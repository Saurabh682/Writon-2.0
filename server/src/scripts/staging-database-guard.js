export function validateStagingDatabaseTarget({
  stagingDatabaseUrl,
  productionDatabaseUrl,
  allowRemoteStaging = false,
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

  return stagingUrl.href;
}
