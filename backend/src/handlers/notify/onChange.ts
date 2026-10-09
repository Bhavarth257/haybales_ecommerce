import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { Offer, Order } from '@parali/shared';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { sendEmail } from '../../lib/email';
import { getUser } from '../../lib/users';

const APP = process.env.APP_URL ?? '';
const emailOf = async (id?: string) => (id ? (await getUser(id))?.email : undefined);

/** DynamoDB stream → emails for new offers, offer decisions and order status changes. */
export const handler = async (event: DynamoDBStreamEvent) => {
  for (const r of event.Records) {
    const img = r.dynamodb?.NewImage && unmarshall(r.dynamodb.NewImage as Record<string, AttributeValue>);
    const old = r.dynamodb?.OldImage && unmarshall(r.dynamodb.OldImage as Record<string, AttributeValue>);
    if (!img || img.status === old?.status) continue;

    if (img.entity === 'OFFER') {
      const o = img as Offer;
      if (o.status === 'WITHDRAWN') {
        // The buyer did this; tell the farmer, not the buyer.
        const to = await emailOf(o.farmerId);
        if (to) await sendEmail(to, `Offer withdrawn: ${o.tonnes} tonnes`, `${o.buyerName} withdrew their offer.\n${APP}/farmer/`);
      } else if (o.status === 'PENDING') {
        const to = await emailOf(o.farmerId);
        if (to) await sendEmail(to, `New offer: ${o.tonnes} tonnes at ₹${o.pricePerTonne}/tonne`, `${o.buyerName} made an offer on your stubble.\n${APP}/farmer/`);
      } else {
        const to = await emailOf(o.buyerId);
        const price = o.status === 'COUNTERED' ? ` Counter price: ₹${o.counterPrice}/tonne.` : '';
        if (to) await sendEmail(to, `Your offer was ${o.status.toLowerCase()}`, `Offer for ${o.tonnes} tonnes is now ${o.status}.${price}\n${APP}/buyer/`);
      }
    }

    if (img.entity === 'ORDER') {
      const o = img as Order;
      const to = (await Promise.all([emailOf(o.farmerId), emailOf(o.buyerId)])).filter(Boolean) as string[];
      if (to.length)
        await sendEmail(
          to,
          `Order ${o.orderId.slice(0, 8)}: ${o.status.replace('_', ' ').toLowerCase()}`,
          `${o.tonnes} tonnes of ${o.crop} stubble, ${o.pickup.district} → ${o.dropoff.district}. Status: ${o.status}.\n${APP}/order/?id=${o.orderId}`,
        );
    }
  }
};
