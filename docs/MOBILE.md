# Mobile: PWA and native apps

There are two ways to get Parali Setu onto a phone. Both use the same static export (`frontend/out`).

## 1. Install as a PWA (no store, works today)

The site ships a web manifest (`/manifest.webmanifest`), icons and Apple meta tags. This needs the deployed HTTPS site; it won't work over a plain-http LAN address.

- **Android (Chrome):** open the site, tap the ⋮ menu, then **Add to Home screen** (or **Install app**).
- **iOS (Safari):** open the site, tap **Share**, then **Add to Home Screen**.

The app opens full screen with the green theme bar.

## 2. Native shells (Capacitor 7)

`frontend/android/` and `frontend/ios/` are Capacitor projects that wrap the static export. Config lives in `frontend/capacitor.config.ts` (app id `in.paralisetu.app`).

We pin Capacitor 7 because Capacitor 8 needs Node 22 and this repo uses Node 20.

### Point the app at the API

Inside the app the page runs from `https://localhost` (Android) or `capacitor://localhost` (iOS), so relative API calls won't work. `NEXT_PUBLIC_API_URL` is baked in at build time and must be the absolute Amplify URL with the `/api` proxy path: `https://<amplify-domain>/api`. Don't use the raw API Gateway URL: the session cookies are issued for the Amplify domain.

Login sessions are httpOnly cookies. `capacitor.config.ts` turns on `CapacitorHttp` (fetch goes through the native HTTP stack, so there's no CORS) and `CapacitorCookies` (the native cookie jar keeps the session between launches).

Write the build values from the CDK outputs into a gitignored env file that `next build` reads, then set `NEXT_PUBLIC_API_URL` in it to `https://<amplify-domain>/api`:

```bash
npm run -s frontend-env > frontend/.env.production.local   # needs cdk-outputs.json from `npm run deploy`
npm -w frontend run cap:sync
```

To test against a local backend, set `NEXT_PUBLIC_API_URL` in that file to your PC's LAN IP, for example `http://192.168.1.20:4000`. The phone has to be on the same Wi-Fi. Android blocks http from an https page by default, so for a local test only, add `cleartext: true` under `server` in `capacitor.config.ts`. Remove it afterwards.

### Build and run

`cap:sync` builds the export into `out/`. It uses `NEXT_DIST_DIR=out`, so it doesn't clash with a running `next dev`. It then copies `out/` into both native projects.

```bash
npm -w frontend run cap:sync      # after every web change
npm -w frontend run cap:android   # opens Android Studio
npm -w frontend run cap:ios       # opens Xcode (Mac only)
```

**Android APK:** install Android Studio 2024.2.1 or newer. It bundles JDK 21 and the SDK. Open the project with `cap:android`, then go to **Build → Build App Bundle(s) / APK(s) → Build APK(s)**. The APK lands in `android/app/build/outputs/apk/debug/`. From the command line (with JDK 21 and `ANDROID_HOME` set): `cd frontend/android && ./gradlew assembleDebug`.

**iOS:** you need a Mac with Xcode 16 or newer. The project uses Swift Package Manager, so CocoaPods isn't needed. Open it with `cap:ios`, pick a team under Signing, and run. You need an Apple Developer account to install on a real device beyond the free 7-day provisioning.

### Icons and splash

The sources are in `frontend/assets/` (`icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`). To regenerate them:

```bash
cd frontend && npx capacitor-assets generate --android --ios --iconBackgroundColor '#2f5d34' --splashBackgroundColor '#f7f3ea'
```

The PWA icons are in `frontend/public/icons/`.
