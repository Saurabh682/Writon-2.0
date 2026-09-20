import 'dotenv/config';
import { execSync } from 'node:child_process';
import pg from 'pg';

const PRODUCTION_PROJECT_REF = 'rrxaitxeirykmiihgiqj';
const productionRequested = process.argv.includes('--production');
const connectionString = process.env.DATABASE_URL || execSync(
  'gcloud secrets versions access latest --secret=writon-database-url-production --project=writon-app-2020',
  { encoding: 'utf8', windowsHide: true },
).trim();

if (!productionRequested || !connectionString.includes(PRODUCTION_PROJECT_REF)) {
  throw new Error(`Refusing production inspection without --production and ${PRODUCTION_PROJECT_REF}.`);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query('begin transaction read only');
  const metadata = await client.query(
    `select count(*)::int as present
       from information_schema.columns
      where table_schema = 'public' and table_name = 'posts'
        and column_name = any($1::text[])`,
    [[
      'content_form', 'content_form_confidence', 'word_count', 'script_code',
      'script_confidence', 'metadata_source', 'metadata_updated_at',
    ]],
  );
  const tables = await client.query(
    `select
       to_regclass('public.reading_progress_mutations') is not null as reading_ledger,
       to_regclass('public.feed_shadow_rankings') is not null as shadow_table`,
  );
  const inventory = await client.query(
    `select count(*)::int as eligible_stories,
            count(distinct post.language_code)::int as languages,
            count(distinct post.author_id)::int as authors
       from public.posts post
       inner join public.profiles author on author.id = post.author_id
      where post.status = 'published' and post.is_public = true
        and post.provenance = 'human_verified' and author.account_type = 'human'`,
  );
  const classifiedStories = metadata.rows[0].present === 7
    ? (await client.query(
      `select count(*)::int as count from public.posts where content_form is not null`,
    )).rows[0].count
    : 0;
  await client.query('rollback');
  console.log(JSON.stringify({
    productionProject: PRODUCTION_PROJECT_REF,
    metadataColumns: metadata.rows[0].present,
    ...tables.rows[0],
    ...inventory.rows[0],
    classifiedStories,
  }, null, 2));
} finally {
  await client.end().catch(() => {});
}
