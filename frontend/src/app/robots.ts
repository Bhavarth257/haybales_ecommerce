import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/config';

// Static export: emitted once at build time as /robots.txt. Role areas are behind login, keep crawlers out.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/farmer/', '/buyer/', '/transporter/', '/order/', '/profile/'] },
    sitemap: new URL('/sitemap.xml', SITE_URL).href,
  };
}
