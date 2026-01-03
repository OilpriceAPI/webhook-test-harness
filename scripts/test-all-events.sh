#!/bin/bash
# Test all 14 OPA webhook event types

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="node $SCRIPT_DIR/../cli/index.js"

echo "=================================================="
echo "  Testing all 14 OPA Webhook Event Types"
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

$CLI trigger --all $SECRET_ARG

echo ""
echo "=================================================="
echo "  All event types sent!"
echo "  Dashboard: http://localhost:3333"
echo "=================================================="
