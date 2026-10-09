import { caller, pathParam } from '../../lib/auth';
import { getOrder } from '../../lib/orders';
import { handler as wrap, HttpError, json } from '../../lib/response';

export const handler = wrap(async (event) => {
  const c = caller(event);
  const o = await getOrder(pathParam(event, 'id'));
  const party = [o.farmerId, o.buyerId, o.transporterId].includes(c.userId) || c.roles.includes('admin');
  if (!party) throw new HttpError(403, 'Not your order');
  return json(200, o);
});
