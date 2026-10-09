# Parali Setu

Every October and November, farmers in Punjab and Haryana burn paddy stubble (*parali*) because clearing it costs money and the next sowing window is short. The smoke covers north India.

**Parali Setu** ("stubble bridge") lets farmers sell that stubble instead. Biomass plants, paper mills, feed makers and mushroom growers buy it at a fair price. A transporter carries it from the field to the buyer. Every tonne delivered counts on the landing page as tonnes kept out of the fire, CO₂ and PM2.5 avoided, and rupees paid to farmers.

Built for the WeMakeDevs AWS hackathon.

## What's in it

| Who | What they do |
|---|---|
| **Farmer** | Lists stubble in four short steps: crop, tonnes, location and price. A fair price band for their region shows next to the price field. The farmer then accepts, counters or rejects offers. |
| **Buyer** | Searches by state, crop, price and distance. Sees one **delivered price per tonne** (stubble + transport), makes an offer, and pays when the stubble arrives (payment is a demo). |
| **Transporter** | Picks pickup jobs from a board and marks them picked up, then delivered. Earns the transport charge. |
| **Admin** | Approves listings, verifies people, sees every order and the impact totals. |

- **Languages:** English, Hindi, Punjabi, Haryanvi, Tamil, Telugu and Malayalam. In any language other than English, headings and buttons keep a faint English line underneath.
- **AI assistant:** an assistant on Amazon Bedrock that understands Hinglish, with read-aloud in Hindi and English through Amazon Polly.
- **Phones vs desktop:** phones get a light, paged interface with short steps and tabs, and no long scrolling. Laptops also get a Three.js hero and scroll-driven sections, which phones never download.

## AWS architecture

```
Browser ─▶ Amplify Hosting (static Next.js) ──sign in──▶ Cognito (farmers/buyers/transporters/admins)
              │ JWT
              ▼
      API Gateway HTTP API ─▶ Lambda (1 per route, Node 24, arm64)
              │                   ├─▶ DynamoDB (single table) ──Streams──▶ notify Lambda ─▶ SES email
              │                   ├─▶ S3 photos (presigned POST, 5 MB cap) ◀── CloudFront
              │                   ├─▶ Bedrock (Converse API) · Polly (read-aloud)
              │                   └─▶ CloudWatch logs
Amazon Translate ─▶ UI strings for 6 Indian languages (build-time script)
```

These are 13 AWS services, all serverless and pay-per-use, and all defined in CDK (`infra/`) except Amplify. Details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run it locally (no AWS account needed)

Requires Node 20 and Java 17 for DynamoDB Local.

```bash
npm install
curl -sL https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz | tar xz -C .dynamodb   # once
npm run dev:db        # DynamoDB Local on :8765
npm run dev:api       # the real Lambda handlers on http://localhost:4000 (AI replies are mocked)
npm run seed:local    # demo accounts and 19 listings
npm -w frontend run dev   # http://localhost:3000, log in by picking a demo account
```

Checks: `npm test` (unit tests), `npx tsx scripts/smoke-local.ts` (37-step end-to-end flow), `npm run synth` (CDK).

## Deploy

The full ordered checklist, with expected output and fixes for the usual failures, is in [docs/DEPLOY_CHECKLIST.md](docs/DEPLOY_CHECKLIST.md). Short version:

```bash
aws configure                                          # region ap-south-1
npx -w infra cdk bootstrap aws://<ACCOUNT_ID>/ap-south-1
npm run deploy                                         # all stacks; writes cdk-outputs.json
npm run -s frontend-env                                # the 5 NEXT_PUBLIC_* values for Amplify
```

1. **Bedrock (before the first deploy):** `infra/cdk.json` → `bedrockModelId` holds a Claude Haiku inference profile id that has **not been verified for ap-south-1**. Check it with `aws bedrock list-inference-profiles --region ap-south-1`, and send one test prompt so the one-time Anthropic use-case form gets done. Add an AWS Budgets alarm (say $20): the AI routes are throttled to 3 req/s in total, but nothing caps a single user.
2. **SES:** click the verification email sent to `supportEmail` (`infra/cdk.json`). In sandbox mode also verify every demo inbox with `aws sesv2 create-email-identity --region ap-south-1 --email-identity <addr>`.
3. **Translations:** `npm run translate` (Amazon Translate) writes `frontend/src/messages/<locale>/`. Commit and push before the Amplify build.
4. **Amplify Hosting:** connect this GitHub repo in ap-south-1; `amplify.yml` is set up. The app must be a static `WEB` app, not `WEB_COMPUTE`. Add these env vars (`npm run -s frontend-env` prints them):

   | Amplify env var | cdk-outputs.json |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `ParaliApi.ApiUrl` |
   | `NEXT_PUBLIC_PHOTOS_CDN` | `ParaliStorage.PhotosCdnUrl` |
   | `NEXT_PUBLIC_USER_POOL_ID` | `ParaliAuth.UserPoolId` |
   | `NEXT_PUBLIC_USER_POOL_CLIENT_ID` | `ParaliAuth.UserPoolClientId` |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` | same as `supportEmail` in `infra/cdk.json` |

5. Put the Amplify URL in `infra/cdk.json` → `appUrl` (it's used in email links), then run `npm run deploy` again.
6. **Demo data:** `npm run seed` for the listings. Sign up an account in the app, then `USER_POOL_ID=<ParaliAuth.UserPoolId> npm run make-admin -- you@example.com`.
7. **Android:** `npm run -s frontend-env > frontend/.env.production.local`, then build as in [docs/MOBILE.md](docs/MOBILE.md).

## Demo script

1. The landing page shows the live impact numbers.
2. A farmer, in Punjabi, lists 25 tonnes of paddy straw from Sangrur and sees the fair price band.
3. The admin approves the listing.
4. A buyer (a biomass plant in Patiala) finds it 69 km away and offers ₹1,600/tonne. The farmer counters at ₹1,700 and the buyer accepts.
5. A transporter takes the job and marks it picked up, then delivered. The buyer pays (demo).
6. The impact counter goes up, and everyone gets an email.
7. The farmer asks the assistant "mera price theek hai?" and taps Read aloud.

## Numbers and assumptions

- **CO₂:** 1.42 tonnes per tonne of residue burnt, derived from the national totals in Jain et al. 2014, *Aerosol and Air Quality Research* 14:422.
- **PM2.5:** 8.3 kg per tonne of rice straw, from Gadde et al. 2009, *Environmental Pollution* 157:1554.
- **Price bands and haulage rates** (₹150/tonne loading plus ₹6 per tonne-km) are demo assumptions in `backend/src/lib/pricing.ts`, not market data.
- **Payments** are mocked. The plan for Razorpay is in [docs/DEPLOY_CHECKLIST.md](docs/DEPLOY_CHECKLIST.md#payments-plugging-in-a-gateway). Login is email + password; phone OTP comes later, because SMS in India needs DLT registration.
- **Seed data** is fictional. Every organisation in it is marked "(demo)".

## Repo layout

`frontend/` Next.js app · `backend/` Lambda handlers, zod validators, tests · `infra/` CDK stacks · `shared/` types · `scripts/` seed, smoke test, translate, make-admin, frontend-env · `docs/` PRD, architecture, plan, handoff
