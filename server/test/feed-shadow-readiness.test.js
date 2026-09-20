import { describe, expect, it } from 'vitest';
import { assessFeedShadowReadiness } from '../src/services/feed-shadow-readiness.js';

const safeInput = {
  coverage: {
    shadow_sessions: 120,
    shadow_readers: 30,
    shadow_empty_sessions: 0,
    visible_sparse_sessions: 4,
    shadow_sparse_sessions: 4,
    average_visible_first_page_items: 20,
    average_shadow_first_page_items: 20,
  },
  structuralComparison: { average_top_20_overlap: 15 },
  distributions: {
    visible: { language: { en: { share: 0.7 }, hi: { share: 0.3 } } },
    shadow: { language: { en: { share: 0.66 }, hi: { share: 0.34 } } },
  },
  concentration: {
    shadow: {
      author: { averageMaximumShare: 0.18 },
      category: { averageMaximumShare: 0.32 },
    },
  },
};

describe('R4 feed shadow readiness', () => {
  it('holds the rollout until representative human traffic exists', () => {
    const result = assessFeedShadowReadiness({
      ...safeInput,
      coverage: { ...safeInput.coverage, shadow_sessions: 10, shadow_readers: 3 },
    });
    expect(result.decision).toBe('hold');
    expect(result.failedChecks).toContain('representative_human_sample');
  });

  it('holds when a language loses more than ten percentage points', () => {
    const result = assessFeedShadowReadiness({
      ...safeInput,
      distributions: {
        visible: { language: { en: { share: 0.6 }, hi: { share: 0.4 } } },
        shadow: { language: { en: { share: 0.75 }, hi: { share: 0.25 } } },
      },
    });
    expect(result.decision).toBe('hold');
    expect(result.failedChecks).toContain('language_preservation');
    expect(result.languageShareChanges.hi).toBe(-0.15);
  });

  it('allows human review only when every structural gate passes', () => {
    const result = assessFeedShadowReadiness(safeInput);
    expect(result.decision).toBe('ready_for_human_review');
    expect(result.failedChecks).toEqual([]);
  });
});
