#!/usr/bin/env bash
# Creates UTM and GA custom text attributes on the Attio People object.
# Usage: ./scripts/attio-create-attributes.sh
#
# Requires ATTIO_API_KEY in .env (or exported in the environment).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load API key from .env if not already exported
if [[ -z "${ATTIO_API_KEY:-}" ]]; then
  if [[ -f "$PROJECT_ROOT/.env" ]]; then
    ATTIO_API_KEY="$(grep -E '^ATTIO_API_KEY=' "$PROJECT_ROOT/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")"
  fi
fi

if [[ -z "${ATTIO_API_KEY:-}" ]]; then
  echo "ERROR: ATTIO_API_KEY not found in environment or .env" >&2
  exit 1
fi

BASE_URL="https://api.attio.com/v2/objects/people/attributes"

# Attributes to create: api_slug and display title
ATTRIBUTES=(
  "utm_source:UTM Source"
  "utm_medium:UTM Medium"
  "utm_campaign:UTM Campaign"
  "utm_term:UTM Term"
  "utm_content:UTM Content"
  "gclid:GCLID"
  "ga_client_id:GA Client ID"
  "landing_page:Landing Page"
  "referrer:Referrer"
)

for entry in "${ATTRIBUTES[@]}"; do
  slug="${entry%%:*}"
  title="${entry#*:}"

  echo "Creating attribute: ${slug} (${title})..."

  HTTP_STATUS=$(curl -s -o /tmp/attio_response.json -w "%{http_code}" \
    -X POST "$BASE_URL" \
    -H "Authorization: Bearer ${ATTIO_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"data\": {
        \"title\": \"${title}\",
        \"api_slug\": \"${slug}\",
        \"description\": \"Auto-captured from website lead form.\",
        \"type\": \"text\",
        \"is_multiselect\": false,
        \"is_required\": false,
        \"is_unique\": false,
        \"config\": {}
      }
    }")

  if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201" ]]; then
    echo "  ✓ Created successfully"
  elif [[ "$HTTP_STATUS" == "409" ]]; then
    echo "  ⏭ Already exists (skipped)"
  else
    echo "  ✗ Failed (HTTP ${HTTP_STATUS}):"
    cat /tmp/attio_response.json
    echo ""
  fi
done

rm -f /tmp/attio_response.json
echo ""
echo "Done. Verify attributes at https://app.attio.com → People → Attributes."
