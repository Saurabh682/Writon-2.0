import crypto from 'node:crypto';
import { withTransaction } from './db.js';
import { emailFingerprint, normalizeEmail } from './security/fingerprint.js';
import { createUnsubscribeToken } from './security/unsubscribe-token.js';

export async function enqueueEmail(pool, {
  profileId,
  recipientEmail,
  recipientEmailVersion,
  category,
  templateKey,
  templateVersion = '1',
  eventKey,
  payload = {},
  dueAt = new Date(),
}) {
  const id = crypto.randomUUID();
  const normalized = normalizeEmail(recipientEmail);
  const fp = emailFingerprint(normalized);
  const idempotencyKey = `${templateKey}/${eventKey}/${profileId}`.slice(0, 256);
  const result = await pool.query(
    `INSERT INTO email_jobs(
      id, profile_id, recipient_email, recipient_fingerprint, recipient_email_version,
      category, template_key, template_version, event_key, payload, due_at, idempotency_key
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)
    ON CONFLICT (profile_id, event_key, template_key, template_version) DO NOTHING
    RETURNING *`,
    [id, profileId, normalized, fp, recipientEmailVersion, category, templateKey, templateVersion,
      eventKey, JSON.stringify(payload), dueAt, idempotencyKey],
  );
  return result.rows[0] || null;
}

export async function claimDueJobs(pool, { limit = 25, leaseSeconds = 300 } = {}) {
  const leaseToken = crypto.randomUUID();
  return withTransaction(pool, async client => {
    const result = await client.query(
      `WITH due AS (
         SELECT id FROM email_jobs
         WHERE due_at <= NOW()
           AND (
             (status IN ('queued','retry') AND (lease_expires_at IS NULL OR lease_expires_at <= NOW()))
             OR (status='processing' AND lease_expires_at <= NOW())
           )
         ORDER BY due_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE email_jobs j
       SET status='processing', lease_token=$2, lease_expires_at=NOW() + ($3 || ' seconds')::interval,
           attempts=attempts+1, updated_at=NOW()
       FROM due
       WHERE j.id=due.id
       RETURNING j.*`,
      [limit, leaseToken, leaseSeconds],
    );
    return result.rows;
  });
}

function consentColumn(category) {
  const map = {
    reading: 'reading_enabled',
    activity: 'activity_enabled',
    lifecycle: 'lifecycle_enabled',
    writer_tips: 'writer_tips_enabled',
  };
  const column = map[category];
  if (!column) throw new Error(`Unknown optional email category: ${category}`);
  return column;
}

export async function reserveSend(pool, job, dailyCapacity) {
  return withTransaction(pool, async client => {
    const prefResult = await client.query(
      `SELECT * FROM user_email_preferences WHERE profile_id=$1 FOR UPDATE`,
      [job.profile_id],
    );
    const pref = prefResult.rows[0];
    if (!pref) return { ok: false, reason: 'no_preferences' };
    if (Number(pref.email_version) !== Number(job.recipient_email_version)) return { ok: false, reason: 'stale_email_version' };
    const column = consentColumn(job.category);
    if (!pref[column]) return { ok: false, reason: 'consent_disabled' };

    const suppression = await client.query(
      `SELECT 1 FROM email_suppressions WHERE recipient_fingerprint=$1`,
      [job.recipient_fingerprint],
    );
    if (suppression.rowCount) return { ok: false, reason: 'suppressed' };

    if (pref.last_optional_sent_at && new Date(pref.last_optional_sent_at).getTime() > Date.now() - 7 * 86400_000) {
      const nextAt = new Date(new Date(pref.last_optional_sent_at).getTime() + 7 * 86400_000);
      return { ok: false, reason: 'cadence', nextAt };
    }
    if (pref.cadence_reserved_until && new Date(pref.cadence_reserved_until) > new Date()) {
      if (String(pref.cadence_reserved_job_id) === String(job.id)) return { ok: true, alreadyReserved: true };
      return { ok: false, reason: 'cadence_reserved' };
    }

    const capacity = await client.query(
      `INSERT INTO email_daily_capacity(capacity_date, reserved_count)
       VALUES (CURRENT_DATE, 1)
       ON CONFLICT (capacity_date)
       DO UPDATE SET reserved_count=email_daily_capacity.reserved_count+1, updated_at=NOW()
       WHERE email_daily_capacity.reserved_count < $1
       RETURNING reserved_count`,
      [dailyCapacity],
    );
    if (capacity.rowCount === 0) return { ok: false, reason: 'daily_capacity' };

    await client.query(
      `UPDATE user_email_preferences
       SET cadence_reserved_until=NOW() + interval '30 minutes', cadence_reserved_job_id=$2, updated_at=NOW()
       WHERE profile_id=$1`,
      [job.profile_id, job.id],
    );
    return { ok: true };
  });
}

export async function releaseReservation(pool, job, { releaseCapacity = true } = {}) {
  return withTransaction(pool, async client => {
    await client.query(
      `UPDATE user_email_preferences
       SET cadence_reserved_until=NULL, cadence_reserved_job_id=NULL, updated_at=NOW()
       WHERE profile_id=$1 AND cadence_reserved_job_id=$2`,
      [job.profile_id, job.id],
    );
    if (releaseCapacity) {
      await client.query(
        `UPDATE email_daily_capacity SET reserved_count=GREATEST(0,reserved_count-1), updated_at=NOW()
         WHERE capacity_date=CURRENT_DATE`,
      );
    }
  });
}

export async function markSent(pool, job, providerMessageId) {
  return withTransaction(pool, async client => {
    await client.query(
      `UPDATE email_jobs SET status='sent', provider_message_id=$2, accepted_at=NOW(), sent_at=NOW(),
       lease_token=NULL, lease_expires_at=NULL, updated_at=NOW() WHERE id=$1`,
      [job.id, providerMessageId],
    );
    await client.query(
      `UPDATE user_email_preferences SET last_optional_sent_at=NOW(), cadence_reserved_until=NULL,
       cadence_reserved_job_id=NULL, updated_at=NOW()
       WHERE profile_id=$1 AND cadence_reserved_job_id=$2`,
      [job.profile_id, job.id],
    );
  });
}

export async function cancelJob(pool, job, reason) {
  await pool.query(
    `UPDATE email_jobs SET status='cancelled', last_error_code=$2, lease_token=NULL,
     lease_expires_at=NULL, updated_at=NOW() WHERE id=$1`,
    [job.id, reason],
  );
}

export async function deferJob(pool, job, nextAt, reason) {
  await pool.query(
    `UPDATE email_jobs SET status='retry', due_at=$2, last_error_code=$3, lease_token=NULL,
     lease_expires_at=NULL, updated_at=NOW() WHERE id=$1`,
    [job.id, nextAt, reason],
  );
}

export async function markDead(pool, job, error) {
  await pool.query(
    `UPDATE email_jobs SET status='dead', last_error_code=$2, last_error_message=$3,
     lease_token=NULL, lease_expires_at=NULL, updated_at=NOW() WHERE id=$1`,
    [job.id, error?.code || String(error?.status || 'send_error'), String(error?.message || error).slice(0, 2000)],
  );
}

export async function markAmbiguous(pool, job, error) {
  await pool.query(
    `UPDATE email_jobs SET status='ambiguous', last_error_code='ambiguous_delivery', last_error_message=$2,
     lease_token=NULL, lease_expires_at=NULL, updated_at=NOW() WHERE id=$1`,
    [job.id, String(error?.message || error).slice(0, 2000)],
  );
}

export async function enqueueWelcomeEmail(pool, config, { profileId, recipientEmail, fullName } = {}) {
  if (!profileId) return null;

  // 1. Seed or ensure user_email_preferences for the new user with lifecycle_enabled = true
  await pool.query(
    `INSERT INTO public.user_email_preferences (
      profile_id, reading_enabled, activity_enabled, lifecycle_enabled, writer_tips_enabled,
      locale, timezone, email_version, created_at, updated_at
    ) VALUES ($1, false, false, true, false, 'en', 'Asia/Kolkata', 1, NOW(), NOW())
    ON CONFLICT (profile_id) DO UPDATE
      SET lifecycle_enabled = true, updated_at = NOW()`,
    [profileId],
  );

  const cleanEmail = typeof recipientEmail === 'string' ? recipientEmail.trim().toLowerCase() : null;
  if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.endsWith('@legacy.writon.io')) {
    return null;
  }

  // 2. Generate signed unsubscribe URL
  const keyring = config?.email?.unsubscribeKeys || [];
  const token = keyring.length > 0
    ? createUnsubscribeToken({ profileId, scope: 'lifecycle' }, keyring)
    : 'onboarding_token';
  const unsubscribeBase = String(config?.email?.unsubscribeBaseUrl || 'https://writon.cc/email/unsubscribe').replace(/\/$/, '');
  const unsubscribeUrl = `${unsubscribeBase}/${encodeURIComponent(token)}`;

  // 3. Build craft tip and model for welcome
  const payload = {
    tip: {
      title: 'Craft Principle: Write Your Opening Sentence Last',
      body: 'Don\'t let perfectionism stall your draft. Begin in media res, and return to sharpen the opening once the core truth of the piece is clear.',
    },
    unsubscribeUrl,
  };

  return enqueueEmail(pool, {
    profileId,
    recipientEmail: cleanEmail,
    recipientEmailVersion: 1,
    category: 'lifecycle',
    templateKey: 'welcome',
    templateVersion: '1',
    eventKey: 'signup_welcome',
    payload,
    dueAt: new Date(),
  });
}

