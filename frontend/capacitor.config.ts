import type { CapacitorConfig } from '@capacitor/cli';

// The native shells load the static export from out/. API calls go to NEXT_PUBLIC_API_URL,
// which must be the absolute https://<amplify-domain>/api, baked in at build time (see docs/MOBILE.md).
// CapacitorHttp sends fetch through the native HTTP stack (no CORS), and CapacitorCookies keeps the
// httpOnly session cookies in the native cookie jar.
const config: CapacitorConfig = {
  appId: 'in.paralisetu.app',
  appName: 'Parali Setu',
  webDir: 'out',
  server: { androidScheme: 'https' },
  plugins: { CapacitorHttp: { enabled: true }, CapacitorCookies: { enabled: true } },
};

export default config;
