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
    const res = await pool.query('SELECT id, content FROM public.posts WHERE id = $1', ['0687eacf-651b-4d0e-af1a-a4948fe4fb48']);
    if (res.rows.length === 0) {
      console.log('Post not found');
      return;
    }
    const c = res.rows[0].content;

    let formatted = c
      .replace(/\r\n/g, '\n')
      .replace(/\n(#{1,6}\s+[^\n]+)\n(?!\n)/g, '\n\n$1\n\n')
      .replace(/([^\n])\n(\*\s+\*\*)/g, '$1\n\n$2')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log('Original length:', c.length, 'Formatted length:', formatted.length);
    if (formatted !== c) {
      console.log('Updating post with clean markdown spacing...');
      await pool.query('UPDATE public.posts SET content = $1 WHERE id = $2', [formatted, '0687eacf-651b-4d0e-af1a-a4948fe4fb48']);
      console.log('Post updated successfully!');
    } else {
      console.log('Post already has clean markdown spacing.');
    }
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await pool.end();
  }
}

run();
