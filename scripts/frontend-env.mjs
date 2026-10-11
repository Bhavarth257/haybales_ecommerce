// Print the frontend build env from cdk-outputs.json (written by `npm run deploy`).
// Use for the Amplify console env vars (web: same-origin /api through the Amplify proxy), and for the
// Android build, which needs the absolute URL: npm run -s frontend-env -- <amplifyUrl> > frontend/.env.production.local
// The Cognito ids are server-only now (Lambda env), so the frontend no longer gets them.
import { readFileSync } from 'fs';

const o = JSON.parse(readFileSync(new URL('../cdk-outputs.json', import.meta.url), 'utf8'));
const site = process.argv[2]?.replace(/\/$/, '');
const c = JSON.parse(readFileSync(new URL('../infra/cdk.json', import.meta.url), 'utf8')).context;
console.log(`NEXT_PUBLIC_API_URL=${site ? `${site}/api` : '/api'}
NEXT_PUBLIC_PHOTOS_CDN=${o.ParaliStorage.PhotosCdnUrl}
NEXT_PUBLIC_SUPPORT_EMAIL=${c.supportEmail}${site ? `\nNEXT_PUBLIC_SITE_URL=${site}` : ''}`);
