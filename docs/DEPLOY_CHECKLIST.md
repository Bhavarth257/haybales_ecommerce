# Deploy day checklist

Run every command from the repo root unless a step says otherwise. Start with `source ~/.nvm/nvm.sh` and Node 20. All of it lands in `ap-south-1`.

Total: about 2.5 hours if nothing breaks. Do steps 2 and 4 first thing in the morning, because Bedrock access and SES verification can each take a while to come through.

## 0. Before you start (10 min)

- [ ] An IAM user or SSO role with `AdministratorAccess` (CDK bootstrap creates IAM roles, so anything less tends to fail halfway).
- [ ] `aws configure` with region `ap-south-1`. Check it:
  ```bash
  aws sts get-caller-identity          # prints your account id
  aws configure get region             # ap-south-1
  ```
- [ ] `npm install && npm test && npm run synth`. Expect the tests to pass and `Successfully synthesized to .../infra/cdk.out`. Docker isn't needed, because the Lambdas bundle with local esbuild.

## 1. CDK bootstrap (5 min, once per account and region)

- [ ] `npx -w infra cdk bootstrap aws://<ACCOUNT_ID>/ap-south-1`
- Expect: `✅ Environment aws://<id>/ap-south-1 bootstrapped.`

## 2. Bedrock model id (10 min, do this before deploying)

`infra/cdk.json` → `bedrockModelId` is `global.anthropic.claude-haiku-4-5-20251001-v1:0`. Nobody has checked yet that this id can be called from Mumbai.

- [ ] List the Haiku profiles that ap-south-1 can call:
  ```bash
  aws bedrock list-inference-profiles --region ap-south-1 --type-equals SYSTEM_DEFINED \
    --query "inferenceProfileSummaries[?contains(inferenceProfileId,'haiku')].inferenceProfileId" --output text
  ```
- [ ] Pick a Claude Haiku id from that list (`global.` or `apac.`) and put it in `infra/cdk.json`.
- [ ] Send one test prompt. This also triggers the one-time Anthropic use-case form if your account hasn't filled it in:
  ```bash
  aws bedrock-runtime converse --region ap-south-1 --model-id <id> \
    --messages '[{"role":"user","content":[{"text":"Say hi"}]}]' --query 'output.message.content[0].text'
  ```
- Expect: a short greeting. The Lambda IAM policy already covers any region's foundation model and inference profile, so a `global.` or `apac.` id needs no infra change.

## 3. Deploy (15–20 min)

- [ ] `npm run deploy`. Answer `y` to the IAM change prompt.
- Expect: five stacks (`ParaliData`, `ParaliAuth`, `ParaliStorage`, `ParaliApi`, `ParaliNotify`) and a `cdk-outputs.json` at the repo root with these keys:

  | Key | Looks like |
  |---|---|
  | `ParaliApi.ApiUrl` | `https://abc123.execute-api.ap-south-1.amazonaws.com` |
  | `ParaliStorage.PhotosCdnUrl` | `https://d123.cloudfront.net` |
  | `ParaliAuth.UserPoolId` | `ap-south-1_AbCdEf` |
  | `ParaliAuth.UserPoolClientId` | 26 characters |

  Ignore the `ExportsOutput…` keys; they are CDK cross-stack plumbing.
- [ ] Sanity check: `curl "$(node -p 'require("./cdk-outputs.json").ParaliApi.ApiUrl')/impact"` returns JSON.

## 4. SES (5 min, plus waiting on inboxes)

The account starts in the SES sandbox, which means it can only send to verified addresses.

- [ ] Click the verification link AWS sent to `supportEmail` (`arham535667@gmail.com`). Check spam.
- [ ] Verify the inbox of every real account you'll use in the demo (farmer, buyer, transporter, admin). Each one gets a link to click:
  ```bash
  aws sesv2 create-email-identity --region ap-south-1 --email-identity someone@gmail.com
  ```
- [ ] Check: `aws sesv2 get-email-identity --region ap-south-1 --email-identity <addr> --query VerifiedForSendingStatus` prints `true`.
- Mail sent from a gmail.com address through SES often lands in spam. That's fine for the demo; just look there.
- Cognito's own sign-up codes don't go through SES (Cognito's default sender handles them, up to 50 a day), so sign-up works before any of this.

## 5. Translations (10 min)

The hi/pa/ta/te/ml/bgc bundles are empty right now, so every language falls back to English until this runs.

- [ ] `npm run translate` (needs `translate:TranslateText`; admin has it). Expect `hi… done` and so on for each locale.
- [ ] `git add frontend/src/messages && git commit -m "UI translations" && git push`. Amplify builds from git, so the push matters.

## 6. Amplify Hosting (20–30 min)

- [ ] Amplify console in **ap-south-1** → Create new app → GitHub → this repo, branch `main`. It picks up `amplify.yml` from the repo root. Don't tick "monorepo".
- [ ] Get the env values: `npm run -s frontend-env`. Add all five as environment variables in the console (App settings → Environment variables).
- [ ] Make sure the app is a static site. Next.js 16 static export goes to `frontend/out`, and Amplify's SSR compute only supports up to Next 15:
  ```bash
  aws amplify list-apps --region ap-south-1 --query 'apps[].[appId,platform]' --output text
  aws amplify update-app --region ap-south-1 --app-id <appId> --platform WEB   # only if it says WEB_COMPUTE
  ```
- [ ] Run (or re-run) the build. Expect a URL like `https://main.d1abc.amplifyapp.com`, with the landing page showing the impact numbers.
- [ ] Sign-up screens should ask for email and password. If you see "pick a demo account" instead, the env vars weren't present at build time.

## 7. Point emails at the live site (10 min)

- [ ] Put the Amplify URL in `infra/cdk.json` → `appUrl`, with no trailing slash.
- [ ] `npm run deploy` again. Only `ParaliNotify` should change (its `APP_URL`).

## 8. Demo data and admin (10 min)

- [ ] `npm run seed`. It writes 19 listings, the demo buyers and the impact baseline into the `ParaliSetu` table. The seeded people exist only in DynamoDB and can't log in.
- [ ] In the app, sign up one account per role with SES-verified inboxes (step 4). Confirm each with the emailed code.
- [ ] Make one of them admin:
  ```bash
  USER_POOL_ID=$(node -p 'require("./cdk-outputs.json").ParaliAuth.UserPoolId') npm run make-admin -- you@example.com
  ```
  Expect `you@example.com is now an admin. Log out and back in to refresh the token.`
- [ ] As admin, verify the farmer and buyer accounts. Unverified users can browse but can't list or offer.

## 9. Run the demo script live (20 min)

- [ ] Walk through README → "Demo script" on a phone and a laptop: list, approve, offer, counter, accept, claim, pick up, deliver, pay, impact goes up, emails arrive, assistant answers and reads aloud.

## 10. Android app with the live API (20 min)

The app bakes the API URL and Cognito ids in at build time (see `docs/MOBILE.md`).

- [ ] `npm run -s frontend-env > frontend/.env.production.local` (gitignored; `next build` reads it).
- [ ] Check `frontend/capacitor.config.ts` has no `cleartext: true`.
- [ ] `npm -w frontend run cap:sync`
- [ ] `cd frontend/android && ./gradlew assembleDebug` (JDK 21, `ANDROID_HOME` set), or Build APK(s) in Android Studio.
- Expect: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. Install it and log in with a real account.

## 11. Guard rails (5 min)

- [ ] AWS Budgets → monthly cost budget, $20, email alert. The AI routes are throttled to 3 req/s in total, but nothing caps a single user.

## If something fails

- **CDK bootstrap or deploy says `SSM parameter /cdk-bootstrap/hnb659fds/version not found`:** the bootstrap went to a different account or region. Check `aws sts get-caller-identity` and `aws configure get region`, then repeat step 1. If it's `AccessDenied` on `iam:CreateRole`, your user needs `AdministratorAccess`. If a stack sits in `ROLLBACK_COMPLETE`, delete it in the CloudFormation console and deploy again.
- **SES: emails don't arrive:** `aws sesv2 get-email-identity` shows `false` for the sender or the recipient. Re-send with `create-email-identity` (delete the identity first if it says it already exists), click the link and check spam. Send errors are logged in CloudWatch under the `ParaliNotify-OnChange…` function. A failed send never blocks an order.
- **Bedrock: chat returns an error:** look at the CloudWatch log group of the `ParaliApi` function with `aichat` in its name. `AccessDeniedException` about model access means the Anthropic use-case form hasn't been filled in or approved yet (Bedrock console → Model catalog → Claude Haiku → submit, then wait a few minutes). `ValidationException` about the model identifier means the id isn't callable from ap-south-1: take one from the step 2 list and run `npx -w infra cdk deploy ParaliApi`.
- **Amplify build or env:** the build log shows `npm ci` failing → run `npm install` locally, commit `package-lock.json`, push. Deep links return 404, or the build "succeeds" but serves nothing → the platform is `WEB_COMPUTE`; switch it to `WEB` (step 6) and redeploy. Login shows demo accounts, or calls go to `localhost:4000` → the env vars are missing. They're baked in at build time, so add them and click **Redeploy this version**.

---

## Payments: plugging in a gateway

Today `POST /orders/{id}/pay` is a mock. A buyer taps Pay on a `DELIVERED` order and `backend/src/handlers/orders/pay.ts` moves it to `PAID` in one DynamoDB transaction that also does `ADD rupeesToFarmers, farmerIds` on the impact stats. (`tonnes`, `co2Tonnes` and `pm25Kg` are added earlier, on `DELIVERED`, in `jobs/updateStatus.ts`.) Keep that mock for local dev.

### Pick Razorpay in test mode

It's the most common choice in India, test mode needs no KYC, and it supports UPI, cards and netbanking with test credentials (UPI `success@razorpay`). Checked against the Razorpay docs on 2026-10-10:

- **Create the order on the server:** `POST https://api.razorpay.com/v1/orders` with Basic auth `key_id:key_secret` and body `{ amount, currency: "INR", receipt, notes }`. `amount` is an integer in **paise**, so `orderMoney(o).buyer * 100`. Put our `orderId` in `notes.orderId`.
- **Open Checkout in the browser:** load `https://checkout.razorpay.com/v1/checkout.js`, then `new Razorpay({ key, amount, currency, name, order_id, prefill, handler }).open()` from the button click.
- **Webhook:** `X-Razorpay-Signature` is the HMAC-SHA256 hex of the **raw request body** keyed with the **webhook secret**, which you set in the dashboard and which is separate from the key secret. Listen for `order.paid`. Events can arrive twice or out of order, so `x-razorpay-event-id` plus a conditional write makes the handler idempotent.
- The Checkout `handler` callback gets `razorpay_order_id`, `razorpay_payment_id` and `razorpay_signature` (HMAC-SHA256 of `order_id|payment_id` with the key secret). Use it only to show "payment received, confirming…". The webhook is what marks the order paid.

Docs: [standard integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [webhook validation](https://razorpay.com/docs/webhooks/validate-test/), [payment events](https://razorpay.com/docs/webhooks/payments/).

### New routes

| Method | Path | Auth | Does |
|---|---|---|---|
| POST | `/orders/{id}/payment-order` | buyer JWT | Checks that the buyer owns the order and it's `DELIVERED`, creates a Razorpay order for `orderMoney(o).buyer * 100` paise, stores `paymentOrderId` on our order, returns `{ provider: 'razorpay', keyId, rzpOrderId, amount }`. With no gateway configured it returns `{ provider: 'mock' }`. |
| POST | `/payments/razorpay/webhook` | none (signature instead) | Verifies the signature with `crypto.timingSafeEqual`, handles `order.paid`, looks up our order from `notes.orderId`, checks `paymentOrderId` and `amount_paid` match, then runs the same PAID transaction as the mock. A failed `#s = :from` condition means it was already paid, so reply 200 and stop. Ignore all other events with 200. |

### Files that change

- `backend/src/lib/orders.ts`: new `markPaid(o, payment?)`, moved out of `pay.ts`. It's the existing transaction (status → `PAID`, `paidAt`, impact `ADD rupeesToFarmers, farmerIds`), plus `paymentId` when there is one.
- `backend/src/handlers/orders/pay.ts`: calls `markPaid`. When `RAZORPAY_KEY_ID` is set it throws `409 Use the payment gateway`, so nobody can skip paying on the live stack.
- `backend/src/handlers/payments/createOrder.ts` and `backend/src/handlers/payments/webhook.ts`: new. Use `fetch` and `node:crypto`; the Razorpay SDK isn't needed.
- `backend/src/routes.ts`: the two routes above. The webhook gets `auth: false`.
- `shared/types`: `Order` gains optional `paymentOrderId` and `paymentId`.
- `infra/lib/stacks/api-stack.ts`: pass `RAZORPAY_KEY_ID` to the two payment Lambdas and `pay.ts`, plus SSM read access for the secrets. Give the webhook route a throttle.
- `infra/cdk.json`: context `razorpayKeyId` (the public `rzp_test_…` id; leave it empty to keep the mock).
- `frontend/src/app/order/page.tsx`: the Pay button calls `/payment-order` first. On `mock` it does what it does today. On `razorpay` it loads checkout.js once, opens it, and on success polls `GET /orders/{id}` every 2 s until the status is `PAID` (give up after 30 s with a "payment is being confirmed" message).
- Tests: a signature check against a known body and secret, and a test that a duplicate webhook doesn't double-count `rupeesToFarmers`.

### Where the secrets live

- Key secret and webhook secret go in **SSM Parameter Store SecureStrings**: `/parali/razorpay/key-secret` and `/parali/razorpay/webhook-secret`. Standard parameters are free. Create them by hand once:
  ```bash
  aws ssm put-parameter --region ap-south-1 --type SecureString --name /parali/razorpay/key-secret --value '<from dashboard>'
  aws ssm put-parameter --region ap-south-1 --type SecureString --name /parali/razorpay/webhook-secret --value '<you choose>'
  ```
  The Lambdas read them with `GetParameter WithDecryption` at cold start and cache them in module scope. Grant `ssm:GetParameter` on `arn:aws:ssm:ap-south-1:<account>:parameter/parali/razorpay/*`; the default `aws/ssm` key needs no extra KMS grant. Never put secrets in `cdk.json` or Lambda env, because both end up in the CloudFormation template.
- Webhook URL to paste into the Razorpay dashboard (Test mode → Webhooks, event `order.paid`): `<ApiUrl>/payments/razorpay/webhook`. API Gateway is public HTTPS, so test mode can reach it without a tunnel.

### Watch out for

- Only the verified webhook may move an order to `PAID` or touch `rupeesToFarmers`. Never trust the browser callback for that.
- Inside the Android app, Checkout runs in a WebView. Cards and UPI collect work there; UPI intent (opening a UPI app) may not. Demo payments on the web build.
