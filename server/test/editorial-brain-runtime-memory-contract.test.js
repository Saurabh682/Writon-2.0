import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Editorial Brain Runtime Memory Migration DDL & Contract Audit', () => {
  const migrationSql = readFileSync(
    new URL('../migrations/20260919_editorial_brain_runtime_memory.sql', import.meta.url),
    'utf8'
  );

  it('DDL includes all 3 core tables with non-destructive IF NOT EXISTS', () => {
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.editorial_insight_reservations');
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.editorial_insight_dispatches');
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.editorial_insight_observations');
  });

  it('enforces delivery_id uniqueness on reservations and dispatches for idempotency', () => {
    expect(migrationSql).toContain('delivery_id text NOT NULL UNIQUE');
    expect(migrationSql).toContain('idx_active_channel_insight');
  });

  it('enforces check constraints and RLS restricted to service_role', () => {
    expect(migrationSql).toContain("status text NOT NULL CHECK (status IN ('active', 'committed', 'released', 'quarantined'))");
    expect(migrationSql).toContain("status text NOT NULL CHECK (status IN ('in_flight', 'published', 'failed', 'reconciliation_required'))");
    expect(migrationSql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migrationSql).toContain("REVOKE ALL ON public.editorial_insight_reservations FROM anon, authenticated");
    expect(migrationSql).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_insight_reservations TO service_role");
  });

  it('observations table includes 72h window and allows nulls for unmeasured engagement', async () => {
    expect(migrationSql).toContain("\"window\" text NOT NULL CHECK (\"window\" IN ('1h', '6h', '24h', '72h', '7d'))");
    expect(migrationSql).toContain("impressions bigint CHECK (impressions IS NULL OR impressions >= 0)");
    expect(migrationSql).toContain("retention_pct numeric(5,2) CHECK (retention_pct IS NULL OR (retention_pct >= 0 AND retention_pct <= 100.00))");
    expect(migrationSql).toContain("uq_dispatch_observation_window UNIQUE (dispatch_id, \"window\")");
  });

  it('acquire_editorial_insight_lease stored function enforces cross-channel 48h spacing and permanent unresolved blocks', () => {
    expect(migrationSql).toContain("pg_advisory_xact_lock(v_lock_key)");
    expect(migrationSql).toContain("status IN ('in_flight', 'reconciliation_required')");
    expect(migrationSql).toContain("ARCHETYPE_UNRESOLVED_DISPATCH_BLOCK");
    expect(migrationSql).toContain("ARCHETYPE_RESERVATION_ACTIVE");
    expect(migrationSql).toContain("status = 'published'");
    expect(migrationSql).toContain("dispatched_at > now() - INTERVAL '48 hours'");
  });
});
