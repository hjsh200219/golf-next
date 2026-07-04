import { describe, it, expect, afterEach, vi } from 'vitest';
import robots from '@/app/robots';

describe('robots', () => {
  const original = process.env.VERCEL_ENV;

  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original;
    vi.unstubAllEnvs();
  });

  it('production: allows all crawlers, disallows /api/, references the sitemap', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules.userAgent).toBe('*');
    expect(rules.allow).toBe('/');
    expect(rules.disallow).toBe('/api/');
    expect(result.sitemap).toBe('https://golfshin.vercel.app/sitemap.xml');
  });

  it('production: does NOT block AI crawlers (no global disallow of /)', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.disallow).not.toBe('/');
  });

  it('non-production (preview): blocks everything', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules.userAgent).toBe('*');
    expect(rules.disallow).toBe('/');
    expect(result.sitemap).toBeUndefined();
  });
});
