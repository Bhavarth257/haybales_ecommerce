// Types shared by frontend and backend. Quantities are tonnes, prices are ₹ per tonne.

export const ROLES = ['farmer', 'buyer', 'transporter', 'admin'] as const;
export type Role = (typeof ROLES)[number];
/** Cognito group name for each role. */
export const ROLE_GROUP: Record<Role, string> = {
  farmer: 'farmers',
  buyer: 'buyers',
  transporter: 'transporters',
  admin: 'admins',
};

export const CROPS = ['paddy', 'wheat', 'sugarcane', 'cotton', 'maize', 'other'] as const;
export type Crop = (typeof CROPS)[number];

export const FORMS = ['baled', 'loose'] as const;
export type StubbleForm = (typeof FORMS)[number];

export const LISTING_STATUSES = ['PENDING_APPROVAL', 'ACTIVE', 'SOLD_OUT', 'CLOSED', 'REJECTED'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const OFFER_STATUSES = ['PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const ORDER_STATUSES = ['AWAITING_TRANSPORT', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'PAID', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Place extends GeoPoint {
  village?: string;
  district: string;
  state: string;
}

export interface User {
  userId: string;
  role: Role;
  name: string;
  email: string;
  phone?: string;
  /** Buyers/transporters: business name. */
  org?: string;
  place?: Place;
  locale: string;
  verified: boolean;
  createdAt: string;
  /** YYYY-MM-DD. Admins check it when a guardian asks for an under-18 account. */
  dob?: string;
  consent?: Consent;
  /** Account deleted by its owner (profile anonymised, login removed). */
  deleted?: boolean;
}

/** Terms and Privacy versions shown at signup (the "Last updated" date on each page). */
export const LEGAL_VERSION = '2026-10-11';
export interface Consent {
  termsVersion: string;
  privacyVersion: string;
  at: string;
}

export interface Listing {
  listingId: string;
  farmerId: string;
  farmerName: string;
  crop: Crop;
  form: StubbleForm;
  tonnes: number;
  tonnesLeft: number;
  pricePerTonne: number;
  harvestDate: string;
  moisturePct?: number;
  notes?: string;
  /** Public listing shows district/state and a rounded point; the exact place is only for order parties. */
  place: Place;
  photos: string[];
  status: ListingStatus;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Filled by search when the caller passes lat/lng. */
  distanceKm?: number;
  transportPerTonne?: number;
}

export interface Offer {
  offerId: string;
  listingId: string;
  farmerId: string;
  buyerId: string;
  buyerName: string;
  tonnes: number;
  pricePerTonne: number;
  /** Set when the farmer counters. */
  counterPrice?: number;
  /** Delivery quote fixed when the offer is made (from the buyer's profile place); the order charges exactly this. */
  distanceKm?: number;
  transportPerTonne?: number;
  status: OfferStatus;
  /** Who must act next. */
  turn: 'farmer' | 'buyer' | null;
  message?: string;
  /** Set once accepted. */
  orderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  orderId: string;
  listingId: string;
  offerId: string;
  farmerId: string;
  buyerId: string;
  transporterId?: string;
  farmerName: string;
  buyerName: string;
  /** Phones are shared only between the parties of an order. */
  farmerPhone?: string;
  buyerPhone?: string;
  transporterName?: string;
  transporterPhone?: string;
  crop: Crop;
  tonnes: number;
  pricePerTonne: number;
  transportPerTonne: number;
  distanceKm: number;
  pickup: Place;
  dropoff: Place;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PriceBand {
  state: string;
  min: number;
  max: number;
  suggested: number;
  nearestBuyerKm: number | null;
  transportPerTonne: number;
  note: string;
}

export interface ImpactStats {
  tonnes: number;
  co2Tonnes: number;
  pm25Kg: number;
  farmersPaid: number;
  rupeesToFarmers: number;
  orders: number;
}

/** Today's date in India as YYYY-MM-DD (en-CA formats dates that way). */
export const todayIST = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

/** Whole years between two YYYY-MM-DD dates. A 29 Feb birth turns a year older on 1 Mar in non-leap years. */
export function ageOn(dob: string, today: string): number {
  const [by, bmd] = [Number(dob.slice(0, 4)), dob.slice(5)];
  const [ty, tmd] = [Number(today.slice(0, 4)), today.slice(5)];
  return ty - by - (tmd < bmd ? 1 : 0);
}
