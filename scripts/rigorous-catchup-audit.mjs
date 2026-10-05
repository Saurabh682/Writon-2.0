import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('server/.env') });

const dbUrl = process.env.DATABASE_URL.replace(':5432/', ':6543/');

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 2,
});

async function runRigorousCatchUpAudit() {
  console.log('=== RIGOROUS CATCH-UP AUDIT FOR FIREBASE HUMAN USERS ===');

  const client = await pool.connect();
  try {
    // 1. Total counts
    const totalProfiles = (await client.query('SELECT count(*)::int as c FROM public.profiles')).rows[0].c;
    const botProfiles = (await client.query("SELECT count(*)::int as c FROM public.profiles WHERE account_type != 'human' OR id IN (SELECT id FROM public.bot_configs)")).rows[0].c;
    const humanProfiles = (await client.query("SELECT count(*)::int as c FROM public.profiles WHERE account_type = 'human' AND id NOT IN (SELECT id FROM public.bot_configs)")).rows[0].c;

    // 2. Email validity & anonymous/guest accounts
    const humanRealEmail = (await client.query(`
      SELECT count(*)::int as c FROM public.profiles 
      WHERE account_type = 'human' 
        AND id NOT IN (SELECT id FROM public.bot_configs)
        AND email IS NOT NULL 
        AND email != ''
        AND email NOT LIKE '%@legacy.writon.io'
        AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
    `)).rows[0].c;

    const anonymousOrGuest = humanProfiles - humanRealEmail;

    // 3. Email verified filter
    const emailVerifiedCount = (await client.query(`
      SELECT count(*)::int as c FROM public.profiles 
      WHERE account_type = 'human' 
        AND id NOT IN (SELECT id FROM public.bot_configs)
        AND email IS NOT NULL 
        AND email != ''
        AND email NOT LIKE '%@legacy.writon.io'
        AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
        AND email_verified = true
    `)).rows[0].c;

    // 4. Suppressed emails
    const suppressedCount = (await client.query('SELECT count(*)::int as c FROM public.email_suppressions')).rows[0].c;

    // 5. User Email Preferences & Explicit Consent Audit
    const totalPreferences = (await client.query('SELECT count(*)::int as c FROM public.user_email_preferences')).rows[0].c;
    const explicitLifecycleConsent = (await client.query(`
      SELECT count(*)::int as c FROM public.user_email_preferences 
      WHERE lifecycle_enabled = true 
        AND consented_at IS NOT NULL 
        AND withdrawn_at IS NULL
    `)).rows[0].c;

    const unconsentedOrWithdrawn = (await client.query(`
      SELECT count(*)::int as c FROM public.user_email_preferences 
      WHERE lifecycle_enabled = false 
        OR consented_at IS NULL 
        OR withdrawn_at IS NOT NULL
    `)).rows[0].c;

    // 6. Job status breakdown (Queued vs Sent vs Processing vs Dead)
    const jobBreakdown = (await client.query(`
      SELECT template_key, status, count(*)::int as count 
      FROM public.email_jobs 
      GROUP BY template_key, status 
      ORDER BY template_key, status
    `)).rows;

    const acceptedOrSentUsers = (await client.query(`
      SELECT count(DISTINCT profile_id)::int as c 
      FROM public.email_jobs 
      WHERE template_key IN ('welcome', 'founding_writers_v2') AND status = 'sent'
    `)).rows[0].c;

    const queuedOrProcessingUsers = (await client.query(`
      SELECT count(DISTINCT profile_id)::int as c 
      FROM public.email_jobs 
      WHERE template_key IN ('welcome', 'founding_writers_v2') AND status IN ('queued', 'processing', 'retry')
    `)).rows[0].c;

    // 7. 7-Day Cadence Guarded Count
    const cadenceBlocked = (await client.query(`
      SELECT count(*)::int as c FROM public.user_email_preferences 
      WHERE last_optional_sent_at IS NOT NULL 
        AND last_optional_sent_at > NOW() - interval '7 days'
    `)).rows[0].c;

    // 8. Net Eligible Users with ALL Criteria strictly enforced:
    // - Human account (not a bot)
    // - Valid RFC email syntax & non-legacy
    // - Email verified in profiles table
    // - Explicit lifecycle consent recorded (consented_at IS NOT NULL and lifecycle_enabled = true)
    // - Consent not withdrawn (withdrawn_at IS NULL)
    // - Not suppressed in email_suppressions
    // - 7-day cadence met (last_optional_sent_at IS NULL OR older than 7 days)
    // - Never sent a welcome or founding campaign email previously
    // - Not currently in queue/processing
    const netStrictlyEligible = await client.query(`
      SELECT p.id, p.pen_name, p.email, p.created_at, pref.consented_at, pref.last_optional_sent_at
      FROM public.profiles p
      INNER JOIN public.user_email_preferences pref ON pref.profile_id = p.id
      WHERE p.account_type = 'human'
        AND p.id NOT IN (SELECT id FROM public.bot_configs)
        AND p.email IS NOT NULL 
        AND p.email != ''
        AND p.email NOT LIKE '%@legacy.writon.io'
        AND p.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
        AND p.email_verified = true
        AND pref.lifecycle_enabled = true
        AND pref.consented_at IS NOT NULL
        AND pref.withdrawn_at IS NULL
        AND (pref.last_optional_sent_at IS NULL OR pref.last_optional_sent_at <= NOW() - interval '7 days')
        AND p.id NOT IN (
          SELECT profile_id FROM public.email_jobs 
          WHERE template_key IN ('welcome', 'founding_writers_v2') 
            AND status IN ('sent', 'processing', 'queued', 'retry')
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.email_suppressions s 
          WHERE s.recipient_fingerprint = pref.email_fingerprint
        )
      ORDER BY p.created_at DESC
    `);

    console.log('\n--- REGISTRY BREAKDOWN ---');
    console.log('Total Profiles in Database               :', totalProfiles);
    console.log('Bot Personas Excluded                    :', botProfiles);
    console.log('Total Human Profiles                     :', humanProfiles);
    console.log('  ├─ Valid Real Email Syntax             :', humanRealEmail);
    console.log('  │    ├─ Email Verified (Firebase Auth) :', emailVerifiedCount);
    console.log('  │    └─ Email Unverified               :', humanRealEmail - emailVerifiedCount);
    console.log('  └─ Anonymous / Guest / Dummy Accounts  :', anonymousOrGuest);

    console.log('\n--- CONSENT & CADENCE BREAKDOWN ---');
    console.log('Total user_email_preferences Rows        :', totalPreferences);
    console.log('  ├─ Explicit Lifecycle Consent Recorded :', explicitLifecycleConsent);
    console.log('  └─ Default Opt-Out / No Consent Record :', unconsentedOrWithdrawn);
    console.log('Blocked by 7-Day Cadence Window          :', cadenceBlocked);
    console.log('Suppressed Email Fingerprints            :', suppressedCount);

    console.log('\n--- DISPATCH PIPELINE & JOB STATUS ---');
    console.log('Profiles with Sent / Delivered Campaign  :', acceptedOrSentUsers);
    console.log('Profiles Currently Queued / Processing   :', queuedOrProcessingUsers);
    console.log('Job table details by status:');
    for (const r of jobBreakdown) {
      console.log(`  - [${r.template_key}] status '${r.status}': ${r.count} jobs`);
    }

    console.log('\n--- STRICT ELIGIBILITY CATCH-UP COUNT ---');
    console.log('Net Strictly Eligible Human Users Now    :', netStrictlyEligible.rows.length);
    if (netStrictlyEligible.rows.length > 0) {
      console.log('Eligible accounts sample:');
      for (const u of netStrictlyEligible.rows.slice(0, 5)) {
        console.log(`  - [${u.id}] ${u.email} (consented_at: ${u.consented_at})`);
      }
    } else {
      console.log('  (Zero pending unserved users meet all strict eligibility gates simultaneously)');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runRigorousCatchUpAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
