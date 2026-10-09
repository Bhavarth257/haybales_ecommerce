import type { GeoPoint } from '@parali/shared';

/** Great-circle distance in km. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Road distance is longer than straight-line; 1.3 is a common detour factor. */
export const roadKm = (a: GeoPoint, b: GeoPoint) => Math.round(haversineKm(a, b) * 1.3);

/** Round to ~1 km so public listings don't reveal the exact farm. */
export const fuzz = (p: GeoPoint): GeoPoint => ({ lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 });
