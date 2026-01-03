import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../webhooks.db');
const db = new Database(dbPath);

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE,
      event_type TEXT NOT NULL,
      commodity TEXT,
      payload TEXT NOT NULL,
      headers TEXT NOT NULL,
      signature TEXT,
      signature_timestamp TEXT,
      signature_valid INTEGER DEFAULT 0,
      signature_error TEXT,
      received_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_event_type ON webhook_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_commodity ON webhook_events(commodity);
    CREATE INDEX IF NOT EXISTS idx_received_at ON webhook_events(received_at);
  `);

  console.log('Database initialized at:', dbPath);
}

export function saveEvent({
  eventId,
  eventType,
  payload,
  headers,
  signature,
  signatureTimestamp,
  signatureValid,
  signatureError,
  commodity
}) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO webhook_events
    (event_id, event_type, commodity, payload, headers, signature, signature_timestamp, signature_valid, signature_error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    eventId,
    eventType,
    commodity,
    payload,
    headers,
    signature,
    signatureTimestamp,
    signatureValid ? 1 : 0,
    signatureError
  );

  return {
    id: info.lastInsertRowid,
    eventId,
    eventType,
    commodity,
    signatureValid,
    signatureError,
    receivedAt: new Date().toISOString()
  };
}

export function getEvents({ eventType, commodity, limit = 100, offset = 0 }) {
  let query = 'SELECT * FROM webhook_events';
  const params = [];
  const conditions = [];

  if (eventType) {
    conditions.push('event_type = ?');
    params.push(eventType);
  }

  if (commodity) {
    conditions.push('commodity = ?');
    params.push(commodity);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY received_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const events = db.prepare(query).all(...params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM webhook_events';
  if (conditions.length > 0) {
    countQuery += ' WHERE ' + conditions.join(' AND ');
  }
  const total = db.prepare(countQuery).get(...params.slice(0, -2));

  return { events, total: total.count };
}

export function getEventById(id) {
  return db.prepare('SELECT * FROM webhook_events WHERE id = ?').get(id);
}

export function getStats() {
  return db.prepare(`
    SELECT
      event_type,
      COUNT(*) as count,
      SUM(CASE WHEN signature_valid = 1 THEN 1 ELSE 0 END) as valid_signatures,
      MAX(received_at) as last_received
    FROM webhook_events
    GROUP BY event_type
    ORDER BY count DESC
  `).all();
}

export function clearEvents() {
  db.exec('DELETE FROM webhook_events');
  console.log('All events cleared');
}

export default db;
