'use client';
import type { Role, User } from '@parali/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from './api';

/** Admin console path. Unlisted, not secret: admins group + TOTP + server checks protect it (docs/AUTH.md). */
export const OPS_PATH = '/ops-b28c4622bfa0/';

export interface SignUpInput {
  role: Exclude<Role, 'admin'>;
  name: string;
  email: string;
  phone?: string;
  password: string;
  dob: string;
  adult: boolean;
  consent: boolean;
}

/** Admin login result: done, or a TOTP step (with the setup secret on first login). */
export type AdminLogin = { ok: true } | { mfa: 'TOTP' } | { mfa: 'SETUP'; secret: string; otpauth: string };

interface Auth {
  me: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  adminSignIn: (email: string, password: string) => Promise<AdminLogin>;
  verifyMfa: (code: string) => Promise<void>;
  /** Resolves 'confirm' when an emailed code is needed, 'login' when the account is ready. */
  signUp: (input: SignUpInput) => Promise<'confirm' | 'login'>;
  confirmSignUp: (email: string, code: string, password: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<Auth | null>(null);

/** "98765 43210", "+91 98765-43210" → "+919876543210" (Cognito wants E.164). */
const toE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
};

/** GET /me; a 401 (after api()'s one refresh) means logged out. */
const fetchMe = () =>
  api<User>('/me').catch((e) => {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMe(await fetchMe().catch(() => null));
    setLoading(false);
  }, []);

  useEffect(() => {
    let live = true;
    fetchMe()
      .catch(() => null)
      .then((u) => {
        if (!live) return;
        setMe(u);
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const value = useMemo<Auth>(() => {
    const login = async (email: string, password: string) => {
      await api('/auth/login', { body: { email, password } });
      setMe(await fetchMe());
    };
    return {
      me,
      loading,
      refresh,
      signIn: login,
      adminSignIn: async (email, password) => {
        const r = await api<AdminLogin>('/auth/admin/login', { body: { email, password } });
        if (!('mfa' in r)) setMe(await fetchMe());
        return r;
      },
      verifyMfa: async (code) => {
        await api('/auth/mfa', { body: { code } });
        setMe(await fetchMe());
      },
      signUp: async ({ phone, ...rest }) =>
        (await api<{ next: 'confirm' | 'login' }>('/auth/signup', { body: { ...rest, ...(phone ? { phone: toE164(phone) } : {}) } })).next,
      confirmSignUp: async (email, code, password) => {
        await api('/auth/confirm', { body: { email, code } });
        await login(email, password);
      },
      resendCode: async (email) => void (await api('/auth/resend', { body: { email } })),
      forgotPassword: async (email) => void (await api('/auth/forgot', { body: { email } })),
      resetPassword: async (email, code, password) => void (await api('/auth/reset', { body: { email, code, password } })),
      logout: async () => {
        // Clear locally even if the API is unreachable; the cookies expire on their own.
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        setMe(null);
      },
    };
  }, [me, loading, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}

/** Where each role lands after login. */
export const HOME: Record<Role, string> = { farmer: '/farmer/', buyer: '/buyer/', transporter: '/transporter/', admin: OPS_PATH };

/** Error line for auth forms: 401 → the generic `wrong` text; offline/tooMany pass through (ErrorBox translates them). */
export const authError = (e: unknown, wrong: string) => (e instanceof ApiError && e.status === 401 ? wrong : (e as Error).message);
