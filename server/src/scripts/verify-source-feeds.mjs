import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';

const args = process.argv.slice(2);
const base = (args.find(arg => arg.startsWith('--base='))?.slice(7) || 'https://api.writon.cc').replace(/\/$/, '');
assert.ok(/^https:\/\/(api\.writon\.cc|[a-z0-9-]+\.a\.run\.app)$/.test(base), 'Unexpected API verification host');
assert.ok(args.every(arg => arg === '--database' || arg.startsWith('--base=')), 'Unknown verification option');

async function get(path, expectedStatus = 200) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, expectedStatus, `Unexpected HTTP status for ${path}`);
  return response.json();
}

const observed = [];
const report = { base, surfaces: {}, compatibility: {} };
assert.equal((await get('/health')).status, 'ok');
for (const audience of ['community', 'editorial']) {
  const ids = new Set();
  let pages = 0;
  for (let page = 1; page <= 3; page++) {
    const result = await get(`/api/v1/${audience}/posts?page=${page}&limit=20`);
    assert.equal(result.pagination.page, page);
    assert.equal(result.pagination.limit, 20);
    assert.ok(Array.isArray(result.posts) && result.posts.length <= 20);
    for (const post of result.posts) {
      assert.equal(post.contentSource, audience);
      assert.ok(!ids.has(post.id), 'Repeated story across source pages');
      assert.ok(/^[a-f0-9-]{36}$/i.test(post.id), 'Unexpected story identifier');
      ids.add(post.id);
      observed.push({ id: post.id, slug: post.slug, audience });
    }
    pages++;
    if (!result.pagination.hasMore) break;
  }
  await get(`/api/v1/${audience}/posts?page=0`, 400);
  await get(`/api/v1/${audience}/posts?limit=999`, 400);
  report.surfaces[audience] = { pages, storiesChecked: ids.size };
}
const communityIds = new Set(observed.filter(post => post.audience === 'community').map(post => post.id));
assert.ok(observed.filter(post => post.audience === 'editorial').every(post => !communityIds.has(post.id)), 'Surfaces overlap');

const legacy = await get('/api/v1/posts?limit=5');
assert.ok(Array.isArray(legacy.posts));
assert.ok(legacy.posts.every(post => post.contentSource === undefined), 'Compatibility feed contract changed');
report.compatibility.legacyStories = legacy.posts.length;
for (const audience of ['community', 'editorial']) {
  const sample = observed.find(post => post.audience === audience);
  if (sample) {
    for (const identifier of [sample.id, sample.slug].filter(Boolean)) {
      const detail = await get(`/api/v1/posts/${encodeURIComponent(identifier)}`);
      assert.equal(detail.post.id, sample.id, 'ID/slug reader mismatch');
      assert.ok(detail.post.content?.length > 0, 'Reader body missing');
    }
  }
}
assert.ok(Array.isArray((await get('/api/v1/tags')).tags));
assert.ok(Number.isInteger((await get('/api/v1/app/version')).latestVersionCode));
await get('/api/v1/me/drafts', 401);
await get('/api/v1/me', 401);
report.compatibility.readerIdAndSlug = true;
report.compatibility.tagsVersionAndAuth = true;

if (args.includes('--database')) {
  dotenv.config({ quiet: true });
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL missing');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1,
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15_000, statement_timeout: 15_000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const classification = `p.provenance = 'synthetic' or a.account_type = 'editorial_bot'
      or exists(select 1 from public.bot_configs b where b.id=p.author_id)`;
    const counts = await client.query(`select count(*)::int as total_public,
      count(*) filter (where p.provenance='human_verified' and a.account_type='human' and not (${classification}))::int as community,
      count(*) filter (where ${classification})::int as editorial,
      count(*) filter (where p.provenance='human_verified' and a.account_type='human'
        and exists(select 1 from public.bot_configs b where b.id=p.author_id))::int as retagged_bots_excluded
      from public.posts p join public.profiles a on a.id=p.author_id
      where p.status='published' and p.is_public=true`);
    const rows = await client.query(`select p.id::text, p.provenance, a.account_type,
      (${classification}) as editorial, p.status, p.is_public
      from public.posts p join public.profiles a on a.id=p.author_id where p.id=any($1::uuid[])`,
      [observed.map(post => post.id)]);
    const records = new Map(rows.rows.map(row => [row.id, row]));
    for (const post of observed) {
      const row = records.get(post.id);
      assert.ok(row && row.status === 'published' && row.is_public === true, 'Inaccessible feed story');
      assert.equal(row.editorial, post.audience === 'editorial', 'Registry/provenance source mismatch');
      if (post.audience === 'community') {
        assert.equal(row.provenance, 'human_verified');
        assert.equal(row.account_type, 'human');
      }
    }
    report.database = { ...counts.rows[0], sampledStoriesValidated: observed.length, readOnly: true };
    await client.query('COMMIT');
  } finally { client.release(); await pool.end(); }
}
console.log(JSON.stringify({ status: 'passed', ...report }, null, 2));
