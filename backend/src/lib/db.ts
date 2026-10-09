import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// DYNAMO_ENDPOINT is only set for local dev (DynamoDB Local).
export const db = DynamoDBDocumentClient.from(
  new DynamoDBClient(process.env.DYNAMO_ENDPOINT ? { endpoint: process.env.DYNAMO_ENDPOINT } : {}),
  { marshallOptions: { removeUndefinedValues: true } },
);
export const TABLE = process.env.TABLE_NAME ?? 'ParaliSetu';

export const now = () => new Date().toISOString();

/** Remove key/index attributes before returning an item to clients. */
export function clean<T>(item: Record<string, unknown> | undefined): T | undefined {
  if (!item) return undefined;
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, entity, ...rest } = item;
  return rest as T;
}
