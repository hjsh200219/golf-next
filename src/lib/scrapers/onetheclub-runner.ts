/**
 * GitHub 러너(scripts/scrape-onetheclub.ts)가 Vercel cron 과 onetheclub 단일 세션을
 * 다투지 않게 하는 시간 조정.
 *
 * Vercel cron 은 매시 :00 에 같은 회원 계정으로 로그인하고, onetheclub 직렬 체인은
 * :00:48~:01:39 UTC 에 돈다(scrape_club_results 2026-10-26~28 실측). GitHub 스케줄은
 * `:30` 이어도 지연돼 06:58 에 시작한 실행의 07:00:57 날짜가 밀려났다(run 40647118121).
 * 러너 날짜 하나가 ~25s 걸리므로 :59:20~:02:30 에는 새 날짜를 시작하지 않는다.
 */

const WINDOW_START_SEC = 59 * 60 + 20; // :59:20 — 이후 시작하면 25s 안에 :00 체인과 겹칠 수 있다
const WINDOW_END_SEC = 2 * 60 + 30; // :02:30 — 관측된 체인 끝(:01:39) 뒤 여유
const KICKED_RETRY_DELAY_MS = 60_000;

export function msUntilSessionWindowClear(now: Date): number {
  const sec = now.getUTCMinutes() * 60 + now.getUTCSeconds();
  if (sec < WINDOW_END_SEC) return (WINDOW_END_SEC - sec) * 1000;
  if (sec >= WINDOW_START_SEC) return (3600 - sec + WINDOW_END_SEC) * 1000;
  return 0;
}

export function isSessionInvalidError(error: string | undefined): boolean {
  return !!error && error.includes('onetheclub session invalid');
}

interface AttemptResult {
  success: boolean;
  error?: string;
}

interface RunOptions {
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Vercel 창을 피해 한 날짜를 돌리고, 세션이 밀리면 새 로그인으로 한 번만 다시 시도한다.
 * 재시도도 밀리면 그 결과를 그대로 돌려줘 러너가 실패로 끝나게 한다.
 */
export async function runDateAvoidingVercel<T extends AttemptResult>(
  attempt: () => Promise<T>,
  { now = () => new Date(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }: RunOptions = {},
): Promise<T> {
  const wait = msUntilSessionWindowClear(now());
  if (wait > 0) await sleep(wait);

  const first = await attempt();
  if (first.success || !isSessionInvalidError(first.error)) return first;

  await sleep(Math.max(KICKED_RETRY_DELAY_MS, msUntilSessionWindowClear(now())));
  return attempt();
}
