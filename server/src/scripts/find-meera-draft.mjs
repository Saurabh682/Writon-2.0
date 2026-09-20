import dotenv from 'dotenv';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT p.id, p.title, p.slug, p.author_id, p.category, p.created_at, p.content
      FROM public.posts p
      WHERE p.content ILIKE '%Pattinson%' OR p.content ILIKE '%Primetime%'
      ORDER BY p.created_at DESC 
      LIMIT 5
    `);
    console.log('Found posts count:', res.rows.length);
    for (const r of res.rows) {
      console.log(`ID: ${r.id} | Title: "${r.title}" | Category: ${r.category} | Created: ${r.created_at}`);
      console.log('Content preview:\n', r.content.slice(0, 400));
      console.log('---');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
