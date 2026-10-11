// Key builders for the single table. See docs/ARCHITECTURE.md §3.
import { idSchema } from '../validators';
import { HttpError } from './response';

/** Every id that reaches a key passes here: no '#' or other characters that could address another item shape. */
const id = (v: string) => {
  if (!idSchema.safeParse(v).success) throw new HttpError(400, 'Invalid id');
  return v;
};

export const userKey = (u: string) => ({ PK: `USER#${id(u)}`, SK: 'PROFILE' });
export const listingKey = (l: string) => ({ PK: `LISTING#${id(l)}`, SK: 'META' });
export const offerKey = (listingId: string, offerId: string) => ({ PK: `LISTING#${id(listingId)}`, SK: `OFFER#${id(offerId)}` });
export const orderKey = (o: string) => ({ PK: `ORDER#${id(o)}`, SK: 'META' });
export const statsKey = { PK: 'STATS', SK: 'GLOBAL' };
