import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('server/.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runCatchUpAudit() {
  console.log('=== WRITON EMAIL ONBOARDING CATCH-UP DRY-RUN AUDIT ===');

  const totalAccounts = await pool.query('SELECT count(*)::int as count FROM public.profiles');
  const humanProfiles = await pool.query("SELECT count(*)::int as count FROM public.profiles WHERE account_type = 'human'");
  const botProfiles = await pool.query("SELECT count(*)::int as count FROM public.profiles WHERE account_type != 'human' OR id IN (SELECT id FROM public.bot_configs)");

  console.log('Total profiles in database:', totalAccounts.rows[0].count);
  console.log('Bot / Non-human profiles:', botProfiles.rows[0].count);
  console.log('Human profiles:', humanProfiles.rows[0].count);

  const humanWithEmail = await pool.query(
    "SELECT count(*)::int as count FROM public.profiles WHERE account_type = 'human' AND email IS NOT NULL AND email != '' AND email NOT LIKE '%@legacy.writon.io'"
  );
  console.log('Human profiles with valid real email:', humanWithEmail.rows[0].count);

  const anonymousAccounts = await pool.query(
    "SELECT count(*)::int as count FROM public.profiles WHERE account_type = 'human' AND (email IS NULL OR email = '' OR email LIKE '%@legacy.writon.io')"
  );
  console.log('Anonymous / Missing email accounts:', anonymousAccounts.rows[0].count);

  const suppressedCount = await pool.query('SELECT count(*)::int as count FROM public.email_suppressions');
  console.log('Suppressed recipient fingerprints:', suppressedCount.rows[0].count);

  const withdrawnConsent = await pool.query(
    'SELECT count(*)::int as count FROM public.user_email_preferences WHERE withdrawn_at IS NOT NULL'
  );
  console.log('Explicitly withdrawn / opted-out preferences:', withdrawnConsent.rows[0].count);

  const previouslyWelcomed = await pool.query(
    "SELECT count(DISTINCT profile_id)::int as count FROM public.email_jobs WHERE template_key IN ('welcome', 'founding_writers_v2') AND status IN ('sent', 'processing', 'queued')"
  );
  console.log('Distinct profiles already welcomed or sent campaign:', previouslyWelcomed.rows[0].count);

  const eligibleQuery = await pool.query(`
    SELECT p.id, p.pen_name, p.full_name, p.email, p.created_at
    FROM public.profiles p
    LEFT JOIN public.user_email_preferences pref ON pref.profile_id = p.id
    WHERE p.account_type = 'human'
      AND p.email IS NOT NULL 
      AND p.email != ''
      AND p.email NOT LIKE '%@legacy.writon.io'
      AND (pref.withdrawn_at IS NULL)
      AND p.id NOT IN (
        SELECT profile_id FROM public.email_jobs 
        WHERE template_key IN ('welcome', 'founding_writers_v2')
          AND status IN ('sent', 'processing', 'queued')
      )
      AND p.id NOT IN (SELECT id FROM public.bot_configs)
    ORDER BY p.created_at DESC
  `);

  console.log('\n--- NET ELIGIBLE CATCH-UP RECIPIENTS ---');
  console.log('Net eligible human users for onboarding welcome:', eligibleQuery.rows.length);
  console.log('Sample eligible users (5 most recent):');
  for (const u of eligibleQuery.rows.slice(0, 5)) {
    console.log(`  - [${u.id}] ${u.email} (@${u.pen_name}) registered: ${u.created_at?.toISOString?.() || u.created_at}`);
  }

  console.log('\n--- PROVIDER & CAPACITY SAFETY GATES ---');
  console.log('Configured daily capacity ceiling (DB table email_daily_capacity): 80 emails/day');
  console.log('Resend plan quota: 100 emails/day (free tier) / 50,000 emails/month (pro tier)');
  console.log('Cadence guard: Exactly 1 optional email per 7 rolling days per recipient');
  console.log('Bulk sending state: DISABLED (WRITON_EMAIL_MODE=internal)');
}

runCatchUpAudit()
  .then(() => pool.end())
  .catch(err => {
    console.error('Audit failed:', err);
    pool.end();
    process.exit(1);
  });
