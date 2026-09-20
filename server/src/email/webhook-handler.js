import { emailFingerprint } from './security/fingerprint.js';

function getProviderMessageId(event) {
  return event?.data?.email_id || event?.data?.id || event?.email_id || null;
}
function getRecipient(event) {
  const to = event?.data?.to;
  if (Array.isArray(to)) return to[0] || null;
  return typeof to === 'string' ? to : null;
}

export async function persistResendEvent(pool, event) {
  const eventId = event?.id;
  const type = event?.type;
  if (!eventId || !type) throw new Error('Webhook event missing id/type');
  const providerMessageId = getProviderMessageId(event);
  const occurredAt = event?.created_at ? new Date(event.created_at) : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO email_delivery_events(provider_event_id, provider_message_id, event_type, occurred_at, payload)
       VALUES ($1,$2,$3,$4,$5::jsonb)
       ON CONFLICT (provider_event_id) DO NOTHING
       RETURNING provider_event_id`,
      [eventId, providerMessageId, type, occurredAt, JSON.stringify(event)],
    );
    if (inserted.rowCount === 0) {
      await client.query('COMMIT');
      return { duplicate: true };
    }

    if (type === 'email.bounced' || type === 'email.complained' || type === 'email.suppressed') {
      const recipient = getRecipient(event);
      if (recipient) {
        const fp = emailFingerprint(recipient);
        await client.query(
          `INSERT INTO email_suppressions(recipient_fingerprint, reason, effective_at, provider_event_id, metadata)
           VALUES ($1,$2,NOW(),$3,$4::jsonb)
           ON CONFLICT (recipient_fingerprint)
           DO UPDATE SET reason = EXCLUDED.reason, effective_at = EXCLUDED.effective_at,
                         provider_event_id = EXCLUDED.provider_event_id, metadata = EXCLUDED.metadata`,
          [fp, type, eventId, JSON.stringify({ providerMessageId })],
        );
        await client.query(
          `UPDATE email_jobs SET status='cancelled', updated_at=NOW(), last_error_code=$2
           WHERE recipient_fingerprint=$1 AND status IN ('queued','retry','processing')`,
          [fp, `suppressed:${type}`],
        );
      }
    }

    await client.query('COMMIT');
    return { duplicate: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
