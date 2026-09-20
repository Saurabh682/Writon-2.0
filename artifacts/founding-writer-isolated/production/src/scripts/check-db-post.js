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
    const posts = await pool.query(
      "SELECT id, title, status, is_public, author_id, created_at, published_at FROM public.posts WHERE title ILIKE $1 OR summary ILIKE $1",
      ['%Architecture of Tech%']
    );
    console.log('Posts matching "Architecture of Tech":', posts.rows);

    const authors = await pool.query(
      "SELECT id, full_name, pen_name, is_bot FROM public.profiles WHERE full_name ILIKE $1 OR pen_name ILIKE $1",
      ['%Ayush%']
    );
    console.log('Authors matching "Ayush":', authors.rows);

    if (authors.rows.length > 0) {
      const authorPosts = await pool.query(
        "SELECT id, title, status, is_public, created_at FROM public.posts WHERE author_id = $1",
        [authors.rows[0].id]
      );
      console.log('All posts by this author:', authorPosts.rows);
    }
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await pool.end();
  }
}

run();
