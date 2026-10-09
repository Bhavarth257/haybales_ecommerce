import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { pathParam, requireRole } from '../../lib/auth';
import { clean, db, TABLE } from '../../lib/db';
import { getListing } from '../../lib/listings';
import { handler as wrap, HttpError, json } from '../../lib/response';

export const handler = wrap(async (event) => {
  const { userId } = requireRole(event, 'farmer');
  const listing = await getListing(pathParam(event, 'id'));
  if (listing.farmerId !== userId) throw new HttpError(403, 'Not your listing');
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :p AND begins_with(SK, :s)',
      ExpressionAttributeValues: { ':p': `LISTING#${listing.listingId}`, ':s': 'OFFER#' },
    }),
  );
  return json(200, { items: Items.map((i) => clean(i)) });
});
