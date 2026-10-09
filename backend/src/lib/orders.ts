import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { Order } from '@parali/shared';
import { clean, db, TABLE } from './db';
import { fuzz } from './geo';
import { orderKey } from './keys';
import { HttpError } from './response';

export async function getOrder(id: string): Promise<Order> {
  const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: orderKey(id) }));
  const o = clean<Order>(Item);
  if (!o) throw new HttpError(404, 'Order not found');
  return o;
}

/** Open job as seen by transporters who haven't claimed it: district-level places, no phones. */
export const toJobPreview = (o: Order): Order => ({
  ...o,
  farmerPhone: undefined,
  buyerPhone: undefined,
  pickup: { ...fuzz(o.pickup), district: o.pickup.district, state: o.pickup.state },
  dropoff: { ...fuzz(o.dropoff), district: o.dropoff.district, state: o.dropoff.state },
});
