import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(
    `SELECT p.id, p.title, p.content, p.status, p.created_at, pr.pen_name 
     FROM public.posts p 
     JOIN public.profiles pr ON p.author_id = pr.id 
     WHERE pr.pen_name = 'gopal_krishnan_jokes'
     ORDER BY p.created_at DESC LIMIT 1`
  );
  console.log('Post:', JSON.stringify(res.rows[0], null, 2));
  await pool.end();
}

run().catch(console.error);
