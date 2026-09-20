# Notification delivery operations

Phase 4–5 hosted staging promotion (2026-09-13): Cloud Build `7bba6d20-dea3-4580-99e8-5b1058ad6cd6` produced Artifact Registry image `phase45-staging-20260913-0920`. Revision `writon-app-api-staging-00013-gig` first served zero traffic through tag `phase45-20260913`, passed health/database, auth-guard, protected-endpoint, authenticated preference, stale-write, granular-control, disposable-identity cleanup, and Cloud Logging error/5xx checks, and then received 100% of staging traffic. The stable staging URL reports `status=ok` and `database=connected`; unauthenticated notification-preferences access returns `401` and an untrusted outbox-drain request returns `403`.

Phase 4–5 database gate (2026-09-13): the additive preference and notification migrations were applied only to guarded staging ref `xrfnebvkazewqramkpri`. Read-only schema checks passed, followed by disposable-data verification of monotonic preference persistence/deletion and atomic human-only notification fan-out, stale-claim recovery, terminal attempts, and unsent outbox state. Verification was scoped to generated event UUIDs, cleanup completed, and no FCM delivery was invoked. The Phase 4–5 suite passes 145/145 and the complete backend suite passes 327/327 tests across 31 files.

Post-promotion safety state: `NODE_ENV=staging`, `TIMERS_DISABLED=true`, `PUSH_DELIVERY_ENABLED=false`, `DAILY_DIGEST_ENABLED=false`, `FOLLOWED_WRITER_NOTIFICATIONS_ENABLED=false`, `DISCOVERY_NOTIFICATIONS_ENABLED=false`, `SOCIAL_AUTO_PUBLISH_ENABLED=false`, `SPARK_AUTOMATION_ENABLED=false`, `FEED_BEHAVIOR_ROLLOUT_PERCENT=0`, and `REVIEW_PROMPT_ENABLED=false`. Guest token registration remains enabled for staging contract testing. No notification was sent and no production service, database, scheduler, DNS setting, or Play release was changed.

Latest staging deployment: `writon-app-api-staging-00009-zjb`, image `discovery-continuity-staging-20260909`, build `a046ea19-bdf0-47cb-86d0-718fce2cf4d9`. The approved optional guest-merge path now links discovery identities atomically; deploy its budget migration first. On 2026-09-09, health/database and empty dry-run passed; live discovery refused with 409; scheduler PAUSED. Shared-device identities conservatively share caps; no account-history access is granted. Legacy digest is not on this budget yet.

Historical staging revision: `writon-app-api-staging-00008-r5g`, image tag `discovery-accounting-staging-20260909`, Cloud Build `416f9b12-f9b5-4fd9-b6d2-340b0b1d8c97`. Verified database-connected health, 200 empty discovery dry-run, 409 live-send refusal, and PAUSED scheduler. No FCM delivery was invoked.

Database verification (2026-09-09): `node server/src/scripts/verify-discovery-budget-staging.mjs` passed against the guarded staging database. Four concurrent claims produced one winner; wrong-owner draft claims, same-day repeats, and a third weekly claim were rejected; history older than seven days released the budget. Cleanup removed the generated draft, profile, and claims. This script sends no FCM messages.

Latest staging check (2026-09-09): revision `writon-app-api-staging-00007-7zc` includes guest discovery candidates, India quiet hours, and target revalidation. Health returned database connected; JSON dry-run returned 200 with zero candidates; live request returned 409; scheduler remains PAUSED. This verifies hosting and query execution, not physical delivery or populated-candidate behavior. Legacy digest/topic delivery remains outside the new shared budget.

## Runtime model

WritOn has decoupled notification paths:

1. **Interaction notifications**: Written to `notification_delivery_outbox` in the same database transaction as the in-app notification. An authenticated Cloud Scheduler job (`writon-notification-outbox-drain`, every minute `* * * * *`) invokes `POST /api/v1/internal/notifications/drain-outbox` with `x-admin-key`. Render background outbox polling has been cleanly retired to enforce strict zero-overlap consumer isolation.
2. **Followed-writer publication fanout**: Bounded Cloud Scheduler job (`writon-followed-writer-fanout`, every minute `* * * * *`) invokes `POST /api/v1/internal/notifications/fanout-publications` with `x-admin-key` to process `publication_notification_events` with deduplication and RLS.
3. **Daily editorial digest**: Invoked by authenticated Cloud Scheduler request (`writon-daily-digest`, daily `0 20 * * *`) calling `POST /api/v1/internal/notifications/daily-digest`. Bounded by durable `notification_dispatch_ledger` preventing duplicate delivery.
4. **Feed retention cleaner**: Daily Cloud Scheduler job (`writon-feed-retention`, daily `0 3 * * *`) calling `POST /api/v1/internal/maintenance/feed-retention`.
5. **Discovery candidate audit**: New additive endpoint `POST /api/v1/internal/notifications/discovery` uses the same `x-admin-key` protection. It defaults to `dryRun=true`; live delivery additionally requires `DISCOVERY_NOTIFICATIONS_ENABLED=true`. Provision `writon-discovery-notifications` paused and dry-run-only until its staging migration and candidate audit pass. Existing endpoints and scheduler jobs remain unchanged.

The provisioning script accepts `--staging` and then creates the separately named `writon-discovery-notifications-staging` job against the isolated staging Cloud Run URL. Both modes always force the resulting job into `PAUSED` state and verify that `dryRun=true` remains in its target URL.

Staging evidence (2026-09-09): migration verification passed on `xrfnebvkazewqramkpri`; Cloud Run revision `writon-app-api-staging-00006-8mp` serves the protected route with live delivery disabled. `writon-discovery-notifications-staging` completed a zero-candidate dry-run recorded in Cloud Logging and is `PAUSED`. Production was not deployed or invoked.

Android registers its FCM token through durable WorkManager work after authentication, token refresh, notification-permission decisions, and foreground resume. Registration stores the real runtime permission state. Logout revokes the server association before deleting the local Firebase token.

## Required production configuration

- `PUSH_DELIVERY_ENABLED=true` keeps the background drain available when the process is active. Interaction requests still make their bounded post-commit delivery attempt.
- `DAILY_DIGEST_ENABLED=false` disables the unreliable in-process digest timer on Cloud Run.
- `ADMIN_SECRET_KEY` must be generated as a high-entropy secret and supplied through Secret Manager.
- Firebase Cloud Messaging must be enabled for the project, and the Cloud Run service account needs only the permission required to create FCM messages.
- The Android release must contain the matching Firebase configuration and be distributed through Google Play to exercise production FCM behavior.

Never place the admin secret, a Firebase service account, an FCM token, or a user bearer token in source control, deployment logs, screenshots, or scheduler job descriptions.

## Cloud Scheduler contract

Current deployment state (2026-09-03): the `writon-daily-digest` job is provisioned in `asia-south1` with the schedule below and a protected header, but is intentionally **PAUSED**. Keep it paused until Android 2.0.37 (139) or later is distributed and guest/direct audience separation has been validated on a Play-installed physical device. Earlier clients can still hold both delivery memberships and could otherwise receive duplicate digests.

Create one HTTPS job in the same Google Cloud project:

- Method: `POST`
- URL: `https://api.writon.cc/api/v1/internal/notifications/daily-digest`
- Header: `x-admin-key: <ADMIN_SECRET_KEY>`
- Schedule: once daily at the selected editorial time
- Time zone: `Asia/Kolkata`
- Retry policy: limited exponential retry; avoid repeated sends over a long window

The endpoint returns `403` for a missing/incorrect secret. A successful no-content run returns a skipped result rather than sending an empty digest.

Before enabling the job, invoke it once manually through an authenticated operator environment and confirm the response and Cloud Logging entry. Do not use the legacy `/api/v1/spark/daily-digest/test` path for new automation; it exists only for temporary compatibility.

## Release acceptance test

### Verification status — 2026-09-07 (LOCKED)

Physical Android device notification delivery was formally verified in production at `2026-09-07T11:41:06+05:30` (06:11:06 UTC). System notifications for story applause and a legacy bookmark event on *"परीक्षा के दिन"* arrived on the device shade under the WritOn app notification channel. Production database outbox records (`fc41d64d`, `983fe938`, `30413add`) transitioned to `status: 'sent'` via Cloud Scheduler `writon-notification-outbox-drain` with zero duplicate messages and zero consumer overlap. The bookmark event is historical evidence only: current policy treats bookmarks as private and does not enqueue a bookmark-received push. Render outbox polling remains permanently retired.

### Phase 4–5 reliability completion — 2026-09-13

The current candidate requires a human actor and recipient both when a social notification is queued and immediately before delivery. The bot engine cannot enqueue external push, while its existing in-app history remains compatible. Delivery claims abandoned in `sending` and publication fanout claims abandoned in `processing` are reclaimable after five minutes; both stop after five attempts and enter a terminal `failed` state. Interaction delivery uses the logical notification ID as a stable FCM tag and local tray ID so acknowledgement retries replace, rather than duplicate, the visible item. The Phase 4–5 server suite passes 145 tests across 5 files, the complete backend suite passes 327/327 tests, and both Android JVM variants pass 212 tests. The connected Android 15 Redmi also passes the focused preference-card and branded notification-render tests with an empty crash buffer. The additive database migrations, disposable verification, and runtime safeguards now pass on isolated Cloud Run/Supabase staging; production remains unchanged and all staging delivery/automation switches remain disabled. The 2026-09-07 physical result must not be treated as validation of this newer candidate, so the two-account delivery matrix is still required.

### Verification status — 2026-09-05 (Historical)

The Redmi A5 (Android 15) is now authorized over ADB. Debug APK `2.0.42 (144)` was installed, WritOn's three channels were created, and `POST_NOTIFICATIONS` was granted locally for this debug installation. No FCM test push was sent yet because the installation is not signed in and therefore has no authenticated WritOn device registration. The Firebase YAML includes an operator-assisted targeted-notification journey, not an automated broadcast.

Audience separation and retry idempotency are separate gates. Current authenticated registration waits for successful guest-topic unsubscribe; settings logout attempts direct-token revocation before switching to guest. Existing policy unit tests prove only the desired membership decision, not FCM convergence, installed-version behavior, or failure recovery.

The daily digest currently sends immediately on every invocation, with no durable per-day/per-recipient dispatch ledger. Scheduler retries or a manual rerun can therefore resend an already accepted digest. Do not enable the paused scheduler merely because a single test message arrives. Implement durable dispatch records and partial-success retry handling before scheduling production broadcasts; do not rely on notification tray replacement as exactly-once delivery.

Physical matrix: foreground, background, process terminated normally (not Android force-stop), permission denied, channel muted, logout, and login while guest-topic unsubscribe fails. Each operator send must target the authorized tester only. Running the daily digest endpoint is not a safe single-device test because it also broadcasts to the guest topic.

Use two authorized tester accounts on physical Android devices where possible.

1. Install the Play-distributed build and sign in as the receiving account.
2. Open Notifications or its settings entry and accept the Android notification permission.
3. Background the receiving device for at least one minute.
4. From the second account, applaud a story owned by the receiver, add a comment, and follow the receiver.
5. Confirm each server mutation succeeds, the in-app notification appears once, and a system notification arrives with the correct channel and deep link.
6. Tap the notification and confirm it opens the intended story or Notifications screen.
7. Disable notifications in Android system settings, return to WritOn, and confirm the device registration changes to `denied` and no local notification is posted.
8. Re-enable notifications, return to WritOn, and confirm registration becomes `granted` without reinstalling.
9. Log out, then create another interaction. Confirm the logged-out installation receives no notification for the former account.
10. Sign back in and confirm WorkManager restores registration.
11. Run the daily digest endpoint once with a test-eligible receiver and confirm the editorial channel, content, and story deep link.

Firebase Console test messages are useful for validating the client/device path, but they do not validate WritOn's database outbox, recipient selection, preferences, or interaction trigger.

## Production health checks

Track these as separate stages of the funnel:

- Active profiles with at least one non-revoked token whose permission is `granted`.
- Outbox rows by `pending`, `sending`, `sent`, and `skipped` status.
- Age of the oldest pending outbox row.
- Invalid tokens revoked per day.
- Android telemetry: `push_permission`, `push_registration`, `push_received`, `push_displayed`, `push_display_suppressed`, and `push_opened`.
- Interaction API latency after enabling request-bound delivery.
- Daily scheduler success/failure and number of recipients sent/skipped.

Never interpret a created in-app notification as a delivered push. A healthy chain requires: eligible recipient, granted device token, outbox processing, FCM acceptance, Android display, and optionally an open.

## Rollback

- If request latency regresses, set `PUSH_DELIVERY_ENABLED=true` on a dedicated always-on worker and remove request-bound delivery only in a tested follow-up release; do not discard outbox rows.
- If digest content or targeting is wrong, pause the Cloud Scheduler job immediately. Keep `DAILY_DIGEST_ENABLED=false`.
- If the Android release reports registration regressions, stop its rollout and retain the previous Play artifact. Server-side in-app notifications remain available.
- Do not delete failed delivery evidence until the incident is understood and the documented retention period permits it.
R2 reading-evidence staging deployment (2026-09-13): Cloud Build `f06783cd-794d-41e2-904a-35f87234eb50` produced image digest `sha256:776b3db7eafcd0531eebcc456f1844ad3089431442de1f28985b202d8651580c` from a 4.3 KiB isolated overlay of prior staging digest `sha256:de399cf3ece5fef1e2579d1192fb3c6ccb06de73b3adc868c09240f1d7c1f77f`. Only `src/server.js` received the R2 reading-progress patch; no bot source entered the build context. Revision `writon-app-api-staging-r2read` passed zero-traffic health/database, public-feed, app-version, auth-guard, environment, and ERROR-log checks, then received 100% of staging traffic. All staging delivery and automation flags remain disabled; the prior revision is retained under tag `phase45-20260913`; production was not changed.
