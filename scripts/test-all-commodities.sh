#!/bin/bash
# Test price.updated webhook for all 14 OPA commodities

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="node $SCRIPT_DIR/../cli/index.js"

echo "=================================================="
echo "  Testing price.updated for all 14 Commodities"
echo "=================================================="
echo ""

# Optional: pass --secret to sign webhooks
SECRET_ARG=""
if [ -n "$WEBHOOK_SECRET" ]; then
  SECRET_ARG="--secret $WEBHOOK_SECRET"
  echo "Using WEBHOOK_SECRET for signature verification"
else
  echo "No WEBHOOK_SECRET set - signatures will not be verified"
fi
echo ""

$CLI trigger --all-commodities $SECRET_ARG

echo ""
echo "=================================================="
echo "  All commodities sent!"
echo "  Dashboard: http://localhost:3333"
echo "=================================================="
