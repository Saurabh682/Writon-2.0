import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const res = await pool.query(`
  select id, title, slug, summary, content, author_id, created_at
  from public.posts
  where title ilike '%silent exchange%' or title ilike '%market closed%' or content ilike '%labor day%' or content ilike '%is us market closed today%'
  order by created_at desc
  limit 5
`);
console.log('Found posts:', res.rows.map(r => ({ id: r.id, title: r.title, slug: r.slug, author_id: r.author_id })));
if (res.rows[0]) {
  console.log('\n--- CONTENT OF FIRST MATCH ---');
  console.log('Title:', res.rows[0].title);
  console.log('ID:', res.rows[0].id);
  console.log('Author:', res.rows[0].author_id);
  console.log('Summary:', res.rows[0].summary);
  console.log('Content preview:\n', res.rows[0].content);
}

await pool.end();
