import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { ImpactStats } from '@parali/shared';
import { db, TABLE } from '../../lib/db';
import { statsKey } from '../../lib/keys';
import { handler as wrap } from '../../lib/response';

export const handler = wrap(async () => {
  const { Item = {} } = await db.send(new GetCommand({ TableName: TABLE, Key: statsKey }));
  const n = (k: string) => Number(Item[k] ?? 0);
  const stats: ImpactStats = {
    tonnes: n('tonnes'),
    co2Tonnes: Math.round(n('co2Tonnes')),
    pm25Kg: Math.round(n('pm25Kg')),
    farmersPaid: (Item.farmerIds as Set<string> | undefined)?.size ?? 0,
    rupeesToFarmers: n('rupeesToFarmers'),
    orders: n('orders'),
  };
  return { statusCode: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=30' }, body: JSON.stringify(stats) };
});
