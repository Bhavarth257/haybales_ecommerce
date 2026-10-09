import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { Listing } from '@parali/shared';
import { clean, db, TABLE } from './db';
import { fuzz } from './geo';
import { listingKey } from './keys';
import { HttpError } from './response';

export async function getListing(id: string): Promise<Listing> {
  const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: listingKey(id) }));
  const l = clean<Listing>(Item);
  if (!l) throw new HttpError(404, 'Listing not found');
  return l;
}

/** Hide village and exact point until an order exists. */
export const toPublic = (l: Listing): Listing => ({
  ...l,
  place: { ...fuzz(l.place), district: l.place.district, state: l.place.state },
});

/** Index attributes for a listing item; recomputed whenever status changes. */
export const listingIndexes = (l: Listing) => ({
  entity: 'LISTING',
  GSI1PK: `FARMER#${l.farmerId}`,
  GSI1SK: `LISTING#${l.createdAt}`,
  GSI2PK: `LSTATUS#${l.status}`,
  GSI2SK: `${l.place.state}#${l.createdAt}`,
});
