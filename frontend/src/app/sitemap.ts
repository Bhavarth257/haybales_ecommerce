import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/config';

// Static export: emitted once at build time as /sitemap.xml. Public pages only.
export const dynamic = 'force-static';

const PAGES = ['/', '/listings/', '/login/', '/signup/', '/help/', '/privacy/', '/terms/', '/refund/', '/shipping/', '/contact/'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({ url: new URL(p, SITE_URL).href }));
}
