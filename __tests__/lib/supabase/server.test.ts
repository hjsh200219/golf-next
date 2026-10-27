import { describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServerSupabaseClient } from '@/lib/supabase/server';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }));

describe('server cookie client', () => {
  it('awaits request cookies before reading and refreshing the session', async () => {
    const cookieStore = { getAll: vi.fn(() => [{ name: 'session', value: 'existing' }]), set: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(cookieStore as never);
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      expect(options.cookies.getAll()).toEqual([{ name: 'session', value: 'existing' }]);
      options.cookies.setAll!([{ name: 'session', value: 'refreshed', options: { path: '/' } }]);
      return {} as never;
    });
    await createServerSupabaseClient();
    expect(cookieStore.set).toHaveBeenCalledWith('session', 'refreshed', { path: '/' });
  });
});
