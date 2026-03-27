import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth/callback');

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    // No code provided — redirect home with error
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  try {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      log.error('Code exchange failed', { error: error.message });
      return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
    }

    // Ensure the redirect target is relative to prevent open-redirect vulnerabilities
    const redirectTo = next.startsWith('/') ? next : '/';

    return NextResponse.redirect(`${origin}${redirectTo}`);
  } catch (err) {
    log.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.redirect(`${origin}/?error=internal_error`);
  }
}
