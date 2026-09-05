import { describe, expect, it } from 'vitest';
import {
  PUBLISHABLE_STORY_CATEGORIES,
  STORY_CATEGORY_CATALOG,
  TRENDING_FEED_LABEL,
} from '../src/domain/story-categories.js';

describe('story category catalog', () => {
  it('preserves the requested public ordering and feed distinction', () => {
    expect(STORY_CATEGORY_CATALOG.slice(0, 14).map(({ name }) => name)).toEqual([
      'Trending',
      'Reviews',
      'Tech',
      'Culture',
      'Essays',
      'Humour',
      'Poetry',
      'Short Stories',
      'Journal',
      'Journalism',
      'Science & Health',
      'Business & Finance',
      'Sports',
      'Entertainment',
    ]);
    expect(TRENDING_FEED_LABEL).toBe('Trending');
    expect(PUBLISHABLE_STORY_CATEGORIES).not.toContain('Trending');
  });

  it('keeps existing stored categories valid while adding the new categories', () => {
    expect(PUBLISHABLE_STORY_CATEGORIES).toEqual(expect.arrayContaining([
      'Journal',
      'Science & Health',
      'Business & Finance',
      'Sports',
      'Entertainment',
      'Shayari',
      'Philosophy',
      'Satire',
      'Fiction',
    ]));
    expect(new Set(PUBLISHABLE_STORY_CATEGORIES).size).toBe(PUBLISHABLE_STORY_CATEGORIES.length);
  });
});

