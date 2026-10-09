import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { pathParam, requireRole } from '../../lib/auth';
import { db, now, TABLE } from '../../lib/db';
import { orderKey, statsKey } from '../../lib/keys';
import { getOrder } from '../../lib/orders';
import { CO2_T_PER_T, PM25_KG_PER_T } from '../../lib/pricing';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { nextOrderStatus } from '../../lib/state';
import { jobStatusSchema } from '../../validators';

export const handler = wrap(async (event) => {
  const { userId } = requireRole(event, 'transporter');
  const { action } = parseBody(event, jobStatusSchema);
  const o = await getOrder(pathParam(event, 'orderId'));
  if (o.transporterId !== userId) throw new HttpError(403, 'Not your job');
  const to = nextOrderStatus(o.status, action, 'transporter');
  if (!to) throw new HttpError(409, `Cannot ${action} a job that is ${o.status}`);
  const ts = now();

  const items: NonNullable<ConstructorParameters<typeof TransactWriteCommand>[0]['TransactItems']> = [
    {
      Update: {
        TableName: TABLE,
        Key: orderKey(o.orderId),
        UpdateExpression: 'SET #s = :to, updatedAt = :u',
        ConditionExpression: '#s = :from AND transporterId = :me',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':to': to, ':from': o.status, ':me': userId, ':u': ts },
      },
    },
  ];
  // Delivered stubble = stubble not burnt: count it toward impact.
  if (to === 'DELIVERED')
    items.push({
      Update: {
        TableName: TABLE,
        Key: statsKey,
        UpdateExpression: 'ADD tonnes :t, co2Tonnes :c, pm25Kg :p, orders :one',
        ExpressionAttributeValues: { ':t': o.tonnes, ':c': o.tonnes * CO2_T_PER_T, ':p': o.tonnes * PM25_KG_PER_T, ':one': 1 },
      },
    });
  await db.send(new TransactWriteCommand({ TransactItems: items }));
  return json(200, { ...o, status: to, updatedAt: ts });
});
