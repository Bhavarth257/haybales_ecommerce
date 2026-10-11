# Auth design: httpOnly cookies, same-origin API

The browser never holds a token. Login goes through our API, which calls Cognito and sets cookies that page scripts can't read.

## Same origin

- Production: Amplify Hosting forwards `/api/<*>` to the API Gateway URL (a 200 rewrite, so it acts as a reverse proxy). The frontend calls `/api/...` on its own domain, so cookies are first-party. `NEXT_PUBLIC_API_URL=/api`.
- Local dev: web on `http://localhost:3000`, API on `http://localhost:4000`. Different ports on the same host are the same *site*, so `SameSite=Strict` cookies still flow. The fetch uses `credentials: 'include'`, and the dev server answers CORS with `access-control-allow-origin: http://localhost:3000` and `access-control-allow-credentials: true`.
- Android/iOS (Capacitor): `CapacitorHttp` is enabled, so requests go through the native HTTP stack with its own cookie jar and no CORS. The app calls the absolute Amplify URL `https://<app>/api`.

## Cookies

| Name | Holds | Max-Age | Flags |
|---|---|---|---|
| `__Host-ps_at` | Cognito access token | 3600 | HttpOnly; Secure; SameSite=Strict; Path=/ |
| `__Host-ps_rt` | Cognito refresh token | 7 days | HttpOnly; Secure; SameSite=Strict; Path=/ |
| `__Host-ps_mfa` | Cognito MFA session string (login in progress) | 300 | HttpOnly; Secure; SameSite=Strict; Path=/ |

`Secure` is fine on `http://localhost` (browsers treat localhost as secure).

## CSRF

Every non-GET request must carry the header `x-requested-with: parali`. The handler wrapper returns 403 without it. With SameSite=Strict, a custom header that cross-site forms can't send, and CORS limited to our own origin, that covers CSRF.

## API routes (all `auth: false` in routes.ts, rate tier `auth`)

| Route | Body | Result |
|---|---|---|
| `POST /auth/signup` | `{email, password, name, role: farmer\|buyer\|transporter, phone?}` | `{next: 'confirm'}` (local mode: `{next: 'login'}`, already confirmed) |
| `POST /auth/confirm` | `{email, code}` | `{}` |
| `POST /auth/resend` | `{email}` | `{}` |
| `POST /auth/login` | `{email, password}` | sets `__Host-ps_at` + `__Host-ps_rt` → `{ok: true}`. Admin accounts get the same generic 401 as a wrong password. |
| `POST /auth/admin/login` | `{email, password}` | non-admins: generic 401. Admin with TOTP: sets `__Host-ps_mfa` → `{mfa: 'TOTP'}`. Admin without TOTP yet: `{mfa: 'SETUP', secret, otpauth}` (AssociateSoftwareToken) |
| `POST /auth/mfa` | `{code}` | completes the TOTP challenge (or VerifySoftwareToken + SetUserMFAPreference on setup, then logs in) → sets cookies, clears `__Host-ps_mfa` |
| `POST /auth/refresh` | none | new `__Host-ps_at` from `__Host-ps_rt`, or 401 and clears cookies |
| `POST /auth/logout` | none | RevokeToken(refresh) + clears all cookies |
| `POST /auth/forgot` | `{email}` | `{}` (same response whether or not the email exists) |
| `POST /auth/reset` | `{email, code, password}` | `{}` |

Session check: `GET /me` (existing). 200 with the profile means logged in; 401 means logged out. On a 401 the frontend calls `/auth/refresh` once, then retries.

## Protected routes

API Gateway no longer has a JWT authorizer. The handler wrapper reads `__Host-ps_at`, verifies it with `aws-jwt-verify` (Cognito access token, our pool and client, cached JWKS), and exposes `{userId: sub, roles from cognito:groups}`. `caller()` reads that. The email isn't in the access token, so handlers that need it read the user's profile.

Admin routes (`/admin/*`) also require that the admin has TOTP MFA enabled (AdminGetUser `UserMFASettingList`, cached per container for 5 minutes). Every admin login then went through MFA.

## Rate limits

- New `auth` tier: **5 per minute per client IP and 5 per minute per email** (when the body has one).
- Client IP: `requestContext.http.sourceIp`, or the last `x-forwarded-for` entry when behind the Amplify proxy (CloudFront appends the real viewer IP there; earlier entries can be forged). The per-email limit and Cognito's own account lockout are the real backstop.
- The Cognito WAF is removed. With login going through our Lambdas, Cognito sees Lambda IPs, so a per-IP WAF rule would throttle everyone together.

## Local mode (`AUTH_MODE=local`, dev server only, never deployed)

There's no Cognito locally.
- Users sign up for real. The password is hashed with scrypt and stored as `AUTH#<email>`.
- Tokens are HMAC-signed with a random per-process secret.
- Signup is auto-confirmed and MFA is skipped.
- `make-admin --local <email>` promotes a local user.
- There are no premade accounts. The seed creates only sample listings for local browsing.

## Admin door

- The admin console lives at `/ops-b28c4622bfa0/`. It isn't linked publicly and is `noindex`.
- Its login uses `/auth/admin/login`, plus TOTP (setup shows a QR code on the first login).
- Admins are created only with `scripts/make-admin.ts`; signup can never pick the admin role.
- An unlisted path is obscurity, not security, and it's visible in the JS route manifest. What actually protects the console is the admins group plus TOTP plus server checks.
