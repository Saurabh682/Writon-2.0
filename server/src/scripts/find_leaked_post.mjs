import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const res = await pool.query(`
    select id, title, slug, category, author_id, summary, created_at
    from public.posts
    where title ilike '%living heritage%'
       or content ilike '%an exploration of failure%'
       or title ilike '%an exploration of failure%'
       or content ilike '%mirzapur%'
       or title ilike '%mirzapur%'
    order by created_at desc
    limit 10
  `);
  console.log('Found posts:', JSON.stringify(res.rows, null, 2));

  if (res.rows.length > 0) {
    const fs = await import('fs');
    const post = await pool.query('select id, title, content from public.posts where id = $1', [res.rows[0].id]);
    fs.writeFileSync('C:/Users/Kumar/.gemini/antigravity/brain/473d28a3-99b1-461c-a12b-69f9a319d26c/scratch/current_leaked_post.txt', post.rows[0]?.content || '', 'utf8');
    console.log('Written full content to scratch/current_leaked_post.txt');
  }
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
