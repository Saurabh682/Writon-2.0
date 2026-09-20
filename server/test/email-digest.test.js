import { describe, it, expect } from 'vitest';
import { buildWriterDigestModel, hasMeaningfulDigestActivity } from '../src/engagement/digest.js';
import { renderWeeklyDigest } from '../src/email/render/weekly-digest.js';

describe('weekly writer digest', () => {
  it('weekly digest labels share actions honestly', () => {
    const model = buildWriterDigestModel({
      profileId: 'p1',
      stats: { shareActions: 7 },
      date: new Date('2026-09-16T00:00:00Z'),
    });
    const rendered = renderWeeklyDigest(model);
    expect(rendered.text).toMatch(/7 share actions/);
    expect(rendered.text).not.toMatch(/7 shares\b/);
    expect(hasMeaningfulDigestActivity(model)).toBe(true);
  });

  it('detects empty activity and suppresses empty sends', () => {
    const model = buildWriterDigestModel({
      profileId: 'p1',
      stats: {},
      date: new Date('2026-09-16T00:00:00Z'),
    });
    expect(hasMeaningfulDigestActivity(model)).toBe(false);
  });
});
