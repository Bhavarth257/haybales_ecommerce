import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ZodError, type ZodTypeAny, type z } from 'zod';

export type Event = APIGatewayProxyEventV2WithJWTAuthorizer;
export type Result = APIGatewayProxyResultV2;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (status: number, body: unknown): Result => ({
  statusCode: status,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
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

/** Wrap a handler: maps HttpError/ZodError to 4xx, anything else to a logged 500. */
export function handler(fn: (event: Event) => Promise<Result>) {
  return async (event: Event): Promise<Result> => {
    try {
      return await fn(event);
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message });
      if (e instanceof ZodError) return json(400, { error: 'Validation failed', issues: e.issues });
      if ((e as { name?: string }).name === 'ConditionalCheckFailedException' || (e as { name?: string }).name === 'TransactionCanceledException')
        return json(409, { error: 'Conflict: the item changed, reload and try again' });
      console.error(e);
      return json(500, { error: 'Internal error' });
    }
  };
}
