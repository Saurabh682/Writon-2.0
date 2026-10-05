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

  console.log('--- Applying Multi-Day Cooldown (Exclusion) to the 4 Today Authors ---');
  console.log('Authors to exclude:', targetPenNames);

  // 1. Set is_active = false and push last_posted_at forward by 7 days
  const updateRes = await client.query(`
    UPDATE public.bot_configs bc
    SET is_active = false,
        last_posted_at = NOW() + INTERVAL '7 days',
        updated_at = NOW()
    FROM public.profiles p
    WHERE p.id = bc.id AND LOWER(p.pen_name) = ANY($1)
    RETURNING bc.id, p.pen_name, p.full_name, bc.is_active, bc.last_posted_at
  `, [targetPenNames]);

  console.log(`\nSuccessfully set cooldown / deactivated ${updateRes.rowCount} authors:`);
  console.table(updateRes.rows.map(r => ({
    id: r.id,
    pen_name: r.pen_name,
    full_name: r.full_name,
    is_active: r.is_active,
    last_posted_at: r.last_posted_at ? new Date(r.last_posted_at).toISOString().slice(0, 16) : null
  })));

  // 2. Verify remaining active writer count
  const activeWritersRes = await client.query(`
    SELECT COUNT(*) as active_writer_count
    FROM public.bot_configs
    WHERE is_active = true AND bot_type = 'writer'
  `);
  console.log('\n--- Active Writer Pool Remaining ---');
  console.log(`Active Writers: ${activeWritersRes.rows[0].active_writer_count} (out of 100 total writer personas)`);

  // 3. Inspect next due authors for Tech, Essays, and Short Stories
  console.log('\n--- Next Due Authors in Tech ---');
  const nextTech = await client.query(`
    SELECT bc.id, p.pen_name, p.full_name, bc.categories, bc.last_posted_at
    FROM public.bot_configs bc
    JOIN public.profiles p ON p.id = bc.id
    WHERE bc.is_active = true AND bc.bot_type = 'writer' AND 'Tech' = ANY(bc.categories)
    ORDER BY COALESCE(bc.last_posted_at, '1970-01-01'::timestamptz) ASC
    LIMIT 6
  `);
  console.table(nextTech.rows.map(r => ({
    pen_name: r.pen_name,
    full_name: r.full_name,
    categories: r.categories.join(', '),
    last_posted: r.last_posted_at ? new Date(r.last_posted_at).toISOString().slice(0, 10) : 'Never'
  })));

  console.log('\n--- Next Due Authors in Essays ---');
  const nextEssays = await client.query(`
    SELECT bc.id, p.pen_name, p.full_name, bc.categories, bc.last_posted_at
    FROM public.bot_configs bc
    JOIN public.profiles p ON p.id = bc.id
    WHERE bc.is_active = true AND bc.bot_type = 'writer' AND 'Essays' = ANY(bc.categories)
    ORDER BY COALESCE(bc.last_posted_at, '1970-01-01'::timestamptz) ASC
    LIMIT 6
  `);
  console.table(nextEssays.rows.map(r => ({
    pen_name: r.pen_name,
    full_name: r.full_name,
    categories: r.categories.join(', '),
    last_posted: r.last_posted_at ? new Date(r.last_posted_at).toISOString().slice(0, 10) : 'Never'
  })));

  console.log('\n--- Next Due Authors in Short Stories ---');
  const nextStories = await client.query(`
    SELECT bc.id, p.pen_name, p.full_name, bc.categories, bc.last_posted_at
    FROM public.bot_configs bc
    JOIN public.profiles p ON p.id = bc.id
    WHERE bc.is_active = true AND bc.bot_type = 'writer' AND 'Short Stories' = ANY(bc.categories)
    ORDER BY COALESCE(bc.last_posted_at, '1970-01-01'::timestamptz) ASC
    LIMIT 6
  `);
  console.table(nextStories.rows.map(r => ({
    pen_name: r.pen_name,
    full_name: r.full_name,
    categories: r.categories.join(', '),
    last_posted: r.last_posted_at ? new Date(r.last_posted_at).toISOString().slice(0, 10) : 'Never'
  })));

  await client.end();
}
main().catch(console.error);
