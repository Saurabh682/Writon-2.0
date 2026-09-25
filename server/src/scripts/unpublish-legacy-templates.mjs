import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  await client.connect();
  const res = await client.query("UPDATE public.posts SET status = 'draft' WHERE id IN ('05dec4c1-98a7-4993-ade9-c93215237af3', '7211c435-dcaa-48f5-a41b-50f9cb8c091f', '1db0379a-3157-463b-9b76-6e54609e56d7', '25b85342-5621-433e-9cfc-7d113f9e8928') RETURNING id, title");
  console.log('Unpublished legacy template posts:', res.rows);
  await client.end();
}
run();
