import dotenv from 'dotenv';
import pg from 'pg';
import path from 'node:path';

dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const res = await pool.query(`
    select p.id, p.title, p.category, p.language_code, p.likes_count,
           prof.full_name, prof.pen_name, prof.bio, p.summary, substring(p.content, 1, 200) as preview
    from public.posts p
    join public.profiles prof on prof.id = p.author_id
    where p.status = 'published' and p.is_public = true
    order by p.likes_count desc, p.created_at desc
    limit 10;
  `);
  console.log('Top Published Stories:');
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

check().catch(console.error);
