import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { requireRole } from '../../lib/auth';
import { clean, db, TABLE } from '../../lib/db';
import { handler as wrap, json } from '../../lib/response';

/** Farmer: offers on my listings. Buyer: offers I made. ?as=farmer|buyer picks when the caller has both. */
export const handler = wrap(async (event) => {
  const c = requireRole(event, 'farmer', 'buyer');
  const as = event.queryStringParameters?.as === 'buyer' || !c.roles.includes('farmer') ? 'buyer' : 'farmer';
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: as === 'buyer' ? 'GSI1' : 'GSI2',
      KeyConditionExpression: `${as === 'buyer' ? 'GSI1PK' : 'GSI2PK'} = :p AND begins_with(${as === 'buyer' ? 'GSI1SK' : 'GSI2SK'}, :s)`,
      ExpressionAttributeValues: { ':p': `${as === 'buyer' ? 'BUYER' : 'FARMER'}#${c.userId}`, ':s': 'OFFER#' },
      ScanIndexForward: false,
    }),
  );
  return json(200, { items: Items.map((i) => clean(i)) });
});
