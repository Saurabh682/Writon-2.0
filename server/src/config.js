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
  GEMINI_MODEL: z.string().trim().default('gemini-3.5-flash'),
  GEMINI_PRO_MODEL: z.string().trim().default('gemini-3.1-pro-preview'),
  ADMIN_SECRET_KEY: z.string().trim().optional(),
  TREND_INGEST_SECRET: z.string().trim().min(16).optional(),
  RENDER: z.enum(['true', 'false']).optional(),
  SPARK_AUTOMATION_ENABLED: z.enum(['true', 'false']).optional(),
  LATEST_APP_VERSION_CODE: z.coerce.number().int().min(1).default(119),
  PUBLISHED_APP_VERSION_CODE: z.coerce.number().int().min(1).default(108),
  MIN_SUPPORTED_APP_VERSION_CODE: z.coerce.number().int().min(1).default(101),
  PLAY_STORE_APP_URL: z.string().url().default('https://play.google.com/store/apps/details?id=com.ibitvalley.writon'),
  PUSH_DELIVERY_ENABLED: z.enum(['true', 'false']).default('true'),
  PUSH_DELIVERY_POLL_INTERVAL_MS: z.coerce.number().int().min(5_000).max(300_000).default(30_000),
  GUEST_PUSH_REGISTRATION_ENABLED: z.enum(['true', 'false']).default('false'),
  TIMERS_DISABLED: z.enum(['true', 'false']).optional(),
  K_SERVICE: z.string().optional(),
  FEED_PERSONALIZATION_ENABLED: z.enum(['true', 'false']).default('true'),
  FEED_BEHAVIOR_ROLLOUT_PERCENT: z.coerce.number().int().min(0).max(90).default(0),
  FEED_HOLDOUT_PERCENT: z.coerce.number().int().min(0).max(50).default(10),
  FEED_SHADOW_RANKING_ENABLED: z.enum(['true', 'false']).default('true'),
  FEED_GUEST_LEARNING_ENABLED: z.enum(['true', 'false']).default('false'),
  FEED_SESSION_TTL_MINUTES: z.coerce.number().int().min(15).max(1_440).default(240),
  DAILY_DIGEST_ENABLED: z.enum(['true', 'false']).default('false'),
  DAILY_DIGEST_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(14),
  DAILY_DIGEST_MINUTE_UTC: z.coerce.number().int().min(0).max(59).default(30),
  REVIEW_PROMPT_ENABLED: z.enum(['true', 'false']).default('false'),
  REVIEW_PROMPT_ROLLOUT_PERCENT: z.coerce.number().int().min(0).max(100).default(0),
  REVIEW_PROMPT_MIN_VERSION_CODE: z.coerce.number().int().min(1).default(120),
  REVIEW_PROMPT_EXCLUDED_VERSION_CODES: z.string().default(''),
  REVIEW_PROMPT_READER_ENABLED: z.enum(['true', 'false']).default('false'),
  REVIEW_PROMPT_WRITER_ENABLED: z.enum(['true', 'false']).default('false'),
  SOCIAL_AUTO_PUBLISH_ENABLED: z.enum(['true', 'false']).default('false'),
  SOCIAL_AUTO_PUBLISH_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(4),
  SOCIAL_AUTO_PUBLISH_MINUTE_UTC: z.coerce.number().int().min(0).max(59).default(0),
  X_API_KEY: z.string().optional(),
  X_API_SECRET: z.string().optional(),
  X_ACCESS_TOKEN: z.string().optional(),
  X_ACCESS_SECRET: z.string().optional(),
  X_BEARER_TOKEN: z.string().optional(),
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  WRITON_SERVICE_ROLE: z.enum(['public', 'worker', 'all']).default('all'),
  WRITON_EMAIL_DELIVERY_ENABLED: z.enum(['true', 'false']).default('false'),
  WRITON_EMAIL_MODE: z.enum(['internal', 'production']).default('internal'),
  WRITON_EMAIL_TEST_RECIPIENTS: z.string().optional(),
  WRITON_EMAIL_DAILY_CAPACITY: z.coerce.number().int().min(1).max(10_000).default(80),
  WRITON_EMAIL_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(25),
  WRITON_EMAIL_LEASE_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  WRITON_EMAIL_FROM: z.string().optional(),
  WRITON_EMAIL_REPLY_TO: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  WRITON_UNSUBSCRIBE_BASE_URL: z.string().url().optional(),
  WRITON_UNSUBSCRIBE_KEYS_JSON: z.string().optional(),
  JEV_EXPERIMENT_ENABLED: z.enum(['true', 'false']).default('false'),
  JEV_API_KEY: z.string().trim().optional(),
  JEV_API_URL: z.string().url().default('https://api.typesafe.ai/v1/systemone'),
  JEV_MODEL: z.string().trim().default('jev-1.13.0'),
  JEV_SHADOW_MODE: z.enum(['true', 'false']).default('true'),
  JEV_TRIAGE_ENABLED: z.enum(['true', 'false']).default('true'),
  JEV_QA_ENABLED: z.enum(['true', 'false']).default('true'),
  JEV_MIN_RELEVANCE: z.coerce.number().min(0).max(1).default(0.55),
  JEV_MIN_WORTH_COVERING: z.coerce.number().min(0).max(1).default(0.60),
  JEV_MAX_DUPLICATE_PROBABILITY: z.coerce.number().min(0).max(1).default(0.65),
  JEV_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.60),
});

function parseKeyring(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed.filter(k => k && typeof k.kid === 'string' && typeof k.secret === 'string' && k.secret.length >= 16);
  } catch {
    return [];
  }
}

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
    geminiModel: values.GEMINI_MODEL,
    geminiProModel: values.GEMINI_PRO_MODEL,
    adminSecretKey: values.ADMIN_SECRET_KEY || null,
    trendIngestSecret: (() => {
      if (values.TREND_INGEST_SECRET) return values.TREND_INGEST_SECRET;
      if (values.NODE_ENV === 'production') {
        throw new Error('TREND_INGEST_SECRET is required in production.');
      }
      return values.ADMIN_SECRET_KEY || null;
    })(),
    sparkAutomationEnabled: values.SPARK_AUTOMATION_ENABLED
      ? values.SPARK_AUTOMATION_ENABLED === 'true'
      : values.RENDER !== 'true',
    latestAppVersionCode: values.LATEST_APP_VERSION_CODE,
    publishedAppVersionCode: values.PUBLISHED_APP_VERSION_CODE,
    minSupportedAppVersionCode: values.MIN_SUPPORTED_APP_VERSION_CODE,
    playStoreAppUrl: values.PLAY_STORE_APP_URL,
    pushDeliveryEnabled: values.PUSH_DELIVERY_ENABLED === 'true',
    pushDeliveryPollIntervalMs: values.PUSH_DELIVERY_POLL_INTERVAL_MS,
    guestPushRegistrationEnabled: values.GUEST_PUSH_REGISTRATION_ENABLED === 'true',
    timersDisabled: Boolean(values.TIMERS_DISABLED === 'true' || values.K_SERVICE),
    feedPersonalizationEnabled: values.FEED_PERSONALIZATION_ENABLED === 'true',
    feedBehaviorRolloutPercent: values.FEED_BEHAVIOR_ROLLOUT_PERCENT,
    feedHoldoutPercent: values.FEED_HOLDOUT_PERCENT,
    feedShadowRankingEnabled: values.FEED_SHADOW_RANKING_ENABLED === 'true',
    feedGuestLearningEnabled: values.FEED_GUEST_LEARNING_ENABLED === 'true',
    feedSessionTtlMinutes: values.FEED_SESSION_TTL_MINUTES,
    dailyDigestEnabled: values.DAILY_DIGEST_ENABLED === 'true',
    dailyDigestHourUtc: values.DAILY_DIGEST_HOUR_UTC,
    dailyDigestMinuteUtc: values.DAILY_DIGEST_MINUTE_UTC,
    reviewPromptEnabled: values.REVIEW_PROMPT_ENABLED === 'true',
    reviewPromptRolloutPercent: values.REVIEW_PROMPT_ROLLOUT_PERCENT,
    reviewPromptMinVersionCode: values.REVIEW_PROMPT_MIN_VERSION_CODE,
    reviewPromptExcludedVersionCodes: values.REVIEW_PROMPT_EXCLUDED_VERSION_CODES
      ? values.REVIEW_PROMPT_EXCLUDED_VERSION_CODES.split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n))
      : [],
    reviewPromptReaderEnabled: values.REVIEW_PROMPT_READER_ENABLED === 'true',
    reviewPromptWriterEnabled: values.REVIEW_PROMPT_WRITER_ENABLED === 'true',
    socialAutoPublishEnabled: values.SOCIAL_AUTO_PUBLISH_ENABLED === 'true',
    socialAutoPublishHourUtc: values.SOCIAL_AUTO_PUBLISH_HOUR_UTC,
    socialAutoPublishMinuteUtc: values.SOCIAL_AUTO_PUBLISH_MINUTE_UTC,
    xApiKey: values.X_API_KEY || null,
    xApiSecret: values.X_API_SECRET || null,
    xAccessToken: values.X_ACCESS_TOKEN || null,
    xAccessSecret: values.X_ACCESS_SECRET || null,
    xBearerToken: values.X_BEARER_TOKEN || null,
    instagramAccessToken: values.INSTAGRAM_ACCESS_TOKEN || null,
    instagramBusinessAccountId: values.INSTAGRAM_BUSINESS_ACCOUNT_ID || null,
    discordWebhookUrl: values.DISCORD_WEBHOOK_URL || null,
    telegramBotToken: values.TELEGRAM_BOT_TOKEN || null,
    telegramChatId: values.TELEGRAM_CHAT_ID || null,
    serviceRole: values.WRITON_SERVICE_ROLE,
    email: {
      enabled: values.WRITON_EMAIL_DELIVERY_ENABLED === 'true',
      mode: values.WRITON_EMAIL_MODE,
      testRecipients: new Set((values.WRITON_EMAIL_TEST_RECIPIENTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)),
      dailyCapacity: values.WRITON_EMAIL_DAILY_CAPACITY,
      batchSize: values.WRITON_EMAIL_BATCH_SIZE,
      leaseSeconds: values.WRITON_EMAIL_LEASE_SECONDS,
      from: values.WRITON_EMAIL_FROM || null,
      replyTo: values.WRITON_EMAIL_REPLY_TO || null,
      resendApiKey: values.RESEND_API_KEY || null,
      resendWebhookSecret: values.RESEND_WEBHOOK_SECRET || null,
      unsubscribeBaseUrl: values.WRITON_UNSUBSCRIBE_BASE_URL || 'https://writon.cc/email/unsubscribe',
      unsubscribeKeys: parseKeyring(values.WRITON_UNSUBSCRIBE_KEYS_JSON),
    },
    jev: {
      enabled: values.JEV_EXPERIMENT_ENABLED === 'true',
      apiKey: values.JEV_API_KEY || null,
      apiUrl: values.JEV_API_URL,
      model: values.JEV_MODEL,
      shadowMode: values.JEV_SHADOW_MODE !== 'false',
      triageEnabled: values.JEV_TRIAGE_ENABLED !== 'false',
      qaEnabled: values.JEV_QA_ENABLED !== 'false',
      thresholds: {
        minRelevance: values.JEV_MIN_RELEVANCE,
        minWorthCovering: values.JEV_MIN_WORTH_COVERING,
        maxDuplicateProbability: values.JEV_MAX_DUPLICATE_PROBABILITY,
        minConfidence: values.JEV_MIN_CONFIDENCE
      }
    },
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

