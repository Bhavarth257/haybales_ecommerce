# HayMarket — Build Plan

Work top to bottom. Every phase ends with something demo-able. Tick the boxes as you go.

## Phase 0 — Setup (≈1 h)
- [ ] AWS account ready, IAM user/SSO, `aws configure`, pick region (e.g. `us-east-1`)
- [ ] Install Node 20, AWS CLI, AWS CDK (`npm i -g aws-cdk`), `cdk bootstrap`
- [ ] `git init`, create GitHub repo (needed for Amplify Hosting)
- [ ] Scaffold: Next.js in `frontend/`, CDK app in `infra/`, TS package in `backend/`
- [ ] Shared types in `shared/types` (Listing, Order, User, enums for HayType, BaleType, OrderStatus)

## Phase 1 — Auth (≈2 h)
- [ ] `auth-stack`: Cognito User Pool, email sign-up, groups `buyers` / `sellers`
- [ ] Post-confirmation Lambda: create the `USER#id / PROFILE` item in DynamoDB
- [ ] Frontend: sign-up, login, logout using Amplify JS (`aws-amplify/auth`)
- [ ] Role picker on sign-up; navbar shows the role
- ✅ *Demo: a user can sign up and log in*

## Phase 2 — Data + Listings API (≈3 h)
- [ ] `data-stack`: DynamoDB table + GSI1 + GSI2 + stream
- [ ] `api-stack`: HTTP API + Cognito JWT authorizer
- [ ] Lambdas: listings create / get / list / update / delete / mine
- [ ] zod validators for listing input
- [ ] `storage-stack`: S3 photos bucket + CloudFront; `uploads/presign` Lambda
- [ ] Seed script with ~15 realistic hay listings
- ✅ *Demo: create and fetch listings with curl/Postman*

## Phase 3 — Marketplace UI (≈4 h)
- [ ] Landing page with search bar
- [ ] Browse page: ListingCard grid + FilterPanel (type, bale type, price, distance)
- [ ] Listing detail page: photo gallery, specs table, seller info
- [ ] Sell page: ListingForm + PhotoUploader (pre-signed upload to S3)
- [ ] Seller dashboard: my listings (edit/delete)
- ✅ *Demo: the seller lists hay and the buyer finds it*

## Phase 4 — Orders (≈3 h)
- [ ] Lambdas: orders create / get / mine / updateStatus (enforce status transitions + stock decrement)
- [ ] OrderForm on the listing page (qty, pickup/delivery, note)
- [ ] Buyer dashboard: my orders with status badges
- [ ] Seller dashboard: incoming orders with Accept / Reject / Ready / Complete buttons
- ✅ *Demo: full buy flow works*

## Phase 5 — Notifications (≈1.5 h)
- [ ] `notify-stack`: verify SES emails, DynamoDB stream → `notifyOnChange` Lambda
- [ ] Emails: new order (to the seller), status change (to the buyer)
- ✅ *Demo: emails arrive live*

## Phase 6 — Deploy (≈1 h)
- [ ] Connect the GitHub repo to Amplify Hosting, set env vars (API URL, Cognito IDs)
- [ ] `cdk deploy --all`, then smoke-test the demo script on the live URL

## Phase 7 — Stretch (pick by value)
1. [ ] **Bedrock** "Write my description" + price suggestion button (big wow factor)
2. [ ] **Amazon Location Service** map on the listing page and distance in search results
3. [ ] Ratings & reviews
4. [ ] Order messaging
5. [ ] Stripe test-mode checkout

## Phase 8 — Pitch prep (≈1 h)
- [ ] Architecture diagram (draw.io / AWS icons) from `ARCHITECTURE.md`
- [ ] Rehearse the demo script from `PRD.md` §7
- [ ] README with setup + deploy steps and screenshots

## Team split (if 3–4 people)
| Person | Owns |
|--------|------|
| A | `infra/` (CDK stacks) + deploy |
| B | `backend/` Lambdas + data model |
| C | `frontend/` pages + components |
| D | Seed data, Bedrock/Location stretch, pitch & diagram |

## Risks & mitigations
| Risk | Mitigation |
|------|-----------|
| SES sandbox blocks emails | Verify all demo emails early |
| Geo search too complex | Fall back to Scan + haversine filter in Lambda |
| Amplify Next.js build issues | Fall back to static export → S3 + CloudFront |
| Bedrock model access not approved | Request model access on day 1 |
