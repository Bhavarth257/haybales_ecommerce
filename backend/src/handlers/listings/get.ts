import { pathParam } from '../../lib/auth';
import { getListing, toPublic } from '../../lib/listings';
import { quote } from '../../lib/pricing';
import { handler as wrap, HttpError, json } from '../../lib/response';

// Public route: only live or sold-out listings are visible; owners use /me/listings.
// Optional ?lat&lng adds distance + transport so clients show the same delivered price as search.
export const handler = wrap(async (event) => {
  const l = await getListing(pathParam(event, 'id'));
  if (l.status !== 'ACTIVE' && l.status !== 'SOLD_OUT') throw new HttpError(404, 'Listing not found');
  const q = event.queryStringParameters ?? {};
  const lat = Number(q.lat), lng = Number(q.lng);
  if (!q.lat || !q.lng || !Number.isFinite(lat) || !Number.isFinite(lng)) return json(200, toPublic(l));
  return json(200, { ...toPublic(l), ...quote({ lat, lng }, l.place) });
});
