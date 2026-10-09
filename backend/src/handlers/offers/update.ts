import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Offer, Order } from '@parali/shared';
import { randomUUID } from 'crypto';
import { pathParam, requireRole } from '../../lib/auth';
import { clean, db, now, TABLE } from '../../lib/db';
import { listingKey, offerKey, orderKey } from '../../lib/keys';
import { getListing } from '../../lib/listings';
import { agreedPrice, quote } from '../../lib/pricing';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { nextOfferStatus } from '../../lib/state';
import { getUser } from '../../lib/users';
import { offerActionSchema, roundTonnes } from '../../validators';

export const handler = wrap(async (event) => {
  const c = requireRole(event, 'farmer', 'buyer');
  const listingId = pathParam(event, 'id');
  const offerId = pathParam(event, 'offerId');
  const body = parseBody(event, offerActionSchema);

  const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: offerKey(listingId, offerId) }));
  const offer = clean<Offer>(Item);
  if (!offer) throw new HttpError(404, 'Offer not found');
  const by = c.userId === offer.farmerId ? 'farmer' : c.userId === offer.buyerId ? 'buyer' : null;
  if (!by) throw new HttpError(403, 'Not your offer');

  const to = nextOfferStatus(offer.status, body.action, by);
  if (!to) throw new HttpError(409, `Cannot ${body.action} an offer that is ${offer.status}`);
  const ts = now();
  const guard = { ConditionExpression: '#s = :from', ExpressionAttributeNames: { '#s': 'status' } };

  if (to !== 'ACCEPTED') {
    const counter = body.action === 'counter' ? body.counterPrice : undefined;
    const { Attributes } = await db.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: offerKey(listingId, offerId),
        UpdateExpression: `SET #s = :to, turn = :turn, updatedAt = :u${counter ? ', counterPrice = :cp' : ''}`,
        ...guard,
        ExpressionAttributeValues: {
          ':to': to,
          ':from': offer.status,
          ':turn': to === 'COUNTERED' ? 'buyer' : null,
          ':u': ts,
          ...(counter ? { ':cp': counter } : {}),
        },
        ReturnValues: 'ALL_NEW',
      }),
    );
    return json(200, clean(Attributes));
  }

  // Accept: in one transaction, mark the offer accepted, take the tonnes off the listing and create the order.
  const [listing, farmer, buyer] = await Promise.all([getListing(listingId), getUser(offer.farmerId), getUser(offer.buyerId)]);
  if (listing.status !== 'ACTIVE') throw new HttpError(409, 'Listing is no longer active');
  if (offer.tonnes > listing.tonnesLeft) throw new HttpError(409, `Only ${listing.tonnesLeft} tonnes left`);
  if (!buyer?.place) throw new HttpError(409, 'Buyer has no delivery location');

  // Use the quote snapshotted on the offer, so a later profile move can't change the buyer's total.
  const { distanceKm, transportPerTonne } =
    offer.transportPerTonne != null && offer.distanceKm != null ? { distanceKm: offer.distanceKm, transportPerTonne: offer.transportPerTonne } : quote(buyer.place, listing.place);
  const order: Order = {
    orderId: randomUUID(),
    listingId,
    offerId,
    farmerId: offer.farmerId,
    buyerId: offer.buyerId,
    farmerName: listing.farmerName,
    buyerName: offer.buyerName,
    farmerPhone: farmer?.phone,
    buyerPhone: buyer.phone,
    crop: listing.crop,
    tonnes: offer.tonnes,
    pricePerTonne: agreedPrice(offer),
    transportPerTonne,
    distanceKm,
    pickup: listing.place,
    dropoff: buyer.place,
    status: 'AWAITING_TRANSPORT',
    createdAt: ts,
    updatedAt: ts,
  };
  const left = roundTonnes(listing.tonnesLeft - offer.tonnes);

  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE,
            Key: offerKey(listingId, offerId),
            UpdateExpression: 'SET #s = :to, turn = :null, updatedAt = :u, orderId = :o',
            ...guard,
            ExpressionAttributeValues: { ':to': to, ':from': offer.status, ':null': null, ':u': ts, ':o': order.orderId },
          },
        },
        {
          Update: {
            TableName: TABLE,
            Key: listingKey(listingId),
            UpdateExpression: 'SET tonnesLeft = :left, updatedAt = :u, #s = :ls, GSI2PK = :g',
            ConditionExpression: 'tonnesLeft = :was AND #s = :active',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
              ':left': left,
              ':was': listing.tonnesLeft,
              ':u': ts,
              ':active': 'ACTIVE',
              ':ls': left > 0 ? 'ACTIVE' : 'SOLD_OUT',
              ':g': `LSTATUS#${left > 0 ? 'ACTIVE' : 'SOLD_OUT'}`,
            },
          },
        },
        {
          Put: {
            TableName: TABLE,
            Item: {
              ...orderKey(order.orderId),
              entity: 'ORDER',
              GSI1PK: `BUYER#${order.buyerId}`,
              GSI1SK: `ORDER#${ts}`,
              GSI2PK: `FARMER#${order.farmerId}`,
              GSI2SK: `ORDER#${ts}`,
              GSI3PK: 'JOB#OPEN',
              GSI3SK: ts,
              ...order,
            },
          },
        },
      ],
    }),
  );
  return json(200, { offer: { ...offer, status: to, turn: null, orderId: order.orderId }, order });
});
