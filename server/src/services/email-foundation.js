// Setup foundation only: callers must enforce consent, suppression and durable
// deduplication before using the transport. No routes or jobs import this yet.
const TYPES = new Set(['verification', 'password-reset', 'welcome', 'digest', 'activity', 'return']);
const ESSENTIAL = new Set(['verification', 'password-reset']);
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function safeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Email links must use HTTPS without credentials');
  return url.href;
}

/** Explicit opt-in; push consent never counts as email consent. */
export function canQueueOptionalEmail({ optedIn, verified, suppressed, lastOptionalAt, now = Date.now() }) {
  if (optedIn !== true || verified !== true || suppressed !== false) return false;
  if (lastOptionalAt == null) return true;
  const previous = Date.parse(lastOptionalAt);
  return Number.isFinite(previous) && now - previous >= 7 * 24 * 60 * 60 * 1000;
}

export function renderWritOnEmail({ type, title, intro, actionLabel, actionUrl, stories = [], preferencesUrl, unsubscribeUrl, postalAddress, locale = 'en' }) {
  if (!TYPES.has(type)) throw new Error('Unknown email type');
  // Reviewed translations must be added before enabling these audiences.
  if (locale !== 'en') throw new Error('Email translation not yet available');
  const optional = !ESSENTIAL.has(type);
  if (!title || !intro || !actionLabel) throw new Error('Email copy is required');
  if (optional && (!preferencesUrl || !unsubscribeUrl || !postalAddress?.trim())) throw new Error('Optional email requires preferences, unsubscribe and sender address');
  if (!Array.isArray(stories) || stories.length > 3) throw new Error('Use at most three stories');
  const action = safeUrl(actionUrl);
  const cards = stories.map((story) => ({ ...story, url: safeUrl(story.url) }));
  const preferences = optional ? safeUrl(preferencesUrl) : null;
  const unsubscribe = optional ? safeUrl(unsubscribeUrl) : null;
  const footer = optional
    ? `You chose to receive emails from WritOn. <a href="${escape(preferences)}" style="color:#69402B">Email preferences</a> &middot; <a href="${escape(unsubscribe)}" style="color:#69402B">Unsubscribe</a><br>${escape(postalAddress)}`
    : 'This email concerns your WritOn account. If you did not request it, you can ignore it.';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;background:#FAF5EE;color:#30271F"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF5EE"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px"><tr><td style="padding:16px 8px 32px;font:24px Georgia,serif;color:#9C3E1D">WritOn</td></tr>
<tr><td style="padding:0 8px"><h1 style="font:normal 30px/1.25 Georgia,serif;margin:0 0 24px">${escape(title)}</h1><p style="font:16px/1.7 Arial,sans-serif;margin:0 0 28px">${escape(intro)}</p>
${cards.map((story) => `<h2 style="font:normal 23px/1.3 Georgia,serif;margin:28px 0 8px"><a href="${escape(story.url)}" style="color:#30271F;text-decoration:underline">${escape(story.title)}</a></h2><p style="font:14px/1.6 Arial,sans-serif;color:#66584B;margin:0 0 8px">${escape(story.author)}${story.readingMinutes ? ` · ${escape(story.readingMinutes)} min read` : ''}</p><p style="font:16px/1.7 Arial,sans-serif;margin:0 0 24px">${escape(story.excerpt)}</p>`).join('')}
<p style="margin:32px 0"><a href="${escape(action)}" style="display:inline-block;background:#9C3E1D;color:#FFFFFF;padding:14px 22px;border-radius:4px;font:bold 16px/1.4 Arial,sans-serif;text-decoration:none">${escape(actionLabel)}</a></p>
<p style="font:13px/1.6 Arial,sans-serif;color:#66584B;overflow-wrap:anywhere">If the button does not work, use this link:<br><a href="${escape(action)}" style="color:#69402B;word-break:break-all">${escape(action)}</a></p></td></tr>
<tr><td style="padding:32px 8px 16px;font:12px/1.7 Arial,sans-serif;color:#66584B;border-top:1px solid #E8DFD3">${footer}</td></tr></table></td></tr></table></body></html>`;
  const text = ['WritOn', title, intro, ...cards.map((s) => `${s.title}\n${s.author}\n${s.excerpt}\n${s.url}`), `${actionLabel}: ${action}`, optional ? `Email preferences: ${preferences}\nUnsubscribe: ${unsubscribe}\n${postalAddress}` : 'This email concerns your WritOn account. If you did not request it, you can ignore it.'].join('\n\n');
  return { html, text };
}

/** No automatic retries: the future durable worker owns retry decisions. */
export async function sendWithResend({ to, subject, html, text, idempotencyKey }, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (env.WRITON_EMAIL_DELIVERY_ENABLED !== 'true') return { status: 'disabled' };
  // Only explicit internal-test recipients during setup. Production is not enabled
  // by removing the allowlist; the queue/consent/webhook integration must land first.
  const allowed = (env.WRITON_EMAIL_TEST_RECIPIENTS ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (typeof to !== 'string' || !allowed.includes(to.toLowerCase())) throw new Error('Recipient is not an approved email tester');
  if (!env.RESEND_API_KEY || !env.WRITON_EMAIL_FROM || !env.WRITON_EMAIL_REPLY_TO) throw new Error('Email sender configuration is incomplete');
  if (!idempotencyKey || !/^[a-zA-Z0-9:_-]{1,200}$/.test(idempotencyKey)) throw new Error('A stable email idempotency key is required');
  if (!subject || /[\r\n]/.test(subject) || !html || !text) throw new Error('Email subject, HTML and plain text are required');
  let response;
  try {
    response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ from: env.WRITON_EMAIL_FROM, to: [to], reply_to: env.WRITON_EMAIL_REPLY_TO, subject, html, text }),
    });
  } catch {
    // Do not log addresses, rendered authentication links or provider secrets.
    throw new Error('Email transport outcome unknown; reconcile before retrying');
  }
  if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`);
  const result = await response.json();
  if (typeof result.id !== 'string' || !result.id) throw new Error('Email provider returned no message ID; reconcile before retrying');
  return { status: 'accepted', providerId: result.id };
}
