import { caller } from '../../lib/auth';
import { handler as wrap, HttpError, json } from '../../lib/response';
import { getUser } from '../../lib/users';

export const handler = wrap(async (event) => {
  const me = await getUser(caller(event).userId);
  if (!me) throw new HttpError(404, 'Profile not found');
  // A deleted account's access token stays valid until it expires (up to an hour); treat it as signed out.
  if (me.deleted) throw new HttpError(401, 'Not signed in');
  return json(200, me);
});
