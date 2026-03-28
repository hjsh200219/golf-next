import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_MS = 60_000; // 1 minute between refresh requests
let lastRefresh = 0;

export async function POST(request: NextRequest) {
  const now = Date.now();
  if (now - lastRefresh < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (now - lastRefresh)) / 1000);
    return NextResponse.json(
      { error: `너무 자주 요청했습니다. ${waitSec}초 후 다시 시도해 주세요.` },
      { status: 429 },
    );
  }
  lastRefresh = now;

  let body: { date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { date } = body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) is required' }, { status: 400 });
  }

  const requestOrigin = new URL(request.url).origin;
  const baseUrl = requestOrigin !== 'http://localhost' ? requestOrigin
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

  try {
    const res = await fetch(`${baseUrl}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SCRAPE_API_KEY ?? '',
      },
      body: JSON.stringify({ dates: [date] }),
    });

    const data = await res.json();
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return NextResponse.json(
      { error: 'Scrape trigger failed' },
      { status: 500 },
    );
  }
}
