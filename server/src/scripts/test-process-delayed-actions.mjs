import dotenv from 'dotenv';
import pg from 'pg';
import { processDueDelayedActions } from '../bot-engine/spark-runner.js';

dotenv.config({ path: 'server/.env' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkDue() {
  const countRes = await pool.query("SELECT count(*)::int as due FROM public.bot_delayed_actions WHERE status = 'pending' AND execute_at <= now()");
  console.log('Due delayed actions right now:', countRes.rows[0].due);

  if (countRes.rows[0].due > 0) {
    console.log('Processing a batch of due delayed actions...');
    const executed = await processDueDelayedActions(pool);
    console.log(`Executed ${executed.length} delayed actions:`, executed);
  }

  await pool.end();
}

checkDue().catch(console.error);
