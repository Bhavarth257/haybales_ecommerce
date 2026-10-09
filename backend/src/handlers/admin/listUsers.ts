import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ROLES, type Role } from '@parali/shared';
import { requireRole } from '../../lib/auth';
import { clean, db, TABLE } from '../../lib/db';
import { handler as wrap, HttpError, json } from '../../lib/response';

export const handler = wrap(async (event) => {
  requireRole(event, 'admin');
  const q = event.queryStringParameters ?? {};
  const role = (q.role ?? 'farmer') as Role;
  if (!ROLES.includes(role)) throw new HttpError(400, 'Unknown role');
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :p',
      ...(q.verified ? { FilterExpression: 'verified = :v' } : {}),
      ExpressionAttributeValues: { ':p': `ROLE#${role}`, ...(q.verified ? { ':v': q.verified === 'true' } : {}) },
      ScanIndexForward: false,
    }),
  );
  return json(200, { items: Items.map((i) => clean(i)) });
});
