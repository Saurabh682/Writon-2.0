import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const productionRequested = process.argv.includes('--production');

if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!productionRequested || !databaseUrl.includes('rrxaitxeirykmiihgiqj')) {
  throw new Error('Refusing to modify a database without --production and the expected production project reference (rrxaitxeirykmiihgiqj).');
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

try {
  const migrationPath = path.resolve('migrations/20260911_owned_content_edits.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying 20260911_owned_content_edits.sql to production database...');
  await pool.query(migrationSql);

  const verification = await pool.query(`
    select
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'posts'
          and column_name = 'content_updated_at' and data_type = 'timestamp with time zone'
      ) as post_update_timestamp,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'comments'
          and column_name = 'updated_at' and data_type = 'timestamp with time zone'
      ) as comment_update_timestamp
  `);

  console.log('Production verification result:', verification.rows[0]);
  if (!verification.rows[0]?.post_update_timestamp || !verification.rows[0]?.comment_update_timestamp) {
    throw new Error('Verification failed: columns missing after migration.');
  }
  console.log('Migration successfully applied and verified on production database.');
} finally {
  await pool.end();
}
