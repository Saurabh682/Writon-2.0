import { describe, it, expect } from 'vitest';
import {
  attachHashtagsAndWatermark,
  generateCategoryHashtags,
  hasExistingHashtags,
  hasWritonWatermark,
  stripWatermark,
  INVISIBLE_WATERMARK
} from '../src/bot-engine/watermark-service.js';

describe('Watermark & Hashtag Service', () => {
  it('generates authentic hashtags for categories', () => {
    const techTags = generateCategoryHashtags('Tech', 'distributed');
    expect(techTags).toContain('#tech');
    expect(techTags).toContain('#distributed');

    const poetryTags = generateCategoryHashtags('Poetry');
    expect(poetryTags).toContain('#poetry');
    expect(poetryTags).toContain('#quietverses');
  });

  it('detects existing hashtags correctly', () => {
    expect(hasExistingHashtags('This is a story with #ShortStories and #Fiction')).toBe(true);
    expect(hasExistingHashtags('Plain story with no tags here.')).toBe(false);
  });

  it('detects and attaches invisible #writon watermark and category hashtags', () => {
    const rawContent = 'In the quiet hours of Kolkata, the rain wrote in gentle cursive.';
    const enhanced = attachHashtagsAndWatermark(rawContent, 'Short Stories', 'kolkata');

    expect(enhanced).toContain('#shortstories');
    expect(enhanced).toContain('#kolkata');
    expect(enhanced).toContain(INVISIBLE_WATERMARK);
    expect(hasWritonWatermark(enhanced)).toBe(true);
  });

  it('preserves user-provided hashtags while converting them to lowercase and adding watermark', () => {
    const existing = 'A deep reflection on code.\n\n#SystemDesign #Architecture';
    const enhanced = attachHashtagsAndWatermark(existing, 'Tech');

    expect(enhanced).toContain('#systemdesign');
    expect(enhanced).toContain('#architecture');
    expect(enhanced).toContain(INVISIBLE_WATERMARK);
  });

  it('safely strips invisible watermark for clean plain text', () => {
    const rawContent = 'A deep reflection on code.\n\n#systemdesign\n\n' + INVISIBLE_WATERMARK;
    const stripped = stripWatermark(rawContent);

    expect(stripped).not.toContain('writon-watermark');
    expect(stripped).not.toContain('opacity:0');
    expect(stripped).toContain('#systemdesign');
  });

  it('formats trending search phrases and keywords into clean lowercase hashtags', async () => {
    const { formatKeywordToHashtag } = await import('../src/bot-engine/watermark-service.js');
    expect(formatKeywordToHashtag('supervisory tax')).toBe('#supervisorytax');
    expect(formatKeywordToHashtag('AI Burnout')).toBe('#aiburnout');
    expect(formatKeywordToHashtag('#agentic_workflows')).toBe('#agentic_workflows');
    expect(formatKeywordToHashtag('')).toBe('');
  });

  it('incorporates trending keywords from database/brain and keeps tags lowercase and SEO ready', () => {
    const tags = generateCategoryHashtags('Tech', 'Cognitive load', 'fatigue', [
      'supervisory tax',
      'synthetic writing fatigue'
    ]);

    expect(tags).toContain('#supervisorytax');
    expect(tags).toContain('#syntheticwritingfatigue');
    expect(tags).toContain('#tech');
    // Ensure all tags in generated output are strictly lowercase
    const tagList = tags.split(' ');
    expect(tagList.length).toBeGreaterThanOrEqual(4);
    expect(tagList.length).toBeLessThanOrEqual(6);
    for (const tag of tagList) {
      expect(tag).toBe(tag.toLowerCase());
      expect(tag.startsWith('#')).toBe(true);
    }
  });

  it('attaches trending keywords when calling attachHashtagsAndWatermark', () => {
    const rawContent = 'The cognitive exhaustion of supervising autonomous models is the real tax of 2026.';
    const enhanced = attachHashtagsAndWatermark(rawContent, 'Tech', 'Supervisory Tax', 'AI', [
      'supervisory tax',
      'agentic workflows'
    ]);

    expect(enhanced).toContain('#supervisorytax');
    expect(enhanced).toContain('#agenticworkflows');
    expect(enhanced).toContain('#tech');
    expect(enhanced).toContain(INVISIBLE_WATERMARK);
    expect(hasWritonWatermark(enhanced)).toBe(true);
  });
});

