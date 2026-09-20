import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  deriveStoryRecommendationMetadata,
  estimateExpectedReadingSeconds,
  EXPECTED_READING_SECONDS_SQL,
  inferContentForm,
  inferDominantScript,
  measureWordCount,
} from '../src/services/story-recommendation-metadata.js';

describe('canonical recommendation metadata', () => {
  it('measures word-like text without counting punctuation as words', () => {
    expect(measureWordCount('Rain, then sunlight — finally.', 'en')).toBe(4);
    expect(measureWordCount('बारिश फिर धूप', 'hi')).toBe(3);
    expect(measureWordCount('', 'en')).toBe(0);
  });

  it('maps only categories that reliably identify a content form', () => {
    expect(inferContentForm('Short Stories')).toEqual({
      value: 'short_story', source: 'category_mapping_v1', confidence: 0.95,
    });
    expect(inferContentForm('Tech')).toEqual({ value: null, source: null, confidence: null });
  });

  it('records dominant script and exposes mixed-script confidence', () => {
    expect(inferDominantScript('बारिश और धूप').value).toBe('Deva');
    const mixed = inferDominantScript('आज rain');
    expect(mixed.value).toBe('Latn');
    expect(mixed.confidence).toBeGreaterThan(0);
    expect(mixed.confidence).toBeLessThan(1);
  });

  it('derives sourced metadata while preserving an unknown form', () => {
    expect(deriveStoryRecommendationMetadata({
      category: 'Culture', content: 'A room with two windows.', languageCode: 'en',
    })).toMatchObject({
      contentForm: null,
      contentFormSource: null,
      wordCount: 5,
      wordCountSource: 'intl_segmenter_v1',
      scriptCode: 'Latn',
      scriptSource: 'unicode_script_ratio_v1',
    });
  });

  it('normalizes expected time only for forms with approved floors', () => {
    expect(estimateExpectedReadingSeconds({ wordCount: 12, contentForm: 'poetry', readingTimeMinutes: 2 })).toBe(8);
    expect(estimateExpectedReadingSeconds({ wordCount: 100, contentForm: 'flash', readingTimeMinutes: 2 })).toBe(30);
    expect(estimateExpectedReadingSeconds({ wordCount: 100, contentForm: 'essay', readingTimeMinutes: 2 })).toBe(45);
    expect(estimateExpectedReadingSeconds({ wordCount: 1_000, contentForm: 'essay', readingTimeMinutes: 2 })).toBe(300);
    expect(estimateExpectedReadingSeconds({ wordCount: 100, contentForm: 'short_story', readingTimeMinutes: 3 })).toBe(90);
    expect(estimateExpectedReadingSeconds({ wordCount: null, contentForm: 'poetry', readingTimeMinutes: 2 })).toBe(60);
  });

  it('keeps the SQL completion guard aligned with approved form-aware inputs and a legacy fallback', () => {
    expect(EXPECTED_READING_SECONDS_SQL).toContain("p.content_form = 'poetry'");
    expect(EXPECTED_READING_SECONDS_SQL).toContain("p.content_form = 'flash'");
    expect(EXPECTED_READING_SECONDS_SQL).toContain("p.content_form = 'essay'");
    expect(EXPECTED_READING_SECONDS_SQL).toContain('p.word_count * 60.0 / 200.0');
    expect(EXPECTED_READING_SECONDS_SQL).toContain('greatest(30, p.reading_time_min * 30)');
  });

  it('keeps schema expansion and data backfill in separate migrations', () => {
    const schema = readFileSync(new URL('../migrations/20260913_recommendation_content_metadata.sql', import.meta.url), 'utf8');
    const backfill = readFileSync(new URL('../migrations/20260913_recommendation_content_metadata_backfill.sql', import.meta.url), 'utf8');
    expect(schema).toContain("'poetry', 'flash', 'short_story', 'essay', 'journalism', 'review', 'other'");
    expect(schema).toContain('add column if not exists word_count integer');
    expect(schema).toContain("script_code in ('Latn', 'Deva', 'Beng', 'Arab')");
    expect(schema).not.toMatch(/\bupdate public\.posts\b/i);
    expect(backfill).not.toMatch(/\balter table\b/i);
    expect(backfill).toContain("content_form_source = 'category_mapping_v1'");
    expect(backfill).toContain("word_count_source = 'unicode_whitespace_v1'");
  });

  it('guards the staging runner and applies schema before backfill', () => {
    const runner = readFileSync(new URL('../src/scripts/apply-recommendation-metadata-staging.mjs', import.meta.url), 'utf8');
    expect(runner).toContain("const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri'");
    expect(runner).toContain('validateStagingDatabaseTarget');
    expect(runner).toContain("--secret=writon-database-url-staging");
    expect(runner.indexOf("client.query(await readFile(fileURLToPath(schemaMigrationUrl), 'utf8'))"))
      .toBeLessThan(runner.indexOf("client.query(await readFile(fileURLToPath(backfillMigrationUrl), 'utf8'))"));
    expect(runner).toContain("process.argv.includes('--verify-only')");
    expect(runner).toContain("process.argv.includes('--editorial-sample')");
    expect(runner).toContain("mode: editorialSample ? 'editorial-sample'");
    expect(runner).toContain("'content_form' as dimension");
    expect(runner).toContain("'language'");
    expect(runner).toContain("'script'");
    expect(runner).toContain('coverageGroups');
  });
});
