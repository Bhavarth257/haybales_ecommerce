export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const PHOTOS_CDN = process.env.NEXT_PUBLIC_PHOTOS_CDN ?? '';

export const photoUrl = (key: string) => (PHOTOS_CDN ? `${PHOTOS_CDN}/${key}` : '');

/**
 * Content-Security-Policy for production builds. Login tokens live in httpOnly cookies the page can't read;
 * on top of that only our own scripts run, and the page can only talk to our API and S3 (photo uploads
 * post straight to a presigned S3 URL). Next's static export inlines its bootstrap scripts, hence
 * 'unsafe-inline' for scripts (no external ones).
 */
export function contentSecurityPolicy() {
  // API_URL is '/api' (same origin) in production, absolute in local dev and the native apps.
  const origin = (u: string) => (/^https?:/.test(u) ? new URL(u).origin : '');
  const connect = ["'self'", origin(API_URL), 'https://*.s3.ap-south-1.amazonaws.com'];
  const images = ["'self'", 'data:', 'blob:', origin(PHOTOS_CDN)];
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${images.filter(Boolean).join(' ')}`,
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    `connect-src ${connect.filter(Boolean).join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/** Public site origin (the Amplify app URL): base for canonical, Open Graph and sitemap URLs. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
