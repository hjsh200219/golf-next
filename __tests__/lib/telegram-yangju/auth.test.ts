import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAllowedChat } from '@/lib/telegram-yangju/auth';

describe('isAllowedChat', () => {
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.TELEGRAM_JK_ALLOWED_CHAT_IDS;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.TELEGRAM_JK_ALLOWED_CHAT_IDS;
    else process.env.TELEGRAM_JK_ALLOWED_CHAT_IDS = saved;
  });

  it('returns true for a listed chat_id', () => {
    process.env.TELEGRAM_JK_ALLOWED_CHAT_IDS = '111,222,333';
    expect(isAllowedChat(222)).toBe(true);
  });

  it('returns false for an unlisted chat_id', () => {
    process.env.TELEGRAM_JK_ALLOWED_CHAT_IDS = '111,222,333';
    expect(isAllowedChat(999)).toBe(false);
  });

  it('tolerates whitespace around ids', () => {
    process.env.TELEGRAM_JK_ALLOWED_CHAT_IDS = ' 111 , 222 ';
    expect(isAllowedChat(111)).toBe(true);
    expect(isAllowedChat(222)).toBe(true);
  });

  it('rejects all when env is empty', () => {
    process.env.TELEGRAM_JK_ALLOWED_CHAT_IDS = '';
    expect(isAllowedChat(111)).toBe(false);
  });

  it('rejects all when env is unset', () => {
    delete process.env.TELEGRAM_JK_ALLOWED_CHAT_IDS;
    expect(isAllowedChat(111)).toBe(false);
  });
});
