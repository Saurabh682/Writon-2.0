import 'dotenv/config';
import pg from 'pg';

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' ? true : false,
  });

  try {
    const humanRes = await pool.query("SELECT count(id)::int as count FROM public.profiles WHERE account_type = 'human'");
    console.log('human profiles count:', humanRes.rows[0].count);

    const humanWithEmail = await pool.query("SELECT count(id)::int as count FROM public.profiles WHERE account_type = 'human' AND email IS NOT NULL");
    console.log('human profiles with email:', humanWithEmail.rows[0].count);

    const jobsRes = await pool.query('SELECT count(id)::int as count FROM public.email_jobs');
    console.log('email_jobs count:', jobsRes.rows[0].count);

    const optedInRes = await pool.query("SELECT count(profile_id)::int as count FROM public.user_email_preferences WHERE activity_enabled = true OR reading_enabled = true");
    console.log('opted-in count:', optedInRes.rows[0].count);
  } catch (err) {
    console.error('DB query error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
