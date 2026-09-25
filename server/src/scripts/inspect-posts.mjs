import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function check() {
  await client.connect();
  const res = await client.query("SELECT id, title, summary, category, substring(content, 1, 300) as snippet, created_at FROM public.posts WHERE id IN ('69fbf462-e110-41a5-9ea6-c8b9028945e0', '463a64bd-5648-43e0-9dd9-b96a73a5d365')");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
check();
