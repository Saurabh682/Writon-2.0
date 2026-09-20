import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('reading progress idempotency contract', () => {
  const server = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
  const migration = readFileSync(
    new URL('../migrations/20260913_reading_progress_idempotency.sql', import.meta.url),
    'utf8',
  );
  const stagingRunner = readFileSync(
    new URL('../src/scripts/apply-reading-progress-idempotency-staging.mjs', import.meta.url),
    'utf8',
  );

  it('keeps the old payload valid while accepting a bounded UUID mutation key', () => {
    expect(server).toContain('clientMutationId: z.string().uuid().optional()');
    expect(server).toContain('parsed.data.clientMutationId ? idempotentQuery : legacyQuery');
  });

  it('increments reading totals only when the mutation ledger accepts a new key', () => {
    expect(server).toContain('on conflict (user_id, post_id, client_mutation_id) do nothing');
    expect(server).toContain('inner join accepted on accepted.post_id = p.id');
    expect(server).toContain('not exists (select 1 from updated)');
  });

  it('uses the shared form-aware expected-time guard in old and idempotent paths', () => {
    expect(server).toContain('coalesce(history.read_seconds, 0) + $4 < ${EXPECTED_READING_SECONDS_SQL}');
    expect(server.match(/\$\{EXPECTED_READING_SECONDS_SQL\}/g)).toHaveLength(2);
  });

  it('keeps the private deduplication ledger bounded and cascade-safe', () => {
    expect(migration).toContain("expires_at timestamptz not null default (now() + interval '35 days')");
    expect(migration).toContain('references public.profiles(id) on delete cascade');
    expect(migration).toContain('references public.posts(id) on delete cascade');
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('revoke all on public.reading_progress_mutations from anon, authenticated');
  });

  it('keeps hosted migration execution locked to the dedicated staging project', () => {
    expect(stagingRunner).toContain("const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri'");
    expect(stagingRunner).toContain('validateStagingDatabaseTarget({');
    expect(stagingRunner).toContain("allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true'");
    expect(stagingRunner).toContain("writon-database-url-staging");
    expect(stagingRunner).not.toContain("--secret=writon-database-url-production");
  });
});
