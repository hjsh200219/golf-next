import type { MetadataRoute } from 'next';

const SITE_URL = 'https://golfshin.vercel.app';

/**
 * Dynamic robots.txt (Next.js App Router → /robots.txt).
 *
 * - Production: allow all crawlers (incl. AI crawlers GPTBot, ClaudeBot,
 *   PerplexityBot, Google-Extended, CCBot — covered by the `*` allow, which
 *   GEO requires we do NOT block), disallow only API endpoints, and point to
 *   the sitemap.
 * - Non-production (Vercel preview): block everything so *.vercel.app preview
 *   domains are not indexed as duplicate content.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === 'production';

  if (!isProduction) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
