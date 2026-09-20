import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifySvixWebhook } from '../src/email/webhook-verify.js';

function fixture(payload, timestamp = 1700000000) {
  const id = 'msg_test';
  const key = crypto.randomBytes(32);
  const secret = `whsec_${key.toString('base64')}`;
  const signed = `${id}.${timestamp}.${payload}`;
  const sig = crypto.createHmac('sha256', key).update(signed).digest('base64');
  return { id, timestamp: String(timestamp), secret, signature: `v1,${sig}` };
}

describe('webhook signature verification', () => {
  it('valid Svix-style signature verifies raw payload', () => {
    const payload = JSON.stringify({ id: 'evt_1', type: 'email.delivered' });
    const f = fixture(payload);
    const event = verifySvixWebhook({ payload: Buffer.from(payload), ...f, now: f.timestamp * 1000 });
    expect(event.id).toBe('evt_1');
    expect(event.type).toBe('email.delivered');
  });

  it('modified payload fails signature verification', () => {
    const payload = JSON.stringify({ id: 'evt_1', type: 'email.delivered' });
    const f = fixture(payload);
    expect(() => verifySvixWebhook({ payload: payload + ' ', ...f, now: f.timestamp * 1000 })).toThrow('Invalid webhook signature');
  });

  it('rejects stale timestamp outside replay tolerance', () => {
    const payload = JSON.stringify({ id: 'evt_1', type: 'email.delivered' });
    const f = fixture(payload, 1700000000);
    expect(() => verifySvixWebhook({
      payload: Buffer.from(payload),
      ...f,
      now: (1700000000 + 400) * 1000,
      toleranceSeconds: 300,
    })).toThrow('replay tolerance');
  });
});
