import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve('server/.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const profileId = 'legacy:usr_leg_73';
  const cleanEmail = 'saurabh.682@gmail.com';

  const { enqueueEmail } = await import('../server/src/email/queue.js');
  const { createUnsubscribeToken } = await import('../server/src/email/security/unsubscribe-token.js');

  const updateRes = await pool.query(
    "UPDATE public.user_email_preferences SET lifecycle_enabled = true, consented_at = NOW(), consent_source = 'test_authorization', consent_text_version = 'v1', last_optional_sent_at = NULL WHERE profile_id = $1 RETURNING profile_id, consented_at",
    [profileId]
  );
  console.log('Consent updated:', updateRes.rows[0]);

  const keyring = JSON.parse(process.env.WRITON_UNSUBSCRIBE_KEYS_JSON || '[]');
  const token = keyring.length > 0 ? createUnsubscribeToken({ profileId, scope: 'lifecycle' }, keyring) : 'token';
  const unsubscribeUrl = 'https://api.writon.cc/email/unsubscribe/' + encodeURIComponent(token);

  const payload = {
    tip: {
      title: 'Craft Principle: Write Your Opening Sentence Last',
      body: "Don't let perfectionism stall your draft. Begin in media res, and return to sharpen the opening once the core truth of the piece is clear.",
    },
    unsubscribeUrl,
  };

  const job = await enqueueEmail(pool, {
    profileId,
    recipientEmail: cleanEmail,
    recipientEmailVersion: 1,
    category: 'lifecycle',
    templateKey: 'welcome',
    templateVersion: '1',
    eventKey: 'gcp_scheduler_live_verify_' + Date.now(),
    payload,
    dueAt: new Date(),
  });

  console.log('Enqueued consented job ID:', job?.id);
  await pool.end();
}

main().catch(err => {
  console.error('Error in script:', err);
  process.exit(1);
});
