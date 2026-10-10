export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const PHOTOS_CDN = process.env.NEXT_PUBLIC_PHOTOS_CDN ?? '';
export const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID ?? '';
export const USER_POOL_CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID ?? '';
/** Without Cognito config we run in demo mode against the local dev API. */
export const DEMO_AUTH = !USER_POOL_ID;

export const photoUrl = (key: string) => (PHOTOS_CDN ? `${PHOTOS_CDN}/${key}` : '');

/**
 * Content-Security-Policy for production builds. The login token has to live in browser storage (a static
 * site has no server to hold an httpOnly cookie), so the defence is: only our own scripts run, and the page
 * can only talk to our API, Cognito and S3. An injected script then has nowhere to send a stolen token.
 * Next's static export inlines its bootstrap scripts, hence 'unsafe-inline' for scripts (no external ones).
 */
export function contentSecurityPolicy() {
  const origin = (u: string) => (u ? new URL(u).origin : '');
  const region = USER_POOL_ID.split('_')[0] || 'ap-south-1';
  const connect = ["'self'", origin(API_URL), `https://cognito-idp.${region}.amazonaws.com`, `https://*.s3.${region}.amazonaws.com`];
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
