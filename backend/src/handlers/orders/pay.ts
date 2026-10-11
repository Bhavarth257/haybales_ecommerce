import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { pathParam, requireRole } from '../../lib/auth';
import { db, now, TABLE } from '../../lib/db';
import { orderKey, statsKey } from '../../lib/keys';
import { getOrder } from '../../lib/orders';
import { orderMoney } from '../../lib/pricing';
import { handler as wrap, HttpError, json } from '../../lib/response';
import { nextOrderStatus } from '../../lib/state';

// TODO: mock payment (marks PAID). Swap in a real gateway in the next draft.
export const handler = wrap(async (event) => {
  const { userId } = requireRole(event, 'buyer');
  const o = await getOrder(pathParam(event, 'id'));
  if (o.buyerId !== userId) throw new HttpError(403, 'Not your order');
  const to = nextOrderStatus(o.status, 'pay', 'buyer');
  if (!to) throw new HttpError(409, `Cannot pay an order that is ${o.status}`);
  const ts = now();
  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE,
            Key: orderKey(o.orderId),
            UpdateExpression: 'SET #s = :to, updatedAt = :u, paidAt = :u',
            ConditionExpression: '#s = :from',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':to': to, ':from': o.status, ':u': ts },
          },
        },
        {
          Update: {
            TableName: TABLE,
            Key: statsKey,
            UpdateExpression: 'ADD rupeesToFarmers :r, farmerIds :f',
            ExpressionAttributeValues: { ':r': orderMoney(o).farmer, ':f': new Set([o.farmerId]) },
          },
        },
      ],
    }),
  );
  return json(200, { ...o, status: to, updatedAt: ts });
});
