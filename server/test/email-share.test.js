import { describe, it, expect } from 'vitest';
import { buildTrackedStoryUrl, buildSharePayload } from '../src/engagement/share.js';

describe('engagement share tracking', () => {
  it('adds clean author-share attribution', () => {
    const url = new URL(buildTrackedStoryUrl('https://writon.cc/story/abc', { destination: 'whatsapp' }));
    expect(url.searchParams.get('utm_source')).toBe('author_share');
    expect(url.searchParams.get('utm_medium')).toBe('share');
    expect(url.searchParams.get('utm_campaign')).toBe('story_publish');
    expect(url.searchParams.get('utm_content')).toBe('whatsapp');
  });

  it('share payload truncates long excerpt', () => {
    const payload = buildSharePayload({
      storyUrl: 'https://writon.cc/s/1',
      title: 'A Story',
      excerpt: 'x'.repeat(400),
      author: 'A Writer',
    });
    expect(payload.text.length).toBeLessThan(400);
    expect(payload.url).toContain('https://writon.cc/s/1');
  });
});
