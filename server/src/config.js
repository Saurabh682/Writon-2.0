import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const runtimeEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(20).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{1,62}$/).default('writon-media'),
  PUBLIC_API_BASE_URL: z.string().url().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().trim().min(2).optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().trim().min(1).optional(),
  CORS_ORIGINS: z.string().trim().optional(),
  GEMINI_API_KEY: z.string().trim().optional(),
  ADMIN_SECRET_KEY: z.string().trim().optional(),
  RENDER: z.enum(['true', 'false']).optional(),
  SPARK_AUTOMATION_ENABLED: z.enum(['true', 'false']).optional(),
  LATEST_APP_VERSION_CODE: z.coerce.number().int().min(1).default(111),
  MIN_SUPPORTED_APP_VERSION_CODE: z.coerce.number().int().min(1).default(101),
  PLAY_STORE_APP_URL: z.string().url().default('https://play.google.com/store/apps/details?id=com.ibitvalley.writon'),
  PUSH_DELIVERY_POLL_INTERVAL_MS: z.coerce.number().int().min(5_000).max(300_000).default(30_000),
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
    databasePoolMax: values.DATABASE_POOL_MAX,
    databaseSslRejectUnauthorized: values.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
    supabaseUrl: values.SUPABASE_URL?.replace(/\/$/, '') ?? null,
    supabaseServiceRoleKey: values.SUPABASE_SERVICE_ROLE_KEY ?? null,
    supabaseStorageBucket: values.SUPABASE_STORAGE_BUCKET,
    publicApiBaseUrl: values.PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? null,

    firebaseServiceAccountJson: values.FIREBASE_SERVICE_ACCOUNT_JSON,
    firebaseServiceAccountPath: values.FIREBASE_SERVICE_ACCOUNT_PATH,
    corsOrigins,
    geminiApiKey: values.GEMINI_API_KEY || null,
    adminSecretKey: values.ADMIN_SECRET_KEY || null,
    sparkAutomationEnabled: values.SPARK_AUTOMATION_ENABLED
      ? values.SPARK_AUTOMATION_ENABLED === 'true'
      : values.RENDER !== 'true',
    latestAppVersionCode: values.LATEST_APP_VERSION_CODE,
    minSupportedAppVersionCode: values.MIN_SUPPORTED_APP_VERSION_CODE,
    playStoreAppUrl: values.PLAY_STORE_APP_URL,
    pushDeliveryPollIntervalMs: values.PUSH_DELIVERY_POLL_INTERVAL_MS,
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

