import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Role } from '@parali/shared';
import { requireRole } from '../../lib/auth';
import { clean, db, TABLE } from '../../lib/db';
import { handler as wrap, json } from '../../lib/response';

const INDEX: Record<string, [string, string, string]> = {
  buyer: ['GSI1', 'BUYER', 'GSI1'],
  farmer: ['GSI2', 'FARMER', 'GSI2'],
  transporter: ['GSI3', 'TRANSPORTER', 'GSI3'],
};

/** ?as=farmer|buyer|transporter; defaults to the caller's first role. */
export const handler = wrap(async (event) => {
  const c = requireRole(event, 'farmer', 'buyer', 'transporter');
  const wanted = event.queryStringParameters?.as as Role | undefined;
  const as = wanted && c.roles.includes(wanted) && INDEX[wanted] ? wanted : c.roles.find((r) => INDEX[r])!;
  const [index, prefix, attr] = INDEX[as];
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: index,
      KeyConditionExpression: as === 'transporter' ? `${attr}PK = :p` : `${attr}PK = :p AND begins_with(${attr}SK, :s)`,
      ExpressionAttributeValues: { ':p': `${prefix}#${c.userId}`, ...(as === 'transporter' ? {} : { ':s': 'ORDER#' }) },
      ScanIndexForward: false,
    }),
  );
  return json(200, { items: Items.map((i) => clean(i)) });
});
