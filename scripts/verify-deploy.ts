// Post-deploy check of the live stack, through the Amplify /api proxy (docs/AUTH.md).
// Usage (AWS credentials for the account, after scripts/amplify-proxy.sh):
//   npm run verify-deploy -- https://main.<appId>.amplifyapp.com
// Creates a throwaway farmer `verify-<ts>@example.invalid` (no email is sent) and deletes it at the end.
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
  GetUserPoolMfaConfigCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DescribeTableCommand, DescribeTimeToLiveCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { execFileSync } from 'child_process';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db, TABLE } from '../backend/src/lib/db';
import { userKey } from '../backend/src/lib/keys';

const site = (process.argv[2] ?? '').replace(/\/$/, '');
if (!/^https:\/\//.test(site)) throw new Error('Usage: npm run verify-deploy -- https://main.<appId>.amplifyapp.com');
const out = JSON.parse(readFileSync(join(__dirname, '../cdk-outputs.json'), 'utf8'));
const API: string = out.ParaliApi.ApiUrl.replace(/\/$/, '');
const POOL: string = out.ParaliAuth.UserPoolId;
const CLIENT: string = out.ParaliAuth.UserPoolClientId;
const cognito = new CognitoIdentityProviderClient({});
const ddb = new DynamoDBClient({});

const results: { check: string; ok: boolean; detail: string }[] = [];
async function check(name: string, fn: () => Promise<string>) {
  try {
    results.push({ check: name, ok: true, detail: await fn() });
  } catch (e) {
    results.push({ check: name, ok: false, detail: (e as Error).message });
  }
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
const WRITE = { 'content-type': 'application/json', 'x-requested-with': 'parali' };
const get = (url: string, headers: Record<string, string> = {}) => fetch(url, { headers, redirect: 'manual' });
const send = (method: string, url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(url, { method, headers: { ...WRITE, ...headers }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
const isJson = (r: Response) => (r.headers.get('content-type') ?? '').includes('application/json');

(async () => {
  // 1. Stacks (aws CLI: avoids adding the CloudFormation SDK client just for this).
  await check('5 stacks CREATE/UPDATE_COMPLETE', async () => {
    const raw = execFileSync('aws', ['cloudformation', 'describe-stacks', '--region', 'ap-south-1', '--query', 'Stacks[].[StackName,StackStatus]', '--output', 'json']);
    const status = Object.fromEntries(JSON.parse(raw.toString()) as [string, string][]);
    const names = ['ParaliData', 'ParaliAuth', 'ParaliStorage', 'ParaliApi', 'ParaliNotify'];
    const bad = names.filter((n) => !/^(CREATE|UPDATE)_COMPLETE$/.test(status[n] ?? ''));
    assert(!bad.length, bad.map((n) => `${n}=${status[n] ?? 'missing'}`).join(', '));
    return names.map((n) => status[n]).join(', ');
  });

  // 2. Public API, direct and through the proxy.
  await check('direct API GET /impact', async () => {
    const r = await get(`${API}/impact`);
    assert(r.status === 200 && isJson(r), `HTTP ${r.status}`);
    return 'HTTP 200 JSON';
  });
  for (const path of ['/impact', '/listings', '/price-band?state=Punjab'])
    await check(`proxy GET /api${path}`, async () => {
      const r = await get(`${site}/api${path}`);
      assert(r.status === 200 && isJson(r), `HTTP ${r.status} ${r.headers.get('content-type')} (proxy rule missing? run scripts/amplify-proxy.sh)`);
      return 'HTTP 200 JSON';
    });
  await check('proxy keeps API 4xx (no 301/HTML)', async () => {
    const r = await get(`${site}/api/listings/verify-missing-${Date.now()}`);
    assert(r.status === 404 && isJson(r), `HTTP ${r.status} ${r.headers.get('content-type')}`);
    return 'HTTP 404 JSON';
  });

  // 3. Table.
  await check('DynamoDB table + TTL on expiresAt', async () => {
    const { Table } = await ddb.send(new DescribeTableCommand({ TableName: TABLE }));
    assert(Table?.TableStatus === 'ACTIVE', `status ${Table?.TableStatus}`);
    const { TimeToLiveDescription: t } = await ddb.send(new DescribeTimeToLiveCommand({ TableName: TABLE }));
    assert(t?.TimeToLiveStatus === 'ENABLED' && t.AttributeName === 'expiresAt', `TTL ${t?.TimeToLiveStatus} on ${t?.AttributeName}`);
    const counts: Record<string, number> = {};
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const page = await db.send(new ScanCommand({ TableName: TABLE, ProjectionExpression: 'PK', ExclusiveStartKey }));
      for (const i of page.Items ?? []) counts[String(i.PK).split('#')[0]] = (counts[String(i.PK).split('#')[0]] ?? 0) + 1;
      ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return Object.entries(counts).map(([k, n]) => `${k}:${n}`).join(' ') || 'empty';
  });

  // 4. Cognito config.
  await check('Cognito MFA OPTIONAL, TOTP only', async () => {
    const m = await cognito.send(new GetUserPoolMfaConfigCommand({ UserPoolId: POOL }));
    assert(m.MfaConfiguration === 'OPTIONAL', `MfaConfiguration=${m.MfaConfiguration}`);
    assert(m.SoftwareTokenMfaConfiguration?.Enabled, 'TOTP not enabled');
    assert(!m.SmsMfaConfiguration?.SmsConfiguration, 'SMS MFA is configured');
    return 'OPTIONAL + SOFTWARE_TOKEN_MFA';
  });
  await check('Cognito client: password auth, no SRP', async () => {
    const { UserPoolClient: c } = await cognito.send(new DescribeUserPoolClientCommand({ UserPoolId: POOL, ClientId: CLIENT }));
    const f = c?.ExplicitAuthFlows ?? [];
    assert(f.includes('ALLOW_USER_PASSWORD_AUTH') && !f.includes('ALLOW_USER_SRP_AUTH'), f.join(','));
    return f.join(',');
  });

  // 5. Real login through the proxy with a throwaway user.
  const email = `verify-${Date.now()}@example.invalid`;
  const password = `Vv1-${randomBytes(12).toString('base64url')}`;
  let sub = '';
  let jar = '';
  let refresh = '';
  try {
    await check('create test user (Admin APIs)', async () => {
      const { User } = await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: POOL,
          Username: email,
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: 'Deploy check' },
            { Name: 'custom:role', Value: 'farmer' },
          ],
        }),
      );
      sub = User?.Attributes?.find((a) => a.Name === 'sub')?.Value ?? '';
      assert(sub, 'no sub');
      await cognito.send(new AdminSetUserPasswordCommand({ UserPoolId: POOL, Username: email, Password: password, Permanent: true }));
      await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: POOL, Username: email, GroupName: 'farmers' }));
      // PostConfirmation doesn't fire for admin-created users, so write the profile it would have written.
      const createdAt = new Date().toISOString();
      await db.send(
        new PutCommand({
          TableName: TABLE,
          Item: { ...userKey(sub), entity: 'USER', GSI1PK: 'ROLE#farmer', GSI1SK: createdAt, userId: sub, role: 'farmer', name: 'Deploy check', email, locale: 'en', verified: false, createdAt },
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );
      return email;
    });

    await check('farmer gets 401 on /api/auth/admin/login', async () => {
      const r = await send('POST', `${site}/api/auth/admin/login`, { email, password });
      assert(r.status === 401, `HTTP ${r.status}`);
      return 'HTTP 401';
    });

    await check('login via proxy sets HttpOnly/Secure/SameSite cookies', async () => {
      assert(sub, 'no test user');
      const r = await send('POST', `${site}/api/auth/login`, { email, password });
      assert(r.status === 200, `HTTP ${r.status} ${await r.text()}`);
      const cookies = r.headers.getSetCookie();
      assert(cookies.length, 'no Set-Cookie came back through the proxy (cacheConfig must be AMPLIFY_MANAGED)');
      for (const name of ['__Host-ps_at', '__Host-ps_rt']) {
        const c = cookies.find((x) => x.startsWith(`${name}=`));
        assert(c, `${name} missing`);
        for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict']) assert(c.includes(flag), `${name} lacks ${flag}`);
      }
      jar = cookies.map((c) => c.split(';')[0]).join('; ');
      refresh = cookies.find((c) => c.startsWith('__Host-ps_rt='))!.split(';')[0];
      return cookies.map((c) => c.split('=')[0]).join(', ');
    });

    await check('GET /api/me with cookie', async () => {
      assert(jar, 'not logged in');
      const r = await get(`${site}/api/me`, { cookie: jar });
      assert(r.status === 200, `HTTP ${r.status} (Cookie not forwarded by the proxy?)`);
      const me = (await r.json()) as { userId?: string };
      assert(me.userId === sub, `userId ${me.userId}`);
      return 'HTTP 200, own profile';
    });

    await check('write without x-requested-with is 403 (CSRF)', async () => {
      assert(jar, 'not logged in');
      const r = await fetch(`${site}/api/me`, { method: 'PUT', headers: { 'content-type': 'application/json', cookie: jar }, body: '{"name":"x"}' });
      assert(r.status === 403, `HTTP ${r.status}`);
      return 'HTTP 403';
    });

    await check('PUT /api/me lands in DynamoDB', async () => {
      assert(jar, 'not logged in');
      const name = `Deploy check ${Date.now()}`;
      const r = await send('PUT', `${site}/api/me`, { name }, { cookie: jar });
      assert(r.status === 200, `HTTP ${r.status}`);
      const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: userKey(sub), ConsistentRead: true }));
      assert(Item?.name === name, `table has name=${Item?.name}`);
      return 'profile item updated';
    });

    await check('logout clears cookies and revokes refresh', async () => {
      assert(jar, 'not logged in');
      const r = await send('POST', `${site}/api/auth/logout`, undefined, { cookie: jar });
      assert(r.status === 200, `HTTP ${r.status}`);
      const cleared = r.headers.getSetCookie().filter((c) => /Max-Age=0/i.test(c)).length;
      assert(cleared >= 2, `${cleared} cookies cleared`);
      const again = await send('POST', `${site}/api/auth/refresh`, undefined, { cookie: refresh });
      assert(again.status === 401, `refresh after logout: HTTP ${again.status}`);
      return `${cleared} cookies cleared, refresh 401`;
    });
  } finally {
    await check('delete test user + profile', async () => {
      await cognito.send(new AdminDeleteUserCommand({ UserPoolId: POOL, Username: email })).catch((e) => {
        if (e.name !== 'UserNotFoundException') throw e;
      });
      if (sub) await db.send(new DeleteCommand({ TableName: TABLE, Key: userKey(sub) }));
      return 'deleted (RATE# counters expire via TTL)';
    });
  }

  // 6. Site headers and source maps.
  await check('security headers + CSP meta', async () => {
    const r = await get(`${site}/`);
    const html = await r.text();
    const missing = ['strict-transport-security', 'x-frame-options', 'x-content-type-options'].filter((h) => !r.headers.get(h));
    assert(!missing.length, `missing ${missing.join(', ')} (customHttp.yml applied?)`);
    assert(/<meta[^>]+http-equiv="Content-Security-Policy"/i.test(html), 'no CSP <meta>');
    return `HSTS "${r.headers.get('strict-transport-security')}", XFO ${r.headers.get('x-frame-options')}`;
  });
  await check('no .map files served', async () => {
    const html = await (await get(`${site}/`)).text();
    const scripts = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]).slice(0, 3);
    assert(scripts.length, 'no /_next/static scripts found on /');
    for (const s of scripts) {
      const map = await get(`${site}${s}.map`);
      assert(map.status !== 200, `${s}.map is served`);
      assert(!(await (await get(`${site}${s}`)).text()).includes('sourceMappingURL='), `${s} references a source map`);
    }
    return `${scripts.length} bundles, no maps`;
  });

  const w = Math.max(...results.map((r) => r.check.length));
  console.log(`\n${'CHECK'.padEnd(w)}  RESULT  DETAIL`);
  for (const r of results) console.log(`${r.check.padEnd(w)}  ${r.ok ? 'PASS  ' : 'FAIL  '}  ${r.detail}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed} failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
