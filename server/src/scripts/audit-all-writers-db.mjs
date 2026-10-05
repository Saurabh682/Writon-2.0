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

  const countRes = await client.query(`
    SELECT bot_type, is_active, COUNT(*) as count
    FROM public.bot_configs
    GROUP BY bot_type, is_active
    ORDER BY bot_type, is_active DESC
  `);
  console.log('--- Current Bot Config Status Breakdown ---');
  console.table(countRes.rows);

  const writersRes = await client.query(`
    SELECT COUNT(*) as total_writers,
           COUNT(*) FILTER (WHERE is_active = true) as active_writers,
           COUNT(*) FILTER (WHERE is_active = false) as inactive_writers
    FROM public.bot_configs
    WHERE bot_type = 'writer'
  `);
  console.log('--- Writer Bot Status ---');
  console.table(writersRes.rows);

  // Check how many posts per writer
  const postDistRes = await client.query(`
    SELECT p.pen_name, p.full_name, bc.is_active, bc.last_posted_at, COUNT(pst.id) as published_stories
    FROM public.bot_configs bc
    JOIN public.profiles p ON p.id = bc.id
    LEFT JOIN public.posts pst ON pst.author_id = p.id AND pst.status = 'published'
    WHERE bc.bot_type = 'writer'
    GROUP BY p.pen_name, p.full_name, bc.is_active, bc.last_posted_at
    ORDER BY published_stories DESC
    LIMIT 20
  `);
  console.log('--- Top 20 Writer Bots by Published Stories ---');
  console.table(postDistRes.rows);

  await client.end();
}
main().catch(console.error);
