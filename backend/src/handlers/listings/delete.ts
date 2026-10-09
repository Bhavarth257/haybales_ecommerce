import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { pathParam, requireRole } from '../../lib/auth';
import { db, now, TABLE } from '../../lib/db';
import { listingKey } from '../../lib/keys';
import { getListing } from '../../lib/listings';
import { handler as wrap, HttpError, json } from '../../lib/response';

// Soft delete: orders still reference the listing, so close it instead of removing it.
export const handler = wrap(async (event) => {
  const { userId } = requireRole(event, 'farmer');
  const l = await getListing(pathParam(event, 'id'));
  if (l.farmerId !== userId) throw new HttpError(403, 'Not your listing');
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: listingKey(l.listingId),
      UpdateExpression: 'SET #s = :c, GSI2PK = :g, updatedAt = :u',
      // Only live listings can be closed; pending/rejected ones must not become re-openable.
      ConditionExpression: '#s IN (:a, :so)',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':c': 'CLOSED', ':g': 'LSTATUS#CLOSED', ':u': now(), ':a': 'ACTIVE', ':so': 'SOLD_OUT' },
    }),
  );
  return json(200, { ok: true });
});
