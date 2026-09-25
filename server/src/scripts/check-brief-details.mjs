import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function check() {
  await client.connect();
  const res = await client.query("SELECT * FROM public.editorial_research_briefs WHERE id IN ('4f628344-d354-41eb-941f-7f322c4b6685', 'b792241f-01aa-4e7b-a9a4-f5c7cd3dca04')");
  console.log('Brief details:', JSON.stringify(res.rows, null, 2));
  await client.end();
}
check();
