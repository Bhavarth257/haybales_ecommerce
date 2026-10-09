# CLAUDE.md

HayMarket is a hackathon project: a buyer/seller marketplace for hay bales. It must be built on AWS.

## Read first
- `docs/PRD.md`: features, the hay listing fields, the demo script
- `docs/ARCHITECTURE.md`: AWS services, DynamoDB keys, API routes, folder layout
- `docs/PLAN.md`: phased checklist. Work on the current phase only and tick the boxes when they're done.

## Stack
- Frontend: Next.js (App Router, TypeScript, Tailwind) in `frontend/`, hosted on AWS Amplify
- Backend: TypeScript Lambdas in `backend/src/handlers/<domain>/<action>.ts` behind API Gateway HTTP API
- Auth: Cognito (groups `buyers`, `sellers`)
- Data: DynamoDB single table `HayMarket`. Photos go to S3 + CloudFront.
- Infra: AWS CDK (TypeScript) in `infra/lib/stacks/`
- Shared types: `shared/types/`

## Rules
- TypeScript everywhere. Validate request bodies with zod (`backend/src/validators`).
- One Lambda handler per route. Shared logic goes in `backend/src/lib`.
- Never hard-code AWS IDs or URLs. Use env vars and CDK outputs.
- Keep it serverless and free-tier friendly. Don't add RDS, EC2 or OpenSearch.
- Stop after each plan phase so the result can be tested before moving on.
