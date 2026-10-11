import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { requireRole } from '../../lib/auth';
import { clean, db, TABLE } from '../../lib/db';
import { handler as wrap, json } from '../../lib/response';

export const handler = wrap(async (event) => {
  requireRole(event, 'admin');
  // TODO: Scan with a filter; add an orders-by-date index past a few thousand items.
  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const r = await db.send(
      new ScanCommand({ TableName: TABLE, FilterExpression: 'entity = :e', ExpressionAttributeValues: { ':e': 'ORDER' }, ExclusiveStartKey }),
    );
    items.push(...(r.Items ?? []));
    ExclusiveStartKey = r.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return json(200, { items: items.map((i) => clean(i)) });
});
