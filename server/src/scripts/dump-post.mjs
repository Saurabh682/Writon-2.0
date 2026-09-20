import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const p = await pool.query("select id, title, slug, author_id, category, summary, created_at from public.posts where title ilike '%Shadow Premium%' or content ilike '%Subodh%' or content ilike '%Pranav%' order by created_at desc limit 5");
console.log('FOUND POSTS:', p.rows);
if (p.rows[0]) {
  const full = await pool.query("select id, title, content from public.posts where id = $1", [p.rows[0].id]);
  console.log('TITLE:', full.rows[0]?.title);
  console.log('CONTENT:\n', full.rows[0]?.content);
}
await pool.end();









