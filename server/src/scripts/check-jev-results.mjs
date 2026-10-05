import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function queryJevTelemetry() {
  try {
    const res = await pool.query(`
      SELECT 
        id, 
        created_at, 
        action_type, 
        bot_id, 
        details
      FROM public.bot_activity_logs
      WHERE action_type = 'spark_reaction'
         OR details->>'experiment_type' = 'jev_decision_layer'
         OR details->>'experiment_id' LIKE '%jev%'
      ORDER BY created_at DESC
      LIMIT 50
    `);

    console.log(`Total Jev/Spark logs found: ${res.rows.length}`);
    if (res.rows.length > 0) {
      console.log('Sample row details:');
      console.log(JSON.stringify(res.rows[0], null, 2));
    }

    const countRes = await pool.query(`
      SELECT 
        count(*) as total,
        count(case when details->>'stage' = 'trend_triage' then 1 end) as triage_count,
        count(case when details->>'stage' = 'article_qa' then 1 end) as qa_count,
        count(case when details->>'agreement' = 'true' then 1 end) as agreement_count
      FROM public.bot_activity_logs
      WHERE details->>'experiment_type' = 'jev_decision_layer'
    `);
    console.log('\nAggregate stats:');
    console.table(countRes.rows);

  } catch (err) {
    console.error('Error querying Jev telemetry:', err.message);
  } finally {
    await pool.end();
  }
}

queryJevTelemetry();
