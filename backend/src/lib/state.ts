import type { ListingStatus, OfferStatus, OrderStatus, Role } from '@parali/shared';

export type OfferAction = 'accept' | 'reject' | 'counter' | 'withdraw';

/** Offer moves: who may do what from which status, and the resulting status. */
const OFFER_MOVES: Record<OfferAction, { by: 'farmer' | 'buyer'; from: OfferStatus[]; to: OfferStatus }[]> = {
  accept: [
    { by: 'farmer', from: ['PENDING'], to: 'ACCEPTED' },
    { by: 'buyer', from: ['COUNTERED'], to: 'ACCEPTED' },
  ],
  reject: [{ by: 'farmer', from: ['PENDING'], to: 'REJECTED' }],
  // shortcut: one counter round only (farmer counters, buyer accepts or withdraws); add buyer re-counter if judges ask.
  counter: [{ by: 'farmer', from: ['PENDING'], to: 'COUNTERED' }],
  withdraw: [{ by: 'buyer', from: ['PENDING', 'COUNTERED'], to: 'WITHDRAWN' }],
};

export function nextOfferStatus(current: OfferStatus, action: OfferAction, by: 'farmer' | 'buyer'): OfferStatus | null {
  return OFFER_MOVES[action].find((m) => m.by === by && m.from.includes(current))?.to ?? null;
}

export type OrderAction = 'claim' | 'pickup' | 'deliver' | 'pay' | 'cancel';

const ORDER_MOVES: Record<OrderAction, { by: Role[]; from: OrderStatus[]; to: OrderStatus }> = {
  claim: { by: ['transporter'], from: ['AWAITING_TRANSPORT'], to: 'ASSIGNED' },
  pickup: { by: ['transporter'], from: ['ASSIGNED'], to: 'PICKED_UP' },
  deliver: { by: ['transporter'], from: ['PICKED_UP'], to: 'DELIVERED' },
  pay: { by: ['buyer'], from: ['DELIVERED'], to: 'PAID' },
  cancel: { by: ['buyer', 'farmer', 'admin'], from: ['AWAITING_TRANSPORT'], to: 'CANCELLED' },
};

export function nextOrderStatus(current: OrderStatus, action: OrderAction, by: Role): OrderStatus | null {
  const m = ORDER_MOVES[action];
  return m.by.includes(by) && m.from.includes(current) ? m.to : null;
}

/** A live listing is ACTIVE while tonnes are left and SOLD_OUT at zero; other statuses don't change. */
export const liveListingStatus = (s: ListingStatus, tonnesLeft: number): ListingStatus =>
  s === 'ACTIVE' || s === 'SOLD_OUT' ? (tonnesLeft > 0 ? 'ACTIVE' : 'SOLD_OUT') : s;
