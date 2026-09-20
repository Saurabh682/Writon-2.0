import crypto from 'node:crypto';

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function unb64url(input) {
  return Buffer.from(input, 'base64url');
}

function sign(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('base64url');
}

function safeEqual(a, b) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function createUnsubscribeToken(payload, keyring, now = Date.now()) {
  if (!Array.isArray(keyring) || keyring.length === 0) throw new Error('No unsubscribe signing keys configured');
  const key = keyring[0];
  const body = { v: 1, iat: Math.floor(now / 1000), ...payload };
  const encoded = b64url(JSON.stringify(body));
  const prefix = `v1.${key.kid}.${encoded}`;
  return `${prefix}.${sign(key.secret, prefix)}`;
}

export function verifyUnsubscribeToken(token, keyring, now = Date.now()) {
  const [version, kid, encoded, signature, extra] = String(token || '').split('.');
  if (extra || version !== 'v1' || !kid || !encoded || !signature) throw new Error('Invalid unsubscribe token');
  const key = keyring.find(k => k.kid === kid);
  if (!key) throw new Error('Unknown unsubscribe signing key');
  const prefix = `${version}.${kid}.${encoded}`;
  if (!safeEqual(sign(key.secret, prefix), signature)) throw new Error('Invalid unsubscribe signature');
  const payload = JSON.parse(unb64url(encoded).toString('utf8'));
  if (payload.exp && Math.floor(now / 1000) > payload.exp) throw new Error('Unsubscribe token expired');
  return payload;
}
