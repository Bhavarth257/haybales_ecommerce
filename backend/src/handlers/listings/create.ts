import { PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Listing } from '@parali/shared';
import { randomUUID } from 'crypto';
import { requireRole } from '../../lib/auth';
import { db, now, TABLE } from '../../lib/db';
import { listingKey } from '../../lib/keys';
import { listingIndexes } from '../../lib/listings';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { requireVerified } from '../../lib/users';
import { listingSchema } from '../../validators';

export const handler = wrap(async (event) => {
  const { userId } = requireRole(event, 'farmer');
  const farmer = await requireVerified(userId);
  const input = parseBody(event, listingSchema);
  if (input.photos.some((p) => !p.startsWith(`listings/${userId}/`))) throw new HttpError(400, 'Photo does not belong to you');
  const ts = now();
  const listing: Listing = {
    ...input,
    listingId: randomUUID(),
    farmerId: userId,
    farmerName: farmer.name,
    tonnesLeft: input.tonnes,
    status: 'PENDING_APPROVAL',
    createdAt: ts,
    updatedAt: ts,
  };
  await db.send(new PutCommand({ TableName: TABLE, Item: { ...listingKey(listing.listingId), ...listingIndexes(listing), ...listing } }));
  return json(201, listing);
});
