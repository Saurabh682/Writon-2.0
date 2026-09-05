import { describe, expect, it } from 'vitest';
import { validateStagingDatabaseTarget } from '../src/scripts/staging-database-guard.js';

describe('validateStagingDatabaseTarget', () => {
  it('accepts a dedicated local PostgreSQL database', () => {
    expect(validateStagingDatabaseTarget({
      stagingDatabaseUrl: 'postgresql://writon_staging:password@127.0.0.1:55432/writon_staging',
      productionDatabaseUrl: 'postgresql://production:password@example.supabase.co/postgres',
    })).toContain('127.0.0.1:55432/writon_staging');
  });

  it('never falls back to DATABASE_URL', () => {
    expect(() => validateStagingDatabaseTarget({
      productionDatabaseUrl: 'postgresql://production:password@example.supabase.co/postgres',
    })).toThrow(/STAGING_DATABASE_URL is required/);
  });

  it('rejects a staging URL identical to the production URL', () => {
    const databaseUrl = 'postgresql://production:password@example.supabase.co/postgres';
    expect(() => validateStagingDatabaseTarget({
      stagingDatabaseUrl: databaseUrl,
      productionDatabaseUrl: databaseUrl,
      allowRemoteStaging: true,
    })).toThrow(/matches DATABASE_URL/);
  });

  it('requires explicit approval for a remote staging host', () => {
    expect(() => validateStagingDatabaseTarget({
      stagingDatabaseUrl: 'postgresql://staging:password@staging.example.com/postgres',
    })).toThrow(/ALLOW_REMOTE_STAGING=true/);
  });

  it('accepts a distinct remote target after explicit approval', () => {
    expect(validateStagingDatabaseTarget({
      stagingDatabaseUrl: 'postgresql://staging:password@staging.example.com/postgres',
      productionDatabaseUrl: 'postgresql://production:password@production.example.com/postgres',
      allowRemoteStaging: true,
    })).toContain('staging.example.com');
  });
});
