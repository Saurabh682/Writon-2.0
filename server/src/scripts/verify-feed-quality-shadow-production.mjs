import 'dotenv/config';
import { execSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { stableBucket } from '../services/feed-ranking.js';

const { Client } = pg;
const PRODUCTION_PROJECT_REF = 'rrxaitxeirykmiihgiqj';
const productionRequested = process.argv.includes('--production');
const PRODUCTION_API = String(
  process.env.PRODUCTION_API_BASE_URL
    || 'https://r3-shadow-20260914---writon-app-api-rfusi3iwbq-el.a.run.app',
).replace(/\/+$/, '');
if (!productionRequested
    || !/^https:\/\/r3-shadow-20260914---writon-app-api-rfusi3iwbq-el\.a\.run\.app$/u.test(PRODUCTION_API)) {
  throw new Error('Production verification requires --production and the isolated R3 revision URL.');
}

const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const googleServicesUrl = new URL('../../../app/google-services.json', import.meta.url);
const connectionString = process.env.DATABASE_URL || execSync(
  'gcloud secrets versions access latest --secret=writon-database-url-production --project=writon-app-2020',
  { encoding: 'utf8', windowsHide: true },
).trim();
if (!connectionString.includes(PRODUCTION_PROJECT_REF)) {
  throw new Error(`Refusing verification outside production ref ${PRODUCTION_PROJECT_REF}.`);
}
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
  return body;
}

async function createShadowEligibleIdentity() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const email = `codex-r3-${randomUUID()}@example.test`;
    const password = `${randomBytes(18).toString('base64url')}aA9!`;
    const account = await jsonRequest(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    if (stableBucket(account.localId) >= 10) return account;
    await jsonRequest(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken: account.idToken }),
      },
    );
  }
  throw new Error('Could not create a disposable identity outside the holdout bucket.');
}

try {
  await database.connect();
  databaseConnected = true;
  const account = await createShadowEligibleIdentity();
  idToken = account.idToken;
  firebaseUid = account.localId;

  const candidates = await database.query(
    `select id,
            greatest(
              case content_form when 'poetry' then 8 when 'flash' then 20 when 'essay' then 45 end,
              ceil(word_count * 60.0 / 200.0)
            )::int as expected_seconds
     from public.posts
     where status = 'published' and is_public = true
       and provenance = 'human_verified'
       and content_form in ('poetry', 'flash', 'essay') and word_count > 0
     order by expected_seconds asc, id
     limit 2`,
  );
  if (candidates.rowCount < 2) throw new Error('Staging needs two eligible stories for shadow-mode proof.');

  const headers = { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' };
  for (const story of candidates.rows) {
    await jsonRequest(`${PRODUCTION_API}/api/v1/posts/${story.id}/reading-progress`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        progress: 0.95,
        readSeconds: Number(story.expected_seconds),
        clientMutationId: randomUUID(),
      }),
    });
  }
  await jsonRequest(`${PRODUCTION_API}/api/v1/posts/${candidates.rows[0].id}/bookmark`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ enabled: true }),
  });

  const feed = await jsonRequest(`${PRODUCTION_API}/api/v1/feed?language=en&limit=20`, {
    headers: { authorization: `Bearer ${idToken}` },
  });
  if (feed.rankingVersion !== 'writon-feed-v1-shadow') {
    throw new Error(`Expected visible shadow mode, received ${feed.rankingVersion}.`);
  }

  const proofResult = await database.query(
    `select session.ranking_version,
            count(distinct exposure.story_id)::int as visible_rows,
            count(distinct shadow.story_id)::int as shadow_rows,
            count(distinct shadow.shadow_rank_position)::int as distinct_shadow_ranks,
            count(distinct shadow.visible_rank_position)::int as distinct_visible_ranks,
            min(shadow.normalized_quality)::float8 as minimum_quality,
            max(shadow.normalized_quality)::float8 as maximum_quality,
            array_agg(distinct shadow.model_version) filter (where shadow.model_version is not null) as shadow_versions
     from public.reader_feed_sessions session
     left join public.feed_exposures exposure on exposure.feed_session_id = session.id
     left join public.feed_shadow_rankings shadow on shadow.feed_session_id = session.id
     where session.id = $1::uuid and session.profile_id = $2
     group by session.id`,
    [feed.feedSessionId, firebaseUid],
  );
  const proof = proofResult.rows[0];
  if (!proof
      || proof.ranking_version !== 'writon-feed-v1-shadow'
      || proof.visible_rows < 1
      || proof.shadow_rows !== proof.visible_rows
      || proof.distinct_shadow_ranks !== proof.shadow_rows
      || proof.distinct_visible_ranks < 1
      || proof.distinct_visible_ranks > proof.visible_rows
      || proof.minimum_quality !== 0.5
      || proof.maximum_quality !== 0.5
      || proof.shadow_versions?.length !== 1
      || proof.shadow_versions[0] !== 'writon-feed-r3-shadow-v1') {
    throw new Error(`R3 shadow persistence proof failed: ${JSON.stringify(proof)}`);
  }

  await jsonRequest(`${PRODUCTION_API}/api/v1/me`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${idToken}` },
  });
  deletedThroughApi = true;
  const cleanupResult = await database.query(
    `select
       (select count(*)::int from public.profiles where id = $1) as profiles,
       (select count(*)::int from public.reading_history where user_id = $1) as history,
       (select count(*)::int from public.reader_feed_sessions where profile_id = $1) as sessions,
       (select count(*)::int from public.feed_shadow_rankings where profile_id = $1) as shadow_rows`,
    [firebaseUid],
  );
  const cleanup = cleanupResult.rows[0];
  if (Object.values(cleanup).some((count) => count !== 0)) {
    throw new Error(`Disposable R3 production-canary data did not cascade: ${JSON.stringify(cleanup)}`);
  }

  console.log(JSON.stringify({
    productionProject: PRODUCTION_PROJECT_REF,
    productionApi: PRODUCTION_API,
    rankingVersion: feed.rankingVersion,
    visibleItemsReturned: feed.items.length,
    proof,
    cleanup,
  }, null, 2));
} finally {
  if (!deletedThroughApi && idToken) {
    deletedThroughApi = await jsonRequest(`${PRODUCTION_API}/api/v1/me`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${idToken}` },
    }).then(() => true).catch(() => false);
  }
  if (!deletedThroughApi && databaseConnected && firebaseUid) {
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
