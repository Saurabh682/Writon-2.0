import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = path.resolve(__dirname, '../../migrations/20260917_founding_writer_eligibility.sql');

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' ? true : false,
  });

  try {
    console.log('Applying migration:', MIGRATION_PATH);
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    await pool.query(sql);
    console.log('✅ Migration executed successfully.');

    // Query stats from founding_writer_eligibility
    const statsRes = await pool.query(`
      SELECT 
        count(*)::int as total_frozen,
        count(case when eligibility_reason = 'published_author' then 1 end)::int as published_authors,
        count(case when eligibility_reason = 'engaged_community' then 1 end)::int as engaged_community,
        count(case when eligibility_reason = 'legacy_member' then 1 end)::int as legacy_members
      FROM public.founding_writer_eligibility
      WHERE campaign_id = 'founding_writers_v2'
    `);

    console.log('\n--- Frozen Founding Writer Snapshot ---');
    console.table(statsRes.rows);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
