import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  await client.connect();
  const res = await client.query("SELECT id, title, status FROM public.posts WHERE status = 'published' AND (title ILIKE '%unexpected rediscovery%' OR title ILIKE '%challenges long-held%' OR summary ILIKE '%timely editorial exploration%')");
  console.log('Any remaining live duplicates:', res.rows);
  await client.end();
}
run();
