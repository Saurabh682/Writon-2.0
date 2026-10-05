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
  const res = await client.query(`
    SELECT p.id, p.title, p.category, p.status, p.published_at, p.created_at, pr.pen_name, pr.full_name
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.author_id
    WHERE p.category = 'Tech'
    ORDER BY COALESCE(p.published_at, p.created_at) DESC
    LIMIT 25
  `);
  console.log('Total Tech posts found in DB:', res.rowCount);
  console.table(res.rows.map(r => ({
    title: r.title.slice(0, 40),
    pen_name: r.pen_name,
    status: r.status,
    published_at: r.published_at ? new Date(r.published_at).toISOString().slice(0, 10) : null
  })));

  const botConfigRes = await client.query(`
    SELECT bc.id, p.pen_name, p.full_name, bc.bot_type, bc.is_active, bc.categories, bc.last_posted_at
    FROM public.bot_configs bc
    JOIN public.profiles p ON p.id = bc.id
    WHERE 'Tech' = ANY(bc.categories)
    ORDER BY bc.last_posted_at DESC NULLS FIRST
  `);
  console.log('\nBot configs with Tech category:');
  console.table(botConfigRes.rows.map(r => ({
    id: r.id,
    pen_name: r.pen_name,
    bot_type: r.bot_type,
    is_active: r.is_active,
    last_posted_at: r.last_posted_at ? new Date(r.last_posted_at).toISOString().slice(0, 16) : null
  })));

  await client.end();
}
main().catch(console.error);
