import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const runtimeEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().trim().min(2).optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().trim().min(1).optional(),
  CORS_ORIGINS: z.string().trim().optional(),
});

function parseServiceAccount(serializedAccount, source) {
  try {
    return JSON.parse(serializedAccount);
  } catch {
    throw new Error(`${source} must contain valid JSON.`);
  }
}

export function loadRuntimeConfig(environment = process.env) {
  const parsed = runtimeEnvironmentSchema.safeParse(environment);

  if (!parsed.success) {
    throw new Error(`Invalid runtime configuration: ${parsed.error.issues.map((issue) => issue.message).join(', ')}`);
  }

  const values = parsed.data;
  const corsOrigins = values.CORS_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

  return {

    environment: values.NODE_ENV,
    port: values.PORT,
    databaseUrl: values.DATABASE_URL,
    databaseSslRejectUnauthorized: values.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',

    firebaseServiceAccountJson: values.FIREBASE_SERVICE_ACCOUNT_JSON,
    firebaseServiceAccountPath: values.FIREBASE_SERVICE_ACCOUNT_PATH,
    corsOrigins,
  };
}

export async function loadFirebaseServiceAccount(config) {
  if (config.firebaseServiceAccountJson) {
    return parseServiceAccount(
      config.firebaseServiceAccountJson,
      'FIREBASE_SERVICE_ACCOUNT_JSON'
    );
  }

  if (config.firebaseServiceAccountPath) {
    return parseServiceAccount(
      await readFile(config.firebaseServiceAccountPath, 'utf8'),
      'FIREBASE_SERVICE_ACCOUNT_PATH'
    );
  }

  try {
    return parseServiceAccount(
      await readFile(new URL('../serviceAccountKey.json', import.meta.url), 'utf8'),
      'server/serviceAccountKey.json'
    );
  } catch (_error) {
    return null;
  }
}

