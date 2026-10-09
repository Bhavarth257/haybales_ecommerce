# HayMarket — Product Requirements (PRD)

> Working name: **HayMarket**. A two-sided marketplace where farmers sell hay bales and
> ranchers, horse owners and feed stores buy them. Built on AWS for a hackathon.

## 1. Problem
Hay is mostly traded through word of mouth, Facebook groups and Craigslist. Buyers can't
compare quality (protein, moisture, cutting), and they can't easily tell how far away the hay is.
Hay is heavy and expensive to haul, so **distance matters as much as price**.
Sellers have no simple way to list their inventory or manage orders.

## 2. Users
| Role | Who | Main goal |
|------|-----|-----------|
| **Seller** | Farmer / hay producer | List bales, manage stock, accept orders |
| **Buyer** | Rancher, horse owner, feed store | Find nearby quality hay, order it |
| **Admin** (stretch) | Us | Moderate listings and users |

One account can be both buyer and seller (role toggle).

## 3. Core features (MVP — must ship for demo)
1. **Auth**: sign up / log in, pick a role (buyer / seller). Uses Cognito.
2. **Seller listings**: create, edit and delete a hay listing with photos.
3. **Browse & search**: filter by hay type, bale type, price, distance and quality.
4. **Listing detail page**: photos, specs, seller info, map, "Order" button.
5. **Ordering**: the buyer requests a quantity plus pickup or delivery. The seller accepts or rejects.
   Status flow: `PENDING → ACCEPTED → READY → COMPLETED` (or `REJECTED` / `CANCELLED`).
6. **Dashboards**:
   - Seller: my listings, incoming orders, stock left
   - Buyer: my orders and their status
7. **Email notifications**: new order, order accepted, and so on (SES).

## 4. Stretch features (only if time allows)
- Buyer ↔ seller messaging per order
- Ratings & reviews after an order is completed
- AI listing helper (Amazon Bedrock): writes a description from the specs and suggests a fair price
- Distance and route estimate (Amazon Location Service)
- Hay quality "lab test" PDF upload
- Real payments (Stripe test mode). The MVP uses a mock "Pay on pickup" flow.

## 5. Hay listing fields (domain model)
| Field | Example values |
|-------|----------------|
| Hay type | Alfalfa, Timothy, Orchard Grass, Bermuda, Brome, Mixed Grass, Straw |
| Bale type | Small square, Large square, Round |
| Avg weight per bale (lb/kg) | 60 lb |
| Cutting | 1st, 2nd, 3rd+ |
| Harvest date | 2026-06 |
| Quality (optional) | Protein %, RFV (relative feed value), moisture % |
| Storage | Barn, Covered, Tarped, Outside |
| Certified weed-free | yes/no |
| Price | per bale **or** per ton |
| Quantity available | 400 bales |
| Min order | 10 bales |
| Fulfilment | Pickup / Delivery (with radius and fee per mile) |
| Location | lat/lng and city/state (exact address hidden until the order is accepted) |
| Photos | 1–6 images |

## 6. Non-functional
- Mobile-friendly (farmers use phones)
- Serverless and pay-per-use, so the AWS bill stays near $0 for the hackathon
- Everything defined in Infrastructure-as-Code (CDK) so it can be redeployed in one command

## 7. Demo script (what judges will see)
1. A seller signs up, creates an "Alfalfa – 2nd cutting – small square" listing with photos.
   *(Stretch: Bedrock writes the description.)*
2. A buyer signs up and searches "alfalfa within 50 miles".
3. The buyer opens the listing and orders 40 bales for pickup.
4. The seller gets an email, accepts the order, and the buyer sees the status update.
5. Both dashboards show the result.

## 8. Success criteria
- The demo flow above runs end-to-end on a live AWS URL
- The architecture diagram shows at least 6 AWS services working together
