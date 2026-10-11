// Screenshot pages at phone + desktop width against a running frontend and the local dev API.
// Usage: node scripts-screens.mjs <outDir> [page,page...]
// Needs `npm run dev` (web on :3000; the dev API only allows that origin) plus dev:db, dev:api, seed:local.
// Each role gets a fresh account (local mode auto-confirms signup); the session is the API's httpOnly cookies.
import { chromium } from 'playwright';

const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? 'http://localhost:4000';
const SHOTS = process.argv[2] ?? 'screens';

// [name, path, role or null]
const PAGES = [
  ['landing', '/', null],
  ['login', '/login/', null],
  ['signup', '/signup/', null],
  ['ops-login', '/ops-b28c4622bfa0/', null],
  ['browse', '/listings/', 'buyer'],
  ['listing', '/listing/?id=demo-listing-01', 'buyer'],
  ['buyer', '/buyer/', 'buyer'],
  ['profile', '/profile/', 'buyer'],
  ['farmer', '/farmer/', 'farmer'],
  ['farmer-new', '/farmer/new/', 'farmer'],
  ['transporter', '/transporter/', 'transporter'],
  ['help', '/help/', 'farmer'],
];
const only = process.argv[3]?.split(',');
const headers = { 'x-requested-with': 'parali' };

async function logIn(ctx, role) {
  const account = { email: `screens-${role}-${Date.now()}@example.com`, password: 'Screens-pass-1', name: `Screens ${role}`, role };
  for (const [path, data] of [['/auth/signup', account], ['/auth/login', { email: account.email, password: account.password }]]) {
    const res = await ctx.request.post(API + path, { data, headers });
    if (!res.ok()) throw new Error(`${path} ${res.status()}: ${await res.text()}`);
  }
}

const browser = await chromium.launch();
for (const [w, h, tag] of [[390, 844, 'phone'], [1280, 800, 'desktop']]) {
  const contexts = {};
  const ctxFor = async (role) => {
    if (!contexts[role ?? '']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: tag === 'phone' ? 2 : 1 });
      if (role) await logIn(ctx, role);
      contexts[role ?? ''] = ctx;
    }
    return contexts[role ?? ''];
  };
  for (const [name, path, role] of PAGES) {
    if (only && !only.includes(name)) continue;
    const page = await (await ctxFor(role)).newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(WEB + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/${name}-${tag}.png`, fullPage: true });
    if (errors.length) console.log(`${name}/${tag} errors:`, errors.slice(0, 3).join(' | '));
    await page.close();
  }
  for (const ctx of Object.values(contexts)) await ctx.close();
}
await browser.close();
console.log('screens saved to', SHOTS);
