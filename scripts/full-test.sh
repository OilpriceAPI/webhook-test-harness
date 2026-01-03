#!/bin/bash
# Full test suite: all events + all commodities

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================="
echo "  OPA Webhook Test Harness - Full Test Suite"
echo "=================================================="
echo ""

# Run all events
$SCRIPT_DIR/test-all-events.sh

echo ""
sleep 1

# Run all commodities
$SCRIPT_DIR/test-all-commodities.sh

echo ""
echo "=================================================="
echo "  Full test suite complete!"
echo "  Total: 14 event types + 14 commodities = 28 webhooks"
echo "  Dashboard: http://localhost:3333"
echo "=================================================="
