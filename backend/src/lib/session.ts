// Cookie sessions (docs/AUTH.md): parse/serialise cookies, verify the access token, CSRF header,
// admin TOTP check, and the local-mode (no Cognito) token + password store.
import { AdminGetUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { ROLE_GROUP } from '@parali/shared';
import { z } from 'zod';
import { db, TABLE } from './db';
import { HttpError } from './response';
import { getUser } from './users';

/** Never honoured inside Lambda, even if the env var leaks into a deployed function. */
export const LOCAL = process.env.AUTH_MODE === 'local' && !process.env.AWS_LAMBDA_FUNCTION_NAME;
export const CLIENT_ID = process.env.USER_POOL_CLIENT_ID ?? '';
export const cognito = new CognitoIdentityProviderClient({});

export const AT = '__Host-ps_at';
export const RT = '__Host-ps_rt';
export const MFA = '__Host-ps_mfa';
const MAX_AGE = { [AT]: 3600, [RT]: 7 * 86400, [MFA]: 300 } as const;

export function parseCookies(list: string[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (list ?? []).join(';').split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    const name = part.slice(0, i).trim();
    if (!(name in out)) out[name] = part.slice(i + 1).trim();
  }
  return out;
}

export const setCookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;
export const clearCookie = (name: string) => setCookie(name, '', 0);
export const clearAll = () => [AT, RT, MFA].map(clearCookie);
/** Signed in: access + refresh cookies, and any half-finished MFA login is dropped. */
export const sessionCookies = (at: string, rt?: string) => [
  setCookie(AT, at, MAX_AGE[AT]),
  ...(rt ? [setCookie(RT, rt, MAX_AGE[RT])] : []),
  clearCookie(MFA),
];
export const mfaCookie = (value: string) => setCookie(MFA, value, MAX_AGE[MFA]);

/** Writes need a header a cross-site form can't send; with SameSite=Strict this is the CSRF defence. */
export const csrfOk = (method: string, headers: Record<string, string | undefined> | undefined) =>
  method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || headers?.['x-requested-with'] === 'parali';

// --- Access token -------------------------------------------------------------------------------

// One per container (created on first use) so the JWKS cache survives warm invocations.
// https://github.com/awslabs/aws-jwt-verify#readme
let verifier: ReturnType<typeof makeVerifier> | undefined;
const makeVerifier = (userPoolId: string) => CognitoJwtVerifier.create({ userPoolId, tokenUse: 'access', clientId: CLIENT_ID });

export type Claims = Record<string, unknown> & { sub: string };

/** Verified claims of a `__Host-ps_at` value, or null when missing/invalid/expired. */
export async function verifyAccess(token: string | undefined): Promise<Claims | null> {
  if (!token) return null;
  if (LOCAL) {
    const c = verifyLocal(token);
    return c?.token_use === 'access' ? (c as Claims) : null;
  }
  if (!process.env.USER_POOL_ID || !CLIENT_ID) return null;
  verifier ??= makeVerifier(process.env.USER_POOL_ID);
  return (await verifier.verify(token).catch(() => null)) as Claims | null;
}

/** Payload of a token Cognito just handed us over TLS (no signature check needed for that one). */
export const decodeJwt = (token: string): Record<string, unknown> => JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString() || '{}');
export const groupsOf = (claims: Record<string, unknown>) => (Array.isArray(claims['cognito:groups']) ? (claims['cognito:groups'] as string[]) : []);

const totpUntil = new Map<string, number>();
/** Admin routes need TOTP turned on (AdminGetUser). Positive results cached per container for 5 minutes. */
export async function hasTotp(username: string): Promise<boolean> {
  if (LOCAL) return true; // local mode skips MFA
  if ((totpUntil.get(username) ?? 0) > Date.now()) return true;
  const u = await cognito.send(new AdminGetUserCommand({ UserPoolId: process.env.USER_POOL_ID, Username: username }));
  const ok = !!u.UserMFASettingList?.includes('SOFTWARE_TOKEN_MFA');
  if (ok) totpUntil.set(username, Date.now() + 5 * 60_000);
  return ok;
}

// --- Local mode (dev server only) ---------------------------------------------------------------

const SECRET = randomBytes(32); // per process: restarting the dev API signs everyone out
const mac = (body: string) => createHmac('sha256', SECRET).update(body).digest('base64url');

export function signLocal(claims: Record<string, unknown>, ttlSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString('base64url');
  return `${body}.${mac(body)}`;
}

export function verifyLocal(token: string): Record<string, unknown> | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = Buffer.from(mac(body));
  const got = Buffer.from(sig);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const c = JSON.parse(Buffer.from(body, 'base64url').toString());
    return typeof c.exp === 'number' && c.exp > Date.now() / 1000 ? c : null;
  } catch {
    return null;
  }
}

const hash = (password: string, salt: string) => scryptSync(password, salt, 64).toString('base64url');
const DUMMY = `${'0'.repeat(22)}:${hash('dummy', '0'.repeat(22))}`;

/** Local credential item, keyed by the (validated, lowercased) email. */
export const authKey = (email: string) => {
  const e = z.string().email().max(254).safeParse(email.trim().toLowerCase());
  if (!e.success) throw new HttpError(400, 'Invalid email');
  return { PK: `AUTH#${e.data}`, SK: 'AUTH' };
};

/** Stores a local login; false when the email is already taken. */
export async function localCreate(email: string, password: string, userId: string): Promise<boolean> {
  const salt = randomBytes(16).toString('base64url');
  try {
    await db.send(new PutCommand({ TableName: TABLE, Item: { ...authKey(email), userId, pw: `${salt}:${hash(password, salt)}` }, ConditionExpression: 'attribute_not_exists(PK)' }));
    return true;
  } catch (e) {
    if ((e as Error).name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}

/** userId when the password matches, else null. Hashes even for unknown emails so timing doesn't leak existence. */
export async function localCheck(email: string, password: string): Promise<string | null> {
  const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: authKey(email) }));
  const [salt, want] = String(Item?.pw ?? DUMMY).split(':');
  const ok = timingSafeEqual(Buffer.from(hash(password, salt)), Buffer.from(want));
  return ok && Item ? String(Item.userId) : null;
}

export const localUserId = async (email: string) =>
  (await db.send(new GetCommand({ TableName: TABLE, Key: authKey(email) }))).Item?.userId as string | undefined;

/** Local sign-in: tokens with the role's group from the profile, mirroring Cognito's access token claims. */
export async function localTokens(userId: string) {
  const u = await getUser(userId);
  if (!u || u.deleted) return null;
  return {
    at: signLocal({ sub: userId, username: userId, 'cognito:groups': [ROLE_GROUP[u.role]], token_use: 'access' }, MAX_AGE[AT]),
    rt: signLocal({ sub: userId, token_use: 'refresh' }, MAX_AGE[RT]),
    admin: u.role === 'admin',
  };
}

// --- Errors -------------------------------------------------------------------------------------

export const BAD_LOGIN = 'Wrong email or password';

/** Turn a Cognito error into a generic HttpError. Logs the error name only (never codes, tokens or emails). */
export function authError(e: unknown, status: number, message: string): never {
  const name = (e as Error)?.name;
  if (['TooManyRequestsException', 'LimitExceededException', 'TooManyFailedAttemptsException'].includes(name))
    throw new HttpError(429, 'Too many tries. Wait a minute and try again.');
  console.warn('auth failed:', name);
  throw new HttpError(status, message);
}
