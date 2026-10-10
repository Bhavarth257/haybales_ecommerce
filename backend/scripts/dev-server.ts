// Local API: runs the real Lambda handlers against DynamoDB Local. Not deployed.
// Auth is emulated: send `Authorization: Bearer dev:<userId>`; the user's role comes from their profile.
import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ROLE_GROUP, type Role } from '@parali/shared';
import { createServer } from 'http';
import { db, TABLE } from '../src/lib/db';
import { ROUTES } from '../src/routes';

const PORT = Number(process.env.PORT ?? 4000);

async function ensureTable() {
  const gsi = (n: number) => ({
    IndexName: `GSI${n}`,
    KeySchema: [
      { AttributeName: `GSI${n}PK`, KeyType: 'HASH' as const },
      { AttributeName: `GSI${n}SK`, KeyType: 'RANGE' as const },
    ],
    Projection: { ProjectionType: 'ALL' as const },
  });
  await new DynamoDBClient({ endpoint: process.env.DYNAMO_ENDPOINT })
    .send(
      new CreateTableCommand({
        TableName: TABLE,
        BillingMode: 'PAY_PER_REQUEST',
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK', 'GSI3PK', 'GSI3SK'].map((a) => ({
          AttributeName: a,
          AttributeType: 'S' as const,
        })),
        GlobalSecondaryIndexes: [gsi(1), gsi(2), gsi(3)],
      }),
    )
    .catch((e) => {
      if (e.name !== 'ResourceInUseException') throw e;
    });
}

const compiled = ROUTES.map((r) => ({ ...r, re: new RegExp('^' + r.path.replace(/\{(\w+)\}/g, '(?<$1>[^/]+)') + '$') }));

async function claimsFor(auth: string | undefined) {
  const id = auth?.match(/^Bearer dev:(.+)$/)?.[1];
  if (!id) return null;
  const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: { PK: `USER#${id}`, SK: 'PROFILE' } }));
  if (!Item) return null;
  return { sub: id, email: Item.email, 'cognito:groups': `[${ROLE_GROUP[Item.role as Role]}]` };
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end();
  const route = compiled.find((r) => r.method === req.method && r.re.test(url.pathname));
  if (!route) return res.writeHead(404, CORS).end(JSON.stringify({ error: 'No route' }));

  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const claims = await claimsFor(req.headers.authorization);
  if (route.auth && !claims) return res.writeHead(401, CORS).end(JSON.stringify({ message: 'Unauthorized' }));

  const event = {
    rawPath: url.pathname,
    queryStringParameters: url.search ? Object.fromEntries(url.searchParams) : undefined,
    pathParameters: route.re.exec(url.pathname)?.groups,
    body: chunks.length ? Buffer.concat(chunks).toString() : undefined,
    isBase64Encoded: false,
    requestContext: { http: { method: req.method, sourceIp: req.socket.remoteAddress }, authorizer: claims ? { jwt: { claims } } : undefined },
  };
  const mod = await import(`../src/handlers/${route.fn}`);
  const out = await mod.handler(event);
  res.writeHead(out.statusCode, { ...CORS, ...out.headers }).end(out.body);
  console.log(req.method, url.pathname, out.statusCode);
}).listen(PORT, async () => {
  await ensureTable();
  console.log(`Parali Setu dev API on http://localhost:${PORT} (table ${TABLE} @ ${process.env.DYNAMO_ENDPOINT})`);
});
