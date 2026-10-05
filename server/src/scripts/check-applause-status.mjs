import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: 'server/.env' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const res = await pool.query("SELECT is_engine_enabled, reader_swarm_enabled, commenter_swarm_enabled FROM public.bot_global_settings WHERE id = 'global'");
  console.log('Global Bot Settings:', res.rows[0]);

  const actions = await pool.query("SELECT action_type, status, count(id)::int as count FROM public.bot_delayed_actions GROUP BY action_type, status ORDER BY action_type, status");
  console.log('Delayed Actions Queue:', actions.rows);

  const recentPosts = await pool.query("SELECT id, title, likes_count, comments_count, published_at FROM public.posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 5");
  console.log('Recent Published Stories & Applauds:', recentPosts.rows);

  await pool.end();
}

check().catch(console.error);
