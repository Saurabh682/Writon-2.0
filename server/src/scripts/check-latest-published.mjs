import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: 'server/.env' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const res = await pool.query("SELECT id, title, slug, published_at FROM public.posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 5");
console.log('Latest published posts:', JSON.stringify(res.rows, null, 2));
await pool.end();
