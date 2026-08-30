import { describe, expect, it, vi } from 'vitest';
import { buildMilestoneProgress, getMilestoneJourney } from '../src/services/milestone-service.js';

describe('milestone service', () => {
  it('caps progress and keeps locked milestones unearned', () => {
    const milestones = buildMilestoneProgress({ storiesPublished: 9 }, new Map());
    expect(milestones.find((item) => item.key === 'three_stories')).toMatchObject({ progress: 3, target: 3, earned: false });
    expect(milestones.find((item) => item.key === 'first_read')).toMatchObject({ progress: 0, earned: false });
  });

  it('awards eligible milestones once and reports only new unlocks', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ profileComplete: 1, storiesRead: 1, applaudsGiven: 0 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ key: 'profile_complete', earnedAt: '2026-08-29T00:00:00Z' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 2, rows: [
        { key: 'profile_complete', earnedAt: '2026-08-29T00:00:00Z' },
        { key: 'first_read', earnedAt: '2026-08-30T00:00:00Z' },
      ] });

    const journey = await getMilestoneJourney({ query }, 'reader-1');
    expect(journey.summary).toEqual({ earned: 2, total: 12 });
    expect(journey.newlyEarned.map((item) => item.key)).toEqual(['first_read']);
    expect(query).toHaveBeenCalledTimes(4);
  });

  it('returns null without writing awards when the profile is missing', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(getMilestoneJourney({ query }, 'missing')).resolves.toBeNull();
    expect(query).toHaveBeenCalledTimes(2);
  });
});
