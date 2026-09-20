import crypto from 'node:crypto';

const DEFAULT_TOLERANCE_SECONDS = 300;

function decodeSecret(secret) {
  const value = String(secret || '');
  const encoded = value.startsWith('whsec_') ? value.slice(6) : value;
  return Buffer.from(encoded, 'base64');
}

function parseSignatures(header) {
  return String(header || '').split(' ').map(s => s.trim()).filter(Boolean).flatMap(token => {
    const [version, signature] = token.split(',');
    return version === 'v1' && signature ? [signature] : [];
  });
}

function safeEqualBase64(a, b) {
  let aa, bb;
  try { aa = Buffer.from(a, 'base64'); bb = Buffer.from(b, 'base64'); } catch { return false; }
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function verifySvixWebhook({ payload, id, timestamp, signature, secret, now = Date.now(), toleranceSeconds = DEFAULT_TOLERANCE_SECONDS }) {
  if (!payload || !id || !timestamp || !signature || !secret) throw new Error('Missing webhook verification input');
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) throw new Error('Invalid webhook timestamp');
  if (Math.abs(Math.floor(now / 1000) - ts) > toleranceSeconds) throw new Error('Webhook timestamp outside replay tolerance');

  const body = Buffer.isBuffer(payload) ? payload.toString('utf8') : String(payload);
  const signedContent = `${id}.${timestamp}.${body}`;
  const expected = crypto.createHmac('sha256', decodeSecret(secret)).update(signedContent).digest('base64');
  const signatures = parseSignatures(signature);
  if (!signatures.some(candidate => safeEqualBase64(candidate, expected))) throw new Error('Invalid webhook signature');
  return JSON.parse(body);
}
