import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track how many times createBrowserClient is invoked so we can assert the
// browser client is instantiated exactly once (singleton). Multiple GoTrue
// instances contend on the same `lock:sb-*-auth-token` navigator lock and throw
// "Lock ... was released because another request stole it".
const createBrowserClient = vi.fn((..._args: unknown[]) => ({ marker: {} }));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: (...args: unknown[]) => createBrowserClient(...args),
}));

describe('supabase browser client', () => {
  beforeEach(() => {
    vi.resetModules();
    createBrowserClient.mockClear();
  });

  it('returns the same instance across calls (singleton)', async () => {
    const { createClient } = await import('@/lib/supabase/client');

    const a = createClient();
    const b = createClient();

    expect(a).toBe(b);
    expect(createBrowserClient).toHaveBeenCalledTimes(1);
  });
});
