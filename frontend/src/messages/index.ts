// Message catalogues: messages/<locale>/<namespace>.json, flattened as "namespace.key".
// To add a namespace: create the JSON for every locale and list it here.
import admin from './en/admin.json';
import ai from './en/ai.json';
import auth from './en/auth.json';
import buyer from './en/buyer.json';
import common from './en/common.json';
import farmer from './en/farmer.json';
import help from './en/help.json';
import landing from './en/landing.json';
import order from './en/order.json';
import place from './en/place.json';
import profile from './en/profile.json';
import transporter from './en/transporter.json';

export const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'bgc', label: 'हरियाणवी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ml', label: 'മലയാളം' },
] as const;
export type Locale = (typeof LOCALES)[number]['code'];

export type Messages = Record<string, unknown>;
export const EN: Messages = { admin, ai, auth, buyer, common, farmer, help, landing, order, place, profile, transporter };

/** Other locales load on demand; add `hi: () => import('./hi')` etc. Missing keys fall back to English. */
const LOADERS: Partial<Record<Locale, () => Promise<{ default: Messages }>>> = {
  hi: () => import('./hi'),
  pa: () => import('./pa'),
  bgc: () => import('./bgc'),
  ta: () => import('./ta'),
  te: () => import('./te'),
  ml: () => import('./ml'),
};

export async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === 'en') return EN;
  return (await LOADERS[locale]?.())?.default ?? {};
}
