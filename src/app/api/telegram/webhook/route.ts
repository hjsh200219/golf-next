import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/server';
import { sendMessage, answerCallbackQuery } from '@/lib/telegram/client';
import {
  clubKeyboard,
  dateKeyboard,
  timeRangeKeyboard,
  decodeCb,
  type InlineKeyboardMarkup,
} from '@/lib/telegram/keyboards';
import {
  createWatch,
  listActiveWatches,
  stopWatch,
  stopAllWatches,
  MAX_ACTIVE_WATCHES,
} from '@/lib/telegram/watches';

const log = createLogger('telegram/webhook');

interface TelegramMessage {
  chat: { id: number };
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  message?: { chat: { id: number } };
  data?: string;
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

const HELP = [
  '⛳️ GolfShin 알림 봇 사용 안내',
  '',
  '/watch - 빈자리 알림 등록 (골프장 → 날짜 → 시간대 선택)',
  '/list - 등록한 알림 목록 보기 / 삭제',
  '/stop - 알림 삭제하기',
  '/cancel - 진행 중인 알림 설정 취소',
  '/help - 이 도움말 보기',
  '',
  '등록하면 매시간 빈자리를 확인해 자리가 나면 알려드려요.',
].join('\n');

/** `YYYYMMDD` -> `YYYY-MM-DD` */
function formatDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** `HHMM` -> `HH:MM` */
function formatTime(hhmm: string): string {
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

/** Inline keyboard to delete each active watch plus a delete-all button. */
function deleteKeyboard(
  watches: { id: number; club_id: string; date: string; time_from: string; time_to: string }[],
): InlineKeyboardMarkup {
  const rows = watches.map((w) => [
    {
      text: `🗑 삭제 - ${w.club_id} ${w.date} ${w.time_from}~${w.time_to}`,
      callback_data: `x|stop|${w.id}`,
    },
  ]);
  rows.push([{ text: '🗑 전체 삭제', callback_data: 'x|stopall' }]);
  return { inline_keyboard: rows };
}

/** One-line summary of an active watch. */
function watchSummary(w: {
  club_id: string;
  date: string;
  time_from: string;
  time_to: string;
}): string {
  return `${w.club_id} / ${w.date} / ${w.time_from}~${w.time_to}`;
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const text = (message.text ?? '').trim();

  if (text === '/help') {
    await sendMessage(chatId, HELP);
    return;
  }

  if (text === '/cancel') {
    // The watch-setup flow is stateless (selections live in callback_data), so
    // there is nothing to roll back server-side — acknowledge and drop the
    // pending inline keyboard from the user's mind.
    await sendMessage(chatId, '진행 중인 알림 설정을 취소했습니다. /watch 로 다시 시작할 수 있어요.');
    return;
  }

  if (text === '/watch' || text === '/start') {
    const supabase = createAdminClient();
    const { data: clubs } = await supabase
      .from('golf_clubs')
      .select('id,name,display_name')
      .eq('is_active', true)
      .order('name');
    await sendMessage(chatId, '골프장을 선택하세요 (취소하려면 /cancel)', clubKeyboard(clubs ?? []));
    return;
  }

  if (text === '/list' || text === '/stop') {
    const watches = await listActiveWatches(chatId);
    if (watches.length === 0) {
      await sendMessage(chatId, '등록된 알림이 없습니다. /watch 로 등록해 보세요.');
      return;
    }
    const summary = ['등록된 알림 (삭제하려면 아래 버튼):', ...watches.map((w) => `• ${watchSummary(w)}`)].join(
      '\n',
    );
    await sendMessage(chatId, summary, deleteKeyboard(watches));
    return;
  }

  await sendMessage(chatId, HELP);
}

async function handleCallback(cb: TelegramCallbackQuery): Promise<void> {
  const chatId = cb.message?.chat.id;
  const data = cb.data ?? '';

  // Answer the callback query so the button stops spinning. Must NOT abort the
  // handler if it fails (e.g. expired/invalid query id) — the watch action
  // below is what matters, so swallow any error here.
  try {
    await answerCallbackQuery(cb.id);
  } catch (err) {
    log.warn('answerCallbackQuery failed (non-fatal)', { error: String(err) });
  }

  if (chatId === undefined) {
    return;
  }

  // Delete scheme: `x|stop|<id>` or `x|stopall`. Not a `w|s=...` watch-flow cb,
  // so do NOT route through decodeCb.
  if (data.startsWith('x|')) {
    const parts = data.split('|');
    if (parts[1] === 'stopall') {
      const count = await stopAllWatches(chatId);
      await sendMessage(chatId, `${count}개의 알림을 모두 삭제했습니다.`);
      return;
    }
    if (parts[1] === 'stop') {
      await stopWatch(Number(parts[2]));
      await sendMessage(chatId, '알림을 삭제했습니다.');
      return;
    }
    return;
  }

  const parts = decodeCb(data);

  if (parts.step === 'date' && parts.club) {
    await sendMessage(chatId, '날짜를 선택하세요', dateKeyboard(parts.club));
    return;
  }

  if (parts.step === 'range' && parts.club && parts.date) {
    await sendMessage(chatId, '시간대를 선택하세요', timeRangeKeyboard(parts.club, parts.date));
    return;
  }

  if (parts.step === 'done' && parts.club && parts.date && parts.range) {
    const [from, to] = parts.range.split('-');
    const date = formatDate(parts.date);
    const timeFrom = formatTime(from);
    const timeTo = formatTime(to);

    const result = await createWatch({
      chatId,
      clubId: parts.club,
      date,
      timeFrom,
      timeTo,
    });

    // Branch on reason BEFORE ok: createWatch returns ok:true with
    // reason:'duplicate', so an ok-first check would mask the duplicate message.
    if (result.reason === 'out_of_range') {
      await sendMessage(chatId, '조회 가능 기간(내일~14일)을 벗어났습니다');
    } else if (result.reason === 'inactive_club') {
      await sendMessage(chatId, '비활성 골프장입니다');
    } else if (result.reason === 'cap') {
      await sendMessage(chatId, `최대 ${MAX_ACTIVE_WATCHES}개까지 등록할 수 있습니다`);
    } else if (result.reason === 'duplicate') {
      await sendMessage(chatId, '이미 등록된 알림입니다');
    } else if (result.ok) {
      const note = parts.club === 'onetheclub' ? ' (클럽 전체 코스 대상)' : '';
      await sendMessage(
        chatId,
        `알림을 등록했습니다.\n${parts.club} / ${date} / ${timeFrom}~${timeTo}${note}`,
      );
    } else {
      await sendMessage(chatId, '알림 등록에 실패했습니다.');
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const header = request.headers.get('x-telegram-bot-api-secret-token');
  if (!secret || header !== secret) {
    log.warn('Unauthorized webhook request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  } catch (err) {
    log.error('webhook handler error', { error: String(err) });
  }

  return NextResponse.json({ ok: true });
}
