# Parali Setu — Architecture

## 1. Stack
| Layer | Choice |
|-------|--------|
| Frontend | Next.js (App Router, TS) + Tailwind + next-intl, on **AWS Amplify Hosting** |
| Auth | **Cognito** User Pool, email + password, groups `farmers` `buyers` `transporters` `admins` |
| API | **API Gateway HTTP API** + **Lambda** (Node 24, TS, arm64, esbuild via CDK), served same-origin at `/api` through an Amplify rewrite; httpOnly-cookie auth in the Lambda wrapper |
| Data | **DynamoDB** single table `ParaliSetu` + Streams |
| Files | **S3** (private) + **CloudFront**, pre-signed PUT uploads |
| Email | **SES**: notifications + help mail to the team (`SUPPORT_EMAIL`, a CDK context value; set to the team inbox at deploy) |
| AI | **Bedrock** (Claude via an inference profile): chat, price explanation, code-mixed understanding |
| Voice | **Polly**: read-aloud in **Hindi and English only** (other locales read in English) |
| Maps | **Amazon Location Service**: map tiles + geocoding |
| IaC / logs | **CDK** (TS), **CloudWatch** |

Region: **`ap-south-1` (Mumbai)** by default (closest to users). Bedrock is called through a cross-region inference profile.

## 2. Diagram
```
Phone ─▶ Amplify (Next.js) ──login──▶ Cognito
             │ JWT
             ▼
      API Gateway (HTTP) ─▶ Lambdas ─┬─▶ DynamoDB ──stream──▶ notify Lambda ─▶ SES
                                     ├─▶ S3 (presign) ◀── CloudFront ◀── Phone
                                     ├─▶ Bedrock   ├─▶ Polly   └─▶ Location Service
```

## 3. Data model (single table `ParaliSetu`)
| Entity | PK | SK | GSI1PK / GSI1SK | GSI2PK / GSI2SK |
|---|---|---|---|---|
| User | `USER#<id>` | `PROFILE` | `ROLE#<role>` / `<createdAt>` | – |
| Listing | `LISTING#<id>` | `META` | `FARMER#<id>` / `LISTING#<createdAt>` | `LSTATUS#<status>` / `<state>#<createdAt>` |
| Offer | `LISTING#<id>` | `OFFER#<offerId>` | `BUYER#<id>` / `OFFER#<createdAt>` | – |
| Order (+ transport job) | `ORDER#<id>` | `META` | `BUYER#<id>` / `ORDER#<createdAt>` | `FARMER#<id>` / `ORDER#<createdAt>` |
| Order job index | (same item) | | GSI3: `JOB#OPEN` or `TRANSPORTER#<id>` / `<createdAt>` | |
| Impact totals | `STATS` | `GLOBAL` | – | – |

- Listing status: `PENDING_APPROVAL → ACTIVE → SOLD_OUT | CLOSED`.
- Offer/order state machines: see PRD §3. Transitions are enforced in `backend/src/lib/state.ts` and unit-tested.
- Accepting an offer runs a conditional transaction: it decrements the listing's tonnes and creates the order.
- On `DELIVERED`, the totals in the `STATS/GLOBAL` item go up by atomic `ADD`.
- Browse: query GSI2 `LSTATUS#ACTIVE`, optionally filtered by state prefix. Distance is filtered in Lambda with haversine (`shortcut: fine under a few thousand listings`).

## 4. Pricing
- Buyers see **one delivered price per tonne**, with a breakdown on tap: farmer price + transport (distance × ₹/t·km). *(Default; open question.)*
- Fair band per state = configured base range ± a connectivity adjustment from the distance to the nearest active buyers. The config lives in `backend/src/lib/pricing.ts`, and the values are cited or marked as assumptions.

## 5. API
| Method | Path | Auth |
|---|---|---|
| GET | `/listings` `?state&crop&lat&lng&radiusKm&maxPrice` | public |
| GET | `/listings/{id}` | public |
| POST | `/listings` | farmer |
| PUT / DELETE | `/listings/{id}` | owner farmer |
| GET | `/me/listings` | farmer |
| POST | `/uploads/presign` | verified farmer → presigned **POST** (5 MB cap) |
| GET | `/price-band` `?state&lat&lng` | public |
| POST | `/listings/{id}/offers` | buyer |
| GET | `/listings/{id}/offers` | owner farmer |
| PATCH | `/listings/{id}/offers/{offerId}` | farmer (accept/reject/counter), buyer (accept counter/withdraw) |
| GET | `/me/offers` | buyer |
| GET | `/me/orders` | farmer / buyer / transporter |
| GET | `/orders/{id}` | parties, transporter, admin |
| POST | `/orders/{id}/pay` | buyer (mock) |
| POST | `/orders/{id}/cancel` | buyer / farmer / admin, before a transporter claims it |
| GET | `/jobs` | transporter (open jobs) |
| POST | `/jobs/{orderId}/claim` | transporter |
| PATCH | `/jobs/{orderId}/status` | assigned transporter (`PICKED_UP`, `DELIVERED`) |
| GET | `/impact` | public |
| GET / PUT | `/me` | auth |
| GET | `/admin/users` `?role&verified` · `/admin/listings?status` · `/admin/orders` | admin |
| PATCH | `/admin/users/{id}` (verify) · `/admin/listings/{id}` (approve/reject) | admin |
| POST | `/support` | auth → SES to the team |
| POST | `/ai/chat` (also answers price questions) | auth |
| POST | `/tts` | auth → Polly audio |

## 6. Folders
```
frontend/src/
  app/            page.tsx (landing+impact), login/, signup/, listings/, listings/[id]/,
                  farmer/, farmer/new/, buyer/, transporter/, admin/, orders/[id]/, help/
  components/     ui/ layout/ listings/ orders/ impact/ ai/
  i18n/           messages/{en,hi,pa,bgc,ta,te,ml}.json, <T> component (text + English subtitle)
  lib/            api.ts, auth.ts, config.ts
backend/src/
  handlers/       listings/ offers/ orders/ jobs/ users/ uploads/ admin/ impact/ ai/ support/ notify/
  lib/            db auth response state pricing geo keys email users listings orders
  routes.ts       route table shared by CDK and the dev server
  scripts/        dev-server.ts (local API)
  validators/     zod schemas
infra/lib/stacks/ auth-stack data-stack storage-stack api-stack notify-stack
shared/types/     User, Listing, Offer, Order, enums
scripts/seed/     demo users, listings, buyers, impact baseline
```
(`bgc` = Haryanvi's ISO 639-3 code.)

## 7. Local development
```
npm install
npm run dev:db      # DynamoDB Local on :8765 (needs Java 17; see scripts/dev-db.sh)
npm run dev:api     # real handlers on http://localhost:4000, AUTH_MODE=local: real signup (scrypt-hashed AUTH#<email>), httpOnly cookies, no Cognito
npm run seed:local  # sample listings only; no premade accounts (sign up, then `DYNAMO_ENDPOINT=http://localhost:8765 npx tsx scripts/make-admin.ts --local <email>`)
npx tsx scripts/smoke-local.ts   # end-to-end checks
npm test            # unit tests;  npm run synth  # CDK synth
```

## 8. Security
- There is no API Gateway authorizer. The handler wrapper verifies the httpOnly `__Host-ps_at` cookie (Cognito access token), roles come from `cognito:groups`, and ownership is checked in the Lambda. Admin routes also require TOTP. See [AUTH.md](AUTH.md).
- Public distances and the price band use points rounded to about 1 km, so callers can't trilaterate farms or buyers.
- Only admin-approved listings can go live. Closing or re-opening a listing can't bypass approval.
- The farmer's exact location and phone number are revealed only to the buyer and transporter of an order that has been accepted.
- Unverified users can browse but can't list or offer.
- The S3 bucket is private and reads go through CloudFront.
- IAM is least-privilege per Lambda, the DynamoDB stand-in for row-level security: every route reads, but only write routes get `PutItem`/`UpdateItem`, and only on the partition-key prefixes they own (`dynamodb:LeadingKeys`, e.g. `users/updateMe` → `USER#*`, `orders/pay` → `ORDER#*` + `STATS`). No Lambda can `DeleteItem` or `BatchWriteItem`. `auth/*` Lambdas get no table access and no Cognito IAM (they use public APIs); only `/admin/*` Lambdas get `cognito-idp:AdminGetUser` (TOTP check). Which *row* within a prefix a caller may touch is still checked in code. The map is `WRITES` in `infra/lib/stacks/api-stack.ts`.
- SES stays in sandbox mode, so the demo addresses are verified ahead of time.
