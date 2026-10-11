import { API_URL } from './config';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

/** Thrown message when the API can't be reached at all; ErrorBox shows a friendly, translated line. */
export const OFFLINE = 'offline';
/** Thrown message when the API's rate limit says wait (429). */
export const TOO_MANY = 'tooMany';

// Session lives in httpOnly cookies set by /auth/*; the custom header is the API's CSRF check.
const send = (path: string, method: string, body?: unknown) =>
  fetch(API_URL + path, {
    method,
    credentials: 'include',
    headers: { 'content-type': 'application/json', 'x-requested-with': 'parali' },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new ApiError(0, OFFLINE);
  });

// Not a token: only says a session cookie may exist, so anonymous visitors don't spend the
// rate-limited /auth/refresh on every page load.
const HINT = 'ps.session';
const hint = (on?: boolean) => {
  try {
    if (on === undefined) return localStorage.getItem(HINT) === '1';
    if (on) localStorage.setItem(HINT, '1');
    else localStorage.removeItem(HINT);
  } catch {}
  return true; // storage blocked: assume a session may exist
};

// One refresh shared by every request that hits a 401 at the same time.
let refreshing: Promise<boolean> | null = null;
const refreshSession = () =>
  (refreshing ??= send('/auth/refresh', 'POST')
    .then((r) => (r.status === 401 && hint(false), r.ok))
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null))));

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? (init.body ? 'POST' : 'GET');
  let res = await send(path, method, init.body);
  if (res.status === 401 && !path.startsWith('/auth/') && hint() && (await refreshSession())) res = await send(path, method, init.body);
  if (path === '/auth/logout') hint(false);
  else if (res.ok && ['/auth/login', '/auth/admin/login', '/auth/mfa'].includes(path)) hint(true);
  const data = await res.json().catch(() => null);
  if (res.status === 429) throw new ApiError(429, TOO_MANY, data);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? data?.message ?? `Request failed (${res.status})`, data);
  return data as T;
}
