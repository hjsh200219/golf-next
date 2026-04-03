import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('scrape/cron');

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    log.warn('Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Split 14 days across hours to avoid overwhelming serverless limits
  // Even hours: D+1 ~ D+7, Odd hours: D+8 ~ D+14
  const hour = new Date().getUTCHours();
  const isEvenHour = hour % 2 === 0;
  const startDay = isEvenHour ? 1 : 8;
  const endDay = isEvenHour ? 7 : 14;

  const today = new Date();
  const dates: string[] = [];
  for (let i = startDay; i <= endDay; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }

  log.info('Cron triggered', { range: `D+${startDay}~D+${endDay}`, dateCount: dates.length });

  const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';

  const res = await fetch(`${baseUrl}/api/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.SCRAPE_API_KEY ?? '',
    },
    body: JSON.stringify({ dates }),
  });

  const body = await res.json();

  log.info('Cron completed', { range: `D+${startDay}~D+${endDay}` });

  return NextResponse.json({
    triggered: true,
    range: `D+${startDay} ~ D+${endDay}`,
    dates,
    scrapeResponse: body,
  });
}
