# Parali Setu — Build Plan

**Stop after every phase** for review. Frontend phases need Playwright screenshots (phone + desktop) and a `web-design-guidelines` check.
The full decision record is in `docs/HANDOFF.md`.

## Phase 0 — Docs ✅
- [x] Rewrite PRD, ARCHITECTURE, PLAN and CLAUDE.md for Parali Setu

## Phase 1+2 — Scaffold, auth, data, API (one checkpoint)
- [x] npm workspaces: `frontend`, `backend`, `infra`, `shared`
- [x] Shared types + enums (roles, crops, offer/order/listing status)
- [x] `auth-stack`: user pool, 4 groups, post-confirmation Lambda (adds the user to the chosen group + creates the profile)
- [x] `data-stack`: table, GSI1–3, stream
- [x] `storage-stack`: S3 + CloudFront, presign Lambda
- [x] `api-stack`: HTTP API, JWT authorizer, all core routes
- [x] `lib/state.ts` (offer/order transitions) + `lib/pricing.ts`, with unit tests
- [x] Seed script: users of each role, ~20 Punjab/Haryana listings, buyers, impact baseline
- [x] Local dev stack (DynamoDB Local + dev API) and `scripts/smoke-local.ts` (37 checks pass)
- [x] Security review applied (approval bypass, location trilateration, upload size cap, IAM)
- [ ] `cdk deploy` (deploy day, `docs/DEPLOY_CHECKLIST.md`)
- ✅ *Demo: the local smoke test runs farmer → offer → counter → order → job → delivered → paid*

## Phase 3 — Landing + farmer + buyer UI
- [x] Design read + tokens (minimalist, earthy, high contrast)
- [x] Landing: impact counter (cited), how it works, role CTAs
- [x] Sign-up/login per role (Amplify JS)
- [x] Farmer: new listing (+ price band, photos), my listings, offers (accept/counter/reject), orders
- [x] Buyer: browse + filters, listing detail, make offer, my offers/orders, mock pay
- [x] Profile page (location needed for offers) + order detail page (timeline, costs, contacts, role actions)
- [x] Static export (`output: 'export'`, `?id=` query routes), demo-user login locally, Cognito path ready for deploy
- ✅ *Demo: farmer lists, buyer offers, deal agreed*

## Phase 4 — Transporter + admin + email ✅
- [x] Transporter: open jobs, claim, picked up / delivered
- [x] Admin console: verify users, approve listings, orders, impact
- [x] `notify-stack`: stream → SES emails; `/support` help mail
- ✅ *Demo: the full flow with emails, and the impact counter goes up*

## Phase 5 — Languages (pipeline ✅, run at deploy)
- [x] Custom i18n (localStorage locale, lazy locale bundles) + `<Tx>` English subtitle
- [x] `npm run translate` (Amazon Translate) generates hi/pa/ta/te/ml; Haryanvi reuses Hindi
- [ ] Run it after `aws configure` and commit the output
- ✅ *Demo: the farmer flow in Punjabi*

## Phase 6 — AI + voice + map
- [x] `/ai/chat` (Bedrock, code-mixed input; also answers price questions)
- [x] `/tts` (Polly) read-aloud button, Hindi + English voices only
- [ ] ~~Location Service map~~ cut (cut list #2): distance-only via haversine
- ✅ *Demo: "mera price theek hai?"*

## Phase 7 — Ship
- [ ] Amplify Hosting connected, env vars set, `cdk deploy --all`
- [ ] Seed live, smoke-test the demo script
- [x] README (architecture, local dev, deploy steps, demo script), amplify.yml, make-admin script
- [x] `docs/DEPLOY_CHECKLIST.md` (ordered deploy steps, failure fixes, Android rebuild); `npm run frontend-env`
- [x] Android/iOS Capacitor shells + PWA (`docs/MOBILE.md`); APK rebuild with the live API is checklist step 10
- [ ] Payments: Razorpay test mode via verified webhook (plan in the checklist; mock stays for local dev)
- [ ] Architecture diagram image, demo video (`brag`)
- [ ] One `security-and-hardening` pass

## Cut list (in order)
1. bgc / ta / te / ml become machine strings only
2. The map becomes distance only
3. Negotiation is limited to one counter round
4. The admin console becomes lists + approve buttons

**Never cut:** the landing impact counter and the farmer → buyer → transporter flow.

## Risks
| Risk | Mitigation |
|---|---|
| SES sandbox | Verify the demo emails early |
| Bedrock model not in ap-south-1 | Use a cross-region inference profile |
| Amplify Next.js build issues | Fall back to static export → S3 + CloudFront |
