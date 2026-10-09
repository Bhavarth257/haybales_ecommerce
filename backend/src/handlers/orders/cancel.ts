import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { caller, pathParam } from '../../lib/auth';
import { db, now, TABLE } from '../../lib/db';
import { listingKey, orderKey } from '../../lib/keys';
import { getListing } from '../../lib/listings';
import { getOrder } from '../../lib/orders';
import { handler as wrap, HttpError, json } from '../../lib/response';
import { nextOrderStatus } from '../../lib/state';
import { roundTonnes } from '../../validators';

/** Cancel before a transporter claims it; the tonnes go back on the listing. */
export const handler = wrap(async (event) => {
  const c = caller(event);
  const o = await getOrder(pathParam(event, 'id'));
  const by = c.roles.includes('admin') ? 'admin' : c.userId === o.buyerId ? 'buyer' : c.userId === o.farmerId ? 'farmer' : null;
  if (!by) throw new HttpError(403, 'Not your order');
  const to = nextOrderStatus(o.status, 'cancel', by);
  if (!to) throw new HttpError(409, `Cannot cancel an order that is ${o.status}`);
  const ts = now();
  const listing = await getListing(o.listingId);
  // Re-open a sold-out listing in the same transaction; closed ones stay closed.
  const status = listing.status === 'SOLD_OUT' ? 'ACTIVE' : listing.status;
  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE,
            Key: orderKey(o.orderId),
            UpdateExpression: 'SET #s = :to, updatedAt = :u REMOVE GSI3PK, GSI3SK',
            ConditionExpression: '#s = :from',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':to': to, ':from': o.status, ':u': ts },
          },
        },
        {
          Update: {
            TableName: TABLE,
            Key: listingKey(o.listingId),
            UpdateExpression: 'SET tonnesLeft = :left, updatedAt = :u, #s = :ls, GSI2PK = :g',
            ConditionExpression: 'tonnesLeft = :was AND #s = :old',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
              ':left': roundTonnes(listing.tonnesLeft + o.tonnes),
              ':was': listing.tonnesLeft,
              ':old': listing.status,
              ':ls': status,
              ':g': `LSTATUS#${status}`,
              ':u': ts,
            },
          },
        },
      ],
    }),
  );
  return json(200, { ...o, status: to, updatedAt: ts });
});
