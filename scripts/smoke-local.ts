// End-to-end check of the demo flow against the local dev API (npm run dev:db, dev:api, seed:local).
const API = process.env.API ?? 'http://localhost:4000';
let failed = 0;
async function call(user: string | null, method: string, path: string, body?: unknown) {
  const r = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(user ? { authorization: `Bearer dev:${user}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => null) as any };
}
function check(name: string, ok: boolean, extra: unknown = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`, ok ? '' : JSON.stringify(extra));
}

(async () => {
  const before = (await call(null, 'GET', '/impact')).data;
  check('impact is public', before?.tonnes === 95, before);

  const search = await call(null, 'GET', '/listings?state=Punjab&lat=30.34&lng=76.386&radiusKm=80');
  check('public search by distance', search.status === 200 && search.data.items.length > 0 && search.data.items.every((l: any) => l.distanceKm <= 80), search.data);
  check('public listing hides village', search.data.items.every((l: any) => !l.place.village));

  const band = await call(null, 'GET', '/price-band?state=Punjab&lat=30.245&lng=75.844');
  check('price band', band.status === 200 && band.data.min < band.data.max, band.data);

  const created = await call('farmer-1', 'POST', '/listings', {
    crop: 'paddy', form: 'baled', tonnes: 25, pricePerTonne: 1800, harvestDate: '2026-10',
    notes: 'Bales ready, road access hai', place: { lat: 30.245, lng: 75.844, village: 'Bhawanigarh', district: 'Sangrur', state: 'Punjab' },
  });
  check('farmer creates listing (pending)', created.status === 201 && created.data.status === 'PENDING_APPROVAL', created.data);
  const id = created.data.listingId;

  check('unverified farmer blocked', (await call('farmer-6', 'POST', '/listings', { ...created.data })).status >= 400);
  check('buyer cannot create listing', (await call('buyer-1', 'POST', '/listings', {})).status === 403);
  check('pending listing not public', (await call(null, 'GET', `/listings/${id}`)).status === 404);
  check('farmer cannot self-activate pending', (await call('farmer-1', 'PUT', `/listings/${id}`, { status: 'ACTIVE' })).status === 409);
  check('farmer cannot close-then-reopen pending', (await call('farmer-1', 'DELETE', `/listings/${id}`)).status === 409);
  check('non-admin cannot approve', (await call('farmer-1', 'PATCH', `/admin/listings/${id}`, { decision: 'approve' })).status === 403);
  const approved = await call('admin-1', 'PATCH', `/admin/listings/${id}`, { decision: 'approve' });
  check('admin approves', approved.data?.status === 'ACTIVE', approved.data);

  const offer = await call('buyer-1', 'POST', `/listings/${id}/offers`, { tonnes: 20, pricePerTonne: 1600, message: 'thoda kam karo' });
  check('buyer makes offer', offer.status === 201, offer.data);
  const oid = offer.data.offerId;
  check('farmer cannot offer on own listing', (await call('farmer-1', 'POST', `/listings/${id}/offers`, { tonnes: 1, pricePerTonne: 1000 })).status === 403);
  check('buyer cannot accept own pending offer', (await call('buyer-1', 'PATCH', `/listings/${id}/offers/${oid}`, { action: 'accept' })).status === 409);
  check('other farmer cannot see offers', (await call('farmer-2', 'GET', `/listings/${id}/offers`)).status === 403);
  const counter = await call('farmer-1', 'PATCH', `/listings/${id}/offers/${oid}`, { action: 'counter', counterPrice: 1700 });
  check('farmer counters', counter.data?.status === 'COUNTERED' && counter.data.turn === 'buyer', counter.data);
  const accepted = await call('buyer-1', 'PATCH', `/listings/${id}/offers/${oid}`, { action: 'accept' });
  check('buyer accepts counter -> order', accepted.status === 200 && accepted.data.order.pricePerTonne === 1700, accepted.data);
  const orderId = accepted.data.order.orderId;

  const listing = await call(null, 'GET', `/listings/${id}`);
  check('tonnes decremented', listing.data.tonnesLeft === 5, listing.data);

  const jobs = await call('transporter-1', 'GET', '/jobs');
  const job = jobs.data.items.find((j: any) => j.orderId === orderId);
  check('job visible to transporter, without phones/village', !!job && !job.farmerPhone && !job.pickup.village, job);
  check('buyer cannot see job board', (await call('buyer-1', 'GET', '/jobs')).status === 403);

  check('transporter claims', (await call('transporter-1', 'POST', `/jobs/${orderId}/claim`)).data?.status === 'ASSIGNED');
  check('second claim conflicts', (await call('transporter-2', 'POST', `/jobs/${orderId}/claim`)).status === 409);
  check('other transporter cannot update', (await call('transporter-2', 'PATCH', `/jobs/${orderId}/status`, { action: 'pickup' })).status === 403);
  check('cannot deliver before pickup', (await call('transporter-1', 'PATCH', `/jobs/${orderId}/status`, { action: 'deliver' })).status === 409);
  check('cancel blocked after claim', (await call('buyer-1', 'POST', `/orders/${orderId}/cancel`)).status === 409);
  check('pickup', (await call('transporter-1', 'PATCH', `/jobs/${orderId}/status`, { action: 'pickup' })).data?.status === 'PICKED_UP');
  check('deliver', (await call('transporter-1', 'PATCH', `/jobs/${orderId}/status`, { action: 'deliver' })).data?.status === 'DELIVERED');
  check('buyer pays (mock)', (await call('buyer-1', 'POST', `/orders/${orderId}/pay`)).data?.status === 'PAID');

  const full = await call('buyer-1', 'GET', `/orders/${orderId}`);
  check('buyer sees exact pickup + farmer phone after accept', !!full.data.pickup.village && !!full.data.farmerPhone, full.data);
  check('stranger cannot read order', (await call('buyer-2', 'GET', `/orders/${orderId}`)).status === 403);

  const after = (await call(null, 'GET', '/impact')).data;
  check('impact went up by 20 t', after.tonnes === before.tonnes + 20 && after.rupeesToFarmers === before.rupeesToFarmers + 34000, after);

  // Cancel path restores tonnes and re-opens a sold-out listing.
  const o2 = await call('buyer-2', 'POST', `/listings/${id}/offers`, { tonnes: 5, pricePerTonne: 1800 });
  const acc2 = await call('farmer-1', 'PATCH', `/listings/${id}/offers/${o2.data.offerId}`, { action: 'accept' });
  check('listing sold out', (await call('farmer-1', 'GET', '/me/listings')).data.items.find((l: any) => l.listingId === id)?.status === 'SOLD_OUT');
  check('buyer cancels before pickup', (await call('buyer-2', 'POST', `/orders/${acc2.data.order.orderId}/cancel`)).data?.status === 'CANCELLED');
  const reopened = await call(null, 'GET', `/listings/${id}`);
  check('listing re-opened with tonnes back', reopened.data.status === 'ACTIVE' && reopened.data.tonnesLeft === 5, reopened.data);

  check('bad body rejected by zod', (await call('farmer-1', 'POST', '/listings', { tonnes: -5 })).status === 400);
  check('no token -> 401', (await call(null, 'GET', '/me')).status === 401);

  console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})();
