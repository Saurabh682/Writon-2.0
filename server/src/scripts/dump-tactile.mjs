import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'node:fs';
dotenv.config({ path: 'server/.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function dumpContent() {
  const res = await pool.query(`
    SELECT id, title, slug, summary, content
    FROM public.posts
    WHERE id = '1f76712c-6c85-43b4-8ba1-132fa7c8b539'
  `);
  if (res.rows.length > 0) {
    fs.writeFileSync('server/src/scripts/tactile-sanctuary-dump.txt', res.rows[0].content, 'utf8');
    console.log('Saved content to tactile-sanctuary-dump.txt');
  }
  await pool.end();
}
dumpContent();
