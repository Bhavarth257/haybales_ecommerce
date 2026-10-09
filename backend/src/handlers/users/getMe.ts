import { caller } from '../../lib/auth';
import { handler as wrap, HttpError, json } from '../../lib/response';
import { getUser } from '../../lib/users';

export const handler = wrap(async (event) => {
  const me = await getUser(caller(event).userId);
  if (!me) throw new HttpError(404, 'Profile not found');
  return json(200, me);
});
