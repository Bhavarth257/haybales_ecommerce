import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { pathParam, requireRole } from '../../lib/auth';
import { clean, db, now, TABLE } from '../../lib/db';
import { orderKey } from '../../lib/keys';
import { handler as wrap, json } from '../../lib/response';
import { requireVerified } from '../../lib/users';

export const handler = wrap(async (event) => {
  const { userId } = requireRole(event, 'transporter');
  const me = await requireVerified(userId);
  const ts = now();
  // The condition makes two transporters racing for one job safe: the second gets 409.
  const { Attributes } = await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: orderKey(pathParam(event, 'orderId')),
      UpdateExpression:
        'SET #s = :to, transporterId = :t, transporterName = :n, transporterPhone = :ph, GSI3PK = :g, GSI3SK = :u, updatedAt = :u',
      ConditionExpression: 'attribute_exists(PK) AND #s = :from',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':to': 'ASSIGNED',
        ':from': 'AWAITING_TRANSPORT',
        ':t': userId,
        ':n': me.org ?? me.name,
        ':ph': me.phone ?? null,
        ':g': `TRANSPORTER#${userId}`,
        ':u': ts,
      },
      ReturnValues: 'ALL_NEW',
    }),
  );
  return json(200, clean(Attributes));
});
