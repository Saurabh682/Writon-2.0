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

  console.log('--- Disabling Commenter Bots ---');

  const updateRes = await client.query(`
    UPDATE public.bot_configs
    SET is_active = false,
        updated_at = NOW()
    WHERE bot_type = 'commenter'
    RETURNING id
  `);

  console.log(`Successfully disabled ${updateRes.rowCount} commenter bots.`);

  // Verify breakdown across all bot types
  const verifyRes = await client.query(`
    SELECT bot_type, is_active, COUNT(*) as count
    FROM public.bot_configs
    GROUP BY bot_type, is_active
    ORDER BY bot_type, is_active DESC
  `);
  console.log('\n--- Verified Bot Config Status Breakdown ---');
  console.table(verifyRes.rows);

  await client.end();
}
main().catch(console.error);
