import 'dotenv/config';
import { execSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const productionRequested = process.argv.includes('--production');
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const PRODUCTION_PROJECT_REF = 'rrxaitxeirykmiihgiqj';
const API_BASE_URL = String(process.env.API_BASE_URL || process.env.STAGING_API_BASE_URL || '').replace(/\/+$/, '');
const expectedApiPattern = productionRequested
  ? /^https:\/\/(?:[a-z0-9-]+---)?writon-app-api-rfusi3iwbq-el\.a\.run\.app$/u
  : /^https:\/\/(?:[a-z0-9-]+---)?writon-app-api-staging-rfusi3iwbq-el\.a\.run\.app$/u;
if (!expectedApiPattern.test(API_BASE_URL)) {
  throw new Error(`API_BASE_URL must target the dedicated WritOn ${productionRequested ? 'production' : 'staging'} Cloud Run service.`);
}

const databaseSecret = productionRequested ? 'writon-database-url-production' : 'writon-database-url-staging';
const databaseUrl = (productionRequested ? process.env.DATABASE_URL : process.env.STAGING_DATABASE_URL) || execSync(
  `gcloud secrets versions access latest --secret=${databaseSecret} --project=writon-app-2020`,
  { encoding: 'utf8', windowsHide: true },
).trim();
const connectionString = productionRequested
  ? databaseUrl
  : validateStagingDatabaseTarget({
      stagingDatabaseUrl: databaseUrl,
      productionDatabaseUrl: process.env.DATABASE_URL,
      allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
      expectedProjectRef: STAGING_PROJECT_REF,
    });
if (productionRequested && !connectionString.includes(PRODUCTION_PROJECT_REF)) {
  throw new Error(`Refusing production verification: expected ${PRODUCTION_PROJECT_REF}.`);
}
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const googleServicesUrl = new URL('../../../app/google-services.json', import.meta.url);
const database = new Client({
  connectionString,
  ssl: {
    ca: await readFile(fileURLToPath(certificateUrl), 'utf8'),
    rejectUnauthorized: true,
  },
});
const googleServices = JSON.parse(await readFile(fileURLToPath(googleServicesUrl), 'utf8'));
const androidClient = googleServices.client.find((entry) =>
  entry.client_info?.android_client_info?.package_name === 'com.ibitvalley.writon');
const apiKey = androidClient?.api_key?.[0]?.current_key;
if (!apiKey) throw new Error('Firebase Android API key is unavailable.');

const email = `codex-founding-${randomUUID()}@example.test`;
const password = `${randomBytes(18).toString('base64url')}aA9!`;
let idToken;
let firebaseUid;
let databaseConnected = false;

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).pathname}: ${JSON.stringify(body)}`);
  return body;
}

try {
  await database.connect();
  databaseConnected = true;
  const signUp = await jsonRequest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  idToken = signUp.idToken;
  firebaseUid = signUp.localId;
  const authorization = { authorization: `Bearer ${idToken}` };

  const created = await jsonRequest(`${API_BASE_URL}/api/v1/me`, { headers: authorization });
  if (created.profile?.foundingWriterNumber !== null || created.profile?.emailVerified !== false) {
    throw new Error(`Unexpected new-profile entitlements: ${JSON.stringify(created.profile)}`);
  }

  await database.query(
    'update public.profiles set founding_writer_number = 250 where id = $1',
    [firebaseUid],
  );
  const numbered = await jsonRequest(`${API_BASE_URL}/api/v1/me`, { headers: authorization });
  if (numbered.profile?.foundingWriterNumber !== 250) {
    throw new Error(`Numbered entitlement did not round-trip: ${JSON.stringify(numbered.profile)}`);
  }

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const form = new FormData();
  form.set('file', new Blob([png], { type: 'image/png' }), 'profile.png');
  form.set('purpose', 'profile');
  const upload = await jsonRequest(`${API_BASE_URL}/api/v1/media/upload`, {
    method: 'POST', headers: authorization, body: form,
  });
  const expectedMediaOrigin = productionRequested
    ? 'https://api.writon.cc/api/v1/media/'
    : 'https://writon-app-api-staging-802112841589.asia-south1.run.app/api/v1/media/';
  if (!upload.url?.startsWith(expectedMediaOrigin)) {
    throw new Error(`Upload returned a non-canonical staging URL: ${upload.url}`);
  }
  const saved = await jsonRequest(`${API_BASE_URL}/api/v1/me`, {
    method: 'PATCH',
    headers: { ...authorization, 'content-type': 'application/json' },
    body: JSON.stringify({ avatarUrl: upload.url }),
  });
  if (saved.profile?.avatarUrl !== upload.url || saved.profile?.foundingWriterNumber !== 250) {
    throw new Error(`Profile update lost media or entitlements: ${JSON.stringify(saved.profile)}`);
  }

  console.log(JSON.stringify({
    environment: productionRequested ? 'production' : 'staging',
    projectRef: productionRequested ? PRODUCTION_PROJECT_REF : STAGING_PROJECT_REF,
    apiBaseUrl: API_BASE_URL,
    defaultEntitlements: { foundingWriterNumber: null, emailVerified: false },
    numberedEntitlement: 250,
    mediaUrlCanonical: true,
    profileUpdateAccepted: true,
  }, null, 2));
} finally {
  if (databaseConnected && firebaseUid) {
    await database.query('delete from public.profiles where id = $1', [firebaseUid]).catch(() => {});
  }
  if (idToken) {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }).catch(() => {});
  }
  await database.end().catch(() => {});
}
