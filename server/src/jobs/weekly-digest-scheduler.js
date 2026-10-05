import { buildWriterDigestModel, hasMeaningfulDigestActivity, isoWeekKey } from '../engagement/digest.js';
import { createUnsubscribeToken } from '../email/security/unsubscribe-token.js';
import { enqueueEmail } from '../email/queue.js';

function unsubscribeUrl(config, token) {
  const base = String(config.email?.unsubscribeBaseUrl || 'https://writon.cc/email/unsubscribe').replace(/\/$/, '');
  return `${base}/${encodeURIComponent(token)}`;
}

export async function runWeeklyDigestScheduler(pool, writonAdapter, config, { date = new Date(), limit = 100 } = {}) {
  const week = isoWeekKey(date);
  const window = { end: date, days: 7 };

  // Query opted-in writers whose accounts exist with an email
  const optedInWriters = await pool.query(
    `select pref.profile_id, pref.email_version, p.email
     from public.user_email_preferences pref
     inner join public.profiles p on p.id = pref.profile_id
     where pref.activity_enabled = true
       and pref.withdrawn_at is null
       and p.email is not null
       and p.email not like '%@legacy.writon.io'
     limit $1`,
    [limit],
  );

  const results = { evaluated: optedInWriters.rowCount, enqueued: 0, skipped: 0 };

  for (const writer of optedInWriters.rows) {
    try {
      const profileId = writer.profile_id;
      const recipientEmail = writer.email;
      const emailVersion = writer.email_version;

      const [stats, topStory, recommendations] = await Promise.all([
        writonAdapter.getWeeklyWriterStats(profileId, window),
        writonAdapter.getTopStory(profileId, window),
        writonAdapter.getRecommendationCandidates(profileId, 3),
      ]);

      const keyring = config.email?.unsubscribeKeys || [];
      if (!Array.isArray(keyring) || keyring.length === 0) {
        throw new Error('Unsubscribe signing keys are not configured; failing closed');
      }
      const token = createUnsubscribeToken({ profileId, scope: 'all' }, keyring);

      const model = buildWriterDigestModel({
        profileId,
        stats,
        topStory,
        milestones: stats.milestones || [],
        recommendations,
        unsubscribeUrl: unsubscribeUrl(config, token),
        date,
      });

      if (!hasMeaningfulDigestActivity(model)) {
        results.skipped++;
        continue;
      }

      const enqueued = await enqueueEmail(pool, {
        profileId,
        recipientEmail,
        recipientEmailVersion: emailVersion,
        category: 'activity',
        templateKey: 'weekly_writer_digest',
        templateVersion: '1',
        eventKey: `weekly-writer:${week}`,
        payload: model,
        dueAt: date,
      });

      if (enqueued) results.enqueued++;
      else results.skipped++;
    } catch (err) {
      results.skipped++;
    }
  }

  return results;
}
