import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { overLimit } from './rateLimit';
import { AT, csrfOk, groupsOf, hasTotp, parseCookies, verifyAccess } from './session';

export type Event = APIGatewayProxyEventV2WithJWTAuthorizer;
export type Result = APIGatewayProxyResultV2;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (status: number, body: unknown, cookies?: string[]): Result => ({
  statusCode: status,
  // no-store: API answers carry per-user data and Set-Cookie; the Amplify proxy (CloudFront) must never cache them.
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
  ...(cookies ? { cookies } : {}),
});

export function parseBody<S extends ZodTypeAny>(event: Event, schema: S): z.infer<S> {
  let raw: unknown;
  try {
    raw = event.body ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body) : {};
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
  return schema.parse(raw);
}

/**
 * Wrap a handler: CSRF header check, identity from the `__Host-ps_at` cookie (exposed as the JWT authorizer
 * claims caller() reads), per-caller rate limit, admin TOTP gate, then maps HttpError/ZodError to 4xx,
 * anything else to a logged 500.
 */
export function handler(fn: (event: Event) => Promise<Result>) {
  return async (event: Event): Promise<Result> => {
    if (!csrfOk(event.requestContext.http.method, event.headers)) return json(403, { error: 'Forbidden' });
    // The cookie is the only source of identity: overwrite whatever else the event carried.
    const claims = await verifyAccess(parseCookies(event.cookies)[AT]);
    (event.requestContext as { authorizer?: unknown }).authorizer = claims ? { jwt: { claims, scopes: [] } } : undefined;
    const wait = await overLimit(event);
    if (wait)
      return {
        statusCode: 429,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'retry-after': String(wait) },
        body: JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.', retryAfter: wait }),
      };
    try {
      if (claims && event.rawPath.startsWith('/admin/') && groupsOf(claims).includes('admins') && !(await hasTotp(String(claims.username))))
        throw new HttpError(403, 'Admins must sign in with two-factor authentication');
      return await fn(event);
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message });
      if (e instanceof ZodError) return json(400, { error: 'Validation failed', issues: e.issues });
      if ((e as { name?: string }).name === 'ConditionalCheckFailedException' || (e as { name?: string }).name === 'TransactionCanceledException')
        return json(409, { error: 'Conflict: the item changed, reload and try again' });
      // Name + message only: SDK error objects can carry request details such as emails.
      console.error(event.routeKey ?? event.rawPath, (e as Error).name, (e as Error).message);
      return json(500, { error: 'Internal error' });
    }
  };
}
