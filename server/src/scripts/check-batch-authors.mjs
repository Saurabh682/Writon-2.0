import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
if (!process.env.DATABASE_URL) dotenv.config({ path: '.env' });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const authors = ['aiden_cross', 'sourabh_das', 'priyanka_mishra', 'riya_sharma_systems', 'ananya_bose', 'sunny_gedam', 'karthik_subramanian'];
  const res = await client.query(`
    SELECT bc.id, p.pen_name, p.full_name, bc.categories, bc.is_active, p.avatar_url
    FROM public.bot_configs bc
    JOIN public.profiles p ON p.id = bc.id
    WHERE p.pen_name = ANY($1::text[])
  `, [authors]);
  console.table(res.rows);
  await client.end();
}
main().catch(console.error);
