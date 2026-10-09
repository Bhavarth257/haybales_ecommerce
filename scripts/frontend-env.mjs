// Print the frontend build env from cdk-outputs.json (written by `npm run deploy`).
// Use for the Amplify console env vars, and for the Android build:
//   npm run -s frontend-env > frontend/.env.production.local
import { readFileSync } from 'fs';

const o = JSON.parse(readFileSync(new URL('../cdk-outputs.json', import.meta.url), 'utf8'));
const c = JSON.parse(readFileSync(new URL('../infra/cdk.json', import.meta.url), 'utf8')).context;
console.log(`NEXT_PUBLIC_API_URL=${o.ParaliApi.ApiUrl}
NEXT_PUBLIC_PHOTOS_CDN=${o.ParaliStorage.PhotosCdnUrl}
NEXT_PUBLIC_USER_POOL_ID=${o.ParaliAuth.UserPoolId}
NEXT_PUBLIC_USER_POOL_CLIENT_ID=${o.ParaliAuth.UserPoolClientId}
NEXT_PUBLIC_SUPPORT_EMAIL=${c.supportEmail}`);
