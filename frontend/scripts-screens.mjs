// Screenshot every page at phone + desktop width against the static build (out/) and the local dev API.
// Usage: node scripts-screens.mjs <outDir> [page,page...]   (needs npm run dev:db, dev:api, seed:local)
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';

const OUT = new URL('./out/', import.meta.url).pathname;
const SHOTS = process.argv[2] ?? 'screens';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }).end(await readFile(join(OUT, p)));
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(3100);

// [name, path, demo user or null]
const PAGES = [
  ['landing', '/', null],
  ['browse', '/listings/', 'buyer-1'],
  ['listing', '/listing/?id=demo-listing-01', 'buyer-1'],
  ['buyer', '/buyer/', 'buyer-1'],
  ['order', '/order/?id=demo-order-1', 'buyer-1'],
  ['profile', '/profile/', 'buyer-1'],
  ['farmer', '/farmer/', 'farmer-1'],
  ['farmer-new', '/farmer/new/', 'farmer-1'],
  ['farmer-listing', '/farmer/listing/?id=demo-listing-01', 'farmer-1'],
  ['login', '/login/', null],
  ['transporter', '/transporter/', 'transporter-1'],
  ['admin', '/admin/', 'admin-1'],
  ['help', '/help/', 'farmer-1'],
];
const only = process.argv[3]?.split(',');
const browser = await chromium.launch();
for (const [w, h, tag] of [[390, 844, 'phone'], [1280, 800, 'desktop']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: tag === 'phone' ? 2 : 1 });
  for (const [name, path, user] of PAGES) {
    if (only && !only.includes(name)) continue;
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.addInitScript((u) => (u ? localStorage.setItem('ps.demoUser', u) : localStorage.removeItem('ps.demoUser')), user);
    await page.goto(`http://localhost:3100${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/${name}-${tag}.png`, fullPage: true });
    if (errors.length) console.log(`${name}/${tag} errors:`, errors.slice(0, 3).join(' | '));
    await page.close();
  }
  await ctx.close();
}
await browser.close();
server.close();
console.log('screens saved to', SHOTS);
