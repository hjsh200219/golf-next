/**
 * Allowlist authorization for the yangju reservation bot.
 *
 * A 2nd bot token isolates the audience but does NOT authenticate it — any Telegram
 * user who finds the bot could otherwise trigger a real, irreversible booking under
 * the account owner's name. `TELEGRAM_JK_ALLOWED_CHAT_IDS` (comma-separated) gates
 * which chats may act. Fail-closed: an empty or unset env rejects everyone.
 */

let cache: { raw: string; set: Set<number> } | null = null;

function allowedSet(): Set<number> {
  // Unset and empty-string are intentionally equivalent: both mean "reject all".
  const raw = process.env.TELEGRAM_JK_ALLOWED_CHAT_IDS ?? '';
  if (cache && cache.raw === raw) {
    return cache.set;
  }
  const set = new Set<number>(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n)),
  );
  cache = { raw, set };
  return set;
}

/** Whether `chatId` is in `TELEGRAM_JK_ALLOWED_CHAT_IDS`. Empty/unset env = reject all. */
export function isAllowedChat(chatId: number): boolean {
  return allowedSet().has(chatId);
}
