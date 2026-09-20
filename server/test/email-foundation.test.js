import { describe, it, expect, vi } from 'vitest';
import { canQueueOptionalEmail, renderWritOnEmail, sendWithResend } from '../src/services/email-foundation.js';

const base = { type: 'verification', title: 'Confirm your email', intro: 'Confirm this address for your WritOn account.', actionLabel: 'Confirm email', actionUrl: 'https://writon.cc/example' };
describe('email foundation safety', () => {
  it('requires explicit email consent and a verified, unsuppressed recipient', () => {
    expect(canQueueOptionalEmail({})).toBe(false);
    expect(canQueueOptionalEmail({ optedIn: true, verified: true, suppressed: false })).toBe(true);
    for (const changed of [{ optedIn: false }, { verified: false }, { suppressed: true }, { lastOptionalAt: 'invalid' }]) {
      expect(canQueueOptionalEmail({ optedIn: true, verified: true, suppressed: false, ...changed })).toBe(false);
    }
  });
  it('enforces a rolling seven-day optional-email gap', () => {
    const value = { optedIn: true, verified: true, suppressed: false, lastOptionalAt: '2026-09-01T00:00:00Z' };
    expect(canQueueOptionalEmail({ ...value, now: Date.parse('2026-09-07T23:59:59Z') })).toBe(false);
    expect(canQueueOptionalEmail({ ...value, now: Date.parse('2026-09-08T00:00:00Z') })).toBe(true);
  });
  it('escapes untrusted copy and generates plain text', () => {
    const result = renderWritOnEmail({ ...base, title: '<img onerror="alert(1)">' });
    expect(result.html).not.toContain('<img');
    expect(result.html).toContain('&lt;img');
    expect(result.text).toContain(base.actionUrl);
  });
  it('rejects unsafe links and unsupported translations', () => {
    expect(() => renderWritOnEmail({ ...base, actionUrl: 'javascript:alert(1)' })).toThrow();
    expect(() => renderWritOnEmail({ ...base, actionUrl: 'https://user:pass@writon.cc' })).toThrow();
    expect(() => renderWritOnEmail({ ...base, locale: 'hi' })).toThrow('translation');
  });
  it('requires unsubscribe, preferences and sender address for optional mail', () => {
    expect(() => renderWritOnEmail({ ...base, type: 'digest' })).toThrow('requires');
  });
  it('never contacts Resend by default', async () => {
    const fetchImpl = vi.fn();
    expect(await sendWithResend({}, { env: {}, fetchImpl })).toEqual({ status: 'disabled' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('cannot enable production delivery by removing the tester allowlist', async () => {
    await expect(sendWithResend({ to: 'reader@example.com' }, { env: { WRITON_EMAIL_DELIVERY_ENABLED: 'true' } })).rejects.toThrow('tester');
  });
  const env = { WRITON_EMAIL_DELIVERY_ENABLED: 'true', WRITON_EMAIL_TEST_RECIPIENTS: 'tester@example.com', RESEND_API_KEY: 'test-secret', WRITON_EMAIL_FROM: 'WritOn <test@example.com>', WRITON_EMAIL_REPLY_TO: 'reply@example.com' };
  const message = { to: 'tester@example.com', subject: 'Preview', html: '<p>Preview</p>', text: 'Preview', idempotencyKey: 'email:job-1:v1' };
  it('uses a stable provider key and distinguishes accepted from delivered', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'provider-id' }) });
    expect(await sendWithResend(message, { env, fetchImpl })).toEqual({ status: 'accepted', providerId: 'provider-id' });
    expect(fetchImpl.mock.calls[0][1].headers['Idempotency-Key']).toBe(message.idempotencyKey);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).text).toBe('Preview');
  });
  it('does not blindly retry or expose credentials on ambiguous network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('test-secret tester@example.com'));
    await expect(sendWithResend(message, { env, fetchImpl })).rejects.toThrow('outcome unknown');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
