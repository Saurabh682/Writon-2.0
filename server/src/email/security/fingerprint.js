import crypto from 'node:crypto';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function emailFingerprint(email) {
  return crypto.createHash('sha256').update(normalizeEmail(email)).digest('hex');
}
