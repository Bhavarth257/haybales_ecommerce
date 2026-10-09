// Key builders for the single table. See docs/ARCHITECTURE.md §3.
export const userKey = (id: string) => ({ PK: `USER#${id}`, SK: 'PROFILE' });
export const listingKey = (id: string) => ({ PK: `LISTING#${id}`, SK: 'META' });
export const offerKey = (listingId: string, offerId: string) => ({ PK: `LISTING#${listingId}`, SK: `OFFER#${offerId}` });
export const orderKey = (id: string) => ({ PK: `ORDER#${id}`, SK: 'META' });
export const statsKey = { PK: 'STATS', SK: 'GLOBAL' };
