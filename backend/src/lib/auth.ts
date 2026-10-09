import { ROLE_GROUP, type Role } from '@parali/shared';
import { HttpError, type Event } from './response';

export interface Caller {
  userId: string;
  email?: string;
  roles: Role[];
}

/** Read the Cognito JWT claims API Gateway already verified. */
export function caller(event: Event): Caller {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims?.sub) throw new HttpError(401, 'Not signed in');
  const raw = claims['cognito:groups'];
  // HTTP API passes groups as "[a b]" or "a,b" depending on the token; accept both.
  const groups = Array.isArray(raw) ? raw.map(String) : String(raw ?? '').replace(/[[\]]/g, '').split(/[ ,]+/).filter(Boolean);
  const roles = (Object.keys(ROLE_GROUP) as Role[]).filter((r) => groups.includes(ROLE_GROUP[r]));
  return { userId: String(claims.sub), email: claims.email ? String(claims.email) : undefined, roles };
}

export function requireRole(event: Event, ...allowed: Role[]): Caller {
  const c = caller(event);
  if (!c.roles.some((r) => allowed.includes(r))) throw new HttpError(403, `Requires role: ${allowed.join(' or ')}`);
  return c;
}

export const pathParam = (event: Event, name: string): string => {
  const v = event.pathParameters?.[name];
  if (!v) throw new HttpError(400, `Missing ${name}`);
  return v;
};
