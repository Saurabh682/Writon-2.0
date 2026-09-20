import { describe, it, expect } from 'vitest';
import { createUnsubscribeToken, verifyUnsubscribeToken } from '../src/email/security/unsubscribe-token.js';

const keys = [
  { kid: 'new', secret: '01234567890123456789012345678901' },
  { kid: 'old', secret: 'abcdefghijklmnopqrstuvwxyzABCDEF' },
];

describe('unsubscribe tokens', () => {
  it('unsubscribe tokens survive key rotation while old key is retained', () => {
    const oldToken = createUnsubscribeToken({ profileId: 'p1', scope: 'all' }, [keys[1]], 1000);
    const payload = verifyUnsubscribeToken(oldToken, keys, 1000);
    expect(payload.profileId).toBe('p1');
    expect(payload.scope).toBe('all');
  });

  it('tampered token is rejected', () => {
    const token = createUnsubscribeToken({ profileId: 'p1' }, keys, 1000);
    expect(() => verifyUnsubscribeToken(token + 'x', keys, 1000)).toThrow('Invalid unsubscribe');
  });

  it('rejects expired token', () => {
    const token = createUnsubscribeToken({ profileId: 'p1', exp: 500 }, keys, 100_000);
    expect(() => verifyUnsubscribeToken(token, keys, 600_000)).toThrow('expired');
  });
});
