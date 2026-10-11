import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'crypto';
import { db, TABLE } from './db';

/** Requests allowed per caller per window, by tier: [limit, window seconds]. */
export const LIMITS = { auth: [5, 60], ai: [20, 600], write: [30, 60], read: [120, 60] } as const;
/** All users together: AI calls (chat + read-aloud) per day. Caps Bedrock/Polly spend at a few dollars a day. */
export const AI_PER_DAY = 100;
export type Tier = keyof typeof LIMITS;

export const tierOf = (method: string, path: string): Tier =>
  // Strict tier for credential guessing only; refresh/logout run on every visit, so they use the normal write tier.
  path.startsWith('/auth/') && path !== '/auth/refresh' && path !== '/auth/logout' ? 'auth' : path === '/ai/chat' || path === '/tts' ? 'ai' : method === 'GET' ? 'read' : 'write';

interface RateEvent {
  rawPath?: string;
  body?: string;
  isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>;
  requestContext?: { http?: { method?: string; sourceIp?: string }; authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
}

/** Behind the Amplify proxy (CloudFront), CloudFront appends the real viewer IP as the LAST x-forwarded-for entry; earlier entries can be forged by the client. */
export const clientIp = (event: RateEvent) =>
  event.headers?.['x-forwarded-for']?.split(',').pop()?.trim() || event.requestContext?.http?.sourceIp || 'anon';

/** Lowercased body email, hashed so rate items don't store addresses. */
function emailKey(event: RateEvent): string | undefined {
  try {
    const raw = event.body ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body) : {};
    if (typeof raw?.email !== 'string') return undefined;
    return createHash('sha256').update(raw.email.trim().toLowerCase()).digest('base64url').slice(0, 22);
  } catch {
    return undefined;
  }
}

/**
 * Fixed-window counter per signed-in user (or IP when signed out) and tier, stored as a RATE# item
 * that DynamoDB TTL deletes. Returns seconds to wait when over the limit, else 0.
 * Fails open: a limiter outage must not take the app down.
 */
export async function overLimit(event: RateEvent, now = Math.floor(Date.now() / 1000)): Promise<number> {
  const http = event.requestContext?.http;
  const tier = tierOf(http?.method ?? 'GET', event.rawPath ?? '');
  const [limit, window] = LIMITS[tier];
  const start = now - (now % window);
  if (tier === 'auth') {
    // Sign-in style routes: 5/min per client IP and, separately, per email.
    const email = emailKey(event);
    for (const who of [`ip:${clientIp(event)}`, ...(email ? [`email:${email}`] : [])])
      if ((await bump(`RATE#${who}`, `auth#${start}`, limit, start + window + 60)) === 'over') return start + window - now;
    return 0;
  }
  const who = event.requestContext?.authorizer?.jwt?.claims?.sub ?? clientIp(event);
  // Count against the caller's own window first, then (AI only) against the shared daily budget.
  const caller = await bump(`RATE#${who}`, `${tier}#${start}`, limit, start + window + 60);
  if (caller === 'over') return start + window - now;
  if (tier === 'ai' && caller === 'ok') {
    const day = now - (now % 86400);
    if ((await bump('RATE#global', `ai-day#${day}`, AI_PER_DAY, day + 86400 + 60)) === 'over') return day + 86400 - now;
  }
  return 0;
}

/** Atomically add one hit to a counter item unless it is already at `limit`. Fails open on DynamoDB errors. */
async function bump(PK: string, SK: string, limit: number, expiresAt: number): Promise<'ok' | 'over' | 'error'> {
  try {
    await db.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK, SK },
        UpdateExpression: 'ADD hits :one SET expiresAt = :exp',
        ConditionExpression: 'attribute_not_exists(hits) OR hits < :limit',
        ExpressionAttributeValues: { ':one': 1, ':exp': expiresAt, ':limit': limit },
      }),
    );
    return 'ok';
  } catch (e) {
    if ((e as { name?: string }).name === 'ConditionalCheckFailedException') return 'over';
    console.error('rate limit check failed', (e as Error).name, (e as Error).message);
    return 'error';
  }
}
