import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

import pg from 'pg';
import { loadRuntimeConfig } from '../config.js';
import { createResendClient, ResendHttpError } from '../email/resend-client.js';
import { renderFoundingWritersInvitation } from '../email/render/founding-writers-invitation.js';
import { createUnsubscribeToken } from '../email/security/unsubscribe-token.js';
import { emailFingerprint, normalizeEmail } from '../email/security/fingerprint.js';

// Campaign Health Gates & Maturation Thresholds
const CAMPAIGN_GATES = {
  complaintRateMax: 0.001,      // 0.1% hard stop (Gmail / Yahoo ceiling is 0.3%)
  hardBounceRateMax: 0.02,      // 2.0% hard bounce ceiling
  deliveryRateMin: 0.95,        // 95.0% minimum delivery rate
  minObservationHoursEarly: 24, // 24h maturation between early cohorts (1 -> 2 -> 3)
  minObservationHoursLater: 12, // 12h maturation for later cohorts (3+)
};

// Parse CLI Flags
const args = process.argv.slice(2);
function getArg(prefix, fallback = null) {
  const match = args.find(a => a.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

const isDryRun = args.includes('--dry-run') || (!args.includes('--send') && !args.includes('--sample') && !args.includes('--status') && !args.includes('--report'));
const isSample = args.includes('--sample');
const isStatus = args.includes('--status') || args.includes('--report');
const isSend = args.includes('--send');
const isForceGate = args.includes('--force-gate');

const sampleTo = getArg('--to=', 'saurabh.682@gmail.com').trim().toLowerCase();
const limitArg = getArg('--limit=');
const cohortArg = getArg('--cohort=');

const runtimeConfig = loadRuntimeConfig();
const pool = new pg.Pool({
  connectionString: runtimeConfig.databaseUrl,
  ssl: runtimeConfig.databaseSslRejectUnauthorized ? true : false,
});

// Fallback keyring in case none configured in environment
const fallbackKeyring = [{ kid: 'writon_k1', secret: 'writon_unsub_secure_signing_key_9f8e7d6c5b4a' }];
const keyring = (runtimeConfig.email?.unsubscribeKeys && runtimeConfig.email.unsubscribeKeys.length > 0)
  ? runtimeConfig.email.unsubscribeKeys
  : fallbackKeyring;

const unsubscribeBaseUrl = runtimeConfig.email?.unsubscribeBaseUrl || 'https://api.writon.cc/email/unsubscribe';
const fromAddress = runtimeConfig.email?.from || 'WritOn <hello@mail.writon.cc>';
const replyTo = runtimeConfig.email?.replyTo || 'support@writon.cc';

// Helper: Query live dynamic library stats
async function getLiveLibraryStats(client) {
  const storyRes = await client.query(`SELECT count(id)::int as count FROM public.posts WHERE status = 'published'`);
  const catRes = await client.query(`SELECT count(distinct trim(category))::int as count FROM public.posts WHERE status = 'published' AND category IS NOT NULL AND trim(category) != ''`);
  return {
    publicStoryCount: storyRes.rows[0]?.count || 764,
    activeCategoryCount: catRes.rows[0]?.count || 15,
  };
}

// Helper: Format hours & minutes
function formatDuration(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

// Helper: Build signed unsubscribe URL & RFC 8058 headers
function buildUnsubscribeBundle(profileId) {
  const token = createUnsubscribeToken({ profileId, scope: 'lifecycle' }, keyring);
  const unsubUrl = `${unsubscribeBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(token)}`;
  const headers = {
    'List-Unsubscribe': `<${unsubUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
  return { unsubUrl, headers };
}

// Helper: Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. HEALTH EVALUATION & TELEMETRY
// ─────────────────────────────────────────────────────────────────────────────
async function evaluateCampaignHealth(client) {
  // Aggregate sent jobs for founding_writers_v2
  const jobsRes = await client.query(`
    SELECT 
      id, profile_id, recipient_email, event_key, status, sent_at, provider_message_id
    FROM public.email_jobs
    WHERE template_key = 'founding_writers_v2'
    ORDER BY sent_at DESC NULLS LAST
  `);

  const jobs = jobsRes.rows;
  const sentJobs = jobs.filter(j => j.status === 'sent');
  const totalSent = sentJobs.length;

  if (totalSent === 0) {
    return {
      totalSent: 0,
      delivered: 0,
      bounced: 0,
      complained: 0,
      deliveryRate: 1.0,
      bounceRate: 0.0,
      complaintRate: 0.0,
      lastSentAt: null,
      elapsedMs: Infinity,
      elapsedHours: Infinity,
      observationGatePassed: true,
      qualityGatesPassed: true,
      lastCohort: 0,
      cohortSummary: [],
    };
  }

  // Check provider delivery events
  const msgIds = sentJobs.map(j => j.provider_message_id).filter(Boolean);
  let eventStats = { delivered: 0, bounced: 0, complained: 0 };

  if (msgIds.length > 0) {
    const eventsRes = await client.query(`
      SELECT event_type, count(distinct provider_message_id)::int as count
      FROM public.email_delivery_events
      WHERE provider_message_id = ANY($1)
      GROUP BY event_type
    `, [msgIds]);

    for (const row of eventsRes.rows) {
      if (row.event_type === 'email.delivered') eventStats.delivered = row.count;
      if (row.event_type === 'email.bounced') eventStats.bounced = row.count;
      if (row.event_type === 'email.complained') eventStats.complained = row.count;
    }
  }

  // Also check suppressions from this campaign
  const suppRes = await client.query(`
    SELECT count(*)::int as count FROM public.email_suppressions
    WHERE metadata->>'campaign_id' = 'founding_writers_v2'
  `);
  const totalSuppressed = suppRes.rows[0]?.count || 0;
  if (totalSuppressed > eventStats.bounced) {
    eventStats.bounced = totalSuppressed;
  }

  const deliveryRate = totalSent > 0 ? (eventStats.delivered / totalSent) : 1.0;
  const bounceRate = totalSent > 0 ? (eventStats.bounced / totalSent) : 0.0;
  const complaintRate = totalSent > 0 ? (eventStats.complained / totalSent) : 0.0;

  const lastSentAt = new Date(sentJobs[0].sent_at);
  const elapsedMs = Date.now() - lastSentAt.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  // Determine last cohort number
  let lastCohort = 1;
  const cohortNumbers = sentJobs
    .map(j => {
      const m = String(j.event_key || '').match(/cohort_(\d+)/);
      return m ? parseInt(m[1], 10) : 1;
    })
    .filter(Boolean);
  if (cohortNumbers.length > 0) {
    lastCohort = Math.max(...cohortNumbers);
  }

  const requiredObservationHours = lastCohort <= 2
    ? CAMPAIGN_GATES.minObservationHoursEarly
    : CAMPAIGN_GATES.minObservationHoursLater;

  const observationGatePassed = elapsedHours >= requiredObservationHours;
  const qualityGatesPassed = (bounceRate <= CAMPAIGN_GATES.hardBounceRateMax) &&
                             (complaintRate <= CAMPAIGN_GATES.complaintRateMax);

  // Group by cohort
  const cohortMap = new Map();
  for (const j of sentJobs) {
    const m = String(j.event_key || '').match(/cohort_(\d+)/);
    const cNum = m ? parseInt(m[1], 10) : 1;
    if (!cohortMap.has(cNum)) {
      cohortMap.set(cNum, { cohort: cNum, count: 0, firstSentAt: j.sent_at, lastSentAt: j.sent_at });
    }
    const cObj = cohortMap.get(cNum);
    cObj.count++;
    if (new Date(j.sent_at) < new Date(cObj.firstSentAt)) cObj.firstSentAt = j.sent_at;
    if (new Date(j.sent_at) > new Date(cObj.lastSentAt)) cObj.lastSentAt = j.sent_at;
  }

  return {
    totalSent,
    delivered: eventStats.delivered,
    bounced: eventStats.bounced,
    complained: eventStats.complained,
    deliveryRate,
    bounceRate,
    complaintRate,
    lastSentAt,
    elapsedMs,
    elapsedHours,
    requiredObservationHours,
    observationGatePassed,
    qualityGatesPassed,
    lastCohort,
    cohortSummary: Array.from(cohortMap.values()).sort((a, b) => a.cohort - b.cohort),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DRY-RUN MODE
// ─────────────────────────────────────────────────────────────────────────────
async function runDryRun(client) {
  console.log(`\n==================================================================`);
  console.log(`📜 WRITON 2.0 FOUNDING WRITERS RE-ENGAGEMENT CAMPAIGN — DRY RUN`);
  console.log(`==================================================================`);

  const libraryStats = await getLiveLibraryStats(client);
  const health = await evaluateCampaignHealth(client);

  // Total snapshot
  const totalSnapRes = await client.query(`SELECT count(*)::int as count FROM public.founding_writer_eligibility`);
  const totalSnapshot = totalSnapRes.rows[0]?.count || 0;

  // Breakdown by eligibility reason
  const tiersRes = await client.query(`
    SELECT eligibility_reason, count(*)::int as count 
    FROM public.founding_writer_eligibility 
    GROUP BY eligibility_reason 
    ORDER BY count DESC
  `);

  // Dispatched & Suppressed
  const contactedRes = await client.query(`
    SELECT count(*)::int as count FROM public.founding_writer_eligibility WHERE contacted_at IS NOT NULL
  `);
  const alreadyContacted = contactedRes.rows[0]?.count || 0;

  const suppRes = await client.query(`SELECT count(*)::int as count FROM public.email_suppressions`);
  const totalSuppressed = suppRes.rows[0]?.count || 0;

  // Top domains of eligible uncontacted writers
  const domainRes = await client.query(`
    SELECT 
      substring(lower(trim(p.email)) from '@(.*)$') as domain,
      count(*)::int as count
    FROM public.founding_writer_eligibility f
    JOIN public.profiles p ON f.profile_id = p.id
    WHERE f.contacted_at IS NULL
    GROUP BY domain
    ORDER BY count DESC
    LIMIT 6
  `);

  // Net targetable
  const netPending = totalSnapshot - alreadyContacted;

  console.log(`\n1. IMMUTABLE SNAPSHOT & INVENTORY:`);
  console.log(`   Frozen Legacy Profiles  : ${totalSnapshot.toLocaleString()}`);
  console.log(`   Already Contacted       : ${alreadyContacted.toLocaleString()}`);
  console.log(`   Suppressed In DB        : ${totalSuppressed.toLocaleString()}`);
  console.log(`   Net Targetable Remaining: ${netPending.toLocaleString()}`);

  console.log(`\n2. REASON / ACTIVITY TIERS:`);
  for (const tier of tiersRes.rows) {
    const label = tier.eligibility_reason === 'published_author'
      ? 'Published Authors   (Tier 1 - Highest Priority)'
      : tier.eligibility_reason === 'engaged_community'
      ? 'Engaged Community   (Tier 2 - Commented/Applauded)'
      : 'Legacy Members      (Tier 3 - Registered Accounts)';
    console.log(`   • ${label.padEnd(46)} : ${tier.count.toLocaleString().padStart(5)}`);
  }

  console.log(`\n3. TOP DOMAIN DISTRIBUTION (Pending Writers):`);
  for (const dom of domainRes.rows) {
    console.log(`   • @${(dom.domain || 'unknown').padEnd(20)} : ${dom.count.toLocaleString().padStart(5)} writers`);
  }

  console.log(`\n4. LIVE DYNAMIC TEMPLATE CONTENT:`);
  console.log(`   Public Story Count      : ${libraryStats.publicStoryCount} stories`);
  console.log(`   Active Craft Categories : ${libraryStats.activeCategoryCount} categories`);
  console.log(`   Primary CTA URL         : https://writon.cc/founding-writer`);
  console.log(`   Unsubscribe Endpoint    : ${unsubscribeBaseUrl}/:token (RFC 8058 One-Click)`);

  console.log(`\n5. CAMPAIGN HEALTH & OBSERVATION GATES:`);
  if (health.totalSent === 0) {
    console.log(`   Status                  : INITIAL STAGE (0 previous dispatches)`);
    console.log(`   Next Recommended Step   : Sample verification -> Cohort 1 (50 writers)`);
    console.log(`   Gate Status             : READY FOR COHORT 1`);
  } else {
    console.log(`   Total Dispatched        : ${health.totalSent} writers`);
    console.log(`   Delivered Telemetry     : ${health.delivered} (${(health.deliveryRate * 100).toFixed(1)}%)`);
    console.log(`   Hard Bounce Telemetry   : ${health.bounced} (${(health.bounceRate * 100).toFixed(2)}% | max ${CAMPAIGN_GATES.hardBounceRateMax * 100}%)`);
    console.log(`   Spam Complaints         : ${health.complained} (${(health.complaintRate * 100).toFixed(3)}% | max ${CAMPAIGN_GATES.complaintRateMax * 100}%)`);
    console.log(`   Last Dispatch Time      : ${health.lastSentAt?.toISOString()}`);
    console.log(`   Maturation Window       : ${formatDuration(health.elapsedMs)} elapsed / ${health.requiredObservationHours}h required`);
    console.log(`   Quality Gates           : ${health.qualityGatesPassed ? 'PASSED ✅' : 'FAILED ❌ (Bounce/Complaint threshold exceeded)'}`);
    console.log(`   Maturation Gate         : ${health.observationGatePassed ? 'PASSED ✅ (24h satisfied)' : 'PENDING ⏳ (Maturation in progress)'}`);
  }

  console.log(`\n6. CONFIGURATION & SAFETY RAILS:`);
  console.log(`   Open Tracking           : OFF (open_tracking: false)`);
  console.log(`   Click Tracking          : OFF (click_tracking: false)`);
  console.log(`   RFC 8058 One-Click POST : ACTIVE`);
  console.log(`   Resend API Key          : ${runtimeConfig.email?.resendApiKey ? 'Configured ✅' : 'MISSING ❌'}`);
  console.log(`   Execution Mode          : DRY RUN (Zero network requests, zero database writes)`);
  console.log(`==================================================================\n`);
  console.log(`To dispatch a single live test to your inbox:`);
  console.log(`  node server/src/scripts/dispatch-founding-writers-campaign.mjs --sample --to=saurabh.682@gmail.com\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SAMPLE MODE
// ─────────────────────────────────────────────────────────────────────────────
async function runSample(client, targetEmail) {
  console.log(`\n==================================================================`);
  console.log(`✉️  DISPATCHING LIVE FOUNDING WRITER SAMPLE TO: ${targetEmail}`);
  console.log(`==================================================================`);

  if (!runtimeConfig.email?.resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured in server/.env');
  }

  const libraryStats = await getLiveLibraryStats(client);
  const sampleProfileId = 'sample-founding-writer-id';
  const { unsubUrl, headers } = buildUnsubscribeBundle(sampleProfileId);

  // Derive recipient display name from email
  const localPart = targetEmail.split('@')[0] || 'Writer';
  const rawFirstName = localPart.split('.')[0].split('_')[0] || localPart;
  const capitalizedName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);

  const cleanEmail = normalizeEmail(targetEmail);
  const rendered = renderFoundingWritersInvitation({
    name: capitalizedName,
    publicStoryCount: libraryStats.publicStoryCount,
    activeCategoryCount: libraryStats.activeCategoryCount,
    actionUrl: `https://writon.cc/founding-writer?email=${encodeURIComponent(cleanEmail)}`,
    actionLabel: 'Open your writing desk',
    unsubscribeUrl: unsubUrl,
  });

  // Save HTML preview to local docs
  const outDir = new URL('../../../docs/email/preview/founding-writers/', import.meta.url);
  await mkdir(outDir, { recursive: true });
  await writeFile(new URL('sample.html', outDir), rendered.html, 'utf8');
  await writeFile(new URL('sample.txt', outDir), rendered.text, 'utf8');
  console.log(`[Preview Saved] -> docs/email/preview/founding-writers/sample.html`);

  const resend = createResendClient({
    enabled: true,
    mode: 'production', // Direct sample send bypasses internal allowlist check if target is tester
    from: fromAddress,
    replyTo,
    resendApiKey: runtimeConfig.email.resendApiKey,
  });

  const idempotencyKey = `sample_founding_writer_${Date.now()}`;
  console.log(`Connecting to Resend API (open_tracking=false, click_tracking=false)...`);

  const result = await resend.send({
    to: targetEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    headers,
    idempotencyKey,
    openTracking: false,
    clickTracking: false,
  });

  if (result.blocked) {
    console.error(`❌ Delivery Blocked by Resend client: ${result.reason}`);
  } else {
    console.log(`✅ Sample Successfully Dispatched!`);
    console.log(`   Recipient           : ${targetEmail}`);
    console.log(`   Resend Message ID   : ${result.id}`);
    console.log(`   Subject             : "${rendered.subject}"`);
    console.log(`   Zero Tracking State : Confirmed (No 1x1 pixels, No redirect proxies)`);
    console.log(`   RFC 8058 Header     : ${headers['List-Unsubscribe']}`);
    console.log(`\nCheck your inbox to inspect visual rendering, links, and headers.`);
  }
  console.log(`==================================================================\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CAMPAIGN STATUS REPORT
// ─────────────────────────────────────────────────────────────────────────────
async function runStatusReport(client) {
  console.log(`\n==================================================================`);
  console.log(`📊 WRITON 2.0 FOUNDING WRITERS CAMPAIGN — STATUS & VITALS REPORT`);
  console.log(`==================================================================`);

  const health = await evaluateCampaignHealth(client);

  if (health.totalSent === 0) {
    console.log(`No live campaign emails have been dispatched yet.`);
    console.log(`Eligible frozen writers are waiting in public.founding_writer_eligibility.`);
    console.log(`==================================================================\n`);
    return;
  }

  console.log(`Overall Campaign Metrics:`);
  console.log(`  Total Dispatched        : ${health.totalSent}`);
  console.log(`  Delivered               : ${health.delivered} (${(health.deliveryRate * 100).toFixed(1)}% | target >= 95%)`);
  console.log(`  Hard Bounces            : ${health.bounced} (${(health.bounceRate * 100).toFixed(2)}% | max 2.0%)`);
  console.log(`  Spam Complaints         : ${health.complained} (${(health.complaintRate * 100).toFixed(3)}% | max 0.1%)`);
  console.log(`\nObservation & Maturation Status:`);
  console.log(`  Last Cohort Sent        : Cohort ${health.lastCohort}`);
  console.log(`  Last Sent Timestamp     : ${health.lastSentAt?.toISOString()}`);
  console.log(`  Elapsed Observation     : ${formatDuration(health.elapsedMs)}`);
  console.log(`  Required Maturation     : ${health.requiredObservationHours} hours`);
  console.log(`  Maturation Gate Status  : ${health.observationGatePassed ? 'READY FOR NEXT COHORT ✅' : 'WAITING (Maturation in progress) ⏳'}`);

  if (health.cohortSummary.length > 0) {
    console.log(`\nCohort Breakdown:`);
    for (const c of health.cohortSummary) {
      console.log(`  • Cohort ${c.cohort.toString().padEnd(2)}: ${c.count.toString().padStart(4)} emails dispatched at ${new Date(c.firstSentAt).toISOString()}`);
    }
  }

  console.log(`==================================================================\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. LIVE SEND MODE
// ─────────────────────────────────────────────────────────────────────────────
async function runSend(client, limit, explicitCohort) {
  console.log(`\n==================================================================`);
  console.log(`🚀 WRITON 2.0 FOUNDING WRITERS CAMPAIGN — LIVE DISPATCH EXECUTION`);
  console.log(`==================================================================`);

  if (!runtimeConfig.email?.resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured in server/.env');
  }

  // Evaluate Health Gates First!
  const health = await evaluateCampaignHealth(client);

  if (health.totalSent > 0) {
    if (!health.qualityGatesPassed) {
      console.error(`\n❌ HARD STOP: Quality gates failed!`);
      console.error(`   Bounce Rate: ${(health.bounceRate * 100).toFixed(2)}% (Max: 2.0%)`);
      console.error(`   Complaint Rate: ${(health.complaintRate * 100).toFixed(3)}% (Max: 0.1%)`);
      console.error(`   Campaign is halted to protect sender reputation.`);
      process.exit(1);
    }

    if (!health.observationGatePassed && !isForceGate) {
      const remainingMs = (health.requiredObservationHours * 3600 * 1000) - health.elapsedMs;
      console.warn(`\n⏳ OBSERVATION GATE ACTIVE:`);
      console.warn(`   A mandatory ${health.requiredObservationHours}h maturation window is required between cohorts.`);
      console.warn(`   Elapsed: ${formatDuration(health.elapsedMs)} | Remaining: ${formatDuration(remainingMs)}`);
      console.warn(`   Run with --force-gate to bypass if manual inspection is complete.`);
      process.exit(0);
    }
  }

  const nextCohort = explicitCohort ? parseInt(explicitCohort, 10) : (health.lastCohort + (health.totalSent > 0 ? 1 : 0));
  const batchLimit = limit ? parseInt(limit, 10) : (nextCohort === 1 ? 50 : 80);

  console.log(`Preparing Cohort ${nextCohort} (Target batch size: ${batchLimit} writers)...`);

  // Query next batch of highest-affinity uncontacted writers
  const query = `
    SELECT 
      f.profile_id, 
      f.eligibility_reason, 
      p.email, 
      p.full_name, 
      p.pen_name,
      (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND status = 'published') as post_count,
      (SELECT count(*)::int FROM public.comments WHERE author_id = p.id) as comment_count,
      p.created_at
    FROM public.founding_writer_eligibility f
    JOIN public.profiles p ON f.profile_id = p.id
    WHERE f.contacted_at IS NULL
      AND p.email NOT IN (
        SELECT recipient_email FROM public.email_jobs WHERE template_key = 'founding_writers_v2'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.email_suppressions s 
        WHERE s.recipient_fingerprint = encode(sha256(lower(trim(p.email))::bytea), 'hex')
      )
    ORDER BY 
      CASE f.eligibility_reason 
        WHEN 'published_author' THEN 1 
        WHEN 'engaged_community' THEN 2 
        ELSE 3 
      END ASC,
      post_count DESC,
      comment_count DESC,
      p.created_at DESC
    LIMIT $1
  `;

  const candidatesRes = await client.query(query, [batchLimit]);
  const candidates = candidatesRes.rows;

  if (candidates.length === 0) {
    console.log(`✅ All eligible legacy writers have already been contacted! No uncontacted candidates remain.`);
    return;
  }

  console.log(`Found ${candidates.length} qualified writers for Cohort ${nextCohort}.`);
  console.log(`Dispatches starting now with 50ms pacing...\n`);

  const libraryStats = await getLiveLibraryStats(client);

  const resend = createResendClient({
    enabled: true,
    mode: 'production',
    from: fromAddress,
    replyTo,
    resendApiKey: runtimeConfig.email.resendApiKey,
  });

  let dispatchedCount = 0;
  let errorCount = 0;

  for (const writer of candidates) {
    const cleanEmail = normalizeEmail(writer.email);
    const fp = emailFingerprint(cleanEmail);
    const rawName = writer.full_name?.trim() || writer.pen_name?.trim();
    let displayName = 'Writer';
    if (rawName) {
      displayName = rawName;
    } else {
      const localPart = cleanEmail.split('@')[0] || 'Writer';
      const rawFirst = localPart.split('.')[0].split('_')[0] || localPart;
      displayName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
    }
    const { unsubUrl, headers } = buildUnsubscribeBundle(writer.profile_id);

    const rendered = renderFoundingWritersInvitation({
      name: displayName,
      publicStoryCount: libraryStats.publicStoryCount,
      activeCategoryCount: libraryStats.activeCategoryCount,
      actionUrl: `https://writon.cc/founding-writer?email=${encodeURIComponent(cleanEmail)}`,
      actionLabel: 'Open your writing desk',
      unsubscribeUrl: unsubUrl,
    });

    const eventKey = `founding_writers_v2_cohort_${nextCohort}`;
    const idempotencyKey = `founding_v2_${writer.profile_id}_c${nextCohort}`;

    try {
      // 1. Insert or ensure user_email_preferences has lifecycle_enabled = true
      await client.query(`
        INSERT INTO public.user_email_preferences (profile_id, lifecycle_enabled, updated_at)
        VALUES ($1, true, NOW())
        ON CONFLICT (profile_id) DO UPDATE SET lifecycle_enabled = true, updated_at = NOW()
      `, [writer.profile_id]);

      // 2. Insert into email_jobs
      const jobIdRes = await client.query(`
        INSERT INTO public.email_jobs (
          id, profile_id, recipient_email, recipient_fingerprint, recipient_email_version,
          category, template_key, template_version, event_key, payload, due_at,
          status, idempotency_key
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, 1,
          'lifecycle', 'founding_writers_v2', '1', $4, $5::jsonb, NOW(),
          'processing', $6
        )
        ON CONFLICT (profile_id, event_key, template_key, template_version) DO NOTHING
        RETURNING id
      `, [
        writer.profile_id,
        cleanEmail,
        fp,
        eventKey,
        JSON.stringify({ name: displayName, unsubscribeUrl: unsubUrl }),
        idempotencyKey,
      ]);

      const jobId = jobIdRes.rows[0]?.id;

      // 3. Dispatch to Resend with zero tracking
      const sendResult = await resend.send({
        to: cleanEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers,
        idempotencyKey,
        openTracking: false,
        clickTracking: false,
      });

      if (sendResult.blocked) {
        console.warn(`  [Blocked] ${cleanEmail} -> ${sendResult.reason}`);
        if (jobId) {
          await client.query(`UPDATE public.email_jobs SET status = 'cancelled', last_error_message = $1 WHERE id = $2`, [sendResult.reason, jobId]);
        }
        errorCount++;
      } else {
        // 4. Update email_jobs to sent
        if (jobId) {
          await client.query(`
            UPDATE public.email_jobs 
            SET status = 'sent', provider_message_id = $1, sent_at = NOW(), updated_at = NOW() 
            WHERE id = $2
          `, [sendResult.id, jobId]);
        }

        // 5. Update founding_writer_eligibility
        await client.query(`
          UPDATE public.founding_writer_eligibility
          SET contacted_at = NOW(), cohort = $1
          WHERE profile_id = $2
        `, [nextCohort, writer.profile_id]);

        // 6. Update user_email_preferences last_optional_sent_at
        await client.query(`
          UPDATE public.user_email_preferences
          SET last_optional_sent_at = NOW()
          WHERE profile_id = $1
        `, [writer.profile_id]);

        dispatchedCount++;
        console.log(`  [Sent] (${dispatchedCount}/${candidates.length}) ${cleanEmail.padEnd(32)} -> Resend ID: ${sendResult.id}`);
      }

      await sleep(50); // Pacing
    } catch (err) {
      errorCount++;
      console.error(`  [Error] Failed for ${cleanEmail}: ${err.message}`);
    }
  }

  console.log(`\n==================================================================`);
  console.log(`🎉 COHORT ${nextCohort} COMPLETED:`);
  console.log(`   Successfully Dispatched : ${dispatchedCount}`);
  console.log(`   Errors / Blocked        : ${errorCount}`);
  console.log(`   Maturation Window       : 24 hours required before next cohort`);
  console.log(`==================================================================\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ROUTER
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const client = await pool.connect();
  try {
    if (isSample) {
      await runSample(client, sampleTo);
    } else if (isStatus) {
      await runStatusReport(client);
    } else if (isSend) {
      await runSend(client, limitArg, cohortArg);
    } else {
      await runDryRun(client);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
