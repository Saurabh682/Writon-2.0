import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeStoryQuality } from '../src/services/story-quality-ranking.js';

function story(id, overrides = {}) {
  return {
    id,
    contentForm: 'essay',
    qualityReadCount: 0,
    qualityCompletionCount: 0,
    qualityBookmarkCount: 0,
    ...overrides,
  };
}

describe('R3 shadow quality normalization', () => {
  it('keeps zero and small samples neutral', () => {
    const normalized = normalizeStoryQuality([
      story('zero'),
      story('one-perfect', { qualityReadCount: 1, qualityCompletionCount: 1, qualityBookmarkCount: 1 }),
    ]);
    expect(normalized.map((item) => item.normalizedQuality)).toEqual([0.5, 0.5]);
  });

  it('compares mature evidence only within the same content-form cohort', () => {
    const normalized = normalizeStoryQuality([
      story('essay-strong', { qualityReadCount: 20, qualityCompletionCount: 18, qualityBookmarkCount: 8 }),
      story('essay-weak', { qualityReadCount: 20, qualityCompletionCount: 4, qualityBookmarkCount: 1 }),
      story('poetry-only', { contentForm: 'poetry', qualityReadCount: 20, qualityCompletionCount: 2 }),
    ]);
    const byId = new Map(normalized.map((item) => [item.id, item]));
    expect(byId.get('essay-strong').normalizedQuality).toBeGreaterThan(0.5);
    expect(byId.get('essay-weak').normalizedQuality).toBeLessThan(0.5);
    expect(byId.get('poetry-only').normalizedQuality).toBe(0.5);
    expect(byId.get('poetry-only').qualityCohort).toBe('poetry');
  });

  it('bounds inconsistent and non-numeric counters safely', () => {
    const [normalized] = normalizeStoryQuality([
      story('invalid', { qualityReadCount: 'bad', qualityCompletionCount: 20, qualityBookmarkCount: -4 }),
    ]);
    expect(normalized).toMatchObject({
      qualityReadCount: 0,
      qualityCompletionCount: 0,
      qualityBookmarkCount: 0,
      normalizedQuality: 0.5,
    });
  });

  it('keeps shadow storage private and cascading', () => {
    const migration = readFileSync(new URL('../migrations/20260914_feed_quality_shadow.sql', import.meta.url), 'utf8');
    expect(migration).toContain('create table if not exists public.feed_shadow_rankings');
    expect(migration).toContain('references public.reader_feed_sessions(id) on delete cascade');
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('revoke all privileges on public.feed_shadow_rankings from anon, authenticated');
    expect(migration).toContain('feed_shadow_rankings_story_idx');
  });

  it('repairs legacy feed sessions so account deletion cannot retain a profile identifier', () => {
    const migration = readFileSync(new URL('../migrations/20260914_reader_feed_session_profile_fk.sql', import.meta.url), 'utf8');
    expect(migration).toContain('set profile_id = null');
    expect(migration).toContain("conname = 'reader_feed_sessions_profile_id_fkey'");
    expect(migration).toContain('foreign key (profile_id) references public.profiles(id)');
    expect(migration).toContain('on delete cascade');
    expect(migration).toContain('validate constraint reader_feed_sessions_profile_id_fkey');
  });

  it('locks the migration runner to the dedicated staging project', () => {
    const runner = readFileSync(new URL('../src/scripts/apply-feed-quality-shadow-staging.mjs', import.meta.url), 'utf8');
    expect(runner).toContain("const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri'");
    expect(runner).toContain('validateStagingDatabaseTarget');
    expect(runner).toContain('--secret=writon-database-url-staging');
    expect(runner).toContain("process.argv.includes('--verify-only')");
    expect(runner).toContain('client_select_revoked');
    expect(runner).toContain('session_profile_cascade');
    expect(runner).toContain('orphan_sessions');
  });

  it('requires an explicit exact production target for the production runner', () => {
    const runner = readFileSync(new URL('../src/scripts/apply-feed-quality-shadow-production.mjs', import.meta.url), 'utf8');
    expect(runner).toContain("const PRODUCTION_PROJECT_REF = 'rrxaitxeirykmiihgiqj'");
    expect(runner).toContain("process.argv.includes('--production')");
    expect(runner).toContain('--secret=writon-database-url-production');
    expect(runner).toContain("process.argv.includes('--verify-only')");
    expect(runner).toContain('client_select_revoked');
  });

  it('locks authenticated production proof to the tagged zero-traffic R3 revision', () => {
    const verifier = readFileSync(new URL('../src/scripts/verify-feed-quality-shadow-production.mjs', import.meta.url), 'utf8');
    expect(verifier).toContain("const PRODUCTION_PROJECT_REF = 'rrxaitxeirykmiihgiqj'");
    expect(verifier).toContain("process.argv.includes('--production')");
    expect(verifier).toContain('r3-shadow-20260914---writon-app-api-rfusi3iwbq-el.a.run.app');
    expect(verifier).toContain('--secret=writon-database-url-production');
    expect(verifier).toContain("method: 'DELETE'");
  });

  it('keeps the production outcome report aggregate-only and explicitly observational', () => {
    const report = readFileSync(new URL('../src/scripts/report-feed-quality-shadow-production.mjs', import.meta.url), 'utf8');
    expect(report).toContain("const PRODUCTION_PROJECT_REF = 'rrxaitxeirykmiihgiqj'");
    expect(report).toContain("process.argv.includes('--production')");
    expect(report).toContain('--secret=writon-database-url-production');
    expect(report).toContain("population: 'server-recorded feed sessions for profiles classified as human'");
    expect(report).toContain("visibleRanking: 'unchanged_v1'");
    expect(report).toContain('round(avg(average_absolute_rank_movement)::numeric, 2)');
    expect(report).toContain('Second-story completion and D7 qualified return require mature outcome attribution');
    expect(report).not.toContain('select post.title');
    expect(report).not.toContain('select profile.email');
  });

  it('keeps v1 evidence intact while excluding non-human readers from private R3 evidence', () => {
    const service = readFileSync(new URL('../src/services/feed-service.js', import.meta.url), 'utf8');
    expect(service).toContain('inner join public.profiles reader on reader.id = history.user_id\n         inner join eligible');
    expect(service).toContain('inner join public.profiles reader on reader.id = bookmark.user_id\n         inner join eligible');
    const r3QualityReaderJoins = service.match(/reader\.id = (?:history\.user_id|bookmark\.user_id) and reader\.account_type = 'human'/g) ?? [];
    expect(r3QualityReaderJoins.length).toBeGreaterThanOrEqual(4);
    expect(service).toContain('), r3_recent_exposure as (');
    expect(service).toContain("reader.id = exposure.profile_id and reader.account_type = 'human'");
    expect(service).toContain('as r3_repetition_penalty');
  });
});
