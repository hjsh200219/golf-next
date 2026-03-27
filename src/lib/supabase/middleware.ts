import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/types/database';

type SetAllCookies = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0];

/**
 * Refreshes the Supabase Auth session stored in cookies.
 * Must be called from Next.js middleware so cookies can be read and written
 * before the request is forwarded to the route handler or page.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Start with a pass-through response; we may mutate its cookies below.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SetAllCookies) {
          // Write to the request so server components see the updated cookies.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          // Re-create the response so we can attach Set-Cookie headers.
          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not run any code between createServerClient and getUser.
  // A bug in your logic could result in the user being randomly signed out.
  // Calling getUser() will silently refresh the session if it has expired.
  await supabase.auth.getUser();

  return supabaseResponse;
}
