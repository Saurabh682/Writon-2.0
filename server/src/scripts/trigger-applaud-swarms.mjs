import dotenv from 'dotenv';
import pg from 'pg';
import { triggerReaderSwarm } from '../bot-engine/spark-runner.js';

dotenv.config({ path: 'server/.env' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function enqueueSwarmForRecent() {
  const posts = await pool.query(`
    SELECT id, title, category, likes_count 
    FROM public.posts 
    WHERE status = 'published' AND is_public = true
    ORDER BY published_at DESC 
    LIMIT 4
  `);

  console.log(`Found ${posts.rowCount} recent stories to inspect:`);
  for (const post of posts.rows) {
    console.log(`\n• Story: "${post.title}" (${post.category}) — current claps: ${post.likes_count}`);
    const res = await triggerReaderSwarm(pool, {
      postId: post.id,
      category: post.category,
      intensity: 'healthy' // 20-35 claps across 12-16 days
    });
    console.log('  Swarm Result:', res);
  }

  await pool.end();
}

enqueueSwarmForRecent().catch(console.error);
