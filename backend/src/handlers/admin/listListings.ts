import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { LISTING_STATUSES, type ListingStatus } from '@parali/shared';
import { requireRole } from '../../lib/auth';
import { clean, db, TABLE } from '../../lib/db';
import { handler as wrap, HttpError, json } from '../../lib/response';

export const handler = wrap(async (event) => {
  requireRole(event, 'admin');
  const status = (event.queryStringParameters?.status ?? 'PENDING_APPROVAL') as ListingStatus;
  if (!LISTING_STATUSES.includes(status)) throw new HttpError(400, 'Unknown status');
  const { Items = [] } = await db.send(
    new QueryCommand({ TableName: TABLE, IndexName: 'GSI2', KeyConditionExpression: 'GSI2PK = :p', ExpressionAttributeValues: { ':p': `LSTATUS#${status}` } }),
  );
  return json(200, { items: Items.map((i) => clean(i)) });
});
