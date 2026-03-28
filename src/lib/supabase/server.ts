import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

/**
 * Typed Supabase client alias.
 *
 * `@supabase/ssr` 0.5.x re-exports types from a path that no longer exists in
 * `@supabase/supabase-js` 2.100+, so `createServerClient<Database>()` resolves
 * table generics to `never`.  We cast the return value through the correctly-
 * resolved `SupabaseClient<Database>` from `@supabase/supabase-js` itself,
 * which keeps full table-level typing for every caller without per-file `as any`.
 */
type TypedClient = SupabaseClient<Database>;

export function createServerSupabaseClient(): TypedClient {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as never),
            );
          } catch {
            // Server Component — ignore
          }
        },
      },
    },
  ) as unknown as TypedClient;
}

export function createAdminClient(): TypedClient {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
