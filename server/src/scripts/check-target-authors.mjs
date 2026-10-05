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

  const targetPenNames = ['aarav_tech', 'devansh_roy', 'sunita_banerjee', 'gurpreet_sandhu'];

  console.log('--- Current Status of Target 4 Authors ---');
  const res = await client.query(`
    SELECT bc.id, p.pen_name, p.full_name, bc.bot_type, bc.is_active, bc.last_posted_at
    FROM public.bot_configs bc
    JOIN public.profiles p ON p.id = bc.id
    WHERE LOWER(p.pen_name) = ANY($1)
  `, [targetPenNames]);

  console.table(res.rows.map(r => ({
    id: r.id,
    pen_name: r.pen_name,
    full_name: r.full_name,
    is_active: r.is_active,
    last_posted_at: r.last_posted_at ? new Date(r.last_posted_at).toISOString().slice(0, 16) : null
  })));

  await client.end();
}
main().catch(console.error);
