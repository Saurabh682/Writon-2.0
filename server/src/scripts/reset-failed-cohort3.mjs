import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  
  // Find the last 50 profiles updated for cohort = 3
  const res = await client.query(`
    SELECT profile_id 
    FROM public.founding_writer_eligibility 
    WHERE cohort = 3 AND contacted_at IS NOT NULL
    ORDER BY contacted_at DESC
    LIMIT 50;
  `);

  const profilesToReset = res.rows.map(r => r.profile_id);
  console.log(`Found ${profilesToReset.length} profiles to reset from Cohort 3.`);

  if (profilesToReset.length > 0) {
    // Reset founding_writer_eligibility
    await client.query(`
      UPDATE public.founding_writer_eligibility
      SET cohort = NULL, contacted_at = NULL
      WHERE profile_id = ANY($1)
    `, [profilesToReset]);

    // Reset user_email_preferences (we assume it was their first optional email)
    await client.query(`
      UPDATE public.user_email_preferences
      SET last_optional_sent_at = NULL
      WHERE profile_id = ANY($1)
    `, [profilesToReset]);

    console.log('Successfully rolled back the 50 dropped emails to "pending" status.');
  }

  await client.end();
}

run().catch(console.error);
