# HayMarket — Architecture

## 1. Tech stack
| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | **Next.js (React, TypeScript) + Tailwind** | Fast to build, good DX |
| Hosting | **AWS Amplify Hosting** | Git push → deployed, supports Next.js |
| Auth | **Amazon Cognito** (User Pool + groups `buyers`, `sellers`) | Managed sign-up/login, JWTs |
| API | **API Gateway (HTTP API) + AWS Lambda (Node.js 20, TypeScript)** | Serverless, cheap, scales |
| Database | **Amazon DynamoDB** (single-table design) | Serverless, fast, free tier |
| File storage | **Amazon S3** (listing photos) + **CloudFront** CDN | Pre-signed uploads, fast images |
| Notifications | **Amazon SES** (email) | Order emails |
| Events (stretch) | **DynamoDB Streams → Lambda** | Send emails when an order changes |
| AI (stretch) | **Amazon Bedrock** | Listing description and price suggestion |
| Maps (stretch) | **Amazon Location Service** | Map, geocoding, distance |
| Infra as Code | **AWS CDK (TypeScript)** | Whole stack in code |
| Logs | **CloudWatch** | Lambda logs and errors |

## 2. High-level diagram

```
                    ┌──────────────────────────┐
   Browser/Phone ──▶│  AWS Amplify Hosting     │  (Next.js frontend)
                    └────────────┬─────────────┘
                                 │  login                ┌──────────────┐
                                 ├──────────────────────▶│   Cognito    │
                                 │  JWT                  └──────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ API Gateway (HTTP API)   │── JWT authorizer (Cognito)
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐        ┌──────────────┐
                    │   Lambda functions       │───────▶│   Bedrock    │ (stretch)
                    │ listings/orders/users/.. │        └──────────────┘
                    └───┬──────────┬───────────┘        ┌──────────────┐
                        │          └───────────────────▶│ Location Svc │ (stretch)
                        ▼                               └──────────────┘
              ┌──────────────────┐   Streams   ┌──────────────┐    ┌─────┐
              │    DynamoDB      │────────────▶│ notify Lambda│───▶│ SES │
              └──────────────────┘             └──────────────┘    └─────┘

   Photos:  Browser ──(pre-signed PUT URL from Lambda)──▶ S3 ──▶ CloudFront ──▶ Browser
```

## 3. Data model (DynamoDB single table `HayMarket`)

| Entity | PK | SK | GSI1PK / GSI1SK | GSI2PK / GSI2SK |
|--------|----|----|-----------------|-----------------|
| User profile | `USER#<userId>` | `PROFILE` | – | – |
| Listing | `LISTING#<listingId>` | `META` | `SELLER#<userId>` / `LISTING#<createdAt>` | `HAYTYPE#<type>` / `<geohash5>#<price>` |
| Order | `ORDER#<orderId>` | `META` | `BUYER#<userId>` / `ORDER#<createdAt>` | `SELLER#<userId>` / `ORDER#<createdAt>` |
| Message (stretch) | `ORDER#<orderId>` | `MSG#<timestamp>` | – | – |
| Review (stretch) | `USER#<sellerId>` | `REVIEW#<orderId>` | – | – |

Access patterns:
- Get listing by id → PK
- Seller's listings → GSI1 `SELLER#id`
- Browse by hay type near a location → GSI2 `HAYTYPE#x` with a geohash prefix, then filter in Lambda
- Buyer's orders → GSI1; seller's incoming orders → GSI2

> Hackathon shortcut: if the geo search gets complicated, `Scan` plus filtering in Lambda is fine
> for under 1,000 listings.

## 4. REST API (API Gateway → Lambda)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/listings` | public | `listings/list` (query: type, baleType, maxPrice, lat, lng, radius) |
| GET | `/listings/{id}` | public | `listings/get` |
| POST | `/listings` | seller | `listings/create` |
| PUT | `/listings/{id}` | owner | `listings/update` |
| DELETE | `/listings/{id}` | owner | `listings/delete` |
| GET | `/me/listings` | seller | `listings/mine` |
| POST | `/uploads/presign` | seller | `uploads/presign` → S3 pre-signed URL |
| POST | `/orders` | buyer | `orders/create` |
| GET | `/orders/{id}` | buyer/seller of the order | `orders/get` |
| GET | `/me/orders?as=buyer\|seller` | auth | `orders/mine` |
| PATCH | `/orders/{id}/status` | seller (accept/reject/ready/complete), buyer (cancel) | `orders/updateStatus` |
| GET/PUT | `/me` | auth | `users/getMe`, `users/updateMe` |
| POST | `/ai/describe` *(stretch)* | seller | `listings/aiDescribe` (Bedrock) |
| GET/POST | `/orders/{id}/messages` *(stretch)* | parties | `messages/*` |
| POST | `/reviews` *(stretch)* | buyer | `reviews/create` |

## 5. File / folder architecture

```
eve_hack/
├── CLAUDE.md                     # Context file for Claude Code (rules, stack, commands)
├── README.md                     # Setup + deploy instructions (written later)
├── docs/
│   ├── PRD.md                    # What we're building and why
│   ├── ARCHITECTURE.md           # This file
│   └── PLAN.md                   # Step-by-step build plan / checklist
│
├── frontend/                     # Next.js app → AWS Amplify Hosting
│   ├── public/                   # logo, placeholder hay images
│   └── src/
│       ├── app/                  # Next.js App Router pages
│       │   ├── page.tsx                    # Landing page + search bar
│       │   ├── login/ , signup/            # Cognito auth pages
│       │   ├── listings/page.tsx           # Browse + filters
│       │   ├── listings/[id]/page.tsx      # Listing detail + order form
│       │   ├── sell/new/page.tsx           # Create listing
│       │   ├── sell/[id]/edit/page.tsx     # Edit listing
│       │   ├── dashboard/seller/page.tsx   # My listings + incoming orders
│       │   ├── dashboard/buyer/page.tsx    # My orders
│       │   └── orders/[id]/page.tsx        # Order detail / status
│       ├── components/
│       │   ├── ui/               # Button, Input, Card, Badge, Modal
│       │   ├── layout/           # Navbar, Footer, RoleSwitcher
│       │   ├── listings/         # ListingCard, ListingForm, FilterPanel, PhotoUploader, MapView
│       │   └── orders/           # OrderForm, OrderStatusBadge, OrderTable
│       ├── lib/                  # api.ts (fetch wrapper), auth.ts (Amplify/Cognito), config.ts
│       ├── hooks/                # useAuth, useListings, useOrders
│       └── types/                # frontend-only types
│
├── backend/                      # Lambda source (bundled by CDK with esbuild)
│   ├── src/
│   │   ├── handlers/             # one file per Lambda / route
│   │   │   ├── listings/         # list, get, create, update, delete, mine, aiDescribe
│   │   │   ├── orders/           # create, get, mine, updateStatus, notifyOnChange (stream)
│   │   │   ├── users/            # getMe, updateMe, postConfirmation (Cognito trigger)
│   │   │   ├── uploads/          # presign
│   │   │   ├── messages/         # (stretch)
│   │   │   └── reviews/          # (stretch)
│   │   ├── lib/                  # db.ts (DynamoDB client), auth.ts (read JWT claims),
│   │   │                         # response.ts (HTTP helpers), s3.ts, ses.ts, geo.ts
│   │   ├── models/               # listing.ts, order.ts, user.ts (key builders + mappers)
│   │   └── validators/           # zod schemas for request bodies
│   └── tests/                    # unit tests for handlers
│
├── infra/                        # AWS CDK app (TypeScript)
│   ├── bin/app.ts                # entry point, instantiates the stacks
│   └── lib/stacks/
│       ├── auth-stack.ts         # Cognito User Pool, groups, app client
│       ├── data-stack.ts         # DynamoDB table + GSIs + stream
│       ├── storage-stack.ts      # S3 bucket + CloudFront for photos
│       ├── api-stack.ts          # HTTP API, routes, Lambdas, IAM
│       ├── notify-stack.ts       # SES identity, stream → notify Lambda
│       └── frontend-stack.ts     # Amplify app (or deploy via the Amplify console)
│
├── shared/
│   └── types/                    # Listing, Order, User TS types used by frontend + backend
│
└── scripts/
    └── seed/                     # seed demo listings + photos for the demo
```

## 6. Security notes
- All write routes use the Cognito JWT authorizer. Ownership is checked inside the Lambda.
- The S3 bucket is private. Uploads use pre-signed PUT URLs, and reads go through CloudFront.
- The seller's exact address is only returned after their order is `ACCEPTED`.
- Each Lambda gets least-privilege IAM (CDK `grantRead` / `grantWrite`).
- SES stays in sandbox mode, so we verify the demo email addresses ahead of time.
