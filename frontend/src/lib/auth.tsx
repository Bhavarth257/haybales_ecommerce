'use client';
import type { Role, User } from '@parali/shared';
import { Amplify } from 'aws-amplify';
import * as cognito from 'aws-amplify/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setTokenGetter } from './api';
import { DEMO_AUTH, USER_POOL_CLIENT_ID, USER_POOL_ID } from './config';

/** Error names Cognito (or our WAF rule in front of it) uses when sign-in attempts are rate limited. */
export const TOO_MANY_NAMES = ['TooManyRequestsException', 'LimitExceededException', 'TooManyFailedAttemptsException'];

if (!DEMO_AUTH) Amplify.configure({ Auth: { Cognito: { userPoolId: USER_POOL_ID, userPoolClientId: USER_POOL_CLIENT_ID } } });

const DEMO_KEY = 'ps.demoUser';

/** "98765 43210", "+91 98765-43210" → "+919876543210" (Cognito wants E.164). */
const toE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
};

/** Seeded demo accounts (scripts/seed/seed.ts) for local demo mode. */
export const DEMO_USERS: { id: string; name: string; role: Role }[] = [
  { id: 'farmer-1', name: 'Gurpreet Singh (Sangrur)', role: 'farmer' },
  { id: 'farmer-3', name: 'Rajesh Kumar (Karnal)', role: 'farmer' },
  { id: 'farmer-6', name: 'Naveen Malik (unverified)', role: 'farmer' },
  { id: 'buyer-1', name: 'Malwa Biomass Power (Patiala)', role: 'buyer' },
  { id: 'buyer-2', name: 'Yamuna Paper Board', role: 'buyer' },
  { id: 'transporter-1', name: 'Doaba Haulage', role: 'transporter' },
  { id: 'admin-1', name: 'Parali Setu Admin', role: 'admin' },
];

export interface SignUpInput {
  role: Exclude<Role, 'admin'>;
  name: string;
  email: string;
  phone?: string;
  password: string;
}

interface Auth {
  me: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  loginDemo: (userId: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  confirmSignUp: (email: string, code: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<Auth | null>(null);

async function currentToken(): Promise<string | null> {
  if (DEMO_AUTH) {
    try {
      const id = localStorage.getItem(DEMO_KEY);
      return id ? `dev:${id}` : null;
    } catch {
      return null;
    }
  }
  try {
    // The API's JWT authorizer expects the ID token (it carries cognito:groups).
    return (await cognito.fetchAuthSession()).tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sets state only after awaiting, so it is safe to call from the mount effect.
  const load = useCallback(async () => {
    let user: User | null = null;
    try {
      user = (await currentToken()) ? await api<User>('/me') : null;
    } catch {}
    setMe(user);
    setLoading(false);
  }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  useEffect(() => {
    setTokenGetter(currentToken);
    let live = true;
    currentToken()
      .then((t) => (t ? api<User>('/me') : null))
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

  const value = useMemo<Auth>(
    () => ({
      me,
      loading,
      refresh,
      loginDemo: async (userId) => {
        localStorage.setItem(DEMO_KEY, userId);
        // Fetch directly (not refresh()) so a failure reaches the login page instead of doing nothing.
        setMe(await api<User>('/me'));
      },
      signIn: async (email, password) => {
        await cognito.signIn({ username: email, password });
        setMe(await api<User>('/me'));
      },
      signUp: async ({ role, name, email, phone, password }) => {
        await cognito.signUp({
          username: email,
          password,
          options: { userAttributes: { email, name, 'custom:role': role, ...(phone ? { phone_number: toE164(phone) } : {}) } },
        });
      },
      confirmSignUp: async (email, code, password) => {
        await cognito.confirmSignUp({ username: email, confirmationCode: code });
        await cognito.signIn({ username: email, password });
        setMe(await api<User>('/me'));
      },
      logout: async () => {
        if (DEMO_AUTH) localStorage.removeItem(DEMO_KEY);
        else await cognito.signOut();
        setMe(null);
      },
    }),
    [me, loading, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}

/** Where each role lands after login. */
export const HOME: Record<Role, string> = { farmer: '/farmer/', buyer: '/buyer/', transporter: '/transporter/', admin: '/admin/' };
