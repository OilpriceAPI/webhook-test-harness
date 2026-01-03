import crypto from 'crypto';

/**
 * OilPriceAPI Webhook Signature Verification
 *
 * Signature format: HMAC-SHA256 of "{payload_json}.{timestamp}"
 * Headers:
 *   - X-OilPriceAPI-Signature: hex-encoded HMAC
 *   - X-OilPriceAPI-Signature-Timestamp: Unix timestamp
 *
 * @param {string} payload - Raw JSON payload string
 * @param {string} signature - Signature from header
 * @param {string} timestamp - Timestamp from header
 * @param {string} secret - Webhook secret
 * @returns {object} Verification result
 */
export function verifySignature(payload, signature, timestamp, secret) {
  const result = {
    valid: false,
    error: null,
    expectedSignature: null,
    providedSignature: signature,
    timestampAge: null
  };

  // No secret configured - skip verification
  if (!secret) {
    result.error = 'No secret configured';
    return result;
  }

  // Missing signature header
  if (!signature) {
    result.error = 'Missing X-OilPriceAPI-Signature header';
    return result;
  }

  // Missing timestamp header
  if (!timestamp) {
    result.error = 'Missing X-OilPriceAPI-Signature-Timestamp header';
    return result;
  }

  // Check timestamp age (5 minute tolerance)
  const now = Math.floor(Date.now() / 1000);
  const timestampAge = Math.abs(now - parseInt(timestamp));
  result.timestampAge = timestampAge;

  if (timestampAge > 300) {
    result.error = `Timestamp expired: ${timestampAge}s old (max 300s)`;
    return result;
  }

  // Compute expected signature
  // OPA format: HMAC-SHA256("{payload_json}.{timestamp}")
  const signaturePayload = `${payload}.${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

  result.expectedSignature = expectedSignature;

  // Constant-time comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
      result.error = 'Signature length mismatch';
      return result;
    }

    result.valid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (e) {
    result.error = `Invalid signature format: ${e.message}`;
    return result;
  }

  if (!result.valid) {
    result.error = 'Signature mismatch';
  }

  return result;
}

/**
 * Generate a signature for testing purposes
 *
 * @param {string|object} payload - Payload to sign
 * @param {string} secret - Webhook secret
 * @param {string} [timestamp] - Optional timestamp (defaults to now)
 * @returns {object} Signature and timestamp
 */
export function generateSignature(payload, secret, timestamp = null) {
  const ts = timestamp || Math.floor(Date.now() / 1000).toString();
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signaturePayload = `${payloadString}.${ts}`;

  return {
    signature: crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex'),
    timestamp: ts
  };
}
