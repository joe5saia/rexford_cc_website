#!/usr/bin/env bash
# Add custom domains to the Cloudflare Pages project via the API.
#
# Prerequisites:
#   1. Each apex domain must already be onboarded as a Cloudflare zone with
#      nameservers pointing to Cloudflare.
#   2. CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set, or a .env
#      file must exist in the project root.
#
# Usage:
#   ./scripts/add-custom-domains.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env if present and vars are not already set.
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  if [[ -f "$PROJECT_ROOT/.env" ]]; then
    # shellcheck disable=SC1091
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
  fi
fi

# Validate required env vars.
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required (set it or add to .env)}"

PAGES_PROJECT="rexford-cc-website"
API_BASE="https://api.cloudflare.com/client/v4"

# Domains to add as custom domains on the Pages project.
DOMAINS=(
  "rexfordfleetfinance.com"
  "rexfordequipmentfinance.com"
  "rexfordpropertyfinance.com"
  "rexfordfundingpros.com"
  "rexfordlendinggroup.com"
)

echo "=== Adding custom domains to Pages project: ${PAGES_PROJECT} ==="
echo ""

for domain in "${DOMAINS[@]}"; do
  echo "→ Adding ${domain}..."
  response=$(curl -s -w "\n%{http_code}" \
    "${API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PAGES_PROJECT}/domains" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"${domain}\"}")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  success=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "unknown")

  if [[ "$success" == "True" ]]; then
    status=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['status'])" 2>/dev/null || echo "unknown")
    echo "  ✅ ${domain} — status: ${status} (HTTP ${http_code})"
  else
    error=$(echo "$body" | python3 -c "import sys,json; errs=json.load(sys.stdin).get('errors',[]); print(errs[0]['message'] if errs else 'unknown error')" 2>/dev/null || echo "unknown error")
    echo "  ❌ ${domain} — ${error} (HTTP ${http_code})"
  fi
  echo ""
done

echo "=== Listing all custom domains ==="
curl -s "${API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PAGES_PROJECT}/domains" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    for d in data.get('result', []):
        print(f\"  {d['name']:40s} status={d['status']}\")
else:
    print('  Failed to list domains')
"
