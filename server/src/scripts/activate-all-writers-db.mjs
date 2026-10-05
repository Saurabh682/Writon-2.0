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

  console.log('--- Activating all 100 Writer Bots in public.bot_configs ---');
  
  const updateRes = await client.query(`
    UPDATE public.bot_configs
    SET is_active = true,
        updated_at = NOW()
    WHERE bot_type = 'writer'
    RETURNING id
  `);

  console.log(`Successfully activated ${updateRes.rowCount} writer bots.`);

  // Stagger last_posted_at for all writers that have null or very old dates so they don't all trigger at the exact same second
  const staggerRes = await client.query(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY COALESCE(last_posted_at, '1970-01-01'::timestamptz) ASC) as rank
      FROM public.bot_configs
      WHERE bot_type = 'writer'
    )
    UPDATE public.bot_configs bc
    SET last_posted_at = CASE 
      WHEN bc.last_posted_at IS NULL THEN (NOW() - (ranked.rank * INTERVAL '3 hours'))
      ELSE bc.last_posted_at
    END
    FROM ranked
    WHERE bc.id = ranked.id AND bc.last_posted_at IS NULL
    RETURNING bc.id
  `);
  console.log(`Backfilled randomized last_posted_at for ${staggerRes.rowCount} unposted writer bots to prevent stampedes.`);

  // Verify breakdown
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
