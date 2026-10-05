# Welcome delivery repair — 2026-10-01

## Evidence and rollout gates

- Seven-day verified signup cohort contains five users; four lack email preference rows. No founder numbers are assigned to this cohort.
- Existing internal-mode blocked welcome jobs must not be released en masse. Check current recipient, verification, address version, recorded consent, suppression and seven-day cadence first.
- Read-only Resend domain/webhook requests returned HTTP 401 for the locally configured key. No email was sent. A new valid key must be supplied through Secret Manager, not chat or source control.
- Google Secret Manager's inspected inventory has no email-specific secrets. Configure a verified sender, monitored Reply-To, unsubscribe keyring and authenticated webhook secret; verify provider status before enabling any workload.
- Use Google Cloud Scheduler and an authenticated worker, not public unauthenticated HTTP dispatch or in-process-only timers. The current admin-header route is not an OIDC verifier: use an IAM-protected worker or add audience-checked Scheduler OIDC verification before attaching a recurring job.
- Disable sending during deployment. First run reconciliation in dry-run mode; require recorded lifecycle consent. Missing preference rows are not permission to subscribe users. Default-on historical rows alone are also not permission.
- Send one authorized internal test only after configuration is valid; verify delivery webhook, actual inbox receipt, unsubscribe and suppression before enabling eligible public welcome delivery.

## Local repair

- Queue retries preserve opt-outs, use current recipient version, and reject unsigned unsubscribe URLs.
- Registration awaits queueing; errors do not reject signup. Bounded reconciliation repairs consenting recent profiles missed by that hook.
- Adapter uses actual `email_verified` and preference address version. Recent welcome jobs awaiting verification are deferred for up to 30 days rather than immediately cancelled.
- Internal email routes fail closed if admin authorization is unconfigured.
- Founder assignment accepts Firebase UIDs; `20261001_founding_writer_firebase_ids.sql` widens the audit ID to text without changing existing numbers or immutable audit rows. Apply before deploying the updated assignment handler.

## Final rollout checklist — operator request, 2026-10-02

- [ ] Include a one-time welcome-email catch-up across all Firebase-registered human users, not just the recent five-user cohort. Reconcile Firebase identities against application profiles and the bot registry; exclude anonymous/guest and bot accounts.
- [ ] Produce a bounded dry-run report of eligible recipients and exclusions before dispatch. Require verified current email addresses and the existing recorded lifecycle consent; honor opt-outs, withdrawals, unsubscribes, suppressions and cadence. This request does not change those recipient protections.
- [ ] Exclude users whose welcome has already been sent/accepted; preserve stable deduplication and provider idempotency. Review ambiguous or provider-unknown jobs rather than resending them blindly.
- [ ] After provider configuration and a real internal inbox test succeed, process eligible recipients in capacity-limited batches and report sent, delivered, deferred, failed and skipped counts. Do not claim all registered users received mail from queue creation or provider acceptance alone.

The current seven-day reconciliation endpoint is insufficient for this broader catch-up; prepare a separately bounded, reviewed backfill without removing its safety limits. No catch-up emails have been sent.

## Pending operator choices

- Confirm founder cohort: the five recent verified users, or all nine previously blocked welcome recipients. Numbers are permanent; do not guess or automatically use a broad eligibility list.
- Provide a valid Resend key securely and confirm the sender domain is verified. Optional craft/engagement welcome mail remains consent-gated; founding status must not alter consent.

Production configuration, database schema, founder assignments and sending are unchanged in this local batch.
