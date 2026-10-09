import type { MetadataRoute } from 'next';

// Static export: emitted once at build time as /manifest.webmanifest.
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Parali Setu',
    short_name: 'Parali Setu',
    description: 'Sell crop stubble instead of burning it.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f3ea', // --color-paper
    theme_color: '#2f5d34', // --color-field
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
