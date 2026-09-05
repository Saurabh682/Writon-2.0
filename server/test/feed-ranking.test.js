import { describe, expect, it } from 'vitest';
import {
  composeFeed,
  decodeFeedCursor,
  determineFeedMode,
  encodeFeedCursor,
} from '../src/services/feed-ranking.js';

function candidate(index, overrides = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    authorId: `author-${index % 12}`,
    category: `category-${index % 8}`,
    languageCode: 'en',
    explicitInterest: 0.8,
    topicAffinity: 0.5,
    deepReadFit: 0.6,
    authorAffinity: 0.4,
    languageAffinity: 0.4,
    freshness: 1 - (index / 500),
    humanQuality: 0.6,
    repetitionPenalty: 0,
    quickExitPenalty: 0,
    exposureCount: index % 4,
    ...overrides,
  };
}

describe('reader feed ranking', () => {
  it('composes the first twenty as 14 preferred, 4 affinity, and 2 exploration stories', () => {
    const preferred = Array.from({ length: 30 }, (_, index) => candidate(index));
    const affinity = Array.from({ length: 12 }, (_, index) => candidate(100 + index, {
      languageCode: 'hi',
      languageAffinity: 0.8,
    }));
    const exploration = Array.from({ length: 12 }, (_, index) => candidate(200 + index, {
      languageCode: 'bn',
      topicAffinity: 0,
      authorAffinity: 0,
      languageAffinity: 0,
      explicitInterest: 0,
    }));

    const feed = composeFeed({
      candidates: [...preferred, ...affinity, ...exploration],
      preferredLanguage: 'en',
      mode: 'behavior',
      seed: 'fixed-seed',
      maximumItems: 20,
    });

    expect(feed).toHaveLength(20);
    expect(feed.filter((item) => item.candidatePool === 'preferred')).toHaveLength(14);
    expect(feed.filter((item) => item.candidatePool === 'affinity')).toHaveLength(4);
    expect(feed.filter((item) => item.candidatePool === 'exploration')).toHaveLength(2);
    expect(new Set(feed.map((item) => item.id)).size).toBe(20);
  });

  it('limits one author to two stories per twenty and one category to three in any ten', () => {
    const candidates = Array.from({ length: 80 }, (_, index) => candidate(index, {
      authorId: index < 20 ? 'prolific-author' : `author-${index}`,
      category: index < 20 ? 'Essays' : `category-${index % 9}`,
      languageCode: index % 5 === 0 ? 'hi' : (index % 7 === 0 ? 'bn' : 'en'),
      languageAffinity: index % 5 === 0 ? 0.8 : 0,
    }));
    const feed = composeFeed({
      candidates,
      preferredLanguage: 'en',
      mode: 'behavior',
      seed: 'diversity-seed',
      maximumItems: 20,
    });

    const authorCounts = feed.reduce((counts, item) => {
      counts.set(item.authorId, (counts.get(item.authorId) ?? 0) + 1);
      return counts;
    }, new Map());
    expect(Math.max(...authorCounts.values())).toBeLessThanOrEqual(2);
    for (let index = 0; index <= feed.length - 10; index += 1) {
      const categories = feed.slice(index, index + 10).reduce((counts, item) => {
        counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
        return counts;
      }, new Map());
      expect(Math.max(...categories.values())).toBeLessThanOrEqual(3);
    }
  });

  it('keeps behavior ranking gated until eligibility and stable rollout assignment pass', () => {
    expect(determineFeedMode({ profileId: 'reader-a', evidenceCount: 4 })).toBe('base');
    const assigned = determineFeedMode({
      profileId: 'reader-a',
      evidenceCount: 5,
      behaviorRolloutPercent: 90,
      holdoutPercent: 0,
    });
    expect(assigned).toBe('behavior');
    expect(determineFeedMode({
      profileId: null,
      guestLearningEnabled: false,
      hasGuestVector: true,
    })).toBe('guest_base');
  });

  it('places deep-reading fit above superficial engagement proxies', () => {
    const deeplyRead = candidate(1, {
      deepReadFit: 1,
      topicAffinity: 0.8,
      authorAffinity: 0.6,
      humanQuality: 0.9,
      freshness: 0.5,
    });
    const merelyFresh = candidate(2, {
      deepReadFit: 0,
      topicAffinity: 0,
      authorAffinity: 0,
      humanQuality: 0.1,
      freshness: 1,
    });
    const feed = composeFeed({
      candidates: [merelyFresh, deeplyRead],
      preferredLanguage: 'en',
      mode: 'behavior',
      seed: 'deep-reading-seed',
      maximumItems: 2,
    });

    expect(feed[0].id).toBe(deeplyRead.id);
  });

  it('round-trips opaque cursor state and rejects malformed cursors', () => {
    const sessionId = '00000000-0000-4000-8000-000000000001';
    const cursor = encodeFeedCursor(sessionId, 20);
    expect(decodeFeedCursor(cursor)).toEqual({ sessionId, nextRank: 20 });
    expect(decodeFeedCursor('not-a-cursor')).toBeNull();
  });
});
