import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function check() {
  await client.connect();
  const res = await client.query("SELECT schedule_date, slot_id, status, result, last_error, updated_at FROM public.bot_schedule_runs WHERE schedule_date = '2026-09-21' ORDER BY updated_at DESC");
  console.log('Schedule runs:', JSON.stringify(res.rows, null, 2));
  await client.end();
}
check();
