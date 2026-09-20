import 'dotenv/config';
import { execSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const STAGING_API = String(
  process.env.STAGING_API_BASE_URL || 'https://writon-app-api-staging-rfusi3iwbq-el.a.run.app',
).replace(/\/+$/, '');
if (!/^https:\/\/(?:[a-z0-9-]+---)?writon-app-api-staging-rfusi3iwbq-el\.a\.run\.app$/u.test(STAGING_API)) {
  throw new Error('STAGING_API_BASE_URL must target the dedicated WritOn staging Cloud Run service.');
}
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const googleServicesUrl = new URL('../../../app/google-services.json', import.meta.url);
const stagingDatabaseUrl = process.env.STAGING_DATABASE_URL || execSync(
  'gcloud secrets versions access latest --secret=writon-database-url-staging --project=writon-app-2020',
  { encoding: 'utf8', windowsHide: true },
).trim();
const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl,
  productionDatabaseUrl: process.env.DATABASE_URL,
  allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
  expectedProjectRef: STAGING_PROJECT_REF,
});
const databaseHost = new URL(connectionString).hostname;
const database = new Client({
  connectionString,
  ssl: ['localhost', '127.0.0.1', '::1'].includes(databaseHost)
    ? false
    : {
        ca: await readFile(fileURLToPath(certificateUrl), 'utf8'),
        rejectUnauthorized: true,
      },
});

const googleServices = JSON.parse(await readFile(fileURLToPath(googleServicesUrl), 'utf8'));
const androidClient = googleServices.client.find((entry) =>
  entry.client_info?.android_client_info?.package_name === 'com.ibitvalley.writon');
const apiKey = androidClient?.api_key?.[0]?.current_key;
if (!apiKey) throw new Error('Firebase Android API key is unavailable.');

const email = `codex-r2-${randomUUID()}@example.test`;
const password = `${randomBytes(18).toString('base64url')}aA9!`;
const mutationId = randomUUID();
let idToken;
let firebaseUid;
let deletedThroughApi = false;
let databaseConnected = false;

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${new URL(url).pathname}: ${JSON.stringify(body)}`);
  }
  return { response, body };
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
  idToken = signUp.body.idToken;
  firebaseUid = signUp.body.localId;

  const candidate = await database.query(
    `select id,
            greatest(
              case content_form when 'poetry' then 8 when 'flash' then 20 when 'essay' then 45 end,
              ceil(word_count * 60.0 / 200.0)
            )::int as expected_seconds
     from public.posts
     where status = 'published' and is_public = true
       and content_form in ('poetry', 'flash', 'essay') and word_count > 0
     order by expected_seconds asc
     limit 1`,
  );
  const postId = candidate.rows[0]?.id;
  const expectedSeconds = candidate.rows[0]?.expected_seconds;
  if (!postId || !expectedSeconds || expectedSeconds > 60) {
    throw new Error('Staging needs an approved-form story with expected time between 1 and 60 seconds.');
  }

  const headers = {
    authorization: `Bearer ${idToken}`,
    'content-type': 'application/json',
  };
  const firstReadSeconds = Math.max(0, expectedSeconds - 1);
  const payload = JSON.stringify({ progress: 0.95, readSeconds: firstReadSeconds, clientMutationId: mutationId });
  const first = await jsonRequest(`${STAGING_API}/api/v1/posts/${postId}/reading-progress`, {
    method: 'POST', headers, body: payload,
  });
  const duplicate = await jsonRequest(`${STAGING_API}/api/v1/posts/${postId}/reading-progress`, {
    method: 'POST', headers, body: payload,
  });

  const databaseProof = await database.query(
    `select
       (select count(*)::int from public.reading_progress_mutations
        where user_id = $1 and post_id = $2 and client_mutation_id = $3) as mutation_count,
       (select read_seconds::int from public.reading_history
        where user_id = $1 and post_id = $2) as read_seconds`,
    [firebaseUid, postId, mutationId],
  );
  const proof = databaseProof.rows[0];
  if (Number(first.body?.progress) !== 0.94 || Number(duplicate.body?.progress) !== 0.94
      || first.body?.readSeconds !== firstReadSeconds || duplicate.body?.readSeconds !== firstReadSeconds
      || proof?.mutation_count !== 1 || proof?.read_seconds !== firstReadSeconds) {
    throw new Error(`Duplicate delivery changed reading evidence: ${JSON.stringify({
      firstReadSeconds: first.body?.readSeconds,
      duplicateReadSeconds: duplicate.body?.readSeconds,
      ...proof,
    })}`);
  }

  const completion = await jsonRequest(`${STAGING_API}/api/v1/posts/${postId}/reading-progress`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ progress: 0.95, readSeconds: 1, clientMutationId: randomUUID() }),
  });
  if (Number(completion.body?.progress) !== 0.95 || completion.body?.readSeconds !== expectedSeconds) {
    throw new Error(`Form-aware completion threshold failed: ${JSON.stringify(completion.body)}`);
  }

  await jsonRequest(`${STAGING_API}/api/v1/me`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${idToken}` },
  });
  deletedThroughApi = true;
  const cleanup = await database.query(
    `select
       (select count(*)::int from public.profiles where id = $1) as profiles,
       (select count(*)::int from public.reading_history where user_id = $1) as history,
       (select count(*)::int from public.reading_progress_mutations where user_id = $1) as mutations`,
    [firebaseUid],
  );
  if (Object.values(cleanup.rows[0]).some((count) => count !== 0)) {
    throw new Error(`Disposable staging data did not cascade: ${JSON.stringify(cleanup.rows[0])}`);
  }

  console.log(JSON.stringify({
    stagingProject: STAGING_PROJECT_REF,
    stagingApi: STAGING_API,
    expectedSeconds,
    firstReadSeconds: first.body.readSeconds,
    duplicateReadSeconds: duplicate.body.readSeconds,
    completedReadSeconds: completion.body.readSeconds,
    mutationRows: proof.mutation_count,
    cleanup: cleanup.rows[0],
  }, null, 2));
} finally {
  if (databaseConnected && firebaseUid) {
    await database.query('delete from public.profiles where id = $1', [firebaseUid]).catch(() => {});
  }
  if (!deletedThroughApi && idToken) {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }).catch(() => {});
  }
  await database.end().catch(() => {});
}
