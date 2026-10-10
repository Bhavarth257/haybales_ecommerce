import { API_URL } from './config';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

/** Thrown message when the API can't be reached at all; ErrorBox shows a friendly, translated line. */
export const OFFLINE = 'offline';
/** Thrown message when the API's per-user rate limit says wait (429). */
export const TOO_MANY = 'tooMany';

let tokenGetter: () => Promise<string | null> = async () => null;
/** Wired by AuthProvider so every call carries the current token. */
export const setTokenGetter = (fn: typeof tokenGetter) => (tokenGetter = fn);

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const token = init.auth === false ? null : await tokenGetter();
  const res = await fetch(API_URL + path, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  }).catch(() => {
    throw new ApiError(0, OFFLINE);
  });
  const data = await res.json().catch(() => null);
  if (res.status === 429) throw new ApiError(429, TOO_MANY, data);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? data?.message ?? `Request failed (${res.status})`, data);
  return data as T;
}
