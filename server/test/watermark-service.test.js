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
    expect(techTags).toContain('#Tech');
    expect(techTags).toContain('#Distributed');

    const poetryTags = generateCategoryHashtags('Poetry');
    expect(poetryTags).toContain('#Poetry');
    expect(poetryTags).toContain('#QuietVerses');
  });

  it('detects existing hashtags correctly', () => {
    expect(hasExistingHashtags('This is a story with #ShortStories and #Fiction')).toBe(true);
    expect(hasExistingHashtags('Plain story with no tags here.')).toBe(false);
  });

  it('detects and attaches invisible #writon watermark and category hashtags', () => {
    const rawContent = 'In the quiet hours of Kolkata, the rain wrote in gentle cursive.';
    const enhanced = attachHashtagsAndWatermark(rawContent, 'Short Stories', 'kolkata');

    expect(enhanced).toContain('#ShortStories');
    expect(enhanced).toContain('#Kolkata');
    expect(enhanced).toContain(INVISIBLE_WATERMARK);
    expect(hasWritonWatermark(enhanced)).toBe(true);
  });

  it('preserves user-provided hashtags while adding watermark', () => {
    const existing = 'A deep reflection on code.\n\n#SystemDesign #Architecture';
    const enhanced = attachHashtagsAndWatermark(existing, 'Tech');

    expect(enhanced).toContain('#SystemDesign');
    expect(enhanced).toContain('#Architecture');
    expect(enhanced).toContain(INVISIBLE_WATERMARK);
  });

  it('safely strips invisible watermark for clean plain text', () => {
    const rawContent = 'A deep reflection on code.\n\n#SystemDesign\n\n' + INVISIBLE_WATERMARK;
    const stripped = stripWatermark(rawContent);

    expect(stripped).not.toContain('writon-watermark');
    expect(stripped).not.toContain('opacity:0');
    expect(stripped).toContain('#SystemDesign');
  });
});
