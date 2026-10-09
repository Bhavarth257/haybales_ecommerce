import type { CapacitorConfig } from '@capacitor/cli';

// The native shells load the static export from out/. API calls go to NEXT_PUBLIC_API_URL,
// which must be an absolute https URL baked in at build time (see docs/MOBILE.md).
const config: CapacitorConfig = {
  appId: 'in.paralisetu.app',
  appName: 'Parali Setu',
  webDir: 'out',
  server: { androidScheme: 'https' },
};

export default config;
