import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function check() {
  await client.connect();
  const res = await client.query("SELECT id, topic, suggested_author_pen_name, status, created_at FROM public.editorial_research_briefs WHERE topic ILIKE '%unexpected rediscovery%' ORDER BY created_at DESC LIMIT 10");
  console.log('Briefs:', JSON.stringify(res.rows, null, 2));
  await client.end();
}
check();
