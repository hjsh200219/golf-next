import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

// Singleton: one browser client per document. Each createBrowserClient spins up
// its own GoTrueClient that acquires the `lock:sb-*-auth-token` navigator lock;
// multiple instances steal the lock from each other and throw
// "Lock ... was released because another request stole it".
let client: BrowserClient | undefined;

export function createClient(): BrowserClient {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
