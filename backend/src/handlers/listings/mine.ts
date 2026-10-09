import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { requireRole } from '../../lib/auth';
import { clean, db, TABLE } from '../../lib/db';
import { handler as wrap, json } from '../../lib/response';

export const handler = wrap(async (event) => {
  const { userId } = requireRole(event, 'farmer');
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :p AND begins_with(GSI1SK, :s)',
      ExpressionAttributeValues: { ':p': `FARMER#${userId}`, ':s': 'LISTING#' },
      ScanIndexForward: false,
    }),
  );
  return json(200, { items: Items.map((i) => clean(i)) });
});
