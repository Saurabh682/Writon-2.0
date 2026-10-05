import { getPreferences, patchPreferences, unsubscribeScope } from '../email/preferences.js';
import { verifyUnsubscribeToken } from '../email/security/unsubscribe-token.js';
import { verifySvixWebhook } from '../email/webhook-verify.js';
import { persistResendEvent } from '../email/webhook-handler.js';
import { recordShareAction } from '../engagement/events.js';
import { runWeeklyDigestScheduler } from '../jobs/weekly-digest-scheduler.js';
import { reconcileWelcomeEmails } from '../email/queue.js';

export async function emailEngagementRoutes(fastify, options) {
  const { database, config, emailWorker, writonAdapter, requireUser, verifyAdminKey } = options;

  // 1. PUBLIC ROUTES (Unsubscribe & Webhooks)
  const unsubscribeBaseUrl = config.email?.unsubscribeBaseUrl || 'https://writon.cc/email/unsubscribe';
  const keyring = config.email?.unsubscribeKeys || [];

  function parseTokenPayload(token) {
    return verifyUnsubscribeToken(token, keyring);
  }

  fastify.get('/email/unsubscribe/:token', async (request, reply) => {
    try {
      const data = parseTokenPayload(request.params.token);
      return reply.type('text/html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WritOn Email Preferences</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF5EE; color: #30271F; margin: 0; padding: 48px 20px; display: flex; justify-content: center; }
    .card { background: #FFFFFF; border: 1px solid #E8DFD3; border-radius: 16px; max-width: 520px; width: 100%; padding: 36px; box-sizing: border-box; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    h1 { font-family: Georgia, serif; font-size: 24px; font-weight: normal; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #57534E; margin: 0 0 24px 0; }
    button { background: #9C3E1D; color: #FFFFFF; border: none; padding: 12px 22px; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; }
    button:hover { background: #823317; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Unsubscribe from WritOn emails?</h1>
    <p>This action will opt you out of <strong>${data.scope || 'optional'}</strong> emails from WritOn. You can always change this later in your settings.</p>
    <form method="post">
      <button type="submit">Confirm Unsubscribe</button>
    </form>
  </div>
</body>
</html>`);
    } catch {
      return reply.code(400).type('text/plain').send('This unsubscribe link is invalid or expired.');
    }
  });

  fastify.post('/email/unsubscribe/:token', async (request, reply) => {
    try {
      const data = parseTokenPayload(request.params.token);
      await unsubscribeScope(database, data.profileId, data.scope || 'all', 'one_click_unsubscribe');
      return reply.type('text/plain').send('You have been unsubscribed from the selected optional WritOn email.');
    } catch {
      return reply.code(400).type('text/plain').send('This unsubscribe link is invalid or expired.');
    }
  });

  // 1.1 Founding Writer Verification & Badge Claim
  fastify.post('/api/v1/founding-writer/claim', async (request, reply) => {
    const rawEmail = request.body?.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return reply.code(400).send({ ok: false, error: 'Valid email address is required' });
    }
    const cleanEmail = rawEmail.trim().toLowerCase();

    const result = await database.query(`
      SELECT 
        f.profile_id, f.campaign_id, f.eligibility_reason, f.badge_activated_at,
        p.display_name, p.username, p.email,
        (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND status = 'published') as stories_count
      FROM public.founding_writer_eligibility f
      JOIN public.profiles p ON f.profile_id = p.id
      WHERE lower(trim(p.email)) = $1
    `, [cleanEmail]);

    if (!result.rowCount) {
      return reply.code(200).send({
        ok: true,
        eligible: false,
        message: 'This email was not found in our 2020–2026 legacy founding registry. If you wrote on WritOn using another address, please check and try again.',
      });
    }

    const writer = result.rows[0];
    let activatedAt = writer.badge_activated_at;
    if (!activatedAt) {
      const updateRes = await database.query(`
        UPDATE public.founding_writer_eligibility
        SET badge_activated_at = NOW()
        WHERE profile_id = $1
        RETURNING badge_activated_at
      `, [writer.profile_id]);
      activatedAt = updateRes.rows[0]?.badge_activated_at || new Date().toISOString();
    }

    const tierLabels = {
      published_author: 'Published Author (Original Generation)',
      engaged_community: 'Engaged Community Member',
      legacy_member: 'Original Generation Member',
    };

    return reply.code(200).send({
      ok: true,
      eligible: true,
      profileId: writer.profile_id,
      displayName: writer.display_name?.trim() || writer.username?.trim() || 'Founding Writer',
      tier: writer.eligibility_reason,
      tierLabel: tierLabels[writer.eligibility_reason] || 'Founding Writer',
      storiesCount: writer.stories_count || 0,
      badgeActivated: true,
      activatedAt,
      message: 'Your permanent Founding Writer Badge has been confirmed and activated.',
    });
  });

  fastify.get('/api/v1/founding-writer/check', async (request, reply) => {
    const rawEmail = request.query?.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return reply.code(400).send({ ok: false, error: 'Email query parameter required' });
    }
    const cleanEmail = rawEmail.trim().toLowerCase();

    const result = await database.query(`
      SELECT 
        f.profile_id, f.campaign_id, f.eligibility_reason, f.badge_activated_at,
        p.display_name, p.username, p.email,
        (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND status = 'published') as stories_count
      FROM public.founding_writer_eligibility f
      JOIN public.profiles p ON f.profile_id = p.id
      WHERE lower(trim(p.email)) = $1
    `, [cleanEmail]);

    if (!result.rowCount) {
      return reply.code(200).send({ ok: true, eligible: false });
    }

    const writer = result.rows[0];
    const tierLabels = {
      published_author: 'Published Author (Original Generation)',
      engaged_community: 'Engaged Community Member',
      legacy_member: 'Original Generation Member',
    };

    return reply.code(200).send({
      ok: true,
      eligible: true,
      displayName: writer.display_name?.trim() || writer.username?.trim() || 'Founding Writer',
      tier: writer.eligibility_reason,
      tierLabel: tierLabels[writer.eligibility_reason] || 'Founding Writer',
      storiesCount: writer.stories_count || 0,
      badgeActivated: Boolean(writer.badge_activated_at),
      activatedAt: writer.badge_activated_at,
    });
  });

  // Dedicated encapsulation for raw-body webhook verification
  fastify.register(async function resendWebhookPlugin(subInstance) {
    subInstance.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));
    subInstance.post('/webhooks/resend', async (request, reply) => {
      try {
        const event = verifySvixWebhook({
          payload: request.body,
          id: request.headers['svix-id'],
          timestamp: request.headers['svix-timestamp'],
          signature: request.headers['svix-signature'],
          secret: config.email?.resendWebhookSecret,
        });
        const result = await persistResendEvent(database, event);
        return reply.code(200).send({ ok: true, duplicate: result.duplicate });
      } catch (error) {
        request.log.warn({ err: error }, 'Rejected Resend webhook');
        return reply.code(400).send({ ok: false });
      }
    });
  });

  // 2. AUTHENTICATED USER ROUTES
  const handleGetPreferences = async (request) => {
    return getPreferences(database, request.profileId);
  };

  const handlePatchPreferences = async (request) => {
    const body = request.body || {};
    const patch = {};
    for (const key of ['reading', 'activity', 'lifecycle', 'writerTips']) {
      if (key in body) {
        if (typeof body[key] !== 'boolean') {
          const e = new Error(`${key} must be boolean`);
          e.statusCode = 400;
          throw e;
        }
        patch[key] = body[key];
      }
    }
    if (typeof body.locale === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(body.locale)) patch.locale = body.locale;
    if (typeof body.timezone === 'string' && body.timezone.length <= 80) patch.timezone = body.timezone;
    return patchPreferences(database, request.profileId, patch, { source: 'settings', consentTextVersion: 'v1' });
  };

  fastify.get('/api/v1/me/email-preferences', { preHandler: requireUser }, handleGetPreferences);
  fastify.patch('/api/v1/me/email-preferences', { preHandler: requireUser }, handlePatchPreferences);

  // Backward compatible routes for /api/email/preferences
  fastify.get('/api/email/preferences', { preHandler: requireUser }, handleGetPreferences);
  fastify.patch('/api/email/preferences', { preHandler: requireUser }, handlePatchPreferences);

  // Record share action from client publish-success screen
  fastify.post('/api/v1/stories/:id/share-initiated', { preHandler: requireUser }, async (request) => {
    const storyId = request.params.id;
    const destination = typeof request.body?.destination === 'string' ? request.body.destination.slice(0, 40) : 'unknown';
    const recorded = await recordShareAction(database, {
      profileId: request.profileId,
      storyId,
      destination,
    });
    return { ok: true, recorded };
  });

  // 3. INTERNAL WORKER ROUTES
  const adminGuard = (request, reply) => {
    if (typeof verifyAdminKey === 'function') {
      return verifyAdminKey(request, reply);
    }
    reply.code(403).send({ error: 'Email job authorization unconfigured' });
    return false;
  };

  fastify.post('/api/v1/internal/jobs/process-emails', async (request, reply) => {
    if (!adminGuard(request, reply)) return;
    if (!emailWorker) {
      return reply.code(503).send({ error: 'Email worker unconfigured' });
    }
    const outcome = await emailWorker.runOnce();
    return outcome;
  });

  fastify.post('/api/v1/internal/jobs/reconcile-welcome-emails', async (request, reply) => {
    if (!adminGuard(request, reply)) return;
    const { days = 7, limit = 25, dryRun = true } = request.body || {};
    if (!Number.isInteger(days) || days < 1 || days > 30 || !Number.isInteger(limit) || limit < 1 || limit > 100 || typeof dryRun !== 'boolean') {
      return reply.code(400).send({ error: 'Use days 1–30, limit 1–100 and a boolean dryRun.' });
    }
    return reconcileWelcomeEmails(database, config, { days, limit, dryRun });
  });

  fastify.post('/api/v1/internal/jobs/enqueue-weekly-digests', async (request, reply) => {
    if (!adminGuard(request, reply)) return;
    const outcome = await runWeeklyDigestScheduler(database, writonAdapter, config);
    return outcome;
  });
}
