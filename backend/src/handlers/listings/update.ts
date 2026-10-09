import { PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Listing } from '@parali/shared';
import { pathParam, requireRole } from '../../lib/auth';
import { db, now, TABLE } from '../../lib/db';
import { listingKey } from '../../lib/keys';
import { getListing, listingIndexes } from '../../lib/listings';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { liveListingStatus } from '../../lib/state';
import { listingUpdateSchema, roundTonnes } from '../../validators';

export const handler = wrap(async (event) => {
  const { userId } = requireRole(event, 'farmer');
  const old = await getListing(pathParam(event, 'id'));
  if (old.farmerId !== userId) throw new HttpError(403, 'Not your listing');
  const patch = parseBody(event, listingUpdateSchema);
  if (patch.photos?.some((p) => !p.startsWith(`listings/${userId}/`))) throw new HttpError(400, 'Photo does not belong to you');
  if (patch.status && !['ACTIVE', 'CLOSED'].includes(old.status)) throw new HttpError(409, `Cannot change status while ${old.status}`);
  // Re-opening is only for listings an admin already approved.
  if (patch.status === 'ACTIVE' && !old.approvedAt) throw new HttpError(409, 'Listing is waiting for approval');
  // shortcut: edits to an approved listing are not re-reviewed; add re-approval if abuse shows up.

  const sold = roundTonnes(old.tonnes - old.tonnesLeft);
  const tonnes = patch.tonnes ?? old.tonnes;
  if (tonnes < sold) throw new HttpError(400, `Already sold ${sold} tonnes; total cannot go below that`);
  const tonnesLeft = roundTonnes(tonnes - sold);
  // More tonnes re-open a sold-out listing; zero left (or re-opening an empty one) means sold out.
  const status = liveListingStatus(patch.status ?? old.status, tonnesLeft);
  const next: Listing = { ...old, ...patch, tonnes, tonnesLeft, status, updatedAt: now() };

  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: { ...listingKey(old.listingId), ...listingIndexes(next), ...next },
      // Fails if an offer was accepted (tonnesLeft changed) since we read it.
      ConditionExpression: 'updatedAt = :u AND tonnesLeft = :t',
      ExpressionAttributeValues: { ':u': old.updatedAt, ':t': old.tonnesLeft },
    }),
  );
  return json(200, next);
});
