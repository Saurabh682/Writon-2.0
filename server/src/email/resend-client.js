export class ResendHttpError extends Error {
  constructor(message, { status, code, retryAfter, responseBody } = {}) {
    super(message);
    this.name = 'ResendHttpError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.responseBody = responseBody;
  }
}

function recipientAllowed(config, email) {
  if (!config.enabled) return { ok: false, reason: 'delivery_disabled' };
  if (config.mode === 'internal' && !config.testRecipients.has(String(email).toLowerCase())) {
    return { ok: false, reason: 'recipient_not_in_internal_allowlist' };
  }
  return { ok: true };
}

export function createResendClient(config, fetchImpl = fetch) {
  return {
    async send({ to, subject, html, text, headers = {}, idempotencyKey, openTracking = false, clickTracking = false }) {
      const gate = recipientAllowed(config, to);
      if (!gate.ok) return { blocked: true, reason: gate.reason };

      const body = {
        from: config.from,
        to: [to],
        subject,
        html,
        text,
        headers,
        open_tracking: Boolean(openTracking),
        click_tracking: Boolean(clickTracking),
      };
      if (config.replyTo) body.reply_to = config.replyTo;

      let response;
      try {
        response = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(body),
        });
      } catch (error) {
        // Network errors are ambiguous: the provider may have accepted the request.
        error.deliveryAmbiguous = true;
        throw error;
      }

      const raw = await response.text();
      let parsed = {};
      try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = { raw }; }

      if (!response.ok) {
        const retryAfter = response.headers.get('retry-after');
        throw new ResendHttpError(parsed?.message || `Resend returned HTTP ${response.status}`, {
          status: response.status,
          code: parsed?.name || parsed?.code,
          retryAfter,
          responseBody: parsed,
        });
      }
      return { blocked: false, id: parsed.id, raw: parsed };
    },
  };
}
