export function validateStagingDatabaseTarget({
  stagingDatabaseUrl,
  productionDatabaseUrl,
  allowRemoteStaging = false,
  expectedProjectRef,
}) {
  if (!stagingDatabaseUrl) {
    throw new Error('STAGING_DATABASE_URL is required. DATABASE_URL is never used as a fallback.');
  }

  const stagingUrl = new URL(stagingDatabaseUrl);
  const productionUrl = productionDatabaseUrl ? new URL(productionDatabaseUrl) : null;

  if (productionUrl && stagingUrl.href === productionUrl.href) {
    throw new Error('Refusing to use STAGING_DATABASE_URL because it matches DATABASE_URL.');
  }

  const localHosts = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal']);
  if (!localHosts.has(stagingUrl.hostname) && !allowRemoteStaging) {
    throw new Error('Remote staging requires ALLOW_REMOTE_STAGING=true and a separate staging database URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(stagingUrl.protocol)) {
    throw new Error('STAGING_DATABASE_URL must use the postgres or postgresql scheme.');
  }

  if (expectedProjectRef && !stagingUrl.href.includes(expectedProjectRef)) {
    throw new Error(`Refusing staging database target: expected project ${expectedProjectRef}.`);
  }

  return stagingUrl.href;
}

export function validateTestDatabaseTarget(databaseUrl, {
  varName = 'DATABASE_URL',
  expectedPort = '5433',
  expectedDatabase = 'testdb',
  allowRemoteTest = false,
} = {}) {
  if (!databaseUrl) {
    throw new Error(`${varName} is required for test execution.`);
  }

  const url = new URL(databaseUrl);
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal']);
  const isLocal = localHosts.has(url.hostname);

  if (url.hostname.includes('supabase.co') || url.hostname.includes('pooler.supabase.com')) {
    throw new Error(
      `[SECURITY FATAL] ${varName} points to a remote Supabase instance (${url.hostname}). ` +
      `Tests are strictly forbidden from connecting to remote Supabase instances.`
    );
  }

  if (!isLocal && !allowRemoteTest) {
    throw new Error(
      `[SECURITY FATAL] ${varName} points to a non-local target (${url.hostname}). ` +
      `Mutating tests require an explicitly verified local disposable database.`
    );
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(`${varName} must use the postgres or postgresql scheme.`);
  }

  // 1. Port verification: Local production or default PostgreSQL port 5432 is strictly prohibited
  const port = url.port || '5432';
  if (port !== String(expectedPort)) {
    throw new Error(
      `[SECURITY FATAL] ${varName} port (${port}) does not match expected disposable test port (${expectedPort}). ` +
      `Local production or default PostgreSQL ports (e.g. 5432) are strictly prohibited in tests.`
    );
  }

  // 2. Database identity verification: Name must match expected test database
  const dbName = url.pathname.replace(/^\//, '').split('?')[0];
  const isAllowedDb = dbName === expectedDatabase || dbName.endsWith('_test') || dbName === 'testdb';
  if (!isAllowedDb) {
    throw new Error(
      `[SECURITY FATAL] ${varName} database name ("${dbName}") does not match expected disposable test database ("${expectedDatabase}"). ` +
      `Non-test databases (e.g. production, postgres) are strictly prohibited in tests.`
    );
  }

  // 3. Disposable-environment marker verification
  const hasDisposableParam = url.searchParams.get('disposable') === 'true';
  const hasDisposableEnv = process.env.DISPOSABLE_TEST_DB === 'true';

  if (!hasDisposableParam && !hasDisposableEnv) {
    throw new Error(
      `[SECURITY FATAL] ${varName} lacks a disposable-environment marker. ` +
      `Add "?disposable=true" to the URL or set DISPOSABLE_TEST_DB=true to confirm this target is disposable.`
    );
  }

  return url.href;
}
