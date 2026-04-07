/**
 * 원더클럽(onetheclub) 본진 + 제휴 통합 스크래퍼 — GitHub Actions runner 전용.
 *
 * Vercel production lambda 환경에서는 fetchCookie/세션 처리 차이로 본진 CC
 * 호출이 빈 응답을 받는 문제가 있어, GitHub Actions 워크플로에서 직접 실행해
 * Supabase에 upsert한다.
 *
 * 사용:
 *   npx tsx scripts/scrape-onetheclub.ts [--days 7] [--start 1]
 *
 * 환경변수 (필수):
 *   GOLF_LOGIN_ID, GOLF_LOGIN_PW, GOLF_LOGIN_NAME, GOLF_LOGIN_MOBILE, ...
 *   ONETHECLUB_MEMBER_ID
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import OneTheClubScraper from '../src/lib/scrapers/onetheclub';
import type { LoginCredentials } from '../src/lib/scrapers/base';

interface Args {
  days: number;
  start: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { days: 7, start: 1 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--days') args.days = Number(argv[++i]);
    if (argv[i] === '--start') args.start = Number(argv[++i]);
  }
  return args;
}

function getCredentials(): LoginCredentials {
  return {
    id: process.env.GOLF_LOGIN_ID ?? '',
    id2: process.env.GOLF_LOGIN_ID2 ?? '',
    email: process.env.GOLF_LOGIN_EMAIL ?? '',
    pw: process.env.GOLF_LOGIN_PW ?? '',
    pw1: process.env.GOLF_LOGIN_PW1 ?? '',
    pw2: process.env.GOLF_LOGIN_PW2 ?? '',
    pw3: process.env.GOLF_LOGIN_PW3 ?? '',
    pw4: process.env.GOLF_LOGIN_PW4 ?? '',
    pw5: process.env.GOLF_LOGIN_PW5 ?? '',
    name: process.env.GOLF_LOGIN_NAME ?? '',
    mobile: process.env.GOLF_LOGIN_MOBILE ?? '',
  };
}

function getDates(start: number, days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = start; i < start + days; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}${m}${day}`);
  }
  return dates;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dates = getDates(args.start, args.days);

  console.log(`[scrape-onetheclub] dates=${dates.join(',')}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const credentials = getCredentials();
  if (!credentials.id || !credentials.pw) {
    throw new Error('GOLF_LOGIN_ID and GOLF_LOGIN_PW are required');
  }
  if (!process.env.ONETHECLUB_MEMBER_ID) {
    throw new Error('ONETHECLUB_MEMBER_ID is required for home courses');
  }

  let totalRows = 0;
  let totalUpserted = 0;
  const ccCounts: Record<string, number> = {};
  const failedDates: string[] = [];

  for (const date of dates) {
    const scraper = new OneTheClubScraper(date, credentials);
    const start = Date.now();
    const result = await scraper.run();
    const durationMs = Date.now() - start;

    if (!result.success) {
      console.error(`[${date}] FAILED in ${durationMs}ms: ${result.error}`);
      failedDates.push(date);
      continue;
    }

    console.log(`[${date}] scraped ${result.teeTimes.length} rows in ${durationMs}ms`);
    totalRows += result.teeTimes.length;
    for (const t of result.teeTimes) {
      ccCounts[t.cc_name] = (ccCounts[t.cc_name] ?? 0) + 1;
    }

    if (result.teeTimes.length === 0) continue;

    const now = new Date().toISOString();
    // tee_times는 (club_id, date, teeoff, course)에 unique constraint가 있어서
    // 같은 batch 안에 동일 conflict key 행이 여러 개면 PG가 거부한다.
    // 본진/제휴 다른 cc_name이 같은 시간/코스를 갖는 케이스가 있으므로 Map으로 dedup
    // (마지막 발견 row를 살린다 — cc_name 정보 일부 손실은 trade-off).
    const dedupMap = new Map<string, ReturnType<typeof toRow>>();
    function toRow(t: (typeof result.teeTimes)[number]) {
      return {
        club_id: 'onetheclub',
        cc_name: t.cc_name,
        date: t.date,
        teeoff: t.teeoff,
        course: t.course ?? '',
        price: t.price,
        event: t.event,
        scraped_at: now,
      };
    }
    for (const t of result.teeTimes) {
      const r = toRow(t);
      const key = `${r.date}|${r.teeoff}|${r.course}`;
      dedupMap.set(key, r);
    }
    const rows = [...dedupMap.values()];
    const droppedDuplicates = result.teeTimes.length - rows.length;
    if (droppedDuplicates > 0) {
      console.log(`  dedup: dropped ${droppedDuplicates} duplicate rows`);
    }

    const { error: upsertError, count } = await supabase
      .from('tee_times')
      .upsert(rows, {
        onConflict: 'club_id,date,teeoff,course',
        ignoreDuplicates: false,
        count: 'exact',
      });

    if (upsertError) {
      console.error(`[${date}] upsert error: ${upsertError.message}`);
      failedDates.push(date);
    } else {
      totalUpserted += count ?? rows.length;
    }
  }

  console.log('\n=== summary ===');
  console.log(`total scraped rows: ${totalRows}`);
  console.log(`total upserted:     ${totalUpserted}`);
  console.log(`failed dates:       ${failedDates.length > 0 ? failedDates.join(',') : '(none)'}`);
  console.log('per cc_name:');
  for (const [name, n] of Object.entries(ccCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name.padEnd(28)} ${n}`);
  }

  if (failedDates.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
