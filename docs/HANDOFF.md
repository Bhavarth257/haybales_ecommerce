# Parali Setu: Session Handoff

Everything decided before the build starts. Date of decisions: 2026-10-09.

**Progress (2026-10-10, end of day):** Phases 0–6 are built and checked locally: 30 routes, CDK synth OK (outputs match the README table), unit tests and the 37-step local smoke test pass, security review applied, Capacitor Android/iOS shells and PWA added (`docs/MOBILE.md`). Map cut (distance only). Nothing is deployed yet and the translation bundles are still empty (they fill in when `npm run translate` runs). **Next (2026-10-11): follow `docs/DEPLOY_CHECKLIST.md` top to bottom, then plug in Razorpay using the plan at the end of that file.** Local dev commands: `docs/ARCHITECTURE.md` §7.
Hackathon: WeMakeDevs AWS hackathon (environmental theme). **Deadline: 1 day.** Team: 2 people.

> **Doc status:** Phase 0 rewrote `CLAUDE.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md` and `docs/PLAN.md` for Parali Setu. Where they conflict with this file, this file wins.

## How to start the next session
1. Paste this file, or tell Claude to read `docs/HANDOFF.md`.
2. Run `/usage` and report the weekly percentage (Claude Pro, about ₹2,500 per month).
3. Stay on **Sonnet**. Activate `/ponytail` at level **full**.
4. Say "let's go". Claude starts at Phase 0 and stops after every phase.
5. Answer the four open questions in section 12 in the first minute.

---

## 1. Product

**Name (provisional): Parali Setu** ("stubble bridge"; *parali* = stubble, *setu* = bridge, same word in Hindi and Punjabi). Alternatives considered: Parali Bazaar, Khet Se. The user said Parali Setu is fine for now. The repo folder keeps its current name.

**What it is:** a marketplace that lets farmers sell crop stubble (paddy straw, *parali*) for money instead of burning it. Buyers purchase it. A logistics agency (transporters) carries it from farm to buyer. The point is to reduce stubble burning, so the **impact numbers are the headline of the product**.

**Region:** focus on Punjab and Haryana, but nothing may be region-locked. It should work India-wide.

**Why a marketplace:** easier access for farmers. The user's description: farmers get money in return, and a logistics agency sits between farmer and buyer.

**Buyers (examples to seed and show):** biomass power plants, paper and board mills, cattle-feed makers, mushroom growers, brick kilns, packaging firms.

## 2. Roles: four, each with its own clean login and flow

| Role | What they do |
|---|---|
| **Farmer** | Signs up as a seller. Lists stubble in **tonnes** (not acres), sets an asking price, accepts or counters buyer offers, sees payment status. |
| **Buyer** | Signs up as a buyer. Browses listings, filters by region, makes offers, tracks orders. Pays for stubble and transport. |
| **Transporter** (logistics agency) | Has its own login. Sees the open pickup jobs and **chooses which ones to take**. Marks *picked up* and *delivered*. |
| **Admin** (the owner) | Separate console. Verify users, approve listings, track all orders, see the impact dashboard. |

- Farmer and buyer are two separate, clean sign-up flows.
- Help requests are **not** handled in-app. Any help needed is emailed to the team (SES).
- Admin console scope (user-confirmed): verify farmers/buyers, approve listings, assign/track transport, track all orders, impact dashboard. Dispute resolution is not included.

## 3. Pricing and negotiation
- The farmer sets the **asking price per tonne**.
- Final price must be **fair to both sides**: the region matters, as does logistics connectivity (distance and road access). The buyer has a say.
- Show a **fair market price band per region** that factors in logistics connectivity. Bedrock can suggest a fair price.
- Buyers can make an **offer**; the farmer accepts or counters. Cut list reduces this to one counter-offer round.
- Quantity is always in **tonnes** (the farmer is selling volume). Do not ask for acres.

## 4. Transport cost (UNRESOLVED, see section 12)
The user said both "the buyer pays" and "there is no price on the buyer for transport, so the stubble price should be reasonable". Needs one decision: transport bundled into a single price shown to the buyer, or shown as its own line.

## 5. Languages (i18n)
- English is the default.
- Supported: **English, Hindi, Punjabi, Haryanvi, Tamil, Telugu, Malayalam.**
- When a non-English language is chosen, **titles, headings and buttons** keep a faint-but-readable **English subtitle** underneath (transparent but visible font).
- User-written text (listing notes, offers, chat) can be **code-mixed** (English + Hindi and similar). The system must understand it, so use Bedrock for that.
- Quality order if time is short: polish en / hi / pa first; the other four can be machine-generated and marked beta.
- Technical caveats to check in the AWS docs: Amazon Translate may not support Haryanvi (it uses Devanagari, so Hindi text can be adapted by hand or LLM). Amazon Polly may only have Hindi and English voices. Where a voice is missing, read-aloud falls back to Hindi or English.

## 6. Authentication
- Long-term: **phone OTP**. SMS to Indian numbers from AWS needs DLT registration, which can take weeks.
- Hackathon: **email + password** (Cognito), and store the phone number on the profile.
- Cognito groups: `farmers`, `buyers`, `transporters`, `admins`.

## 7. Payments
Mock for now: the buyer taps Pay after delivery and the order goes to `PAID`. Next: Razorpay test mode, with the order marked `PAID` only by a verified `order.paid` webhook. The plan, files and routes are in `docs/DEPLOY_CHECKLIST.md` → "Payments".

## 8. Wow features (priority order)
1. **(a) Impact counter**, shown **on the landing page**: tonnes collected, CO₂ avoided, PM2.5 avoided, farmers paid, ₹ paid to farmers. Use published emission factors and **cite them on the page**. Also shown in the admin console.
2. **(b) AI chat assistant** (Amazon Bedrock) with a **read-aloud button** (Amazon Polly). Text chat; Hindi voice input only if Amazon Transcribe supports it (verify). Also does fair-price suggestion.
3. **(c) Map** matching farms to the nearest buyers (Amazon Location Service). Fallback: distance-only (haversine), no rendered map.

## 9. Constraints
- **AWS-only is strict.** User data (the database) stays in AWS. Judges check the architecture; aim for 6+ services, and this design uses about 11.
- Serverless and free-tier friendly. **No RDS, EC2 or OpenSearch** (from the project `CLAUDE.md`).
- Never hard-code AWS IDs or URLs; use env vars and CDK outputs.
- Users are mostly on **low-end phones with patchy data**: mobile-first, simple, clean UI, big tap targets, high contrast, **no heavy animation**.
- Budget: Claude Pro + **$200 AWS credits**. Bedrock model access is approved. A GitHub repo exists (needed for Amplify Hosting).

## 10. Tech stack (carry over from the existing CLAUDE.md)
- Frontend: Next.js App Router + TypeScript + Tailwind in `frontend/`, hosted on AWS Amplify. Add an i18n library (e.g. next-intl).
- Backend: TypeScript Lambdas in `backend/src/handlers/<domain>/<action>.ts` behind an API Gateway HTTP API. One handler per route. Shared logic in `backend/src/lib`. Validate bodies with **zod** (`backend/src/validators`).
- Auth: Cognito. Data: DynamoDB single table. Photos: S3 + CloudFront (pre-signed uploads).
- Infra: AWS CDK (TypeScript) in `infra/lib/stacks/`. Shared types in `shared/types/`.
- Services in play: Cognito, API Gateway, Lambda, DynamoDB (+ Streams), S3, CloudFront, SES, Bedrock, Polly, Location Service, Amplify, CloudWatch, plus Translate and Transcribe if used.
- Domain model to redesign in Phase 0: User, Listing (tonnes, crop type, region, location, photos, asking price, moisture/quality), Offer, Order, TransportJob, Impact stats. Replace the hay fields (hay type, bale type, cutting) entirely.

## 11. Build plan (about 8 phases; **stop after each one**)

| # | Phase | Main skills | Gate |
|---|---|---|---|
| 0 | Rewrite `CLAUDE.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md` for Parali Setu (4 roles, offers, transport jobs, i18n, impact) | spec-driven-development, planning-and-task-breakdown, api-and-interface-design | user reviews the docs |
| 1 | Scaffold Next.js, CDK app, backend package, shared types. Auth stack with 4 groups, email + password | source-driven-development, incremental-implementation | sign up and log in per role |
| 2 | DynamoDB table, listings, offers/counters, orders, transport jobs, presigned S3 photos, region price band, seed data | api-and-interface-design, test-driven-development (offer/order state machine and price band only), security-and-hardening | curl demo |
| 3 | Landing page with live impact counter; farmer and buyer flows, mobile-first | design-taste-frontend (landing only), frontend-ui-engineering + minimalist-ui (app screens), dataviz (impact tiles) | screenshots + web-design-guidelines |
| 4 | Transporter job board, admin console, order tracking, SES emails and support mail | frontend-ui-engineering, minimalist-ui, security-and-hardening | screenshots + guidelines |
| 5 | i18n for 7 languages with English subtitles | frontend-ui-engineering | screenshots per language |
| 6 | Bedrock chat (code-mixed input) + Polly read-aloud, Location Service map and distance, Bedrock price suggestion | source-driven-development | demo run |
| 7 | Deploy (Amplify + `cdk deploy`), seed demo data, smoke test, README, architecture diagram, demo video | shipping-and-launch, no-ai-slop (copy), brag (video) | live URL |

Merge phases with no UI (1 and 2) into one checkpoint to save time and tokens.

### Agents per phase (background subagents for independent work; each starts cold, so give self-contained prompts)
| Phase | Main session does | Parallel agents |
|---|---|---|
| 1+2 | backend, infra, tests | ✅ done: 1 security-review agent (`security-and-hardening`) — 8 findings, all high/medium fixed |
| 3 | design read + tokens, layout shell, API client (shared base first) | after the base: agent A landing (`design-taste-frontend` + `dataviz`), agent B farmer screens, agent C buyer screens (`frontend-ui-engineering` + `minimalist-ui`); then 1 review agent (`web-design-guidelines`) |
| 4 | wire emails/support | agent A transporter board, agent B admin console; then 1 `security-and-hardening` agent on new routes |
| 5 | `<T>` subtitle component, en strings | 1 agent per language group producing message JSON (hi+bgc, pa, ta+te+ml) |
| 6 | integrate | agent A Bedrock chat + Polly (`source-driven-development`), agent B Location Service map |
| 7 | deploy + smoke test | agent A README + architecture diagram (`no-ai-slop`), agent B demo video (`brag`) |

**Before closing every phase:** run one small *health-check agent* (Explore/general-purpose, short prompt) that runs `tsc` for every workspace, `npm test`, `cdk synth`, `next build` and lint, and reads VS Code diagnostics (`getDiagnostics`). It reports problems only; the main session fixes them.

At the end of each phase, rebuild the `/graphify` graph (`graphify-out/`) and query it before reading files in the next session.

**Skills to avoid:** `redesign-existing-projects` (nothing to redesign), `industrial-brutalist-ui` (wrong tone), `gpt-taste` and `high-end-visual-design` (heavy motion hurts low-end phones), `imagegen-*`, `image-to-code`, `brandkit` (no image generator). Use `full-output-enforcement` only on long files.

### Cut list (apply in this order if time runs short)
1. Tamil, Telugu, Malayalam, Haryanvi use machine-generated strings and are marked beta.
2. The map becomes distance-only.
3. Negotiation is limited to one counter-offer round.
4. The admin console becomes read-only lists plus approve buttons.

**Never cut:** the landing page impact counter, and the end-to-end farmer → buyer → transporter flow.

## 12. Open questions (resolved 2026-10-10)
- Transport cost: the buyer sees one delivered ₹/tonne (farmer price + transport), with a breakdown on tap.
- Support email: `arham535667@gmail.com` (passed as CDK context `supportEmail`; must be SES-verified).
- Region: `ap-south-1` for latency.
- Read-aloud voices: Hindi and English only.

### Original questions
1. **Transport cost:** bundled into one price, or shown as a separate line?
2. **Support email address** for help mails (SES must verify it).
3. **AWS region:** Mumbai `ap-south-1` (closest) vs `us-east-1` (more Bedrock models).
4. **Language and voice limits:** confirm in the AWS docs whether Translate supports Haryanvi and whether Polly has voices for pa / ta / te / ml.

## 13. How to work (process rules)

### After every phase
- Run tests and the review skills that fit the phase.
- For any frontend change: take **Playwright screenshots at one phone width and one desktop width per page**, show them to the user, and give a pass/fail table from the **`web-design-guidelines`** skill.
- **Stop and wait** for the user's go-ahead before the next phase. (The project `CLAUDE.md` also requires this.) The user approved Playwright as a dev dependency only.

### Skill notes
- `design-taste-frontend` is for landing pages only. It is not for dashboards, tables or multi-step product UI. It starts with a one-line "Design Read" and sets dials for variance, motion and density.
- Product screens use `frontend-ui-engineering` + `minimalist-ui` (warm monochrome, flat, no heavy shadows).
- The Taste Skill pack (github.com/Leonxlnx/taste-skill) is installed: 6 skills in `~/.claude/skills/` (design-taste-frontend, redesign-existing-projects, high-end-visual-design, minimalist-ui, industrial-brutalist-ui, full-output-enforcement). The full pack including `web-design-guidelines` is also available as `anthropic-skills:*`.

### Token and time budget (Claude Pro, weekly and 5-hour limits)
- Use **`/ponytail` at level full** for the whole build: the smallest complete change, no unrequested abstractions, and every reply ends with what was skipped and any risk. It never overrides validation at trust boundaries, security or accessibility.
- Stay on **Sonnet**. Use Opus only if debugging is stuck.
- Keep replies short: diffs and results, not narration.
- Read only the lines needed. Do not re-read files just edited.
- Pipe long command and deploy output through `tail` / `grep`.
- Do not run `doubt-driven-development`. Run `security-and-hardening` once near the end.
- Start a fresh session per phase. This file and the memory files carry the plan.
- Time estimate: a guess of **4–8 hours wall-clock**, not 14. The old 14 h figure was a human-effort estimate. Real time is dominated by your reviews, `cdk deploy` waits, AWS setup (SES, Bedrock access) and debugging deployed code.
- At about 30% weekly usage already, plan on a pause or a second plan.

## 14. Short decision log
- Pivot from HayMarket (hay) to Parali Setu (stubble): the hackathon theme is stubble burning.
- Role count rose from 2 (+ admin stretch) to 4, because the user wants transporters to have their own login and choose jobs.
- Tonnes over acres, because farmers sell volume.
- Email + password now, phone OTP later (DLT registration delay).
- Mock payments now.
- Phase-by-phase stops with visual review, because the user wants to see and approve each step.
