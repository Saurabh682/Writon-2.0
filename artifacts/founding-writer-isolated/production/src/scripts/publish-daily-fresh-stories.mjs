import pg from 'pg';
import { runSparkPulse } from '../bot-engine/spark-runner.js';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.rrxaitxeirykmiihgiqj:pxA6pa-f5fj7$nu@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const categoriesToPublish = ['Poetry', 'Shayari', 'Tech', 'Culture'];

async function run() {
  console.log(`Publishing fresh daily stories for categories: ${categoriesToPublish.join(', ')}...`);
  for (const category of categoriesToPublish) {
    try {
      console.log(`\n--- Triggering pulse for ${category} ---`);
      const res = await runSparkPulse(pool, { category, forcePublication: true });
      console.log(`Success for ${category}:`, res?.title, `by bot ${res?.botId} (post: ${res?.postId})`);
      // Short delay between category generations
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (err) {
      console.error(`Error generating story for ${category}:`, err.message);
    }
  }

  // Allow background memory records to finish
  await new Promise(resolve => setTimeout(resolve, 5000));
  await pool.end();
  console.log('\nAll fresh category stories successfully published!');
}

run().catch(console.error);
