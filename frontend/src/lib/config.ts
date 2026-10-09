export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const PHOTOS_CDN = process.env.NEXT_PUBLIC_PHOTOS_CDN ?? '';
export const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID ?? '';
export const USER_POOL_CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID ?? '';
/** Without Cognito config we run in demo mode against the local dev API. */
export const DEMO_AUTH = !USER_POOL_ID;

export const photoUrl = (key: string) => (PHOTOS_CDN ? `${PHOTOS_CDN}/${key}` : '');
