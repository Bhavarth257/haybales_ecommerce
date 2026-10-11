import { AdminDeleteUserCommand, RevokeTokenCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DeleteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Listing, Offer, Order } from '@parali/shared';
import { caller } from '../../lib/auth';
import { db, now, TABLE } from '../../lib/db';
import { listingKey, offerKey, userKey } from '../../lib/keys';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { authKey, clearAll, CLIENT_ID, cognito, LOCAL, parseCookies, RT } from '../../lib/session';
import { getUser } from '../../lib/users';
import { deleteSchema } from '../../validators/auth';

const DONE = ['DELIVERED', 'PAID', 'CANCELLED'];

/** Every item on one GSI partition (the caller's own orders, offers and listings). */
async function all(index: string, pk: string) {
  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const r = await db.send(
      new QueryCommand({ TableName: TABLE, IndexName: index, KeyConditionExpression: `${index}PK = :p`, ExpressionAttributeValues: { ':p': pk }, ExclusiveStartKey }),
    );
    items.push(...(r.Items ?? []));
    ExclusiveStartKey = r.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/** Only touch an item whose status is still the one we read, so a race can't reopen or revive anything. */
const setStatus = (Key: Record<string, string>, from: string, to: string, extra: Record<string, unknown> = {}) =>
  db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key,
      UpdateExpression: `SET #s = :to, updatedAt = :u${Object.keys(extra).map((k) => `, ${k} = :${k}`).join('')}`,
      ConditionExpression: '#s = :from',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':to': to, ':from': from, ':u': now(), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [`:${k}`, v])) },
    }),
  ).catch((e) => {
    if (e.name !== 'ConditionalCheckFailedException') throw e;
  });

/** DPDP right to erasure: close open listings and offers, anonymise the profile, remove the login. Completed orders stay. */
export const handler = wrap(async (event) => {
  const { userId } = caller(event);
  parseBody(event, deleteSchema);
  const me = await getUser(userId);
  if (!me || me.deleted) throw new HttpError(404, 'Profile not found');

  // GSI1: BUYER# offers/orders and FARMER# listings. GSI2: FARMER# offers/orders. GSI3: TRANSPORTER# jobs.
  const [g1b, g1f, g2, g3] = await Promise.all([all('GSI1', `BUYER#${userId}`), all('GSI1', `FARMER#${userId}`), all('GSI2', `FARMER#${userId}`), all('GSI3', `TRANSPORTER#${userId}`)]);
  const mine = [...g1b, ...g1f, ...g2, ...g3];
  const open = mine.filter((i) => i.entity === 'ORDER' && !DONE.includes(String(i.status))) as unknown as Order[];
  if (open.length)
    throw new HttpError(
      409,
      `You have ${open.length} order(s) still in progress. Finish or cancel them first, so the other people in the deal are not left waiting. Then delete your account.`,
    );

  // shortcut: an offer accepted between the check above and the closes below still makes an order; a transaction would fix it if that ever happens.
  for (const l of mine.filter((i) => i.entity === 'LISTING') as unknown as Listing[])
    if (['ACTIVE', 'SOLD_OUT', 'PENDING_APPROVAL'].includes(l.status)) await setStatus(listingKey(l.listingId), l.status, 'CLOSED', { GSI2PK: 'LSTATUS#CLOSED' });
  for (const o of mine.filter((i) => i.entity === 'OFFER') as unknown as Offer[])
    if (o.status === 'PENDING' || o.status === 'COUNTERED')
      await setStatus(offerKey(o.listingId, o.offerId), o.status, o.buyerId === userId ? 'WITHDRAWN' : 'REJECTED', { turn: null });

  // Keep role, dates and the consent record (proof of what was agreed); drop everything that identifies the person.
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: userKey(userId),
      UpdateExpression: 'SET #n = :n, deleted = :t, verified = :f, deletedAt = :u REMOVE email, phone, place, org, dob',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':n': 'Deleted user', ':t': true, ':f': false, ':u': now() },
    }),
  );

  const rt = parseCookies(event.cookies)[RT];
  if (LOCAL) {
    await db.send(new DeleteCommand({ TableName: TABLE, Key: authKey(me.email) }));
  } else {
    if (rt) await cognito.send(new RevokeTokenCommand({ ClientId: CLIENT_ID, Token: rt })).catch((e) => console.warn('revoke failed:', e.name));
    const username = String(event.requestContext.authorizer?.jwt?.claims?.username ?? userId);
    await cognito.send(new AdminDeleteUserCommand({ UserPoolId: process.env.USER_POOL_ID, Username: username })).catch((e) => {
      if (e.name !== 'UserNotFoundException') throw e;
    });
  }
  return json(200, { ok: true }, clearAll());
});
