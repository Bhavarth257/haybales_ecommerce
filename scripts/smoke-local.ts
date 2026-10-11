// End-to-end check against the local dev API with cookie auth (npm run dev:db, dev:api, seed:local).
// Signs up fresh users each run; one is promoted with `make-admin --local`.
// Each actor sends its own x-forwarded-for, so the 5/min auth limit is per actor, not shared by the whole run.
import { execFileSync } from 'child_process';

const API = process.env.API ?? 'http://localhost:4000';
const RUN = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const NET = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
let failed = 0;
let ipN = 1;

interface Actor { ip: string; jar: Map<string, string>; email: string; id?: string }
const actor = (name: string): Actor => ({ ip: `${NET}.${ipN++}`, jar: new Map(), email: `${name}-${RUN}@example.test` });
const ANON = actor('anon');

async function call(who: Actor | null, method: string, path: string, body?: unknown, opts: { csrf?: boolean; ip?: string } = {}) {
  const a = who ?? ANON;
  const r = await fetch(API + path, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': opts.ip ?? a.ip,
      ...(opts.csrf === false ? {} : { 'x-requested-with': 'parali' }),
      ...(a.jar.size ? { cookie: [...a.jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const c of r.headers.getSetCookie()) {
    const [pair, ...attrs] = c.split(';');
    const i = pair.indexOf('=');
    const [k, v] = [pair.slice(0, i), pair.slice(i + 1)];
    if (attrs.some((x) => x.trim() === 'Max-Age=0')) a.jar.delete(k);
    else a.jar.set(k, v);
  }
  return { status: r.status, data: (await r.json().catch(() => null)) as any, cookies: r.headers.getSetCookie() };
}
function check(name: string, ok: boolean, extra: unknown = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`, ok ? '' : JSON.stringify(extra));
}
const PW = 'Kheti2026pass';
const ADULT = { dob: '1990-05-01', adult: true, consent: true };
/** Today in India minus `years`, as YYYY-MM-DD. */
const yearsAgo = (years: number) => {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return `${Number(d.slice(0, 4)) - years}${d.slice(4)}`;
};

async function join(a: Actor, role: string, name: string) {
  const s = await call(a, 'POST', '/auth/signup', { email: a.email, password: PW, name, role, ...ADULT });
  if (s.status !== 200) check(`signup ${name}`, false, s.data);
}
async function login(a: Actor, path = '/auth/login') {
  const r = await call(a, 'POST', path, { email: a.email, password: PW });
  a.id = (await call(a, 'GET', '/me')).data?.userId;
  return r;
}

(async () => {
  // --- Public ---------------------------------------------------------------------------------
  const before = (await call(null, 'GET', '/impact')).data;
  check('impact is public', before?.tonnes === 95, before);
  const search = await call(null, 'GET', '/listings?state=Punjab&lat=30.34&lng=76.386&radiusKm=80');
  check('public search by distance', search.status === 200 && search.data.items.length > 0 && search.data.items.every((l: any) => l.distanceKm <= 80), search.data);
  check('public listing hides village', search.data.items.every((l: any) => !l.place.village));
  const band = await call(null, 'GET', '/price-band?state=Punjab&lat=30.245&lng=75.844');
  check('price band', band.status === 200 && band.data.min < band.data.max, band.data);

  // --- Accounts -------------------------------------------------------------------------------
  const farmer = actor('farmer'), farmer2 = actor('farmer2'), buyer = actor('buyer'), buyer2 = actor('buyer2');
  const tr = actor('transporter'), tr2 = actor('transporter2'), admin = actor('admin');

  const noCsrf = await call(farmer, 'POST', '/auth/signup', { email: farmer.email, password: PW, name: 'Gurpreet', role: 'farmer', ...ADULT }, { csrf: false });
  check('signup without x-requested-with -> 403', noCsrf.status === 403, noCsrf);
  const asAdmin = await call(admin, 'POST', '/auth/signup', { email: admin.email, password: PW, name: 'Sneaky', role: 'admin', ...ADULT });
  check('signup cannot pick admin role', asAdmin.status === 400, asAdmin.data);

  const signup = await call(farmer, 'POST', '/auth/signup', { email: farmer.email, password: PW, name: 'Gurpreet Singh', role: 'farmer', ...ADULT });
  check('signup (local: next=login)', signup.status === 200 && signup.data.next === 'login', signup.data);
  const again = await call(farmer2, 'POST', '/auth/signup', { email: farmer.email, password: 'Other2026pass', name: 'X', role: 'buyer', ...ADULT });
  check('signup with a taken email answers the same', again.status === 200 && again.data.next === 'login', again.data);
  // --- Age gate + consent (DPDP: under 18 is a child) -----------------------------------------
  const kid = actor('kid');
  const under = await call(kid, 'POST', '/auth/signup', { email: kid.email, password: PW, name: 'Kid', role: 'farmer', ...ADULT, dob: yearsAgo(17) });
  check('under-18 signup rejected with guardian route', under.status === 400 && /parent or guardian/.test(under.data?.error), under.data);
  const noTick = await call(kid, 'POST', '/auth/signup', { email: kid.email, password: PW, name: 'Kid', role: 'farmer', dob: '1990-05-01', adult: true });
  check('signup without consent tick rejected', noTick.status === 400, noTick.data);
  const eighteen = actor('eighteen');
  const ok18 = await call(eighteen, 'POST', '/auth/signup', { email: eighteen.email, password: PW, name: 'Just Eighteen', role: 'buyer', ...ADULT, dob: yearsAgo(18) });
  check('18 today: signup accepted', ok18.status === 200, ok18.data);
  check('under-18 kept no account', (await call(kid, 'POST', '/auth/login', { email: kid.email, password: PW })).status === 401);

  await join(farmer2, 'farmer', 'Naveen Malik');
  await join(buyer, 'buyer', 'Amandeep Gill');
  await join(buyer2, 'buyer', 'Rohit Sharma');
  await join(tr, 'transporter', 'Jaswinder Singh');
  await join(tr2, 'transporter', 'Sandeep Yadav');
  await join(admin, 'buyer', 'Parali Setu Admin');
  execFileSync('npx', ['tsx', 'scripts/make-admin.ts', '--local', admin.email], {
    env: { ...process.env, DYNAMO_ENDPOINT: process.env.DYNAMO_ENDPOINT ?? 'http://localhost:8765', AWS_REGION: 'ap-south-1', AWS_ACCESS_KEY_ID: 'local', AWS_SECRET_ACCESS_KEY: 'local' },
    stdio: 'ignore',
  });

  const fl = await login(farmer);
  check('login sets httpOnly Secure SameSite=Strict cookies', fl.status === 200 && fl.cookies.some((c) => /^__Host-ps_at=.+HttpOnly; Secure; SameSite=Strict/.test(c)) && farmer.jar.has('__Host-ps_rt'), fl.cookies);
  check('GET /me with cookie', !!farmer.id);
  const fme = (await call(farmer, 'GET', '/me')).data;
  check('consent + dob saved on profile', fme?.dob === ADULT.dob && fme?.consent?.termsVersion === '2026-10-11' && fme.consent.privacyVersion === '2026-10-11' && !!fme.consent.at, fme);
  for (const a of [farmer2, buyer, buyer2, tr, tr2]) await login(a);

  const wrongPw = await call(actor('probe'), 'POST', '/auth/login', { email: farmer.email, password: 'Wrong2026pass' });
  const noUser = await call(actor('probe'), 'POST', '/auth/login', { email: `nobody-${RUN}@example.test`, password: PW });
  check('wrong password -> generic 401', wrongPw.status === 401 && noUser.status === 401 && wrongPw.data.error === noUser.data.error, [wrongPw.data, noUser.data]);

  const adminViaUserDoor = await call(admin, 'POST', '/auth/login', { email: admin.email, password: PW });
  check('admin rejected on /auth/login with the same 401', adminViaUserDoor.status === 401 && adminViaUserDoor.data.error === wrongPw.data.error && !admin.jar.has('__Host-ps_at'), adminViaUserDoor.data);
  const farmerViaAdminDoor = await call(actor('probe'), 'POST', '/auth/admin/login', { email: farmer2.email, password: PW });
  check('non-admin rejected on /auth/admin/login', farmerViaAdminDoor.status === 401, farmerViaAdminDoor.data);
  const al = await login(admin, '/auth/admin/login');
  check('admin logs in at the admin door (local: no MFA)', al.status === 200 && !!admin.id, al.data);

  // --- Verification gate ----------------------------------------------------------------------
  const draft = {
    crop: 'paddy', form: 'baled', tonnes: 25, pricePerTonne: 1800, harvestDate: '2026-10',
    notes: 'Bales ready, road access hai', place: { lat: 30.245, lng: 75.844, village: 'Bhawanigarh', district: 'Sangrur', state: 'Punjab' },
  };
  check('unverified farmer blocked', (await call(farmer, 'POST', '/listings', draft)).status === 403);
  check('non-admin cannot verify users', (await call(farmer, 'PATCH', `/admin/users/${farmer.id}`, { verified: true })).status === 403);
  for (const a of [farmer, buyer, buyer2, tr, tr2]) {
    const v = await call(admin, 'PATCH', `/admin/users/${a.id}`, { verified: true });
    if (v.status !== 200) check(`admin verifies ${a.email.split('-')[0]}`, false, v.data);
  }
  check('admin verified the users', (await call(farmer, 'GET', '/me')).data?.verified === true);
  const place = (district: string, state: string, lat: number, lng: number) => ({ place: { district, state, lat, lng } });
  for (const [a, p] of [
    [buyer, { ...place('Patiala', 'Punjab', 30.34, 76.386), org: 'Malwa Biomass Power (test)' }],
    [buyer2, { ...place('Sonipat', 'Haryana', 28.993, 77.016), org: 'Yamuna Paper Board (test)' }],
    [tr, place('Sangrur', 'Punjab', 30.245, 75.844)],
    [tr2, place('Kurukshetra', 'Haryana', 29.969, 76.878)],
  ] as const) {
    const r = await call(a, 'PUT', '/me', p);
    if (r.status !== 200) check(`profile location for ${a.email.split('-')[0]}`, false, r.data);
  }

  // --- Listing -> offer -> order -> delivery -------------------------------------------------
  const noHeader = await call(farmer, 'POST', '/listings', draft, { csrf: false });
  check('write with cookie but no x-requested-with -> 403', noHeader.status === 403, noHeader.data);
  const created = await call(farmer, 'POST', '/listings', draft);
  check('farmer creates listing (pending)', created.status === 201 && created.data.status === 'PENDING_APPROVAL', created.data);
  const id = created.data.listingId;

  check('buyer cannot create listing', (await call(buyer, 'POST', '/listings', {})).status === 403);
  check('pending listing not public', (await call(null, 'GET', `/listings/${id}`)).status === 404);
  check('farmer cannot self-activate pending', (await call(farmer, 'PUT', `/listings/${id}`, { status: 'ACTIVE' })).status === 409);
  check('farmer cannot close-then-reopen pending', (await call(farmer, 'DELETE', `/listings/${id}`)).status === 409);
  check('non-admin cannot approve', (await call(farmer, 'PATCH', `/admin/listings/${id}`, { decision: 'approve' })).status === 403);
  const approved = await call(admin, 'PATCH', `/admin/listings/${id}`, { decision: 'approve' });
  check('admin approves', approved.data?.status === 'ACTIVE', approved.data);

  const offer = await call(buyer, 'POST', `/listings/${id}/offers`, { tonnes: 20, pricePerTonne: 1600, message: 'thoda kam karo' });
  check('buyer makes offer', offer.status === 201, offer.data);
  const oid = offer.data.offerId;
  check('farmer cannot offer on own listing', (await call(farmer, 'POST', `/listings/${id}/offers`, { tonnes: 1, pricePerTonne: 1000 })).status === 403);
  check('buyer cannot accept own pending offer', (await call(buyer, 'PATCH', `/listings/${id}/offers/${oid}`, { action: 'accept' })).status === 409);
  check('other farmer cannot see offers', (await call(farmer2, 'GET', `/listings/${id}/offers`)).status === 403);
  const counter = await call(farmer, 'PATCH', `/listings/${id}/offers/${oid}`, { action: 'counter', counterPrice: 1700 });
  check('farmer counters', counter.data?.status === 'COUNTERED' && counter.data.turn === 'buyer', counter.data);
  const accepted = await call(buyer, 'PATCH', `/listings/${id}/offers/${oid}`, { action: 'accept' });
  check('buyer accepts counter -> order', accepted.status === 200 && accepted.data.order.pricePerTonne === 1700, accepted.data);
  const orderId = accepted.data.order.orderId;
  check('tonnes decremented', (await call(null, 'GET', `/listings/${id}`)).data.tonnesLeft === 5);

  const jobs = await call(tr, 'GET', '/jobs');
  const job = jobs.data.items.find((j: any) => j.orderId === orderId);
  check('job visible to transporter, without phones/village', !!job && !job.farmerPhone && !job.pickup.village, job);
  check('buyer cannot see job board', (await call(buyer, 'GET', '/jobs')).status === 403);
  check('transporter claims', (await call(tr, 'POST', `/jobs/${orderId}/claim`)).data?.status === 'ASSIGNED');
  check('second claim conflicts', (await call(tr2, 'POST', `/jobs/${orderId}/claim`)).status === 409);
  check('other transporter cannot update', (await call(tr2, 'PATCH', `/jobs/${orderId}/status`, { action: 'pickup' })).status === 403);
  check('cannot deliver before pickup', (await call(tr, 'PATCH', `/jobs/${orderId}/status`, { action: 'deliver' })).status === 409);
  check('cancel blocked after claim', (await call(buyer, 'POST', `/orders/${orderId}/cancel`)).status === 409);
  check('pickup', (await call(tr, 'PATCH', `/jobs/${orderId}/status`, { action: 'pickup' })).data?.status === 'PICKED_UP');
  check('deliver', (await call(tr, 'PATCH', `/jobs/${orderId}/status`, { action: 'deliver' })).data?.status === 'DELIVERED');
  check('buyer pays (mock)', (await call(buyer, 'POST', `/orders/${orderId}/pay`)).data?.status === 'PAID');
  const full = await call(buyer, 'GET', `/orders/${orderId}`);
  check('buyer sees exact pickup after accept', !!full.data.pickup.village, full.data);
  check('stranger cannot read order', (await call(buyer2, 'GET', `/orders/${orderId}`)).status === 403);
  const after = (await call(null, 'GET', '/impact')).data;
  check('impact went up by 20 t', after.tonnes === before.tonnes + 20 && after.rupeesToFarmers === before.rupeesToFarmers + 34000, after);

  // Cancel path restores tonnes and re-opens a sold-out listing.
  const o2 = await call(buyer2, 'POST', `/listings/${id}/offers`, { tonnes: 5, pricePerTonne: 1800 });
  const acc2 = await call(farmer, 'PATCH', `/listings/${id}/offers/${o2.data.offerId}`, { action: 'accept' });
  check('listing sold out', (await call(farmer, 'GET', '/me/listings')).data.items.find((l: any) => l.listingId === id)?.status === 'SOLD_OUT');
  check('buyer cancels before pickup', (await call(buyer2, 'POST', `/orders/${acc2.data.order.orderId}/cancel`)).data?.status === 'CANCELLED');
  const reopened = await call(null, 'GET', `/listings/${id}`);
  check('listing re-opened with tonnes back', reopened.data.status === 'ACTIVE' && reopened.data.tonnesLeft === 5, reopened.data);
  // --- Delete my account (DPDP right to erasure) ------------------------------------------------
  const leaver = actor('leaver');
  await join(leaver, 'buyer', 'Leaving Buyer');
  await login(leaver);
  await call(admin, 'PATCH', `/admin/users/${leaver.id}`, { verified: true });
  await call(leaver, 'PUT', '/me', place('Patiala', 'Punjab', 30.34, 76.386));
  const lo = await call(leaver, 'POST', `/listings/${id}/offers`, { tonnes: 1, pricePerTonne: 1800 });
  const lacc = await call(farmer, 'PATCH', `/listings/${id}/offers/${lo.data?.offerId}`, { action: 'accept' });
  check('delete needs typed DELETE', (await call(leaver, 'POST', '/me/delete', { confirm: 'delete' })).status === 400);
  check('delete needs x-requested-with', (await call(leaver, 'POST', '/me/delete', { confirm: 'DELETE' }, { csrf: false })).status === 403);
  const blocked = await call(leaver, 'POST', '/me/delete', { confirm: 'DELETE' });
  check('delete refused while an order is in progress', blocked.status === 409 && /in progress/.test(blocked.data?.error), blocked.data);
  await call(leaver, 'POST', `/orders/${lacc.data?.order?.orderId}/cancel`);
  const pend = await call(leaver, 'POST', `/listings/${id}/offers`, { tonnes: 2, pricePerTonne: 1750 });
  const del = await call(leaver, 'POST', '/me/delete', { confirm: 'DELETE' });
  check('delete my account clears cookies', del.status === 200 && leaver.jar.size === 0, del.data);
  check('deleted user cannot log in', (await call(leaver, 'POST', '/auth/login', { email: leaver.email, password: PW })).status === 401);
  const offersNow = (await call(farmer, 'GET', `/listings/${id}/offers`)).data?.items ?? [];
  check('their open offer was withdrawn', offersNow.find((o: any) => o.offerId === pend.data?.offerId)?.status === 'WITHDRAWN', offersNow);
  const gone = (await call(admin, 'GET', '/admin/users?role=buyer')).data?.items?.find((u: any) => u.userId === leaver.id);
  check('profile anonymised', gone?.name === 'Deleted user' && gone.deleted === true && !gone.email && !gone.phone && !gone.place, gone);

  check('bad body rejected by zod', (await call(farmer, 'POST', '/listings', { tonnes: -5 })).status === 400);

  // --- Session lifecycle ----------------------------------------------------------------------
  check('no cookie -> 401', (await call(null, 'GET', '/me')).status === 401);
  const forged = actor('forged');
  forged.jar.set('__Host-ps_at', farmer.jar.get('__Host-ps_at')!.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')));
  check('tampered __Host-ps_at -> 401', (await call(forged, 'GET', '/me')).status === 401);
  buyer.jar.delete('__Host-ps_at');
  check('expired/missing __Host-ps_at -> 401', (await call(buyer, 'GET', '/me')).status === 401);
  const ref = await call(buyer, 'POST', '/auth/refresh');
  check('refresh issues a new __Host-ps_at from __Host-ps_rt', ref.status === 200 && buyer.jar.has('__Host-ps_at') && (await call(buyer, 'GET', '/me')).status === 200, ref.data);
  const out = await call(farmer, 'POST', '/auth/logout');
  check('logout clears all cookies', out.status === 200 && farmer.jar.size === 0, out.cookies);
  check('after logout -> 401', (await call(farmer, 'GET', '/me')).status === 401);
  check('refresh after logout -> 401', (await call(farmer, 'POST', '/auth/refresh')).status === 401);

  // --- Auth rate limit: 5/min per IP and per email --------------------------------------------
  const ipProbe = actor('ratelimit-ip');
  const perIp: number[] = [];
  for (let i = 0; i < 6; i++) perIp.push((await call(ipProbe, 'POST', '/auth/login', { email: `x${i}-${RUN}@example.test`, password: 'Wrong2026pass' })).status);
  check('6th auth attempt from one IP -> 429', perIp.slice(0, 5).every((s) => s === 401) && perIp[5] === 429, perIp);
  const perEmail: number[] = [];
  for (let i = 0; i < 6; i++) perEmail.push((await call(actor('ratelimit-email'), 'POST', '/auth/login', { email: `Target-${RUN}@example.test`, password: 'Wrong2026pass' })).status);
  check('6th attempt on one email from new IPs -> 429', perEmail.slice(0, 5).every((s) => s === 401) && perEmail[5] === 429, perEmail);

  console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})();
