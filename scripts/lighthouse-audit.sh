#!/usr/bin/env bash
set -euo pipefail

# Run reproducible Lighthouse audits in a clean Chromium context.
# Usage:
#   ./scripts/lighthouse-audit.sh mobile
#   ./scripts/lighthouse-audit.sh desktop
# Optional env vars:
#   LH_URL        Target URL (default: https://rexford-cc-website.pages.dev/)
#   LH_OUTPUT_DIR Output folder (default: output/lighthouse)

MODE="${1:-mobile}"
TARGET_URL="${LH_URL:-https://rexford-cc-website.pages.dev/}"
OUTPUT_DIR="${LH_OUTPUT_DIR:-output/lighthouse}"

case "$MODE" in
  mobile|desktop) ;;
  *)
    echo "Invalid mode: '$MODE'. Use 'mobile' or 'desktop'."
    exit 1
    ;;
esac

mkdir -p "$OUTPUT_DIR"

BASE_OUTPUT_PATH="$OUTPUT_DIR/lighthouse-${MODE}"
CHROME_FLAGS="--headless=new --disable-gpu --disable-extensions --incognito --no-first-run --no-default-browser-check"

LIGHTHOUSE_FLAGS=(
  "--output=json"
  "--output=html"
  "--output-path=$BASE_OUTPUT_PATH"
  "--chrome-flags=$CHROME_FLAGS"
  "--only-categories=performance,accessibility,best-practices,seo"
  "--throttling-method=simulate"
)

if [[ "$MODE" == "desktop" ]]; then
  LIGHTHOUSE_FLAGS+=("--preset=desktop")
fi

# Pin the Lighthouse version so results are comparable over time.
npx --yes lighthouse@12.8.2 "$TARGET_URL" "${LIGHTHOUSE_FLAGS[@]}"

echo "Saved reports:"
echo "  - ${BASE_OUTPUT_PATH}.report.json"
echo "  - ${BASE_OUTPUT_PATH}.report.html"
