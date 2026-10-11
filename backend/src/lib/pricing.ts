import type { GeoPoint, Offer, Order, PriceBand } from '@parali/shared';
import { fuzz, roadKm } from './geo';

// ASSUMPTION (demo values, not market data): ex-farm ₹/tonne ranges for baled paddy straw.
// Replace with mandi/plant rates before real use.
const STATE_BASE: Record<string, [number, number]> = {
  Punjab: [1500, 2300],
  Haryana: [1400, 2200],
  'Uttar Pradesh': [1200, 2000],
};
const DEFAULT_BASE: [number, number] = [1200, 2000];

// ASSUMPTION: tractor-trolley haulage ≈ ₹150/t loading + ₹6 per tonne-km.
export const transportPerTonne = (km: number) => Math.round(150 + 6 * km);

/**
 * Delivery quote from a buyer point to a farm. Always measured to the fuzzed farm point, so the
 * price search shows, the offer snapshot and the order all use the same number.
 */
export function quote(from: GeoPoint, farm: GeoPoint) {
  const distanceKm = roadKm(from, fuzz(farm));
  return { distanceKm, transportPerTonne: transportPerTonne(distanceKm) };
}

/** Stubble price the buyer agreed to: their own offer, or the farmer's counter once the buyer accepts it. */
export const agreedPrice = (o: Pick<Offer, 'status' | 'pricePerTonne' | 'counterPrice'>) =>
  o.status === 'COUNTERED' ? o.counterPrice! : o.pricePerTonne;

/** Who gets what (₹): the farmer gets the stubble price, the transporter the haulage, the buyer pays both. */
export function orderMoney(o: Pick<Order, 'tonnes' | 'pricePerTonne' | 'transportPerTonne'>) {
  const farmer = Math.round(o.tonnes * o.pricePerTonne);
  const transporter = Math.round(o.tonnes * o.transportPerTonne);
  return { farmer, transporter, buyer: farmer + transporter };
}

/**
 * Fair band for a farmer at `at`. Farther from buyers (poor connectivity) => lower ex-farm band,
 * because the buyer's delivered cost rises with distance.
 */
export function priceBand(state: string, at: GeoPoint | null, buyers: GeoPoint[]): PriceBand {
  const [min, max] = Object.hasOwn(STATE_BASE, state) ? STATE_BASE[state] : DEFAULT_BASE; // not `[state] ??`: '__proto__' would 500
  const nearest = at && buyers.length ? Math.min(...buyers.map((b) => roadKm(at, fuzz(b)))) : null;
  // Within 30 km: full band. Beyond: -₹4/t per km, capped at -₹500/t.
  const adj = nearest === null ? 0 : -Math.min(500, Math.max(0, nearest - 30) * 4);
  const lo = Math.max(500, min + adj);
  const hi = Math.max(lo + 100, max + adj);
  return {
    state,
    min: lo,
    max: hi,
    suggested: Math.round((lo + hi) / 2 / 50) * 50,
    nearestBuyerKm: nearest,
    transportPerTonne: transportPerTonne(nearest ?? 30),
    note:
      nearest === null
        ? 'No buyers mapped near you yet; showing the state range.'
        : `Nearest buyer ≈ ${nearest} km by road. Prices drop as distance rises because transport costs more.`,
  };
}

// Sources for the landing-page impact numbers (shown on the page):
// CO2: 1.42 t per tonne burnt, from Jain et al. 2014, Aerosol Air Qual. Res. 14:422 (141.15 Mt CO2 / ~99 Mt residue burnt).
// PM2.5: 8.3 kg per tonne of rice straw, Gadde et al. 2009, Environ. Pollut. 157:1554.
export const CO2_T_PER_T = 1.42;
export const PM25_KG_PER_T = 8.3;
