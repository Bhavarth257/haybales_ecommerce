// Local API: runs the real Lambda handlers against DynamoDB Local. Not deployed.
// Run with AUTH_MODE=local: cookie sessions use locally signed tokens (docs/AUTH.md, "Local mode").
import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { createServer } from 'http';
import { TABLE } from '../src/lib/db';
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

// Only the local web app, with credentials (cookies).
const CORS = {
  'access-control-allow-origin': 'http://localhost:3000',
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'content-type, x-requested-with',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  vary: 'Origin',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end();
  const route = compiled.find((r) => r.method === req.method && r.re.test(url.pathname));
  if (!route) return res.writeHead(404, CORS).end(JSON.stringify({ error: 'No route' }));

  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  // Shaped like an API Gateway HTTP API (v2) event: lowercased headers, cookies as a separate array.
  const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v]));
  const event = {
    routeKey: `${route.method} ${route.path}`,
    rawPath: url.pathname,
    headers,
    cookies: req.headers.cookie?.split(';').map((c) => c.trim()).filter(Boolean),
    queryStringParameters: url.search ? Object.fromEntries(url.searchParams) : undefined,
    pathParameters: route.re.exec(url.pathname)?.groups,
    body: chunks.length ? Buffer.concat(chunks).toString() : undefined,
    isBase64Encoded: false,
    requestContext: { http: { method: req.method, sourceIp: req.socket.remoteAddress } },
  };
  const mod = await import(`../src/handlers/${route.fn}`);
  const out = await mod.handler(event);
  res.writeHead(out.statusCode, { ...CORS, ...out.headers, ...(out.cookies ? { 'set-cookie': out.cookies } : {}) }).end(out.body);
  console.log(req.method, url.pathname, out.statusCode);
}).listen(PORT, async () => {
  await ensureTable();
  console.log(`Parali Setu dev API on http://localhost:${PORT} (table ${TABLE} @ ${process.env.DYNAMO_ENDPOINT})`);
});
