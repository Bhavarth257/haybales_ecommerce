// Demo data: fictional users, listings and a few completed orders. Idempotent (fixed ids).
// Local:  npm run seed:local   (DynamoDB Local)      AWS: npm run seed   (table from TABLE_NAME, default ParaliSetu)
// Note: seeded users exist only in DynamoDB. On AWS, sign up real Cognito accounts for the demo.
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { Crop, Listing, Order, Place, Role, User } from '@parali/shared';
import { db, TABLE } from '../../backend/src/lib/db';
import { orderKey, listingKey, statsKey, userKey } from '../../backend/src/lib/keys';
import { listingIndexes } from '../../backend/src/lib/listings';
import { CO2_T_PER_T, PM25_KG_PER_T, quote } from '../../backend/src/lib/pricing';

const P = (district: string, state: string, lat: number, lng: number, village?: string): Place => ({ district, state, lat, lng, village });
const PLACES = {
  sangrur: P('Sangrur', 'Punjab', 30.245, 75.844, 'Bhawanigarh'),
  bathinda: P('Bathinda', 'Punjab', 30.211, 74.945, 'Goniana'),
  ludhiana: P('Ludhiana', 'Punjab', 30.901, 75.857, 'Khanna'),
  patiala: P('Patiala', 'Punjab', 30.34, 76.386),
  moga: P('Moga', 'Punjab', 30.817, 75.171, 'Baghapurana'),
  barnala: P('Barnala', 'Punjab', 30.374, 75.548, 'Tapa'),
  mansa: P('Mansa', 'Punjab', 29.998, 75.393, 'Budhlada'),
  amritsar: P('Amritsar', 'Punjab', 31.634, 74.872, 'Ajnala'),
  karnal: P('Karnal', 'Haryana', 29.686, 76.99, 'Gharaunda'),
  kaithal: P('Kaithal', 'Haryana', 29.801, 76.4, 'Pundri'),
  kurukshetra: P('Kurukshetra', 'Haryana', 29.969, 76.878, 'Pehowa'),
  fatehabad: P('Fatehabad', 'Haryana', 29.515, 75.455, 'Tohana'),
  jind: P('Jind', 'Haryana', 29.316, 76.315, 'Narwana'),
  yamunanagar: P('Yamunanagar', 'Haryana', 30.129, 77.267),
  sonipat: P('Sonipat', 'Haryana', 28.993, 77.016),
};

const T0 = Date.parse('2026-10-01T06:00:00Z');
const at = (h: number) => new Date(T0 + h * 3600_000).toISOString();

const user = (userId: string, role: Role, name: string, place: Place, extra: Partial<User> = {}): User => ({
  userId, role, name, place, email: `${userId}@demo.paralisetu.in`, phone: '+919800000000', locale: 'en', verified: true, createdAt: at(0), ...extra,
});

const USERS: User[] = [
  user('admin-1', 'admin', 'Parali Setu Admin', PLACES.patiala),
  user('farmer-1', 'farmer', 'Gurpreet Singh', PLACES.sangrur, { locale: 'pa' }),
  user('farmer-2', 'farmer', 'Harjit Kaur', PLACES.bathinda, { locale: 'pa' }),
  user('farmer-3', 'farmer', 'Rajesh Kumar', PLACES.karnal, { locale: 'hi' }),
  user('farmer-4', 'farmer', 'Sunita Devi', PLACES.kaithal, { locale: 'hi' }),
  user('farmer-5', 'farmer', 'Baldev Singh', PLACES.moga, { locale: 'pa' }),
  user('farmer-6', 'farmer', 'Naveen Malik', PLACES.jind, { locale: 'hi', verified: false }),
  user('buyer-1', 'buyer', 'Amandeep Gill', PLACES.patiala, { org: 'Malwa Biomass Power (demo)' }),
  user('buyer-2', 'buyer', 'Rohit Sharma', PLACES.yamunanagar, { org: 'Yamuna Paper Board (demo)' }),
  user('buyer-3', 'buyer', 'Kavita Rana', PLACES.sonipat, { org: 'Green Spore Mushrooms (demo)' }),
  user('transporter-1', 'transporter', 'Jaswinder Singh', PLACES.sangrur, { org: 'Doaba Haulage (demo)' }),
  user('transporter-2', 'transporter', 'Sandeep Yadav', PLACES.kurukshetra, { org: 'Kisan Trolley Seva (demo)' }),
];
const byId = Object.fromEntries(USERS.map((u) => [u.userId, u]));

let n = 0;
const listing = (farmerId: string, place: Place, crop: Crop, tonnes: number, price: number, status: Listing['status'] = 'ACTIVE', tonnesLeft = tonnes): Listing => {
  n++;
  return {
    listingId: `demo-listing-${String(n).padStart(2, '0')}`,
    farmerId,
    farmerName: byId[farmerId].name,
    crop,
    form: n % 3 ? 'baled' : 'loose',
    tonnes,
    tonnesLeft,
    pricePerTonne: price,
    harvestDate: '2026-10',
    moisturePct: 12 + (n % 6),
    notes: n % 2 ? 'Square bales, stored dry. Tractor access from the main road.' : 'Kheton mein pada hai, jaldi uthana hai. Field is next to the canal road.',
    place,
    photos: [],
    status,
    approvedAt: status === 'PENDING_APPROVAL' ? undefined : at(n * 5 + 1),
    createdAt: at(n * 5),
    updatedAt: at(n * 5),
  };
};

const LISTINGS: Listing[] = [
  listing('farmer-1', PLACES.sangrur, 'paddy', 25, 1800),
  listing('farmer-1', PLACES.barnala, 'paddy', 40, 1700),
  listing('farmer-2', PLACES.bathinda, 'paddy', 60, 1600),
  listing('farmer-2', PLACES.mansa, 'cotton', 15, 1200),
  listing('farmer-3', PLACES.karnal, 'paddy', 35, 1900),
  listing('farmer-3', PLACES.kurukshetra, 'paddy', 20, 2000),
  listing('farmer-4', PLACES.kaithal, 'paddy', 50, 1750),
  listing('farmer-4', PLACES.fatehabad, 'wheat', 18, 1500),
  listing('farmer-5', PLACES.moga, 'paddy', 45, 1650),
  listing('farmer-5', PLACES.ludhiana, 'paddy', 30, 2100),
  listing('farmer-5', PLACES.amritsar, 'paddy', 22, 1550),
  listing('farmer-1', PLACES.patiala, 'paddy', 28, 2050),
  listing('farmer-3', PLACES.yamunanagar, 'sugarcane', 12, 1300),
  listing('farmer-4', PLACES.jind, 'paddy', 26, 1700),
  listing('farmer-2', PLACES.bathinda, 'paddy', 32, 1500, 'PENDING_APPROVAL'),
  listing('farmer-6', PLACES.jind, 'paddy', 20, 1650, 'PENDING_APPROVAL'),
  // Sold-out listings backing the completed orders below.
  listing('farmer-1', PLACES.sangrur, 'paddy', 40, 1750, 'SOLD_OUT', 0),
  listing('farmer-3', PLACES.karnal, 'paddy', 30, 1850, 'SOLD_OUT', 0),
  listing('farmer-4', PLACES.kaithal, 'paddy', 25, 1700, 'SOLD_OUT', 0),
];

const order = (i: number, l: Listing, buyerId: string, transporterId: string): Order => {
  const b = byId[buyerId], t = byId[transporterId], f = byId[l.farmerId];
  const q = quote(b.place!, l.place);
  return {
    orderId: `demo-order-${i}`, listingId: l.listingId, offerId: `demo-offer-${i}`,
    farmerId: l.farmerId, buyerId, transporterId,
    farmerName: f.name, buyerName: b.org!, farmerPhone: f.phone, buyerPhone: b.phone, transporterName: t.org, transporterPhone: t.phone,
    crop: l.crop, tonnes: l.tonnes, pricePerTonne: l.pricePerTonne, ...q,
    pickup: l.place, dropoff: b.place!, status: 'PAID', createdAt: l.createdAt, updatedAt: at(200 + i),
  };
};
const sold = LISTINGS.filter((l) => l.status === 'SOLD_OUT');
const ORDERS: Order[] = [order(1, sold[0], 'buyer-1', 'transporter-1'), order(2, sold[1], 'buyer-2', 'transporter-2'), order(3, sold[2], 'buyer-2', 'transporter-2')];

// Impact totals derived from the seeded orders, so the landing page numbers are consistent.
const tonnes = ORDERS.reduce((s, o) => s + o.tonnes, 0);
const STATS = {
  ...statsKey,
  tonnes,
  co2Tonnes: tonnes * CO2_T_PER_T,
  pm25Kg: tonnes * PM25_KG_PER_T,
  orders: ORDERS.length,
  rupeesToFarmers: ORDERS.reduce((s, o) => s + o.tonnes * o.pricePerTonne, 0),
  farmerIds: new Set(ORDERS.map((o) => o.farmerId)),
};

const items = [
  ...USERS.map((u) => ({ ...userKey(u.userId), entity: 'USER', GSI1PK: `ROLE#${u.role}`, GSI1SK: u.createdAt, ...u })),
  ...LISTINGS.map((l) => ({ ...listingKey(l.listingId), ...listingIndexes(l), ...l })),
  ...ORDERS.map((o) => ({
    ...orderKey(o.orderId), entity: 'ORDER',
    GSI1PK: `BUYER#${o.buyerId}`, GSI1SK: `ORDER#${o.createdAt}`,
    GSI2PK: `FARMER#${o.farmerId}`, GSI2SK: `ORDER#${o.createdAt}`,
    GSI3PK: `TRANSPORTER#${o.transporterId}`, GSI3SK: o.updatedAt,
    ...o,
  })),
  STATS,
];

(async () => {
  for (let i = 0; i < items.length; i += 25)
    await db.send(new BatchWriteCommand({ RequestItems: { [TABLE]: items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })) } }));
  console.log(`Seeded ${USERS.length} users, ${LISTINGS.length} listings, ${ORDERS.length} orders into ${TABLE}. Impact: ${tonnes} t.`);
})();
