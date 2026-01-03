import express from 'express';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { initDB, saveEvent, getEvents, getStats, clearEvents, getEventById } from './db.js';
import { verifySignature } from './signatureVerifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Check for SSL certificates
const certPath = join(__dirname, '../cert.pem');
const keyPath = join(__dirname, '../key.pem');
const useHttps = existsSync(certPath) && existsSync(keyPath);

let server;
if (useHttps) {
  const sslOptions = {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath)
  };
  server = createHttpsServer(sslOptions, app);
} else {
  server = createServer(app);
}

const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3333;
const HTTPS_PORT = process.env.HTTPS_PORT || 3334;

// Mutable webhook secret - can be set via API or environment
let webhookSecret = process.env.WEBHOOK_SECRET || null;

// Initialize database
initDB();

// Create HTTP server for local CLI testing
const httpServer = createServer(app);
const httpIo = new Server(httpServer, { cors: { origin: '*' } });

// Middleware
app.use(cors());

// Serve dashboard static files
app.use(express.static(join(__dirname, '../dashboard')));

// Parse JSON for API endpoints
app.use('/api', express.json());

// Raw body for webhook endpoint (needed for signature verification)
app.use('/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

// ============================================================
// WEBHOOK RECEIVER ENDPOINT
// ============================================================
app.post('/webhook', (req, res) => {
  const rawBody = req.body.toString();
  const signature = req.headers['x-oilpriceapi-signature'];
  const timestamp = req.headers['x-oilpriceapi-signature-timestamp'];
  const eventType = req.headers['x-oilpriceapi-event'];
  const eventId = req.headers['x-oilpriceapi-event-id'];

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error('Invalid JSON payload:', e.message);
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  // Verify signature
  const verification = verifySignature(rawBody, signature, timestamp, webhookSecret);

  // Extract commodity from payload if present
  const commodity = payload?.data?.commodity_code || payload?.data?.commodity || null;

  // Save to database
  const event = saveEvent({
    eventId: eventId || payload.id || `local_${Date.now()}`,
    eventType: eventType || payload.event || 'unknown',
    payload: rawBody,
    headers: JSON.stringify(req.headers),
    signature,
    signatureTimestamp: timestamp,
    signatureValid: verification.valid,
    signatureError: verification.error,
    commodity
  });

  // Emit to connected dashboards (both HTTP and HTTPS)
  io.emit('webhook', {
    ...event,
    payload: payload
  });
  httpIo.emit('webhook', {
    ...event,
    payload: payload
  });

  // Log to console
  const sigStatus = verification.valid ? '\x1b[32mvalid\x1b[0m' : `\x1b[31m${verification.error || 'invalid'}\x1b[0m`;
  console.log(`[${new Date().toISOString()}] Received: ${eventType || payload.event} | Signature: ${sigStatus}${commodity ? ` | ${commodity}` : ''}`);

  res.status(200).json({ status: 'received', eventId: event.eventId });
});

// ============================================================
// API ENDPOINTS FOR DASHBOARD
// ============================================================

// Get all events
app.get('/api/events', (req, res) => {
  const { eventType, commodity, limit = 100, offset = 0 } = req.query;
  const result = getEvents({ eventType, commodity, limit: parseInt(limit), offset: parseInt(offset) });
  res.json(result);
});

// Get single event by ID
app.get('/api/events/:id', (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json(event);
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const stats = getStats();
  res.json({ stats });
});

// Clear all events
app.delete('/api/events', (req, res) => {
  clearEvents();
  io.emit('clear');
  httpIo.emit('clear');
  res.json({ status: 'cleared' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    webhookSecret: webhookSecret ? 'configured' : 'not configured'
  });
});

// Get current secret status
app.get('/api/secret', (req, res) => {
  res.json({
    configured: !!webhookSecret,
    // Show first/last 4 chars if configured (for verification)
    preview: webhookSecret ? `${webhookSecret.slice(0, 4)}...${webhookSecret.slice(-4)}` : null
  });
});

// Set webhook secret dynamically
app.post('/api/secret', (req, res) => {
  const { secret } = req.body;

  if (!secret || typeof secret !== 'string') {
    return res.status(400).json({ error: 'Secret is required and must be a string' });
  }

  if (secret.length < 16) {
    return res.status(400).json({ error: 'Secret must be at least 16 characters' });
  }

  webhookSecret = secret;

  // Notify connected clients
  io.emit('secretUpdated', { configured: true });
  httpIo.emit('secretUpdated', { configured: true });

  console.log(`[${new Date().toISOString()}] Webhook secret updated via API`);

  res.json({
    success: true,
    message: 'Webhook secret configured',
    preview: `${secret.slice(0, 4)}...${secret.slice(-4)}`
  });
});

// Clear webhook secret
app.delete('/api/secret', (req, res) => {
  webhookSecret = null;

  io.emit('secretUpdated', { configured: false });
  httpIo.emit('secretUpdated', { configured: false });

  console.log(`[${new Date().toISOString()}] Webhook secret cleared`);

  res.json({ success: true, message: 'Webhook secret cleared' });
});

// Serve dashboard for root path
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../dashboard/index.html'));
});

// ============================================================
// SOCKET.IO CONNECTIONS
// ============================================================
io.on('connection', (socket) => {
  console.log('Dashboard connected (HTTPS):', socket.id);
  socket.on('disconnect', () => {
    console.log('Dashboard disconnected (HTTPS):', socket.id);
  });
});

httpIo.on('connection', (socket) => {
  console.log('Dashboard connected (HTTP):', socket.id);
  socket.on('disconnect', () => {
    console.log('Dashboard disconnected (HTTP):', socket.id);
  });
});

// ============================================================
// START SERVERS
// ============================================================

// Start HTTP server (for local CLI testing)
httpServer.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('  OPA Webhook Test Harness');
  console.log('='.repeat(60));
  console.log(`  HTTP:       http://localhost:${PORT}`);
  console.log(`  Dashboard:  http://localhost:${PORT}`);
  console.log(`  CLI:        http://localhost:${PORT}/webhook`);
});

// Start HTTPS server (for production webhooks) if certs exist
if (useHttps) {
  server.listen(HTTPS_PORT, () => {
    console.log(`  HTTPS:      https://localhost:${HTTPS_PORT}`);
    console.log(`  Webhook:    https://localhost:${HTTPS_PORT}/webhook`);
    console.log(`  Secret:     ${webhookSecret ? 'Configured' : 'Not configured (set via UI or POST /api/secret)'}`);
    console.log('='.repeat(60));
    console.log('');
  });
} else {
  console.log(`  Webhook:    http://localhost:${PORT}/webhook`);
  console.log(`  Secret:     ${webhookSecret ? 'Configured' : 'Not configured (set via UI or POST /api/secret)'}`);
  console.log('='.repeat(60));
  console.log('');
}
