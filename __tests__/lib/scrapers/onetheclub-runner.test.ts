import { describe, it, expect, vi } from 'vitest';
import {
  msUntilSessionWindowClear,
  isSessionInvalidError,
  runDateAvoidingVercel,
} from '@/lib/scrapers/onetheclub-runner';

// Vercel cron logs into the same single-session onetheclub account every hour
// at :00; its serial chain ran :00:48–:01:39 UTC (scrape_club_results,
// 2026-10-26~28). A runner date that started at 07:00:57 was kicked.
function at(hms: string): Date {
  return new Date(`2026-10-28T07:${hms}Z`);
}

describe('msUntilSessionWindowClear', () => {
  it('is 0 well outside the Vercel window', () => {
    expect(msUntilSessionWindowClear(at('30:00'))).toBe(0);
    expect(msUntilSessionWindowClear(at('02:30'))).toBe(0);
    expect(msUntilSessionWindowClear(at('59:19'))).toBe(0);
  });

  it('waits until :02:30 when a date would overlap the Vercel chain', () => {
    expect(msUntilSessionWindowClear(at('00:57'))).toBe(93_000);
    expect(msUntilSessionWindowClear(at('00:00'))).toBe(150_000);
    expect(msUntilSessionWindowClear(new Date('2026-10-28T06:59:20Z'))).toBe(190_000);
  });
});

describe('isSessionInvalidError', () => {
  it('matches the kicked-session error only', () => {
    expect(
      isSessionInvalidError('onetheclub session invalid for J54 (파주CC): status 200, empty company heading'),
    ).toBe(true);
    expect(isSessionInvalidError('fetch failed')).toBe(false);
    expect(isSessionInvalidError(undefined)).toBe(false);
  });
});

describe('runDateAvoidingVercel', () => {
  const KICKED = { success: false, error: 'onetheclub session invalid for J53 (신라CC): status 302, empty company heading' };
  const OK = { success: true };

  it('sleeps past the Vercel window before the first attempt', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const attempt = vi.fn().mockResolvedValue(OK);
    const result = await runDateAvoidingVercel(attempt, { now: () => at('00:57'), sleep });
    expect(sleep).toHaveBeenCalledWith(93_000);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(result).toBe(OK);
  });

  it('retries once with a fresh login after a kicked session', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const attempt = vi.fn().mockResolvedValueOnce(KICKED).mockResolvedValueOnce(OK);
    const result = await runDateAvoidingVercel(attempt, { now: () => at('20:00'), sleep });
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(60_000);
    expect(result).toBe(OK);
  });

  it('gives up after the retry so the run still fails loudly', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const attempt = vi.fn().mockResolvedValue(KICKED);
    const result = await runDateAvoidingVercel(attempt, { now: () => at('20:00'), sleep });
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(result).toBe(KICKED);
  });

  it('does not retry other failures', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const other = { success: false, error: 'fetch failed' };
    const attempt = vi.fn().mockResolvedValue(other);
    const result = await runDateAvoidingVercel(attempt, { now: () => at('20:00'), sleep });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(result).toBe(other);
  });
});
