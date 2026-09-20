import { describe, expect, it } from 'vitest';
import { validateStagingDatabaseTarget, validateTestDatabaseTarget } from '../src/scripts/staging-database-guard.js';

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

  it('locks an approved remote operation to its expected staging project', () => {
    expect(() => validateStagingDatabaseTarget({
      stagingDatabaseUrl: 'postgresql://postgres.wrong@staging.example.com/postgres',
      allowRemoteStaging: true,
      expectedProjectRef: 'xrfnebvkazewqramkpri',
    })).toThrow(/expected project xrfnebvkazewqramkpri/);

    expect(validateStagingDatabaseTarget({
      stagingDatabaseUrl: 'postgresql://postgres.xrfnebvkazewqramkpri@staging.example.com/postgres',
      allowRemoteStaging: true,
      expectedProjectRef: 'xrfnebvkazewqramkpri',
    })).toContain('xrfnebvkazewqramkpri');
  });
});

describe('validateTestDatabaseTarget', () => {
  it('accepts a local disposable test database with disposable marker', () => {
    const url = 'postgresql://testuser:testpass@localhost:5433/testdb?disposable=true';
    expect(validateTestDatabaseTarget(url)).toBe(url);
  });

  it('strictly rejects when disposable marker is missing', () => {
    expect(() => validateTestDatabaseTarget('postgresql://testuser:testpass@localhost:5433/testdb'))
      .toThrow(/lacks a disposable-environment marker/);
  });

  it('strictly rejects when only ?project=anything is provided without disposable marker', () => {
    const prev = process.env.DISPOSABLE_TEST_DB;
    try {
      delete process.env.DISPOSABLE_TEST_DB;
      expect(() => validateTestDatabaseTarget('postgresql://testuser:testpass@localhost:5433/testdb?project=anything'))
        .toThrow(/lacks a disposable-environment marker/);
    } finally {
      if (prev !== undefined) process.env.DISPOSABLE_TEST_DB = prev;
    }
  });

  it('accepts when DISPOSABLE_TEST_DB=true environment variable is set', () => {
    const prev = process.env.DISPOSABLE_TEST_DB;
    try {
      process.env.DISPOSABLE_TEST_DB = 'true';
      const url = 'postgresql://testuser:testpass@localhost:5433/testdb';
      expect(validateTestDatabaseTarget(url)).toBe(url);
    } finally {
      if (prev !== undefined) process.env.DISPOSABLE_TEST_DB = prev;
      else delete process.env.DISPOSABLE_TEST_DB;
    }
  });

  it('strictly rejects any remote Supabase database URL', () => {
    expect(() => validateTestDatabaseTarget('postgresql://postgres:secret@db.xrfnebvkazewqramkpri.supabase.co:5432/postgres'))
      .toThrow(/remote Supabase instance/);
    expect(() => validateTestDatabaseTarget('postgresql://postgres:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'))
      .toThrow(/remote Supabase instance/);
  });

  it('strictly rejects non-local hostnames without explicit test override', () => {
    expect(() => validateTestDatabaseTarget('postgresql://user:pass@remote-test-server.org:5433/testdb'))
      .toThrow(/points to a non-local target/);
  });

  it('strictly rejects local production databases (e.g. postgresql://localhost:5432/production)', () => {
    expect(() => validateTestDatabaseTarget('postgresql://localhost:5432/production'))
      .toThrow(/does not match expected disposable test port/);
  });

  it('strictly rejects non-test database names even on port 5433', () => {
    expect(() => validateTestDatabaseTarget('postgresql://localhost:5433/production?disposable=true'))
      .toThrow(/does not match expected disposable test database/);
    expect(() => validateTestDatabaseTarget('postgresql://localhost:5433/postgres?disposable=true'))
      .toThrow(/does not match expected disposable test database/);
  });

  it('strictly rejects local test databases on port 5432', () => {
    expect(() => validateTestDatabaseTarget('postgresql://localhost:5432/testdb?disposable=true'))
      .toThrow(/does not match expected disposable test port/);
  });
});
