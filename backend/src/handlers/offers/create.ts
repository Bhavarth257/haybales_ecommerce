import { PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Offer } from '@parali/shared';
import { randomUUID } from 'crypto';
import { pathParam, requireRole } from '../../lib/auth';
import { db, now, TABLE } from '../../lib/db';
import { offerKey } from '../../lib/keys';
import { getListing } from '../../lib/listings';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { quote } from '../../lib/pricing';
import { requireVerified } from '../../lib/users';
import { offerSchema } from '../../validators';

export const handler = wrap(async (event) => {
  const { userId } = requireRole(event, 'buyer');
  const buyer = await requireVerified(userId);
  const input = parseBody(event, offerSchema);
  const listing = await getListing(pathParam(event, 'id'));
  if (listing.status !== 'ACTIVE') throw new HttpError(409, 'Listing is not open for offers');
  if (listing.farmerId === userId) throw new HttpError(400, 'Cannot offer on your own listing');
  if (input.tonnes > listing.tonnesLeft) throw new HttpError(400, `Only ${listing.tonnesLeft} tonnes left`);
  if (!buyer.place) throw new HttpError(400, 'Add your delivery location in your profile first');

  const ts = now();
  const offer: Offer = {
    ...input,
    offerId: randomUUID(),
    listingId: listing.listingId,
    farmerId: listing.farmerId,
    buyerId: userId,
    buyerName: buyer.org ?? buyer.name,
    // Same quote the listing page showed this buyer; the order will charge exactly this transport.
    ...quote(buyer.place, listing.place),
    status: 'PENDING',
    turn: 'farmer',
    createdAt: ts,
    updatedAt: ts,
  };
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...offerKey(listing.listingId, offer.offerId),
        entity: 'OFFER',
        GSI1PK: `BUYER#${userId}`,
        GSI1SK: `OFFER#${ts}`,
        GSI2PK: `FARMER#${listing.farmerId}`,
        GSI2SK: `OFFER#${ts}`,
        ...offer,
      },
    }),
  );
  return json(201, offer);
});
