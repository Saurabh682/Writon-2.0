import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const res = await pool.query("SELECT id, title, slug, author_id, category, summary, content, created_at FROM public.posts WHERE slug LIKE '%7a213509%' OR title ILIKE '%forgot its path%'");
if (res.rows[0]) {
  console.log('--- FOUND POST ---');
  console.log('ID:', res.rows[0].id);
  console.log('Title:', res.rows[0].title);
  console.log('Slug:', res.rows[0].slug);
  console.log('Author ID:', res.rows[0].author_id);
  console.log('Category:', res.rows[0].category);
  console.log('Summary:', res.rows[0].summary);
  console.log('Content:\n', res.rows[0].content);
} else {
  console.log('Not found by slug, searching by author or keyword...');
  const res2 = await pool.query("SELECT id, title, slug, author_id, category, summary, content, created_at FROM public.posts WHERE content ILIKE '%Chaulani%' OR title ILIKE '%Chaulani%' LIMIT 5");
  console.log('Results:', res2.rows);
}
await pool.end();
