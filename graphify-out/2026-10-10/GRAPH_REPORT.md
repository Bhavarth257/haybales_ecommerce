# Graph Report - haybales_ecommerce  (2026-10-10)

## Corpus Check
- 141 files · ~156,306 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 778 nodes · 2574 edges · 43 communities (34 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d6d9f39`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types/index.ts
- infra/package.json
- seed.ts
- dev-server.ts
- CLAUDE.md Stack
- backend/package.json
- useI18n
- DynamoDB single table ParaliSetu
- Parali Setu PRD
- Amazon SES
- CLAUDE.md Rules
- scripts
- messages/index.ts
- Parali Setu Build Plan
- compilerOptions
- API routes table
- frontend/package.json
- auth.tsx
- ImpactCounter.tsx
- compilerOptions
- shared/package.json
- app.ts
- backend/tsconfig.json
- infra/tsconfig.json
- dev-db.sh
- CloudWatch
- Buyer segments (biomass plants, mills, feed, mushroom, kilns, packaging)
- auth-stack.ts
- smoke-local.ts
- Security model
- scripts-screens.mjs
- README.md
- AGENTS.md
- next.config.ts
- devDependencies
- state.ts
- layout.tsx
- Cognito User Pool
- I18nProvider
- ApiError

## God Nodes (most connected - your core abstractions)
1. `useI18n()` - 74 edges
2. `json()` - 56 edges
3. `Tx()` - 56 edges
4. `HttpError` - 43 edges
5. `requireRole()` - 40 edges
6. `Button()` - 36 edges
7. `clean()` - 35 edges
8. `react` - 33 edges
9. `ErrorBox()` - 32 edges
10. `@aws-sdk/lib-dynamodb` - 31 edges

## Surprising Connections (you probably didn't know these)
- `ROUTES` --implements--> `API routes table`  [INFERRED]
  backend/src/routes.ts → docs/ARCHITECTURE.md
- `caller` --references--> `Role`  [EXTRACTED]
  backend/src/lib/auth.ts → shared/types/index.ts
- `SignUpInput` --references--> `Role`  [EXTRACTED]
  frontend/src/lib/auth.tsx → shared/types/index.ts
- `Auth` --references--> `User`  [EXTRACTED]
  frontend/src/lib/auth.tsx → shared/types/index.ts
- `Skills to avoid` --references--> `Mobile-first for low-end phones`  [INFERRED]
  docs/HANDOFF.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **DynamoDB stream -> notify Lambda -> SES email pipeline** — docs_architecture_dynamodb_streams, infra_lib_stacks_notify_stack, docs_architecture_ses, docs_prd_email_notifications [EXTRACTED 1.00]
- **Offer -> order -> transport job -> delivered -> impact flow** — docs_prd_offer_state_machine, docs_architecture_accept_offer_transaction, docs_prd_order_state_machine, docs_architecture_job_index_gsi3, docs_architecture_atomic_add_impact, docs_architecture_impact_totals_item [EXTRACTED 1.00]
- **AI assistant: Bedrock chat + Polly read-aloud + code-mixed input** — docs_architecture_bedrock, docs_architecture_polly, docs_architecture_ai_routes, docs_architecture_tts_route, docs_handoff_code_mixed_input, docs_prd_ai_assistant [INFERRED 0.85]

## Communities (43 total, 9 thin omitted)

### Community 0 - "types/index.ts"
Cohesion: 0.09
Nodes (82): handler, handler, handler, handler, handler, handler, handler, handler (+74 more)

### Community 1 - "infra/package.json"
Cohesion: 0.12
Nodes (15): dependencies, aws-cdk-lib, constructs, tsx, @types/node, typescript, name, private (+7 more)

### Community 2 - "seed.ts"
Cohesion: 0.12
Nodes (29): handler, handler, fuzz(), haversineKm(), roadKm(), toPublic(), CO2_T_PER_T, DEFAULT_BASE (+21 more)

### Community 3 - "dev-server.ts"
Cohesion: 0.20
Nodes (7): compiled, CORS, PORT, Route, ROUTES, Props, @aws-sdk/client-dynamodb

### Community 4 - "CLAUDE.md Stack"
Cohesion: 0.16
Nodes (18): CLAUDE.md Stack, POST /ai/chat and /ai/price, API Gateway HTTP API, Amazon Bedrock, AWS CDK, Bedrock cross-region inference profile, AWS Lambda (Node 24, arm64, esbuild), Amazon Location Service (+10 more)

### Community 5 - "backend/package.json"
Cohesion: 0.05
Nodes (38): dependencies, @aws-sdk/client-cognito-identity-provider, @aws-sdk/client-dynamodb, @aws-sdk/client-s3, @aws-sdk/client-sesv2, @aws-sdk/lib-dynamodb, @aws-sdk/s3-presigned-post, @aws-sdk/util-dynamodb (+30 more)

### Community 6 - "useI18n"
Cohesion: 0.07
Nodes (112): BuyerPage(), Dashboard(), OfferRow(), OrderRow(), Tab, Flash, Items, ListingView() (+104 more)

### Community 7 - "DynamoDB single table ParaliSetu"
Cohesion: 0.24
Nodes (11): Accept-offer conditional transaction, Atomic ADD of impact totals on DELIVERED, DynamoDB single table ParaliSetu, DynamoDB Streams, Impact totals item (STATS / GLOBAL), Offer entity (LISTING#id / OFFER#offerId), Order + transport job entity (ORDER#id / META), Single-table data model (+3 more)

### Community 8 - "Parali Setu PRD"
Cohesion: 0.19
Nodes (11): Parali Setu (project), Haversine distance filter in Lambda, Listing entity (LISTING#id / META), Listing status PENDING_APPROVAL -> ACTIVE -> SOLD_OUT|CLOSED, Map matching farms to nearest buyers, Browse & search, Farmer listings, Parali Setu PRD (+3 more)

### Community 9 - "Amazon SES"
Cohesion: 0.25
Nodes (8): Delivered price per tonne (farmer price + transport), Amazon SES, POST /support -> SES, Open questions (resolved 2026-10-10), Support email via CDK context supportEmail, Transport cost question, Phase 4 Transporter + admin + email, Email notifications (SES)

### Community 10 - "CLAUDE.md Rules"
Cohesion: 0.13
Nodes (6): CLAUDE.md Rules, Code-mixed input understanding via Bedrock, Seven languages (en, hi, pa, bgc, ta, te, ml), Playwright phone+desktop screenshots + web-design-guidelines, Skills to avoid, Languages with English subtitles

### Community 11 - "scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, dev:api, dev:db, seed, seed:local, synth (+2 more)

### Community 12 - "messages/index.ts"
Cohesion: 0.12
Nodes (5): I18n, EN, LOADERS, Locale, Messages

### Community 13 - "Parali Setu Build Plan"
Cohesion: 0.14
Nodes (15): i18n messages + <T> component, GET /impact, Agents per phase, Build plan phases 0-7, Cut list, Rebuild graphify graph each phase, Impact counter (landing page), Never cut: impact counter + farmer->buyer->transporter flow (+7 more)

### Community 14 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, esModuleInterop, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck, strict (+1 more)

### Community 15 - "API routes table"
Cohesion: 0.29
Nodes (6): Admin routes, API routes table, Order job index GSI3 (JOB#OPEN / TRANSPORTER#id), Transporter jobs routes (/jobs, claim, status), POST /orders/{id}/pay (mock), Out of scope

### Community 16 - "frontend/package.json"
Cohesion: 0.05
Nodes (39): eslintConfig, dependencies, aws-amplify, next, @parali/shared, react, react-dom, three (+31 more)

### Community 17 - "auth.tsx"
Cohesion: 0.17
Nodes (16): setTokenGetter(), tokenGetter(), Auth, AuthProvider(), Ctx, currentToken(), DEMO_USERS, SignUpInput (+8 more)

### Community 18 - "ImpactCounter.tsx"
Cohesion: 0.08
Nodes (37): Page(), baleGeometry(), BALES, BaleScene(), Item, PALETTE, Props, Spring (+29 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "shared/package.json"
Cohesion: 0.33
Nodes (5): main, name, private, types, version

### Community 21 - "app.ts"
Cohesion: 0.14
Nodes (10): app, appUrl, auth, data, env, storage, supportEmail, ApiStack (+2 more)

### Community 22 - "backend/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../tsconfig.base.json

### Community 23 - "infra/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../tsconfig.base.json

### Community 27 - "auth-stack.ts"
Cohesion: 0.23
Nodes (10): Folder layout, Phase 1+2 Scaffold, auth, data, API, Post-confirmation Lambda, Seed script (Punjab/Haryana demo data), handlerFn(), ROOT, AuthStack, NotifyStack (+2 more)

### Community 28 - "smoke-local.ts"
Cohesion: 0.33
Nodes (3): Dev auth header Bearer dev:<userId>, Local dev (DynamoDB Local, dev API, seed, smoke), Demo script

### Community 29 - "Security model"
Cohesion: 0.25
Nodes (8): Exact location/phone revealed only to accepted order parties, Fair price band per state, Public location rounding (~1 km), Security model, SES sandbox mode, Risks and mitigations, Static export -> S3 + CloudFront fallback, Fair price band (PRD)

### Community 30 - "scripts-screens.mjs"
Cohesion: 0.22
Nodes (5): only, PAGES, server, TYPES, playwright

### Community 31 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 37 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, aws-cdk, esbuild, tsx, @types/node, typescript

### Community 38 - "state.ts"
Cohesion: 0.17
Nodes (10): nextOfferStatus(), OFFER_MOVES, OfferAction, ORDER_MOVES, OrderAction, STEPS, STATUS_TONE, Tone (+2 more)

### Community 39 - "layout.tsx"
Cohesion: 0.21
Nodes (9): body, display, metadata, RootLayout(), viewport, LanguagePicker(), Navbar(), HOME (+1 more)

### Community 40 - "Cognito User Pool"
Cohesion: 0.25
Nodes (7): AWS Amplify Hosting, Cognito groups farmers/buyers/transporters/admins, Cognito User Pool, Cognito JWT authorizer, Four roles: farmer, buyer, transporter, admin, Phase 7 Ship, Role dashboards

### Community 41 - "I18nProvider"
Cohesion: 0.29
Nodes (7): Providers(), fill(), I18nProvider(), lookup(), readLocale(), subscribe(), loadMessages()

## Ambiguous Edges - Review These
- `Parali Setu (project)` → `haybales_ecommerce README (stub)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **41 isolated node(s):** `@parali/shared`, `@types/aws-lambda`, `@types/node`, `tsx`, `typescript` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 276 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Phase 1+2 Scaffold, auth, data, API` connect `auth-stack.ts` to `seed.ts`, `dev-server.ts`, `state.ts`, `Parali Setu Build Plan`, `smoke-local.ts`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **What connects `@parali/shared`, `@types/aws-lambda`, `@types/node` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09280585286546539 - nodes in this community are weakly interconnected._
- **Why does `react` connect `useI18n` to `state.ts`, `I18nProvider`, `frontend/package.json`, `auth.tsx`, `ImpactCounter.tsx`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `infra/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `@aws-sdk/lib-dynamodb` connect `types/index.ts` to `seed.ts`, `dev-server.ts`, `backend/package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Parali Setu (project)` and `haybales_ecommerce README (stub)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._