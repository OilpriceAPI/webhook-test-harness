# OPA Webhook Test Harness

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

A local development tool for capturing, verifying, and inspecting [OilPriceAPI](https://oilpriceapi.com) webhooks in real-time.

## Features

- **Real-time Dashboard** - Watch webhooks arrive instantly via WebSocket
- **Signature Verification** - Automatic HMAC-SHA256 validation
- **14 Event Types** - Support for all OilPriceAPI webhook events
- **14 Commodities** - WTI, Brent, Natural Gas, Gold, Forex, and more
- **CLI Tool** - Send test webhooks and manage captures
- **Docker Ready** - One-command deployment
- **Tunnel Friendly** - Works with ngrok, Cloudflare Tunnel, Tailscale

## Quick Start

```bash
# Clone the repo
git clone https://github.com/OilpriceAPI/webhook-test-harness.git
cd webhook-test-harness

# Install dependencies
npm install

# Start the harness
npm start
```

Open http://localhost:3333 - you'll see the dashboard ready to receive webhooks.

### Expose to the Internet (for production webhooks)

OilPriceAPI needs a public URL to send webhooks. Use ngrok:

```bash
# In another terminal
npx ngrok http 3333
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and register it in your [OilPriceAPI dashboard](https://oilpriceapi.com/dashboard/webhooks).

## Dashboard

The web dashboard provides:

- **Settings Panel** - Configure your webhook secret and copy your webhook URL
- **Event List** - All captured webhooks with filtering
- **Event Details** - Full payload inspection with syntax highlighting
- **Signature Status** - Green/red indicator for valid/invalid signatures
- **Real-time Updates** - Events appear instantly via Socket.io

### Configuration via Dashboard

1. Click **Settings** in the top-right
2. Copy your **Webhook URL** and register it with OilPriceAPI
3. Paste your **Webhook Secret** (from OilPriceAPI) to enable signature verification
4. Click **Test** to verify the connection

## CLI Commands

### Send Test Webhooks

```bash
# Send a single price update
npm run cli -- trigger -e price.updated -c WTI_USD

# Send all 14 event types
npm run cli -- trigger --all

# Send price.updated for all 14 commodities
npm run cli -- trigger --all-commodities

# With signature (for testing verification)
npm run cli -- trigger --all --secret YOUR_WEBHOOK_SECRET
```

### View Captured Webhooks

```bash
# List all captured webhooks
npm run cli -- list

# Filter by event type
npm run cli -- list -e price.updated

# Filter by commodity
npm run cli -- list -c WTI_USD
```

### Other Commands

```bash
npm run cli -- stats        # Show statistics
npm run cli -- clear        # Clear all captured webhooks
npm run cli -- events       # List all 14 event types
npm run cli -- commodities  # List all 14 commodities
npm run cli -- verify       # Manually verify a signature
```

## Event Types

| Category | Events |
|----------|--------|
| **Price** | `price.updated`, `price.significant_change`, `price.threshold` |
| **Drilling** | `drilling.rig_count.updated`, `drilling.frac_spread.updated`, `drilling.well_permit.new`, `drilling.well_permit.updated`, `drilling.well_permits.batch`, `drilling.duc_well.updated` |
| **API** | `api.limit.warning`, `api.limit.exceeded` |
| **Subscription** | `subscription.updated`, `subscription.cancelled` |
| **Analytics** | `analytics_alert.triggered` |

## Commodities

```
WTI_USD, BRENT_CRUDE_USD, NATURAL_GAS_USD, NATURAL_GAS_GBP,
COAL_USD, GOLD_USD, GBP_USD, EUR_USD, DUBAI_CRUDE_USD,
DUTCH_TTF_EUR, MGO_05S_USD, VLSFO_USD, HFO_380_USD, HFO_180_USD
```

## Signature Verification

OilPriceAPI signs all webhooks using HMAC-SHA256. The harness automatically verifies signatures when you configure your secret.

**Headers sent by OilPriceAPI:**
- `X-OilPriceAPI-Signature` - HMAC-SHA256 signature (hex)
- `X-OilPriceAPI-Signature-Timestamp` - Unix timestamp
- `X-OilPriceAPI-Event` - Event type
- `X-OilPriceAPI-Event-ID` - Unique event ID

**Signature payload format:**
```
{json_payload}.{timestamp}
```

**Verification algorithm:**
```javascript
const expected = crypto
  .createHmac('sha256', secret)
  .update(`${jsonPayload}.${timestamp}`)
  .digest('hex');
```

## Docker

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3333` |
| `WEBHOOK_SECRET` | Your OilPriceAPI webhook secret | (none) |
| `OPA_API_KEY` | API key for production tests | (none) |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook` | POST | Receive webhooks |
| `/api/events` | GET | List captured events |
| `/api/events/:id` | GET | Get single event |
| `/api/events` | DELETE | Clear all events |
| `/api/stats` | GET | Get statistics |
| `/health` | GET | Health check |

## Tunnel Options

### ngrok (Recommended for testing)
```bash
npx ngrok http 3333
```

### Cloudflare Tunnel (Free, permanent URL)
```bash
cloudflared tunnel --url http://localhost:3333
```

### Tailscale (If you're already using it)
Your Tailscale IP works directly - just register `http://your-tailscale-ip:3333/webhook`

## File Structure

```
opa-webhook-harness/
├── server/
│   ├── index.js              # Express server + Socket.io
│   ├── db.js                 # SQLite storage
│   └── signatureVerifier.js  # HMAC verification
├── cli/
│   ├── index.js              # CLI commands
│   └── samplePayloads.js     # Payload generators
├── dashboard/
│   └── index.html            # Web UI (Tailwind + Socket.io)
├── scripts/
│   ├── test-all-events.sh    # Test all event types
│   ├── test-all-commodities.sh
│   └── full-test.sh
├── package.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## Troubleshooting

### Webhooks not arriving?
1. Check your webhook URL is publicly accessible
2. Verify the URL is registered correctly in OilPriceAPI dashboard
3. Check firewall/router settings if self-hosting

### Signature shows "Invalid"?
1. Ensure you've entered your webhook secret in Settings
2. Secrets are case-sensitive - copy exactly from OilPriceAPI
3. Check the harness isn't modifying the payload (raw body required)

### Dashboard not updating?
1. Check the connection status indicator (top-right)
2. Refresh the page to reconnect Socket.io
3. Verify the server is running (`npm start`)

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with care for the [OilPriceAPI](https://oilpriceapi.com) community.
