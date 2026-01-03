# OPA Webhook Test Harness

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

A local development tool for capturing, verifying, and inspecting [OilPriceAPI](https://oilpriceapi.com) webhooks in real-time.

**Documentation Links:**
- [OilPriceAPI Webhooks Guide](https://docs.oilpriceapi.com/webhooks/) - Complete webhook API documentation
- [Signature Verification Guide](https://docs.oilpriceapi.com/guides/webhook-verification.html) - Security best practices
- [OilPriceAPI Dashboard](https://oilpriceapi.com/dashboard/webhooks) - Manage your webhooks

## Features

- **Real-time Dashboard** - Watch webhooks arrive instantly via WebSocket
- **Signature Verification** - Automatic HMAC-SHA256 validation
- **Dynamic Secret Configuration** - Set webhook secret via UI or API without restart
- **14 Event Types** - Support for all OilPriceAPI webhook events
- **14 Commodities** - WTI, Brent, Natural Gas, Gold, Forex, and more
- **CLI Tool** - Send test webhooks and manage captures
- **SQLite Storage** - Persistent webhook history
- **Docker Ready** - One-command deployment
- **Tunnel Friendly** - Works with ngrok, Cloudflare Tunnel, localtunnel

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

Open http://localhost:3333 to see the dashboard.

## Production Webhook Setup

To receive real webhooks from OilPriceAPI, you need a public URL. Here's the complete flow:

### Step 1: Start the Harness

```bash
npm start
```

### Step 2: Create a Public Tunnel

Choose one of these options:

**Option A: Cloudflare Tunnel (Recommended - Free, no signup)**
```bash
# Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
cloudflared tunnel --url http://localhost:3333
# You'll get a URL like: https://random-words.trycloudflare.com
```

**Option B: ngrok (Requires free account)**
```bash
npx ngrok http 3333
# You'll get a URL like: https://abc123.ngrok.io
```

**Option C: localtunnel (Free, less stable)**
```bash
npx localtunnel --port 3333
# You'll get a URL like: https://random-subdomain.loca.lt
```

### Step 3: Register Webhook in OilPriceAPI

1. Go to [OilPriceAPI Dashboard](https://oilpriceapi.com/dashboard/webhooks)
2. Click **New Webhook**
3. Enter your tunnel URL + `/webhook` (e.g., `https://random-words.trycloudflare.com/webhook`)
4. Select events you want to receive
5. Click **Save** - copy the **Webhook Secret** shown

### Step 4: Configure Secret for Signature Verification

You have two options:

**Via API (Recommended):**
```bash
curl -X POST http://localhost:3333/api/secret \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_WEBHOOK_SECRET_HERE"}'
```

**Via Environment Variable (on startup):**
```bash
WEBHOOK_SECRET=your_secret_here npm start
```

### Step 5: Test It

In the OilPriceAPI dashboard, click **Test** on your webhook. You should see:
- The event appear in the harness dashboard
- **Signature: valid** (green) if secret is configured correctly

## Dashboard

The web dashboard at http://localhost:3333 provides:

```
+------------------------------------------------------------------+
|  OPA Webhook Test Harness                    [Settings] [Clear]  |
+------------------------------------------------------------------+
|                                                                  |
|  Total: 42 webhooks captured                                     |
|                                                                  |
|  [All Events ▼]  [All Commodities ▼]                            |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | price.updated          | WTI_USD    | Signature: valid ✓  |  |
|  | 1/3/2026, 12:33:11 PM  |            |                      |  |
|  +------------------------------------------------------------+  |
|  | price.significant_change | BRENT    | Signature: valid ✓  |  |
|  | 1/3/2026, 12:32:46 PM    |          |                      |  |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

### Features

- **Real-time Updates** - Events appear instantly via Socket.io
- **Event Filtering** - Filter by event type or commodity
- **Payload Inspector** - Click any event to see full JSON payload
- **Signature Status** - Green checkmark for valid, red X for invalid
- **Clear All** - Reset captured webhooks

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

# Show latest 10
npm run cli -- list --limit 10
```

### Other Commands

```bash
npm run cli -- stats        # Show statistics
npm run cli -- clear        # Clear all captured webhooks
npm run cli -- events       # List all 14 event types
npm run cli -- commodities  # List all 14 commodities
npm run cli -- verify       # Manually verify a signature
npm run cli -- help         # Show all commands
```

## Event Types

OilPriceAPI sends webhooks for these events:

| Category | Event | Description |
|----------|-------|-------------|
| **Price** | `price.updated` | Any price change |
| | `price.significant_change` | Major price movement (>1%) |
| | `price.threshold` | Custom threshold crossed |
| **Drilling** | `drilling.rig_count.updated` | Baker Hughes rig count update |
| | `drilling.frac_spread.updated` | Frac spread count update |
| | `drilling.well_permit.new` | New well permit issued |
| | `drilling.well_permit.updated` | Well permit status change |
| | `drilling.well_permits.batch` | Batch of permit updates |
| | `drilling.duc_well.updated` | DUC well inventory change |
| **API** | `api.limit.warning` | Approaching usage limit (80%) |
| | `api.limit.exceeded` | Usage limit reached |
| **Subscription** | `subscription.updated` | Plan changed |
| | `subscription.cancelled` | Subscription cancelled |
| **Analytics** | `analytics_alert.triggered` | Custom analytics alert |

## Commodities

All 14 commodities supported by OilPriceAPI:

| Code | Name |
|------|------|
| `WTI_USD` | West Texas Intermediate Crude |
| `BRENT_CRUDE_USD` | Brent Crude Oil |
| `NATURAL_GAS_USD` | US Natural Gas (Henry Hub) |
| `NATURAL_GAS_GBP` | UK Natural Gas (NBP) |
| `COAL_USD` | Coal (Newcastle) |
| `GOLD_USD` | Gold Spot |
| `GBP_USD` | British Pound / US Dollar |
| `EUR_USD` | Euro / US Dollar |
| `DUBAI_CRUDE_USD` | Dubai Crude Oil |
| `DUTCH_TTF_EUR` | Dutch TTF Natural Gas |
| `MGO_05S_USD` | Marine Gas Oil 0.5% Sulfur |
| `VLSFO_USD` | Very Low Sulfur Fuel Oil |
| `HFO_380_USD` | Heavy Fuel Oil 380 CST |
| `HFO_180_USD` | Heavy Fuel Oil 180 CST |

## Signature Verification

OilPriceAPI signs all webhooks using HMAC-SHA256 for security.

### Headers

Every webhook includes these headers:

| Header | Description |
|--------|-------------|
| `X-OilPriceAPI-Signature` | HMAC-SHA256 signature (hex) |
| `X-OilPriceAPI-Signature-Timestamp` | Unix timestamp |
| `X-OilPriceAPI-Event` | Event type (e.g., `price.updated`) |
| `X-OilPriceAPI-Event-ID` | Unique event ID (UUID) |

### Verification Algorithm

The signature is computed as:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, timestamp, secret) {
  // Signature payload format: {json}.{timestamp}
  const signaturePayload = `${JSON.stringify(payload)}.${timestamp}`;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Security Best Practices

1. **Always verify signatures in production** - Prevents spoofed webhooks
2. **Check timestamp freshness** - Reject webhooks older than 5 minutes
3. **Use constant-time comparison** - Prevents timing attacks
4. **Store secrets securely** - Use environment variables, not code

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook` | POST | Receive webhooks from OilPriceAPI |
| `/api/events` | GET | List captured events (supports `?eventType=`, `?commodity=`, `?limit=`, `?offset=`) |
| `/api/events/:id` | GET | Get single event by ID |
| `/api/events` | DELETE | Clear all captured events |
| `/api/stats` | GET | Get capture statistics |
| `/api/secret` | GET | Check if secret is configured |
| `/api/secret` | POST | Set webhook secret dynamically |
| `/api/secret` | DELETE | Clear webhook secret |
| `/health` | GET | Health check endpoint |

### Dynamic Secret Configuration

Set the webhook secret at runtime without restarting:

```bash
# Set secret
curl -X POST http://localhost:3333/api/secret \
  -H "Content-Type: application/json" \
  -d '{"secret": "your_webhook_secret_here"}'

# Response:
# {"success": true, "message": "Webhook secret configured", "preview": "7ea1...ac31"}

# Check status
curl http://localhost:3333/api/secret
# {"configured": true, "preview": "7ea1...ac31"}

# Clear secret
curl -X DELETE http://localhost:3333/api/secret
# {"success": true, "message": "Webhook secret cleared"}
```

## Docker

### Quick Start

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### With Secret

```bash
WEBHOOK_SECRET=your_secret docker-compose up
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  webhook-harness:
    build: .
    ports:
      - "3333:3333"
    environment:
      - PORT=3333
      - WEBHOOK_SECRET=${WEBHOOK_SECRET:-}
    volumes:
      - ./data:/app/data  # Persist webhook database
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3333` |
| `WEBHOOK_SECRET` | Your OilPriceAPI webhook secret (can also set via API) | (none) |
| `OPA_API_KEY` | API key for production webhook testing | (none) |

### .env File

```bash
cp .env.example .env
# Edit .env with your values
```

## File Structure

```
opa-webhook-harness/
├── server/
│   ├── index.js              # Express server + Socket.io + API
│   ├── db.js                 # SQLite storage layer
│   └── signatureVerifier.js  # HMAC-SHA256 verification
├── cli/
│   ├── index.js              # CLI commands
│   └── samplePayloads.js     # Test payload generators
├── dashboard/
│   └── index.html            # Web UI (Tailwind + Alpine.js + Socket.io)
├── scripts/
│   ├── test-all-events.sh    # Test all event types
│   ├── test-all-commodities.sh
│   └── full-test.sh
├── data/
│   └── webhooks.db           # SQLite database (gitignored)
├── package.json
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

## Tunnel Comparison

| Tool | Pros | Cons |
|------|------|------|
| **Cloudflare Tunnel** | Free, no signup, reliable | URL changes on restart |
| **ngrok** | Stable URLs (paid), great UI | Free tier requires signup, limits |
| **localtunnel** | Free, no signup | Less stable, password prompt |
| **Tailscale** | Permanent, secure | Requires setup |

### Cloudflare Tunnel (Recommended)

```bash
# Install (macOS)
brew install cloudflare/cloudflare/cloudflared

# Install (Linux)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Run
cloudflared tunnel --url http://localhost:3333
```

## Troubleshooting

### Webhooks not arriving?

1. **Check tunnel is running** - The URL should be accessible from the internet
2. **Verify webhook URL** - Must include `/webhook` path (e.g., `https://xyz.trycloudflare.com/webhook`)
3. **Check OilPriceAPI dashboard** - Webhook status should be "active"
4. **Test manually:**
   ```bash
   curl -X POST https://your-tunnel-url.com/webhook \
     -H "Content-Type: application/json" \
     -d '{"event": "test", "data": {}}'
   ```

### Signature shows "No secret configured"?

1. Set the secret via API:
   ```bash
   curl -X POST http://localhost:3333/api/secret \
     -H "Content-Type: application/json" \
     -d '{"secret": "YOUR_SECRET"}'
   ```
2. Or restart with environment variable:
   ```bash
   WEBHOOK_SECRET=your_secret npm start
   ```

### Signature shows "Invalid"?

1. **Copy secret exactly** - Secrets are case-sensitive
2. **Check for whitespace** - No leading/trailing spaces
3. **Verify it's the correct webhook** - Each webhook has a unique secret
4. **Check timestamp** - Webhooks older than 5 minutes may be rejected

### Dashboard not updating?

1. **Check connection indicator** - Should show "Connected" in top-right
2. **Refresh the page** - Reconnects Socket.io
3. **Check server is running** - `curl http://localhost:3333/health`

### Port already in use?

```bash
# Find and kill the process
lsof -i :3333
kill -9 <PID>

# Or use a different port
PORT=4444 npm start
```

## Example Webhook Payload

```json
{
  "id": "079dfeb2-6391-4e52-88fd-6f8e149cea6c",
  "event": "price.updated",
  "created_at": "2026-01-03T17:39:28Z",
  "data": {
    "commodity": "WTI_USD",
    "commodity_code": "WTI_USD",
    "name": "spot_price",
    "value": 72.45,
    "previous_value": 72.38,
    "change_percent": 0.097,
    "currency": "USD",
    "unit": "barrel",
    "source": "oilprice.business_insider",
    "timestamp": "2026-01-03T17:39:28Z"
  }
}
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with care for the [OilPriceAPI](https://oilpriceapi.com) community.

**Resources:**
- [OilPriceAPI Webhooks Documentation](https://docs.oilpriceapi.com/webhooks/) - Full API reference
- [Signature Verification Guide](https://docs.oilpriceapi.com/guides/webhook-verification.html) - Security implementation
- [API Documentation](https://docs.oilpriceapi.com) - Complete API reference

**Questions?** Open an issue or contact [support@oilpriceapi.com](mailto:support@oilpriceapi.com)
