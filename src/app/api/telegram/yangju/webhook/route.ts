import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { sendMessage, answerCallbackQuery } from '@/lib/telegram/client';
import { isAllowedChat } from '@/lib/telegram-yangju/auth';
import { decodeCb } from '@/lib/telegram/keyboards';
import {
  decodeReserveCb,
  slotListKeyboard,
  confirmKeyboard,
  yangjuDateKeyboard,
  yangjuTimeRangeKeyboard,
  bookDateKeyboard,
  decodeBookCb,
} from '@/lib/telegram-yangju/keyboards';
import {
  createYangjuWatch,
  listActiveYangjuWatches,
  stopYangjuWatch,
  stopAllYangjuWatches,
  MAX_ACTIVE_YANGJU_WATCHES,
} from '@/lib/telegram-yangju/watches';
import {
  claimAttempt,
  confirmAttempt,
  markBooked,
  markDryRun,
  markFailed,
  getAttempt,
} from '@/lib/telegram-yangju/attempts';
import { YangjuReservationClient } from '@/lib/telegram-yangju/reservation-client';
import { buildResOkBody } from '@/lib/telegram-yangju/resok-payload';
import { getBooker, getYangjuCreds } from '@/lib/telegram-yangju/booker';
import { fmtDate, fmtTime } from '@/lib/telegram-yangju/slot-format';

const log = createLogger('telegram/yangju/webhook');

function token(): string | undefined {
  return process.env.TELEGRAM_JK_BOT_TOKEN;
}
const send = (chatId: number, text: string, markup?: object) =>
  sendMessage(chatId, text, markup, undefined, token());

interface TgMessage {
  chat: { id: number };
  text?: string;
}
interface TgCallback {
  id: string;
  message?: { chat: { id: number } };
  data?: string;
}
interface TgUpdate {
  message?: TgMessage;
  callback_query?: TgCallback;
}

const HELP = [
  '⛳️ 양주CC 예약 봇',
  '',
  '/book - 지금 빈자리 조회 후 바로 예약',
  '/watch - 빈자리 알림 등록 (날짜 → 시간대)',
  '/list - 등록한 알림 보기 / 삭제',
  '/stop - 알림 삭제',
  '/cancel - 진행 중 설정 취소',
  '/help - 도움말',
].join('\n');

async function handleMessage(m: TgMessage): Promise<void> {
  const chatId = m.chat.id;
  const text = (m.text ?? '').trim();

  if (text === '/help' || text === '/start') {
    await send(chatId, HELP);
    return;
  }
  if (text === '/cancel') {
    await send(chatId, '진행 중인 설정을 취소했습니다.');
    return;
  }
  if (text === '/watch') {
    await send(chatId, '날짜를 선택하세요 (취소: /cancel)', yangjuDateKeyboard());
    return;
  }
  if (text === '/list' || text === '/stop') {
    const watches = await listActiveYangjuWatches(chatId);
    if (watches.length === 0) {
      await send(chatId, '등록된 알림이 없습니다. /watch 로 등록해 보세요.');
      return;
    }
    const rows = watches.map((w) => [
      {
        text: `🗑 ${w.date} ${w.time_from}~${w.time_to}`,
        callback_data: `x|stop|${w.id}`,
      },
    ]);
    rows.push([{ text: '🗑 전체 삭제', callback_data: 'x|stopall' }]);
    const summary = ['등록된 알림:', ...watches.map((w) => `• ${w.date} ${w.time_from}~${w.time_to}`)].join('\n');
    await send(chatId, summary, { inline_keyboard: rows });
    return;
  }
  if (text === '/book') {
    await send(chatId, '예약할 날짜를 선택하세요 (취소: /cancel)', bookDateKeyboard());
    return;
  }
  await send(chatId, HELP);
}

/** Book-flow date tapped: live login + fetchSlots for that date → [예약] buttons. */
async function runBookForDate(chatId: number, date: string): Promise<void> {
  const client = new YangjuReservationClient(getYangjuCreds());
  try {
    await client.login();
  } catch (err) {
    await send(chatId, `로그인 실패: ${(err as Error).message}`);
    return;
  }
  let slots;
  try {
    slots = await client.fetchSlots(date);
  } catch (err) {
    await send(chatId, `조회 실패: ${(err as Error).message}`);
    return;
  }
  if (slots.length === 0) {
    await send(chatId, `${fmtDate(date)} 빈자리가 없습니다.`);
    return;
  }
  await send(chatId, `${fmtDate(date)} 빈자리 — 예약할 시간을 누르세요:`, slotListKeyboard(slots));
}

async function handleCallback(cb: TgCallback): Promise<void> {
  const chatId = cb.message?.chat.id;
  try {
    await answerCallbackQuery(cb.id, undefined, token());
  } catch (err) {
    log.warn('answerCallbackQuery failed (non-fatal)', { error: String(err) });
  }
  if (chatId === undefined) return;

  const data = cb.data ?? '';

  // delete scheme x|stop|<id> / x|stopall
  if (data.startsWith('x|')) {
    const parts = data.split('|');
    if (parts[1] === 'stopall') {
      const n = await stopAllYangjuWatches(chatId);
      await send(chatId, `${n}개의 알림을 모두 삭제했습니다.`);
    } else if (parts[1] === 'stop') {
      await stopYangjuWatch(Number(parts[2]));
      await send(chatId, '알림을 삭제했습니다.');
    }
    return;
  }

  // book-flow date scheme b|date|<YYYYMMDD> → fetch that date's slots
  if (data.startsWith('b|')) {
    const { date } = decodeBookCb(data);
    if (date) await runBookForDate(chatId, date);
    return;
  }

  // reserve scheme r|pick|... / r|confirm|<attemptId>
  if (data.startsWith('r|')) {
    await handleReserve(chatId, data);
    return;
  }

  // watch-flow w|s=...  (reuse existing decodeCb; yangju has no club step but the
  // date/range steps are identical — club is fixed 'yangju')
  const parts = decodeCb(data);
  if (parts.step === 'range' && parts.date) {
    await send(chatId, '시간대를 선택하세요', yangjuTimeRangeKeyboard(parts.date));
    return;
  }
  if (parts.step === 'done' && parts.date && parts.range) {
    const [from, to] = parts.range.split('-');
    const result = await createYangjuWatch({
      chatId,
      date: fmtDate(parts.date),
      timeFrom: fmtTime(from),
      timeTo: fmtTime(to),
    });
    if (result.reason === 'out_of_range') await send(chatId, '조회 가능 기간(내일~14일)을 벗어났습니다');
    else if (result.reason === 'cap') await send(chatId, `최대 ${MAX_ACTIVE_YANGJU_WATCHES}개까지 등록할 수 있습니다`);
    else if (result.reason === 'duplicate') await send(chatId, '이미 등록된 알림입니다');
    else if (result.ok) await send(chatId, `알림 등록 완료\n양주CC / ${fmtDate(parts.date)} / ${fmtTime(from)}~${fmtTime(to)}`);
    else await send(chatId, '알림 등록에 실패했습니다.');
  }
}

/**
 * Reserve flow. Two taps:
 *   pick    -> claimAttempt (INSERT pending; deterministic-key conflict aborts a
 *              webhook retry) -> show confirm button.
 *   confirm -> confirmAttempt CAS (pending->confirmed; a retry of THIS tap finds
 *              non-pending and aborts) -> re-fetch live slot (truth at tap-time) ->
 *              preflight -> buildResOkBody -> submitReservation (DRY-RUN unless the
 *              env flag is set; the live POST is human-gated).
 */
async function handleReserve(chatId: number, data: string): Promise<void> {
  const parts = decodeReserveCb(data);

  // pointid is intentionally NOT required: the idempotency key excludes it and the
  // tap-time pointid is re-fetched at confirm. The alert path has no display
  // pointid (tee_times stores no pointid), so requiring it would break alerts.
  if (parts.step === 'pick' && parts.date && parts.time && parts.course) {
    const claim = await claimAttempt({
      chatId,
      date: fmtDate(parts.date),
      teeTime: parts.time,
      course: parts.course,
    });
    if (!claim.ok) {
      if (claim.reason === 'duplicate') await send(chatId, '이미 진행 중인 예약입니다.');
      else if (claim.reason === 'cap') await send(chatId, '일일 예약 한도를 초과했습니다.');
      else await send(chatId, '예약 시작에 실패했습니다.');
      return;
    }
    await send(
      chatId,
      `${fmtDate(parts.date)} ${fmtTime(parts.time)} ${parts.course} 코스로 예약할까요?`,
      confirmKeyboard(claim.id),
    );
    return;
  }

  if (parts.step === 'confirm' && parts.attemptId) {
    const id = Number(parts.attemptId);
    // CAS pending->confirmed: the tap-2 webhook-retry guard.
    const cas = await confirmAttempt(id);
    if (!cas.ok) {
      await send(chatId, '이미 처리 중입니다.');
      return;
    }
    const attempt = await getAttempt(id);
    if (!attempt) {
      await markFailed(id, 'attempt row missing after CAS');
      await send(chatId, '예약 정보를 찾을 수 없습니다.');
      return;
    }

    // Build the client INSIDE the try: getYangjuCreds() can throw on misconfig,
    // and the CAS already flipped the row to 'confirmed' (which is in the unique
    // index). A throw here must route through markFailed so the slot is retryable.
    try {
      const client = new YangjuReservationClient(getYangjuCreds());
      await client.login();
      // truth at tap-time: re-fetch the live list, find THIS slot's current pointid
      const yyyymmdd = attempt.date.replace(/-/g, '');
      const slots = await client.fetchSlots(yyyymmdd);
      const slot = slots.find(
        (s) => s.pointtime === attempt.tee_time && s.pointname === attempt.course,
      );
      if (!slot) {
        await markFailed(id, 'slot gone at re-fetch');
        await send(chatId, '이미 마감된 시간입니다.');
        return;
      }
      // preflight (fail-closed): throws on a bounced session before the POST.
      await client.checkMyBookings();

      const body = buildResOkBody(slot, getBooker());
      const result = await client.submitReservation(slot, body, { live: true });

      if (result.mode === 'dry_run') {
        await markDryRun(id, body);
        await send(chatId, `[DRY-RUN] 예약 본문 준비 완료 (실예약 비활성). ${fmtTime(slot.pointtime)} ${slot.pointname}`);
      } else {
        await markBooked(id, slot.pointid, body);
        await send(chatId, `✅ 예약 요청 완료: ${fmtDate(attempt.date)} ${fmtTime(slot.pointtime)} ${slot.pointname}`);
      }
    } catch (err) {
      await markFailed(id, (err as Error).message);
      await send(chatId, `예약 실패: ${(err as Error).message}`);
    }
    return;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.TELEGRAM_JK_WEBHOOK_SECRET;
  const header = request.headers.get('x-telegram-bot-api-secret-token');
  if (!secret || header !== secret) {
    log.warn('Unauthorized yangju webhook request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Authorization gate at the TOP — before any yangju login / watch / booking.
  // A non-allowlisted chat gets 200 OK (Telegram best practice) but no processing.
  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  if (chatId === undefined || !isAllowedChat(chatId)) {
    log.warn('yangju webhook: chat not allowlisted', { chatId });
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.message) await handleMessage(update.message);
    else if (update.callback_query) await handleCallback(update.callback_query);
  } catch (err) {
    log.error('yangju webhook handler error', { error: String(err) });
  }

  return NextResponse.json({ ok: true });
}
