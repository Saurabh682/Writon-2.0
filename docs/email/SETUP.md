# WritOn email setup

Prepared 16 September 2026. Status: local foundation and design previews; NOT a deployed email system. Resend account/domain setup is pending. No live emails sent.

## What is ready

- Shared HTML/plain-text renderer with six English design samples: verification, reset, welcome, weekly reading, activity and return invitation.
- Native-fetch Resend adapter, disabled by default and restricted to an explicit internal-test recipient list even when enabled.
- Basic explicit-consent/cadence predicate and focused tests. This predicate is NOT a substitute for atomic database enforcement.
- Preview generator: from the repository root, run `node server/src/scripts/preview-email.mjs`; open `docs/email/preview/index.html`.
- No new dependencies, database migration, scheduled job or Android change. Existing Firebase password resets remain intact.

## Decisions that update the supplied proposal

The current application uses Firebase Authentication and Fastify/PostgreSQL on Cloud Run. Reuse that backend and Cloud Scheduler; do not introduce Firestore and Python as a second application backend. Firebase basic Auth creation/deletion triggers also do not map directly to the proposed second-generation Auth trigger. Use the actual account-creation flow or a supported event integration.

Separate essential account mail (verification and user-requested password reset) from optional activity and editorial mail. Followers, comments, applause and milestones are optional, even when they are caused by an event. Never equate a push subscription, registration or an existing email address with email marketing consent.

The draft's specific recommendation percentages are unverified assumptions. Reuse the deployed feed's eligible-content selection and language settings after inspecting its current behavior; do not hard-code those percentages into email.

### Launch cadence

| Email | Eligibility and timing | Limits |
|---|---|---|
| Verification | User requests account verification; skip already verified or provider-verified accounts | Per-account and per-IP rate limits; no editorial inserts |
| Password reset | User requests it through the existing Firebase flow | Preserve anti-enumeration and existing rate limits |
| Welcome | After verified signup AND explicit optional-email consent | Once; replaces that week's reading email |
| Weekly reading | Explicit reading-email consent | Up to 3 eligible stories; once per rolling 7 days |
| Activity + milestones | Separate explicit activity consent | Weekly batch; combine into reading email when both categories enabled |
| Return invitation | 30 days without meaningful app reading/writing activity; explicit lifecycle consent | Once per inactivity episode, replacing that week's digest; pause discretionary mail thereafter until return or explicit renewed request |
| Writer tips | Later, separate explicit consent | Include in existing weekly slot; do not create an additional send |
| Monthly roundup | Deferred from v1 | Reconsider after content density and weekly retention are established |

Global limit: one optional email per recipient per rolling seven days, across all categories. Empty activity and weak recommendations produce no email. Any future Day-3 welcome step must REPLACE another discretionary send or require a deliberately revised cadence; do not quietly stack it on this plan. Account-security mail is outside this cap but must still be rate-limited.

Weekly default: Sunday 10:00 in the user's selected timezone, falling back to Asia/Kolkata. Spread processing across small batches. Do not turn an uncertain timezone into a fabricated preference. The scheduling time is an initial operating choice, not a proven engagement optimum.

## Design specification

- Warm ivory `#FAF5EE`; ink `#30271F`; restrained rules `#E8DFD3`.
- WritOn's terracotta remains the brand accent. Button background uses darker terracotta `#9C3E1D` to keep white text readable.
- Georgia/book-serif headings and standard sans-serif body; no external font dependency.
- 600px maximum, single-column presentation tables, generous whitespace, body text 16px and comfortable line height.
- One primary action. Story titles may link to their story; avoid competing download, social-follow and rating buttons.
- No tracking pixel, image-only text, social-icon strip, fake urgency, guilt or invented reading statistics. Disable provider open/click tracking at domain settings during launch.
- Plain-text alternative for every email. Authentication URLs are sensitive; never log the rendered body or put tracking wrappers around them.
- English samples are implemented. Hindi, Marathi and Bengali require reviewed translations before those audiences are enabled; the renderer currently rejects unsupported locales rather than silently substituting English.
- Test final messages in Gmail web/mobile, Outlook and Apple Mail, including dark mode and images disabled. Local HTML previews do not establish inbox rendering compatibility.

## Resend and mailbox preparation

1. Create the Resend account under a durable company-owned login; enable MFA and document recovery access.
2. Add a sending subdomain such as `mail.writon.cc`. Use the exact DNS records supplied by Resend for that domain. Preserve existing root-domain MX records and existing SPF configuration; do not paste guessed DNS values or add conflicting SPF records.
3. Verify DKIM/SPF in Resend. Configure and monitor DMARC with a real report destination; move toward enforcement after all legitimate senders are identified and aligned.
4. Choose a sender such as `WritOn <hello@mail.writon.cc>` only AFTER it is verified. Choose a monitored Reply-To mailbox. Resend outbound sending alone does not create a staffed support inbox.
5. Provision actual inbound mailboxes/aliases for public support, privacy and safety addresses already promised by the website. Confirm receipt and replies with a test; never publish an unmonitored address merely because it looks credible.
6. Store a least-privilege Resend sending key in Google Secret Manager and grant access only to the sending workload. Set the deployment environment from secrets; do not commit keys or paste them in chat.
7. Configure the variables shown below. Keep delivery disabled until an explicitly authorized internal test. Sender postal address must be the operator's real suitable business address; do not invent one.
8. Before a pilot, register authenticated delivery/bounce/complaint webhooks and implement suppression. A provider-accepted email is not proof of delivery.

### Environment values for the current test-only adapter

```dotenv
WRITON_EMAIL_DELIVERY_ENABLED=false
RESEND_API_KEY=
WRITON_EMAIL_FROM=
WRITON_EMAIL_REPLY_TO=
WRITON_EMAIL_TEST_RECIPIENTS=
```

`WRITON_EMAIL_TEST_RECIPIENTS` is a comma-separated list of explicitly authorized internal recipients. Empty denies all sends. This adapter has no CLI send command and is not connected to live routes or jobs. Enabling the flag does not enable production recipients.

### Cost and capacity

Resend currently documents a free transactional allowance of 3,000/month with a 100/day limit. Marketing is a separate product/pricing category: confirm the permitted product and account limits for optional newsletters before launch. Do not call optional marketing "transactional" to assume it fits a tier.

1,000 registered people is not 1,000 emails: 1,000 weekly recipients can generate 4,000–5,000 emails/month before account mail. Conversely, today's actual opted-in audience may be much smaller. Budget from recipient count × cadence + account volume + retries. Reserve capacity for account mail and pause/defer optional sends first. A weekly cohort larger than 100 cannot all be sent on one day on a 100/day plan.

## Remaining implementation before production

### 1. Preferences and consent

Create PostgreSQL email preferences keyed to the existing profile ID, defaults false for `reading`, `activity`, `lifecycle` and future `writer_tips`. Store selected locale/timezone, consent source, consent-text version, consent timestamp and withdrawal timestamp. Record changes in an append-only minimal audit ledger. Include an email-address version/fingerprint so changing the account email invalidates pending deliveries and requires verified control of the new address.

Expose authenticated GET/PATCH preferences through the existing API and add the app settings screen. Verify profile ownership server-side, never trust a submitted profile ID or target email. Never pre-enable existing accounts. Provide a signed, scoped web unsubscribe action without login; GET displays confirmation and never mutates preferences because scanners follow links. RFC 8058 POST performs one-click unsubscribe. Tokens cannot log a reader in or resubscribe them. POST must work for the advertised lifetime and after ordinary key rotation. Optional emails require List-Unsubscribe and List-Unsubscribe-Post headers plus visible body links. The current test-only transport does not yet supply these production headers.

### 2. Durable queue and suppression

Create a separate user-email outbox; the existing editorial bot outbox serves another purpose. Suggested records:

- `email_jobs`: profile ID, email-address version, type, immutable template version/content reference, event key, due time, lease expiry, attempts, status, provider ID and timestamps. Unique recipient/event/type/version constraint prevents duplicate scheduling. Do not persist raw passwords or log authentication URLs.
- `email_delivery_events`: provider event ID unique, provider message ID, event type, occurred/received times. Authenticate webhook signatures over raw bytes, enforce replay tolerance and deduplicate before state changes.
- `email_suppressions`: normalized recipient lookup or keyed fingerprint, reason, effective time. Hard bounce and complaint suppression override optional consent; decide account-mail exceptions with provider rules, not by bypassing suppression.

Worker transaction claims due jobs with `FOR UPDATE SKIP LOCKED`, leases them and atomically reserves recipient cadence and global daily capacity. Recheck consent, verified/current recipient, suppression and account existence immediately before sending. Do not hold a DB transaction open during a network request. Use a stable provider idempotency key and immutable payload for retries. Resend retains idempotency keys for only 24 hours: after an ambiguous send beyond that window, reconcile/hold for review rather than blindly retry. Expired leases must not create duplicate sends. Handle 429/Retry-After, 5xx backoff and terminal 4xx separately, with bounded attempts and dead-letter review.

Persist accepted/delivered/bounced/complained independently. Handle out-of-order events; a late delivery event must not erase a complaint. Account deletion cancels queued mail and removes ordinary preference/activity data; define and disclose any minimal suppression record retained to prevent renewed contact, with a reviewed retention schedule.

### 3. Scheduler and content

Use Cloud Scheduler calling a dedicated authenticated internal worker endpoint; prefer a separate IAM-protected Cloud Run worker or explicit audience-checked OIDC verification rather than assuming the public API validates Scheduler identity. Jobs must be replay-safe. No public manual-send endpoint, credentials in URLs or in-process-only Cloud Run timers.

Reuse current recommendation eligibility: only public, accessible, non-deleted, permitted excerpts; honor blocks, author rights, language, prior sends and content availability. Do not email private drafts. Revalidate links/content at delivery; skip stale candidates. For opted-in writers, summarize actual eligible activity, not every applause event. Never fabricate personalization or counters. Future generated editorial copy must use the project's editorial-brain service and voice checks.

### 4. Branded account emails

Keep Firebase's existing verification/reset delivery until the custom path is fully verified. Generate action links using Firebase Admin SDK for the authenticated/resolved account, with allowlisted application continuation URLs. Server-side reset responses must not reveal account existence; rate-limit by IP and recipient. Limit Firebase action URLs to the configured project and expected action mode. Do not allow arbitrary client-supplied CTA URLs or redirects. Avoid simultaneous Firebase and Resend sends for one request. Implement secure web/app action completion and test expired, reused and malformed codes before switching.

### 5. Measurement and rollout

Start with authorized internal recipients. Verify real inbox receipt, reply handling, unsubscribe, bounce/complaint suppression and link completion. Then explicitly opted-in pilot accounts; expand after observed results. Compare full weekly signup/consent cohorts, with counts and denominators: delivered rate, hard bounces, complaints, unsubscribe rate, seven-day return, meaningful reading and writing. Open rate is unreliable and unnecessary for v1. For small cohorts, avoid claims of causal uplift; a holdout becomes useful once sample size supports it.

Measure return from app events and non-sensitive campaign tags; never add raw emails or auth tokens to analytics URLs. Define retention before collecting delivery data. Kill switch pauses optional scheduling AND queued delivery; essential Firebase mail remains available.

## Launch acceptance checklist

- [ ] Domain verified, monitored Reply-To/inbound support, key in Secret Manager, real sender address.
- [ ] Preferences default off; existing users not auto-enrolled; four reviewed locales or explicit supported-audience gating.
- [ ] Concurrent scheduling tests prove single job and single cadence reservation.
- [ ] Retry/timeout tests prove no blind duplicates after provider idempotency expiry.
- [ ] Signature/replay/duplicate webhook tests; bounce and complaint block queued sends.
- [ ] One-click POST and visible unsubscribe tested; GET scanners cannot unsubscribe.
- [ ] Address changes, deleted accounts and unpublished stories cancel stale deliveries.
- [ ] Auth completion, rate limits, anti-enumeration, expired links and Firebase rollback tested.
- [ ] Inbox rendering and plain text verified with actual authorized test recipients.
- [ ] Privacy policy and provider disclosures reflect implemented collection, consent, retention and email processor use; no invented claims.
- [ ] Provider capacity/product eligibility confirmed; budget reserved for essential account mail.

## Primary references

- Resend pricing: https://resend.com/pricing
- Sending API: https://resend.com/docs/api-reference/emails/send-email
- Idempotency lifetime: https://resend.com/docs/dashboard/emails/idempotency-keys
- Webhook verification/storage: https://resend.com/docs/dashboard/webhooks/how-to-store-webhooks-data
- Firebase custom action links: https://firebase.google.com/docs/auth/admin/email-action-links
- Firebase Auth trigger support: https://firebase.google.com/docs/functions/auth-events

These are setup decisions and outstanding acceptance conditions, not claims that production capabilities have already been implemented.
