# CLAUDE.md

**Parali Setu**: a hackathon marketplace where farmers sell crop stubble instead of burning it. It has four roles: farmer, buyer, transporter and admin. It must be built on AWS.

## Read first
- `docs/PRD.md`: features, roles, state machines, demo script
- `docs/ARCHITECTURE.md`: AWS services, DynamoDB keys, API routes, folder layout
- `docs/PLAN.md`: phased checklist. Work on the current phase only and tick the boxes when they're done.
- `docs/HANDOFF.md`: the full decision record and open questions

## Stack
- Frontend: Next.js (App Router, TypeScript, Tailwind, next-intl) in `frontend/`, hosted on AWS Amplify
- Backend: TypeScript Lambdas in `backend/src/handlers/<domain>/<action>.ts` behind API Gateway HTTP API
- Auth: Cognito (groups `farmers`, `buyers`, `transporters`, `admins`)
- Data: DynamoDB single table `ParaliSetu`. Photos go to S3 + CloudFront.
- AI/voice/maps: Bedrock, Polly, Amazon Location Service
- Infra: AWS CDK (TypeScript) in `infra/lib/stacks/`. Region `ap-south-1`.
- Shared types: `shared/types/`

## Rules
- TypeScript everywhere. Validate request bodies with zod (`backend/src/validators`).
- One Lambda handler per route. Shared logic goes in `backend/src/lib`.
- Never hard-code AWS IDs or URLs. Use env vars and CDK outputs.
- Keep it serverless and free-tier friendly. Don't add RDS, EC2 or OpenSearch.
- Mobile-first for low-end phones: big tap targets, high contrast, no heavy animation.
- UI strings go through i18n. Headings, titles and buttons show an English subtitle in non-English locales.
- Quantities are in tonnes, prices in ₹ per tonne.
- Stop after each plan phase. For frontend phases, show phone + desktop screenshots and a `web-design-guidelines` check.
- Keep changes minimal (ponytail): no abstractions or options nobody asked for.
