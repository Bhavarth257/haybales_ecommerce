import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { GeoPoint } from '@parali/shared';
import { db, TABLE } from '../../lib/db';
import { priceBand } from '../../lib/pricing';
import { handler as wrap, HttpError, json } from '../../lib/response';

export const handler = wrap(async (event) => {
  const q = event.queryStringParameters ?? {};
  if (!q.state) throw new HttpError(400, 'state is required');
  const lat = Number(q.lat), lng = Number(q.lng);
  const at = q.lat && q.lng && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  // TODO: reads all buyer profiles each call; cache or precompute once there are many buyers.
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :p',
      ExpressionAttributeValues: { ':p': 'ROLE#buyer' },
      ProjectionExpression: 'place',
    }),
  );
  const buyers = Items.map((i) => i.place as GeoPoint | undefined).filter((p): p is GeoPoint => !!p);
  return json(200, priceBand(q.state, at, buyers));
});
