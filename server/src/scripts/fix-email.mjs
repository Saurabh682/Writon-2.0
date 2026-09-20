import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function fix() {
  await client.connect();
  const res = await client.query("UPDATE public.profiles SET email = 'saazizullah@gmail.com' WHERE email = 'saazizullah@gmail.com.' RETURNING id");
  console.log('Fixed:', res.rows);
  await client.end();
}
fix();
