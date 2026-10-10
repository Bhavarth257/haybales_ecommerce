import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLE } from './db';

/** Requests allowed per caller per window, by tier: [limit, window seconds]. */
export const LIMITS = { ai: [20, 600], write: [30, 60], read: [120, 60] } as const;
export type Tier = keyof typeof LIMITS;

export const tierOf = (method: string, path: string): Tier =>
  path === '/ai/chat' || path === '/tts' ? 'ai' : method === 'GET' ? 'read' : 'write';

interface RateEvent {
  rawPath?: string;
  requestContext?: { http?: { method?: string; sourceIp?: string }; authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
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
  const who = event.requestContext?.authorizer?.jwt?.claims?.sub ?? http?.sourceIp ?? 'anon';
  const start = now - (now % window);
  try {
    await db.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `RATE#${who}`, SK: `${tier}#${start}` },
        UpdateExpression: 'ADD hits :one SET expiresAt = :exp',
        ConditionExpression: 'attribute_not_exists(hits) OR hits < :limit',
        ExpressionAttributeValues: { ':one': 1, ':exp': start + window + 60, ':limit': limit },
      }),
    );
    return 0;
  } catch (e) {
    if ((e as { name?: string }).name === 'ConditionalCheckFailedException') return start + window - now;
    console.error('rate limit check failed', e);
    return 0;
  }
}
