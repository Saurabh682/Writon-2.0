import { describe, it, expect } from 'vitest';
import { detectMilestones } from '../src/engagement/milestones.js';

describe('engagement milestones', () => {
  it('detects only crossed milestone thresholds', () => {
    const events = detectMilestones({ posts: 4, applauds: 49 }, { posts: 5, applauds: 51 });
    expect(events.map(e => e.eventKey)).toEqual(['milestone:posts:5', 'milestone:applauds:50']);
  });

  it('first post copy is factual', () => {
    const [event] = detectMilestones({ posts: 0 }, { posts: 1 });
    expect(event.title).toBe('Your first story is live ✒️');
  });

  it('does not fire when threshold is not crossed', () => {
    const events = detectMilestones({ posts: 5 }, { posts: 6 });
    expect(events).toHaveLength(0);
  });
});
