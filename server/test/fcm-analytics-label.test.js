import { describe, expect, it } from 'vitest';
import { toFcmAnalyticsLabel } from '../src/services/fcm-analytics-label.js';

describe('FCM analytics labels', () => {
  // Regression: language or notification-kind input could produce a label rejected by FCM.
  it('normalizes user-derived segments to the documented safe alphabet', () => {
    expect(toFcmAnalyticsLabel('interaction', 'new comment / বাংলা')).toBe('interaction_new_comment');
  });

  // Regression: labels longer than FCM permits could make an otherwise valid send fail.
  it('caps labels at 50 characters and always returns a non-empty fallback', () => {
    expect(toFcmAnalyticsLabel('a'.repeat(80))).toHaveLength(50);
    expect(toFcmAnalyticsLabel('!!!')).toBe('writon');
  });
});
