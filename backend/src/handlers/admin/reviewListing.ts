import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { pathParam, requireRole } from '../../lib/auth';
import { clean, db, now, TABLE } from '../../lib/db';
import { listingKey } from '../../lib/keys';
import { handler as wrap, json, parseBody } from '../../lib/response';
import { reviewListingSchema } from '../../validators';

export const handler = wrap(async (event) => {
  requireRole(event, 'admin');
  const { decision } = parseBody(event, reviewListingSchema);
  const to = decision === 'approve' ? 'ACTIVE' : 'REJECTED';
  const { Attributes } = await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: listingKey(pathParam(event, 'id')),
      UpdateExpression: 'SET #s = :to, GSI2PK = :g, updatedAt = :u, approvedAt = :u',
      ConditionExpression: '#s = :pending',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':to': to, ':g': `LSTATUS#${to}`, ':u': now(), ':pending': 'PENDING_APPROVAL' },
      ReturnValues: 'ALL_NEW',
    }),
  );
  return json(200, clean(Attributes));
});
