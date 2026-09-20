import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const post = await pool.query('SELECT * FROM public.posts WHERE id = $1', ['105b1991-bb87-4388-aece-9ce60e950bf4']);
if (post.rows[0]) {
  console.log('--- POST CONTENT ---');
  console.log(post.rows[0].content);
}
await pool.end();
