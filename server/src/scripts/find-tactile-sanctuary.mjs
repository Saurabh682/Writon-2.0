import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const res = await pool.query(`
    SELECT id, title, slug, status, category, summary, content, author_id
    FROM public.posts
    WHERE slug LIKE '%tactile-sanctuary%'
       OR title ILIKE '%tactile sanctuary%'
       OR slug LIKE '%3dad44ec-06b%'
    LIMIT 5
  `);
  console.log('Found rows:', res.rows.length);
  if (res.rows.length > 0) {
    const post = res.rows[0];
    console.log('ID:', post.id);
    console.log('Title:', post.title);
    console.log('Slug:', post.slug);
    console.log('Status:', post.status);
    console.log('Summary:', post.summary);
    console.log('Content preview (first 500 chars):\n', post.content.slice(0, 500));
    console.log('\n--- Content length:', post.content.length);
  }
  await pool.end();
}
run();
