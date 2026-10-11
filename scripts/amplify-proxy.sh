#!/usr/bin/env bash
# Make Amplify Hosting serve the API same-origin at /api (docs/AUTH.md), so the auth cookies are first-party.
# Usage: ./scripts/amplify-proxy.sh <amplifyAppId>     (after `npm run deploy` wrote cdk-outputs.json)
#
# Sources (checked 2026-10-11):
# - Reverse proxy = a 200 rewrite to an https:// target; rules run top to bottom:
#   https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html#reverse-proxy-rewrite
# - Reverse-proxy paths use the Amplify-Default cache policy (all cookies in the cache key) only when
#   cacheConfig.type=AMPLIFY_MANAGED. The default, AMPLIFY_MANAGED_NO_COOKIES, uses Amplify-DefaultNoCookies:
#   https://docs.aws.amazon.com/amplify/latest/userguide/cache-configuration-type.html
#   https://docs.aws.amazon.com/amplify/latest/userguide/cache-key-cookies.html
# - CloudFront sends cache-key cookies to the origin, and only returns Set-Cookie when cookies are forwarded:
#   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html
#   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html#ResponseCustomRemovedHeaders
# So AMPLIFY_MANAGED is required, or login cookies never reach the browser. `npm run verify-deploy` proves it.
set -euo pipefail
APP_ID="${1:?Usage: $0 <amplifyAppId>  (aws amplify list-apps --region ap-south-1)}"
cd "$(dirname "$0")/.."
API_URL=$(node -p 'require("./cdk-outputs.json").ParaliApi.ApiUrl.replace(/\/$/, "")')
case "$API_URL" in https://*.execute-api.*.amazonaws.com) ;; *) echo "Unexpected ApiUrl: $API_URL" >&2; exit 1 ;; esac

# 1. /api/* → API Gateway (200 = rewrite, i.e. reverse proxy).
# 2. Unknown paths → the static export's 404.html with a real 404. Next's export already writes
#    <route>/index.html for every page (trailingSlash: true), and Amplify serves /x/ → /x/index.html itself,
#    so no SPA catch-all is needed (detail pages use ?id=, not dynamic routes).
RULES=$(cat <<JSON
[
  { "source": "/api/<*>", "target": "${API_URL}/<*>", "status": "200" },
  { "source": "/<*>", "target": "/404.html", "status": "404" }
]
JSON
)

aws amplify update-app --region ap-south-1 --app-id "$APP_ID" \
  --custom-rules "$RULES" \
  --cache-config type=AMPLIFY_MANAGED \
  --query 'app.{rules:customRules,cache:cacheConfig.type,platform:platform}' --output json

echo "Done. Check: curl -i https://main.$APP_ID.amplifyapp.com/api/impact  (if it is not JSON yet, click Redeploy this version in the console)"
