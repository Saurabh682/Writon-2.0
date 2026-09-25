import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  await client.connect();
  const res = await client.query("UPDATE public.posts SET status = 'archived' WHERE id IN ('69fbf462-e110-41a5-9ea6-c8b9028945e0', '463a64bd-5648-43e0-9dd9-b96a73a5d365') RETURNING id, title, status");
  console.log('Archived posts:', res.rows);
  await client.end();
}
run();
