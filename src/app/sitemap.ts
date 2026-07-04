import type { MetadataRoute } from 'next';

const SITE_URL = 'https://golfshin.vercel.app';

/**
 * Dynamic sitemap (Next.js App Router → /sitemap.xml).
 *
 * Only public, indexable pages are listed. Auth/user-specific routes
 * (/settings, /login) and the PWA offline fallback (/_offline) are excluded
 * because they carry no public SEO value.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'hourly', // tee-time data refreshes hourly
      priority: 1,
    },
    {
      url: `${SITE_URL}/weather`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/chatbot`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
