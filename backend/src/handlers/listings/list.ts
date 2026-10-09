import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Listing } from '@parali/shared';
import { clean, db, TABLE } from '../../lib/db';
import { toPublic } from '../../lib/listings';
import { quote } from '../../lib/pricing';
import { handler as wrap, json } from '../../lib/response';

export const handler = wrap(async (event) => {
  const q = event.queryStringParameters ?? {};
  const lat = Number(q.lat), lng = Number(q.lng);
  const here = Number.isFinite(lat) && Number.isFinite(lng) && q.lat && q.lng ? { lat, lng } : null;
  const radiusKm = Number(q.radiusKm) || Infinity;
  const maxPrice = Number(q.maxPrice) || Infinity;

  // shortcut: one query of all ACTIVE listings (paged in a loop) + filter in Lambda; fine under a few thousand listings.
  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const r = await db.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI2',
        KeyConditionExpression: q.state ? 'GSI2PK = :s AND begins_with(GSI2SK, :st)' : 'GSI2PK = :s',
        ExpressionAttributeValues: { ':s': 'LSTATUS#ACTIVE', ...(q.state ? { ':st': `${q.state}#` } : {}) },
        ExclusiveStartKey,
      }),
    );
    items.push(...(r.Items ?? []));
    ExclusiveStartKey = r.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  const listings = items
    .map((i) => clean<Listing>(i)!)
    .filter((l) => (!q.crop || l.crop === q.crop) && l.pricePerTonne <= maxPrice)
    .map((l) => {
      if (!here) return toPublic(l);
      // Fuzzed point: exact distances would let a caller trilaterate the farm.
      return { ...toPublic(l), ...quote(here, l.place) };
    })
    .filter((l) => (l.distanceKm ?? 0) <= radiusKm)
    .sort((a, b) => (here ? a.distanceKm! - b.distanceKm! : b.createdAt.localeCompare(a.createdAt)));
  return json(200, { items: listings });
});
