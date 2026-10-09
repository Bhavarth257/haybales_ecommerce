# Graph Report - haybales_ecommerce  (2026-10-10)

## Corpus Check
- 154 files · ~199,596 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 839 nodes · 2872 edges · 41 communities (34 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d6d9f39`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types/index.ts
- infra/package.json
- translate.ts
- dev-server.ts
- API routes table
- backend/package.json
- useI18n
- DynamoDB single table ParaliSetu
- Parali Setu PRD
- Bedrock cross-region inference profile
- CLAUDE.md Rules
- scripts
- messages/index.ts
- Parali Setu Build Plan
- compilerOptions
- Navbar.tsx
- frontend/package.json
- AuthProvider
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
- Phase 1+2 Scaffold, auth, data, API
- Cognito User Pool
- scripts-screens.mjs
- README.md
- AGENTS.md
- next.config.ts
- Folder layout
- te/index.ts
- devDependencies
- state.ts
- layout.tsx
- i18n.tsx

## God Nodes (most connected - your core abstractions)
1. `useI18n()` - 86 edges
2. `Tx()` - 67 edges
3. `json()` - 60 edges
4. `HttpError` - 47 edges
5. `Button()` - 43 edges
6. `ErrorBox()` - 41 edges
7. `requireRole()` - 40 edges
8. `react` - 37 edges
9. `clean()` - 35 edges
10. `@aws-sdk/lib-dynamodb` - 32 edges

## Surprising Connections (you probably didn't know these)
- `ROUTES` --implements--> `API routes table`  [INFERRED]
  backend/src/routes.ts → docs/ARCHITECTURE.md
- `CLAUDE.md Stack` --references--> `shared/types (User, Listing, Offer, Order, enums)`  [EXTRACTED]
  CLAUDE.md → docs/ARCHITECTURE.md
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

## Communities (41 total, 7 thin omitted)

### Community 0 - "types/index.ts"
Cohesion: 0.06
Nodes (124): handler, handler, handler, handler, handler, bedrock, handler, LANG (+116 more)

### Community 1 - "infra/package.json"
Cohesion: 0.12
Nodes (15): dependencies, aws-cdk-lib, constructs, tsx, @types/node, typescript, name, private (+7 more)

### Community 2 - "translate.ts"
Cohesion: 0.21
Nodes (10): @aws-sdk/client-translate, client, DIR, KEEP, LOCALES, protect(), tr(), Tree (+2 more)

### Community 3 - "dev-server.ts"
Cohesion: 0.20
Nodes (7): compiled, CORS, PORT, Route, ROUTES, Props, @aws-sdk/client-dynamodb

### Community 4 - "API routes table"
Cohesion: 0.12
Nodes (18): Admin routes, POST /ai/chat and /ai/price, API Gateway HTTP API, API routes table, Amazon Bedrock, AWS Lambda (Node 24, arm64, esbuild), POST /orders/{id}/pay (mock), Amazon Polly (+10 more)

### Community 5 - "backend/package.json"
Cohesion: 0.05
Nodes (44): dependencies, @aws-sdk/client-bedrock-runtime, @aws-sdk/client-cognito-identity-provider, @aws-sdk/client-dynamodb, @aws-sdk/client-polly, @aws-sdk/client-s3, @aws-sdk/client-sesv2, @aws-sdk/lib-dynamodb (+36 more)

### Community 6 - "useI18n"
Cohesion: 0.06
Nodes (134): Console(), Orders(), Page(), Paged(), PendingListings(), People(), ROLES, Tab (+126 more)

### Community 7 - "DynamoDB single table ParaliSetu"
Cohesion: 0.19
Nodes (13): Accept-offer conditional transaction, Atomic ADD of impact totals on DELIVERED, DynamoDB single table ParaliSetu, DynamoDB Streams, Impact totals item (STATS / GLOBAL), Order job index GSI3 (JOB#OPEN / TRANSPORTER#id), Transporter jobs routes (/jobs, claim, status), Offer entity (LISTING#id / OFFER#offerId) (+5 more)

### Community 8 - "Parali Setu PRD"
Cohesion: 0.14
Nodes (15): Parali Setu (project), CLAUDE.md Stack, AWS CDK, Cognito groups farmers/buyers/transporters/admins, Haversine distance filter in Lambda, Amazon Location Service, Four roles: farmer, buyer, transporter, admin, Map matching farms to nearest buyers (+7 more)

### Community 9 - "Bedrock cross-region inference profile"
Cohesion: 0.15
Nodes (13): Bedrock cross-region inference profile, Delivered price per tonne (farmer price + transport), Region ap-south-1 (Mumbai), Amazon SES, SES sandbox mode, POST /support -> SES, Open questions (resolved 2026-10-10), Support email via CDK context supportEmail (+5 more)

### Community 10 - "CLAUDE.md Rules"
Cohesion: 0.18
Nodes (3): CLAUDE.md Rules, Playwright phone+desktop screenshots + web-design-guidelines, Skills to avoid

### Community 11 - "scripts"
Cohesion: 0.14
Nodes (13): name, private, scripts, deploy, dev:api, dev:db, make-admin, seed (+5 more)

### Community 12 - "messages/index.ts"
Cohesion: 0.08
Nodes (8): messages, messages, EN, LOADERS, Messages, messages, messages, messages

### Community 13 - "Parali Setu Build Plan"
Cohesion: 0.17
Nodes (13): GET /impact, Agents per phase, Build plan phases 0-7, Cut list, Rebuild graphify graph each phase, Impact counter (landing page), Never cut: impact counter + farmer->buyer->transporter flow, Session Handoff decision record (+5 more)

### Community 14 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, esModuleInterop, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck, strict (+1 more)

### Community 15 - "Navbar.tsx"
Cohesion: 0.40
Nodes (5): LanguagePicker(), Navbar(), I18n, Locale, LOCALES

### Community 16 - "frontend/package.json"
Cohesion: 0.05
Nodes (39): eslintConfig, dependencies, aws-amplify, next, @parali/shared, react, react-dom, three (+31 more)

### Community 17 - "AuthProvider"
Cohesion: 0.50
Nodes (4): setTokenGetter(), AuthProvider(), currentToken(), toE164()

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
Cohesion: 0.17
Nodes (10): app, appUrl, auth, data, env, storage, supportEmail, DataStack (+2 more)

### Community 22 - "backend/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../tsconfig.base.json

### Community 23 - "infra/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../tsconfig.base.json

### Community 27 - "auth-stack.ts"
Cohesion: 0.21
Nodes (7): Post-confirmation Lambda, handlerFn(), ROOT, ApiStack, AuthStack, NotifyStack, constructs

### Community 28 - "Phase 1+2 Scaffold, auth, data, API"
Cohesion: 0.25
Nodes (5): Dev auth header Bearer dev:<userId>, Local dev (DynamoDB Local, dev API, seed, smoke), Phase 1+2 Scaffold, auth, data, API, Seed script (Punjab/Haryana demo data), Demo script

### Community 29 - "Cognito User Pool"
Cohesion: 0.17
Nodes (12): AWS Amplify Hosting, Cognito User Pool, Exact location/phone revealed only to accepted order parties, Fair price band per state, Cognito JWT authorizer, Listing entity (LISTING#id / META), Listing status PENDING_APPROVAL -> ACTIVE -> SOLD_OUT|CLOSED, Public location rounding (~1 km) (+4 more)

### Community 30 - "scripts-screens.mjs"
Cohesion: 0.25
Nodes (5): only, PAGES, server, TYPES, playwright

### Community 31 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 34 - "Folder layout"
Cohesion: 0.50
Nodes (4): Folder layout, i18n messages + <T> component, Phase 5 Languages, shared/types (User, Listing, Offer, Order, enums)

### Community 37 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, aws-cdk, esbuild, tsx, @types/node, typescript

### Community 38 - "state.ts"
Cohesion: 0.18
Nodes (9): OFFER_MOVES, OfferAction, ORDER_MOVES, OrderAction, STEPS, STATUS_TONE, Tone, OfferStatus (+1 more)

### Community 39 - "layout.tsx"
Cohesion: 0.25
Nodes (8): body, display, metadata, RootLayout(), viewport, Assistant(), Footer(), Providers()

### Community 41 - "i18n.tsx"
Cohesion: 0.29
Nodes (9): Ctx, fill(), I18nProvider(), listeners, lookup(), readLocale(), subscribe(), Vars (+1 more)

## Ambiguous Edges - Review These
- `Parali Setu (project)` → `haybales_ecommerce README (stub)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **41 isolated node(s):** `@parali/shared`, `@types/aws-lambda`, `@types/node`, `tsx`, `typescript` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 297 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Phase 1+2 Scaffold, auth, data, API` connect `Phase 1+2 Scaffold, auth, data, API` to `types/index.ts`, `dev-server.ts`, `state.ts`, `Parali Setu Build Plan`, `app.ts`, `auth-stack.ts`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **What connects `@parali/shared`, `@types/aws-lambda`, `@types/node` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05840143512058999 - nodes in this community are weakly interconnected._
- **Why does `react` connect `useI18n` to `frontend/package.json`, `i18n.tsx`, `ImpactCounter.tsx`, `state.ts`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Should `infra/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `@aws-sdk/lib-dynamodb` connect `types/index.ts` to `dev-server.ts`, `backend/package.json`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Parali Setu (project)` and `haybales_ecommerce README (stub)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._