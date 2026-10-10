import { describe, expect, it } from 'vitest';
import { liveListingStatus, nextOfferStatus, nextOrderStatus } from '../src/lib/state';
import { agreedPrice, orderMoney, priceBand, quote, transportPerTonne } from '../src/lib/pricing';
import { fuzz, haversineKm } from '../src/lib/geo';
import { LIMITS, tierOf } from '../src/lib/rateLimit';
import { listingSchema, offerSchema, roundTonnes } from '../src/validators';

describe('offer state machine', () => {
  it('lets the farmer accept, reject or counter a pending offer', () => {
    expect(nextOfferStatus('PENDING', 'accept', 'farmer')).toBe('ACCEPTED');
    expect(nextOfferStatus('PENDING', 'reject', 'farmer')).toBe('REJECTED');
    expect(nextOfferStatus('PENDING', 'counter', 'farmer')).toBe('COUNTERED');
  });
  it('lets the buyer accept a counter or withdraw, but not accept their own pending offer', () => {
    expect(nextOfferStatus('COUNTERED', 'accept', 'buyer')).toBe('ACCEPTED');
    expect(nextOfferStatus('COUNTERED', 'withdraw', 'buyer')).toBe('WITHDRAWN');
    expect(nextOfferStatus('PENDING', 'accept', 'buyer')).toBeNull();
  });
  it('blocks moves out of final states', () => {
    for (const s of ['ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const)
      for (const a of ['accept', 'reject', 'counter', 'withdraw'] as const) {
        expect(nextOfferStatus(s, a, 'farmer')).toBeNull();
        expect(nextOfferStatus(s, a, 'buyer')).toBeNull();
      }
  });
});

describe('order state machine', () => {
  it('runs the happy path in order', () => {
    expect(nextOrderStatus('AWAITING_TRANSPORT', 'claim', 'transporter')).toBe('ASSIGNED');
    expect(nextOrderStatus('ASSIGNED', 'pickup', 'transporter')).toBe('PICKED_UP');
    expect(nextOrderStatus('PICKED_UP', 'deliver', 'transporter')).toBe('DELIVERED');
    expect(nextOrderStatus('DELIVERED', 'pay', 'buyer')).toBe('PAID');
  });
  it('rejects skipped steps and wrong roles', () => {
    expect(nextOrderStatus('ASSIGNED', 'deliver', 'transporter')).toBeNull();
    expect(nextOrderStatus('PICKED_UP', 'pay', 'buyer')).toBeNull();
    expect(nextOrderStatus('ASSIGNED', 'pickup', 'buyer')).toBeNull();
    expect(nextOrderStatus('ASSIGNED', 'cancel', 'buyer')).toBeNull();
    expect(nextOrderStatus('AWAITING_TRANSPORT', 'cancel', 'farmer')).toBe('CANCELLED');
  });
});

describe('pricing', () => {
  const sangrur = { lat: 30.245, lng: 75.844 };
  const patiala = { lat: 30.34, lng: 76.386 };
  it('measures distance roughly right (Sangrur–Patiala ≈ 53 km straight)', () => {
    expect(haversineKm(sangrur, patiala)).toBeGreaterThan(48);
    expect(haversineKm(sangrur, patiala)).toBeLessThan(58);
  });
  it('gives the full state band when a buyer is close', () => {
    const b = priceBand('Punjab', sangrur, [{ lat: 30.25, lng: 75.85 }]);
    expect([b.min, b.max]).toEqual([1500, 2300]);
  });
  it('lowers the band for poorly connected farms, within limits', () => {
    const near = priceBand('Punjab', sangrur, [patiala]);
    const far = priceBand('Punjab', sangrur, [{ lat: 28.6, lng: 77.2 }]);
    expect(far.max).toBeLessThan(near.max);
    expect(far.min).toBeGreaterThanOrEqual(1000);
    expect(far.max).toBeGreaterThan(far.min);
  });
  it('falls back to the state range with no buyers', () => {
    expect(priceBand('Kerala', null, []).nearestBuyerKm).toBeNull();
  });
  it('charges more transport for longer hauls', () => {
    expect(transportPerTonne(80)).toBeGreaterThan(transportPerTonne(10));
  });
});

describe('listing validation', () => {
  const ok = {
    crop: 'paddy', form: 'baled', tonnes: 25, pricePerTonne: 1800, harvestDate: '2026-10',
    place: { lat: 30.245, lng: 75.844, district: 'Sangrur', state: 'Punjab' },
  };
  it('accepts a valid listing', () => expect(listingSchema.safeParse(ok).success).toBe(true));
  it('rejects negative tonnes, places outside India and foreign photo keys', () => {
    expect(listingSchema.safeParse({ ...ok, tonnes: -1 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...ok, place: { ...ok.place, lat: 51.5, lng: -0.1 } }).success).toBe(false);
    expect(listingSchema.safeParse({ ...ok, photos: ['../../etc/passwd'] }).success).toBe(false);
  });
});

describe('tonnes arithmetic', () => {
  it('rounds tonnes to 2 decimals so leftovers stay exact (5.3 - 2.1 leaves 3.2)', () => {
    expect(roundTonnes(5.3 - 2.1)).toBe(3.2);
    expect(offerSchema.parse({ tonnes: 3.333, pricePerTonne: 1800 }).tonnes).toBe(3.33);
  });
  it('rejects dust-sized offers', () => {
    expect(offerSchema.safeParse({ tonnes: 1e-9, pricePerTonne: 1800 }).success).toBe(false);
  });
});

describe('listing status after tonnes change', () => {
  it('re-opens a sold-out listing that got more tonnes, and sells out an empty live one', () => {
    expect(liveListingStatus('SOLD_OUT', 5)).toBe('ACTIVE');
    expect(liveListingStatus('ACTIVE', 0)).toBe('SOLD_OUT');
    expect(liveListingStatus('CLOSED', 5)).toBe('CLOSED');
    expect(liveListingStatus('PENDING_APPROVAL', 0)).toBe('PENDING_APPROVAL');
  });
});

describe('money flow for all three parties', () => {
  const sangrur = { lat: 30.245, lng: 75.844 }; // smoke-test farm
  const patiala = { lat: 30.34, lng: 76.386 }; // buyer-1 (Malwa Biomass)

  it('farmer gets the agreed price: own offer price unless the buyer accepted a counter', () => {
    expect(agreedPrice({ status: 'PENDING', pricePerTonne: 1600 })).toBe(1600);
    expect(agreedPrice({ status: 'COUNTERED', pricePerTonne: 1600, counterPrice: 1700 })).toBe(1700);
  });

  it('splits the order: farmer = price x tonnes, transporter = transport x tonnes, buyer pays exactly the sum', () => {
    const q = quote(patiala, sangrur);
    expect(q.distanceKm).toBe(69);
    expect(q.transportPerTonne).toBe(150 + 6 * 69);
    const m = orderMoney({ tonnes: 20, pricePerTonne: 1700, transportPerTonne: q.transportPerTonne });
    expect(m).toEqual({ farmer: 34000, transporter: 11280, buyer: 45280 });
    // Buyer's total is exactly the delivered price per tonne they were shown, times tonnes: no hidden extra.
    expect(m.buyer).toBe(20 * (1700 + q.transportPerTonne));
  });

  it('quotes the same transport whether the farm point is exact or already fuzzed (what search shows)', () => {
    const shown = quote(patiala, fuzz(sangrur));
    expect(quote(patiala, sangrur)).toEqual(shown);
  });

  it('always pays the transporter something, even next door', () => {
    expect(quote(sangrur, sangrur).transportPerTonne).toBeGreaterThan(0);
  });

  it('shares distance cost: a far farm earns less per tonne, but the buyer still pays more delivered', () => {
    const near = priceBand('Punjab', sangrur, [patiala]);
    const far = priceBand('Punjab', { lat: 31.634, lng: 74.872 }, [patiala]); // Amritsar
    expect(far.suggested).toBeLessThan(near.suggested);
    expect(far.suggested + far.transportPerTonne).toBeGreaterThan(near.suggested + near.transportPerTonne);
  });
});

describe('rate limit tiers', () => {
  it('puts AI routes in the strict tier and splits the rest by method', () => {
    expect(tierOf('POST', '/ai/chat')).toBe('ai');
    expect(tierOf('POST', '/tts')).toBe('ai');
    expect(tierOf('GET', '/listings')).toBe('read');
    expect(tierOf('PATCH', '/jobs/x/status')).toBe('write');
    expect(LIMITS.ai[0]).toBeLessThan(LIMITS.write[0]);
  });
});
