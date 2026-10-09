# Parali Setu — Product Requirements (PRD)

> **Parali Setu** ("stubble bridge"). A marketplace where farmers sell crop stubble (*parali*) for money
> instead of burning it. Buyers purchase it, and transporters carry it from farm to buyer.
> Built on AWS for the WeMakeDevs AWS hackathon (environmental theme).

## 1. Problem
Every Oct–Nov, farmers in Punjab and Haryana burn paddy stubble because clearing it costs money
and the next sowing window is short. The smoke is a major cause of north India's winter air pollution.
Stubble has buyers (biomass plants, paper and board mills, cattle-feed makers, mushroom growers,
brick kilns, packaging firms), but farmers can't reach them, and no one organises pickup.

## 2. Users (four roles, each with its own login and flow)
| Role | Who | Main goal |
|------|-----|-----------|
| **Farmer** | Paddy / wheat grower | List stubble in tonnes, get a fair price, get paid |
| **Buyer** | Biomass plant, mill, feed maker, kiln… | Find stubble near them at a fair delivered price |
| **Transporter** | Logistics agency / tractor-trolley owner | Pick which pickup jobs to take, move stubble farm → buyer |
| **Admin** | The Parali Setu team | Verify users, approve listings, track orders, see impact |

Farmers and buyers have two separate, clean sign-up flows. Help requests are emailed to the team (SES), not handled in the app.

## 3. Core features (MVP)
1. **Auth**: email + password (Cognito). The phone number is stored on the profile. Phone OTP comes later because Indian SMS needs DLT registration.
2. **Farmer listings**: crop, quantity (**tonnes**), asking price per tonne, village/district/state + map pin, harvest date, baled or loose, moisture (optional), 1–4 photos. Admin approves a listing before it goes live.
3. **Fair price band**: for each region, a suggested ₹/tonne range that factors in logistics connectivity (distance to the nearest buyers). It is shown to both sides, and Bedrock explains it.
4. **Browse & search** (buyer): filter by state, district, crop, distance and price.
5. **Offers / negotiation**: the buyer offers a price and quantity. The farmer accepts, rejects or counters, and the buyer accepts or withdraws.
   Offer: `PENDING → COUNTERED → ACCEPTED | REJECTED | WITHDRAWN`
6. **Orders + transport**: an accepted offer becomes an order, which appears as an open pickup job. Transporters choose jobs.
   Order: `AWAITING_TRANSPORT → ASSIGNED → PICKED_UP → DELIVERED → PAID` (or `CANCELLED`). Payment is **mocked**.
7. **Dashboards**: farmer (listings, offers, orders, earnings), buyer (offers, orders), transporter (open jobs, my jobs), admin (users, listings, orders, impact).
8. **Impact counter on the landing page**: tonnes collected, CO₂ avoided, PM2.5 avoided, farmers paid, ₹ paid to farmers. The emission factors are cited on the page.
9. **Languages**: English (default), Hindi, Punjabi, Haryanvi, Tamil, Telugu, Malayalam. In a non-English language, headings, titles and buttons show a faint English subtitle line. Users can type code-mixed text (Hinglish and similar).
10. **Email notifications** (SES): new offer, offer accepted, job claimed, delivered.

## 4. Differentiators (built after the core flow)
- **AI assistant** (Bedrock): chat that understands code-mixed input, has a **read-aloud** button (Polly), and explains fair prices.
- **Map** (Amazon Location Service): farms near a buyer, and distance on every listing.

## 5. Out of scope for the hackathon
Real payments, phone OTP, ratings, disputes, satellite fire detection.

## 6. Non-functional
- Mobile-first: low-end Android phones, patchy data. Big tap targets, high contrast, light pages, no heavy animation.
- Serverless and pay-per-use. The whole stack is in CDK and deploys with one command.
- India-wide design, with Punjab and Haryana seeded for the demo.

## 7. Demo script
1. The landing page shows live impact numbers.
2. A farmer (in Punjabi, with English subtitles) lists 25 t of paddy straw from Sangrur and sees the fair price band.
3. The admin approves the listing.
4. A buyer (a biomass plant in Patiala) finds it 40 km away and offers a price. The farmer counters, and the buyer accepts.
5. A transporter claims the job and marks it picked up, then delivered. The buyer clicks the mock pay button.
6. The impact counter goes up. Everyone got an email.
7. A farmer asks the assistant in Hinglish "mera price theek hai?" and the reply is read aloud.

## 8. Success criteria
- The demo runs end-to-end on a live AWS URL.
- The architecture diagram shows ~11 AWS services working together.
