import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const res = await pool.query(`
  SELECT id, title, slug, category, author_id, summary
  FROM public.posts
  WHERE title ILIKE '%southern avenue%' OR content ILIKE '%southern avenue%'
     OR title ILIKE '%ananya%' OR content ILIKE '%ananya%'
     OR content ILIKE '%blue-and-white%' OR content ILIKE '%rashbehari%'
  ORDER BY created_at DESC
  LIMIT 5;
`);

console.log('Matches:', res.rows);
if (res.rows[0]) {
  const full = await pool.query('SELECT * FROM public.posts WHERE id = $1', [res.rows[0].id]);
  console.log('\n--- FIRST MATCH CONTENT ---');
  console.log(full.rows[0].content);
}
await pool.end();
