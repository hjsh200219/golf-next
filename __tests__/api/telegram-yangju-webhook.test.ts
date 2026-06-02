/**
 * Integration tests for POST /api/telegram/yangju/webhook.
 *
 * Mocks the Telegram client + all yangju data/HTTP modules; keeps
 * `@/lib/telegram-yangju/keyboards` and `@/lib/telegram/keyboards` REAL so the
 * callback round-trips are exercised for real. The reservation HTTP client is
 * mocked — NO real network, and submitReservation never returns mode:'live'
 * (DRY-RUN only), so no test path can book.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const sendMessage = vi.fn<(...a: any[]) => Promise<void>>(async () => {});
const answerCallbackQuery = vi.fn<(...a: any[]) => Promise<void>>(async () => {});
vi.mock('@/lib/telegram/client', () => ({
  sendMessage: (...a: any[]) => sendMessage(...a),
  answerCallbackQuery: (...a: any[]) => answerCallbackQuery(...a),
  setWebhook: vi.fn(async () => {}),
  editMessageReplyMarkup: vi.fn(async () => {}),
}));

const isAllowedChat = vi.fn(() => true);
vi.mock('@/lib/telegram-yangju/auth', () => ({ isAllowedChat: (...a: any[]) => isAllowedChat(...(a as [])) }));

const claimAttempt = vi.fn<(...a: any[]) => Promise<any>>(async () => ({ ok: true, id: 7 }));
const confirmAttempt = vi.fn<(...a: any[]) => Promise<any>>(async () => ({ ok: true }));
const getAttempt = vi.fn(async () => ({
  id: 7, chat_id: 1, date: '2026-06-30', tee_time: '0612', course: '동',
  resolved_pointid: null, status: 'confirmed', idempotency_key: 'k', payload_log: null,
}));
const markBooked = vi.fn(async () => {});
const markDryRun = vi.fn(async () => {});
const markFailed = vi.fn(async () => {});
vi.mock('@/lib/telegram-yangju/attempts', () => ({
  claimAttempt: (...a: any[]) => claimAttempt(...(a as [])),
  confirmAttempt: (...a: any[]) => confirmAttempt(...(a as [])),
  getAttempt: (...a: any[]) => getAttempt(...(a as [])),
  markBooked: (...a: any[]) => markBooked(...(a as [])),
  markDryRun: (...a: any[]) => markDryRun(...(a as [])),
  markFailed: (...a: any[]) => markFailed(...(a as [])),
  MAX_DAILY_BOOKINGS: 3,
}));

vi.mock('@/lib/telegram-yangju/watches', () => ({
  createYangjuWatch: vi.fn(async () => ({ ok: true })),
  listActiveYangjuWatches: vi.fn(async () => []),
  stopYangjuWatch: vi.fn(async () => {}),
  stopAllYangjuWatches: vi.fn(async () => 0),
  MAX_ACTIVE_YANGJU_WATCHES: 20,
}));

const login = vi.fn(async () => {});
const fetchSlots = vi.fn<(...a: any[]) => Promise<any[]>>(async () => [
  { pointdate: '20260630', pointid: '1', pointtime: '0612', pointname: '동', pointhole: '18홀' },
]);
const checkMyBookings = vi.fn(async () => [] as any[]);
const submitReservation = vi.fn<(...a: any[]) => Promise<any>>(async () => ({
  mode: 'dry_run',
  request: { url: 'x', method: 'POST', headers: {}, body: 'b' },
}));
vi.mock('@/lib/telegram-yangju/reservation-client', () => ({
  YangjuReservationClient: vi.fn().mockImplementation(() => ({
    login, fetchSlots, checkMyBookings, submitReservation,
  })),
}));

vi.mock('@/lib/telegram-yangju/booker', () => ({
  getBooker: vi.fn(() => ({ hand_tel1: '010', hand_tel2: '8002', hand_tel3: '8080' })),
  getYangjuCreds: vi.fn(() => ({ id: 'id', pw: 'pw' })),
}));

const SECRET = 'jk-secret';

function req(update: unknown, secret = SECRET): NextRequest {
  return new NextRequest('http://localhost/api/telegram/yangju/webhook', {
    method: 'POST',
    headers: { 'x-telegram-bot-api-secret-token': secret, 'content-type': 'application/json' },
    body: JSON.stringify(update),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_JK_WEBHOOK_SECRET = SECRET;
  isAllowedChat.mockReturnValue(true);
  submitReservation.mockResolvedValue({
    mode: 'dry_run',
    request: { url: 'x', method: 'POST', headers: {}, body: 'b' },
  });
  claimAttempt.mockResolvedValue({ ok: true, id: 7 });
  confirmAttempt.mockResolvedValue({ ok: true });
});

describe('auth', () => {
  it('rejects a bad secret with 401', async () => {
    const { POST } = await import('@/app/api/telegram/yangju/webhook/route');
    const res = await POST(req({ message: { chat: { id: 1 }, text: '/help' } }, 'wrong'));
    expect(res.status).toBe(401);
  });

  it('non-allowlisted chat → 200, NO yangju login, NO processing', async () => {
    isAllowedChat.mockReturnValue(false);
    const { POST } = await import('@/app/api/telegram/yangju/webhook/route');
    const res = await POST(req({ message: { chat: { id: 999 }, text: '/book' } }));
    expect(res.status).toBe(200);
    expect(login).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe('/book', () => {
  it('/book → date keyboard only, NO login yet (date chosen at tap-time)', async () => {
    const { POST } = await import('@/app/api/telegram/yangju/webhook/route');
    await POST(req({ message: { chat: { id: 1 }, text: '/book' } }));
    expect(login).not.toHaveBeenCalled();
    expect(fetchSlots).not.toHaveBeenCalled();
    // sent a date-selection keyboard with b|date| buttons
    const markup = sendMessage.mock.calls[0][2] as any;
    expect(markup.inline_keyboard[0][0].callback_data).toMatch(/^b\|date\|\d{8}$/);
  });

  it('b|date|<date> tap → login + fetchSlots for that date, shows slots (no booking)', async () => {
    const { POST } = await import('@/app/api/telegram/yangju/webhook/route');
    await POST(req({ callback_query: { id: 'c', message: { chat: { id: 1 } }, data: 'b|date|20260630' } }));
    expect(login).toHaveBeenCalled();
    expect(fetchSlots).toHaveBeenCalledWith('20260630');
    expect(submitReservation).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalled();
  });
});

describe('reserve flow', () => {
  it('pick tap → claimAttempt → confirm button (no booking yet)', async () => {
    const { POST } = await import('@/app/api/telegram/yangju/webhook/route');
    await POST(req({ callback_query: { id: 'c', message: { chat: { id: 1 } }, data: 'r|pick|20260630|0612|동|1' } }));
    expect(claimAttempt).toHaveBeenCalled();
    expect(submitReservation).not.toHaveBeenCalled();
  });

  it('pick retry (claim duplicate) → "이미 진행 중", no confirm', async () => {
    claimAttempt.mockResolvedValue({ ok: false, reason: 'duplicate' });
    const { POST } = await import('@/app/api/telegram/yangju/webhook/route');
    await POST(req({ callback_query: { id: 'c', message: { chat: { id: 1 } }, data: 'r|pick|20260630|0612|동|1' } }));
    const text = sendMessage.mock.calls.map((c) => c[1]).join(' ');
    expect(text).toContain('이미 진행 중');
  });

  it('confirm tap → CAS ok → DRY-RUN: submitReservation called, markDryRun, NO markBooked', async () => {
    const { POST } = await import('@/app/api/telegram/yangju/webhook/route');
    await POST(req({ callback_query: { id: 'c', message: { chat: { id: 1 } }, data: 'r|confirm|7' } }));
    expect(confirmAttempt).toHaveBeenCalledWith(7);
    expect(submitReservation).toHaveBeenCalled();
    expect(markDryRun).toHaveBeenCalled();
    expect(markBooked).not.toHaveBeenCalled();
  });

  it('confirm tap → live mode (mock) → markBooked, NO markDryRun (no real booking — mock only)', async () => {
    submitReservation.mockResolvedValue({
      mode: 'live',
      request: { url: 'x', method: 'POST', headers: {}, body: 'b' },
      status: 200,
    });
    const { POST } = await import('@/app/api/telegram/yangju/webhook/route');
    await POST(req({ callback_query: { id: 'c', message: { chat: { id: 1 } }, data: 'r|confirm|7' } }));
    expect(markBooked).toHaveBeenCalledWith(7, '1', expect.any(String));
    expect(markDryRun).not.toHaveBeenCalled();
  });

  it('confirm retry (CAS already_confirmed) → "이미 처리 중", NO submitReservation', async () => {
    confirmAttempt.mockResolvedValue({ ok: false, reason: 'already_confirmed' });
    const { POST } = await import('@/app/api/telegram/yangju/webhook/route');
    await POST(req({ callback_query: { id: 'c', message: { chat: { id: 1 } }, data: 'r|confirm|7' } }));
    expect(submitReservation).not.toHaveBeenCalled();
    const text = sendMessage.mock.calls.map((c) => c[1]).join(' ');
    expect(text).toContain('이미 처리 중');
  });

  it('confirm but slot gone at re-fetch → markFailed, "마감", NO submitReservation', async () => {
    fetchSlots.mockResolvedValue([]); // slot disappeared
    const { POST } = await import('@/app/api/telegram/yangju/webhook/route');
    await POST(req({ callback_query: { id: 'c', message: { chat: { id: 1 } }, data: 'r|confirm|7' } }));
    expect(submitReservation).not.toHaveBeenCalled();
    expect(markFailed).toHaveBeenCalled();
    const text = sendMessage.mock.calls.map((c) => c[1]).join(' ');
    expect(text).toContain('마감');
  });
});
