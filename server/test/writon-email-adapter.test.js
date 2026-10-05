import { describe, it, expect, vi } from 'vitest';
import { createWritonEmailAdapter } from '../src/services/writon-email-adapter.js';

describe('WritOn email adapter', () => {
  it('resolves authenticated profile ID from request', async () => {
    const adapter = createWritonEmailAdapter({});
    await expect(adapter.resolveAuthenticatedProfileId({ profileId: 'user_123' })).resolves.toBe('user_123');
    await expect(adapter.resolveAuthenticatedProfileId({})).rejects.toThrow('Authentication required');
  });

  it('checks current email state correctly', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: 'p1', email: 'Writer@example.com', account_type: 'human', email_verified: true, email_version: 3 }],
        rowCount: 1,
      }),
    };
    const adapter = createWritonEmailAdapter(mockPool);
    const state = await adapter.getCurrentEmailState('p1');
    expect(state).toEqual({
      accountExists: true,
      verified: true,
      email: 'writer@example.com',
      emailVersion: 3,
    });
  });

  it('detects unverified or missing accounts', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    const adapter = createWritonEmailAdapter(mockPool);
    const state = await adapter.getCurrentEmailState('non_existent');
    expect(state.accountExists).toBe(false);
    expect(state.verified).toBe(false);
  });

  it('does not infer verification from a normal email address', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'p1', email: 'writer@example.com', account_type: 'human', email_verified: false, email_version: 2 }], rowCount: 1 }) };
    const state = await createWritonEmailAdapter(pool).getCurrentEmailState('p1');
    expect(state.verified).toBe(false);
    expect(state.emailVersion).toBe(2);
  });

  it('returns recommendations with canonical story URLs', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          { id: '11111111-1111-1111-1111-111111111111', title: 'Story One', slug: 'story-one', author: 'Author A' },
        ],
        rowCount: 1,
      }),
    };
    const adapter = createWritonEmailAdapter(mockPool, { siteBaseUrl: 'https://writon.cc' });
    const recs = await adapter.getRecommendationCandidates('author_me', 3);
    expect(recs).toHaveLength(1);
    expect(recs[0].url).toBe('https://writon.cc/story/story-one');
    expect(recs[0].title).toBe('Story One');
  });
});
