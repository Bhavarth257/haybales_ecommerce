import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Order } from '@parali/shared';
import { requireRole } from '../../lib/auth';
import { clean, db, TABLE } from '../../lib/db';
import { roadKm } from '../../lib/geo';
import { toJobPreview } from '../../lib/orders';
import { handler as wrap, json } from '../../lib/response';
import { requireVerified } from '../../lib/users';

/** Open pickup jobs, nearest first when the transporter has a base location. */
export const handler = wrap(async (event) => {
  const { userId } = requireRole(event, 'transporter');
  const [me, { Items = [] }] = await Promise.all([
    requireVerified(userId),
    db.send(new QueryCommand({ TableName: TABLE, IndexName: 'GSI3', KeyConditionExpression: 'GSI3PK = :p', ExpressionAttributeValues: { ':p': 'JOB#OPEN' } })),
  ]);
  const jobs = Items.map((i) => toJobPreview(clean<Order>(i)!)).map((o) => ({ ...o, kmFromYou: me?.place ? roadKm(me.place, o.pickup) : null }));
  jobs.sort((a, b) => (a.kmFromYou ?? 0) - (b.kmFromYou ?? 0));
  return json(200, { items: jobs });
});
