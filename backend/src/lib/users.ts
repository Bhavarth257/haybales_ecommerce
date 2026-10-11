import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { User } from '@parali/shared';
import { clean, db, TABLE } from './db';
import { userKey } from './keys';
import { HttpError } from './response';

export async function getUser(id: string): Promise<User | undefined> {
  const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: userKey(id) }));
  return clean<User>(Item);
}

/** Profile must exist and be admin-verified before listing, offering or hauling. */
export async function requireVerified(id: string): Promise<User> {
  const u = await getUser(id);
  if (!u || u.deleted) throw new HttpError(403, 'Profile not found');
  if (!u.verified) throw new HttpError(403, 'Your account is waiting for verification by the Parali Setu team');
  return u;
}
