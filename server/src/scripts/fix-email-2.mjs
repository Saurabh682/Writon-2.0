import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function check() {
  await client.connect();
  const res = await client.query("SELECT f.contacted_at, p.email, p.id FROM public.profiles p LEFT JOIN public.founding_writer_eligibility f ON p.id = f.profile_id WHERE p.email LIKE 'saazizullah@%'");
  console.log('Status:', res.rows);
  
  // Clean up the broken one so it doesn't block future queues
  await client.query("UPDATE public.founding_writer_eligibility SET contacted_at = NOW() WHERE profile_id = (SELECT id FROM public.profiles WHERE email = 'saazizullah@gmail.com.')");
  
  await client.end();
}
check();
