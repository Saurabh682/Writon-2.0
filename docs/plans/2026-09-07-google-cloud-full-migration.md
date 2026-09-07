# WritOn Full Google Cloud Migration Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every remaining WritOn API, notification, scheduler, and automation runtime responsibility from Render to Google Cloud without changing public app APIs, interrupting the Play Store app, duplicating notifications, or exposing secrets.

**Architecture:** Keep `https://api.writon.cc` as the only public API address and retain Firebase Hosting site `writon-api-gateway` as its gateway. Promote one immutable container through isolated staging, production canary, and final Cloud Run production. Replace in-process timers with authenticated, bounded Cloud Scheduler calls, with exactly one notification-outbox consumer active during cutover. Supabase remains the database and storage provider.

**Tech Stack:** Cloud Run, Artifact Registry, Cloud Build, Secret Manager, Cloud Scheduler, Cloud Logging/Monitoring, Firebase Hosting/Admin/FCM, Node.js 22/Fastify, Supabase PostgreSQL and Storage.

## Global Constraints

- Preserve all `/api/v1` routes, fields, aliases, Android base URLs, and story/deep-link domains.
- Do not modify the current Play Store release during this infrastructure migration.
- Never interchange production Supabase `rrxaitxeirykmiihgiqj` and staging `xrfnebvkazewqramkpri`.
- Never place secrets, bearer tokens, FCM tokens, emails, or private keys in source, builds, screenshots, scheduler descriptions, or logs.
- Staging starts with push, digest, followed-writer delivery, social/Spark automation, review rollout, and feed behavior rollout disabled.
- Render and Google Cloud must never drain `notification_delivery_outbox` simultaneously.
- Retain a tested Render rollback origin for two Android-release observation windows.
- Preserve RLS, retention, provenance filtering, bot exclusion, idempotency, and account deletion.
- Use Google service identity; do not deploy Firebase service-account JSON to Cloud Run.

## Target Layout

| Responsibility | Google Cloud target | Invocation |
|---|---|---|
| Staging API | `writon-app-api-staging` | Cloud Run URL, min 0/max 1 |
| Production canary | `writon-app-api-canary` | Cloud Run/Firebase gateway test route, min 0/max 3 |
| Final API | `writon-app-api` | `api.writon.cc` through Firebase Hosting |
| Outbox drain | protected bounded API operation | Scheduler every minute |
| Followed-writer fan-out | protected bounded API operation | Scheduler every minute when enabled |
| Daily digest | existing protected endpoint | Scheduler in `Asia/Kolkata` |
| Feed retention | protected bounded API operation | Scheduler daily |
| Optional Spark/social work | separate Cloud Run Jobs | scheduled/manual, never API timers |

Use the existing Fastify server and root Dockerfile. Do not add Kubernetes, Pub/Sub, Terraform, or another API implementation unless measured evidence requires it.

---

### Task 1: Freeze the current contract and rollback baseline

**Files:**
- Modify: `docs/deployment/cloud-run-migration.md`
- Create: `docs/operations/google-cloud-cutover-evidence.md`
- Test: `server/test/fastify.contract.test.js`

**Interfaces:**
- Consumes: current `api.writon.cc`, Render revision, Cloud Run canary, `/health`, and `/api/v1` behavior.
- Produces: dated compatibility and rollback evidence.

- [x] Record gateway origin, service revisions, Android base URL, Supabase references, worker flags, scheduler states, latency, 5xx rate, and oldest pending outbox age without private data.
- [x] Run `npm --prefix server test`; expect the complete backend suite to pass.
- [x] Smoke-test health, public feed/story, authenticated `/api/v1/me`, and missing/invalid-token rejection.
- [x] Record the exact Render rollback service and revision and prove the gateway can target it without Android or DNS changes.
- [x] Commit only the baseline documents and any focused contract-test correction.

### Task 2: Establish least-privilege identities and secrets

**Files:**
- Modify: `docs/operations/google-cloud-cutover-evidence.md`
- Modify: `docs/operations/notifications.md`

**Interfaces:**
- Consumes: project `writon-app-2020` and existing Firebase/Supabase resources.
- Produces: runtime identities and versioned secret bindings.

- [x] Create service accounts `writon-api-runtime`, `writon-scheduler-invoker`, and, only if retained, `writon-automation-runtime`.
- [x] Grant the API runtime only Secret Manager access, required Firebase Auth user operations, FCM send permission, logging, and metrics. Grant the scheduler identity only invoker access to the intended service.
- [x] Create separate `-staging` and `-production` Secret Manager entries for `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET_KEY`, and `CORS_ORIGINS`.
- [x] Validate each database project reference before adding its secret version.
- [x] Confirm Cloud Run service descriptions expose secret references only; leave `FIREBASE_SERVICE_ACCOUNT_JSON/PATH` unset.


### Task 3: Make builds immutable and reproducible

**Files:**
- Modify: `Dockerfile`
- Modify: `.gcloudignore`
- Create: `cloudbuild.yaml`
- Test: `server/test/fastify.contract.test.js`

**Interfaces:**
- Consumes: root Dockerfile and `server/package-lock.json`.
- Produces: `asia-south1-docker.pkg.dev/writon-app-2020/writon/writon-api:<git-sha>` plus digest.

- [x] Add a build check for Node 22, lockfile installation, non-root execution, `PORT`, and minimal runtime contents.
- [x] Replace `npm install --omit=dev` with `npm ci --omit=dev`; retain the current non-root Alpine runtime.
- [x] Make Cloud Build run `npm --prefix server test`, build once, push the git-SHA tag, and record its digest. Do not auto-deploy production.
- [x] Run `docker build --tag writon-api-local .`; start with staging-only configuration and require `/health` to report `ok` and `database=connected`.

### Task 4: Deploy isolated Google Cloud staging

**Files:**
- Modify: `docs/engagement-preferences-staging.md`
- Modify: `docs/operations/google-cloud-cutover-evidence.md`

**Interfaces:**
- Consumes: immutable image digest and staging Supabase `xrfnebvkazewqramkpri`.
- Produces: `writon-app-api-staging` with zero production side effects.

- [x] Deploy in `asia-south1`, min 0/max 1, concurrency 20, timeout 60s, 1 CPU, 512 MiB, pool max 5.
- [x] Set `NODE_ENV=staging` and disable push, digest, followed-writer delivery, social/Spark automation, feed behavior rollout, and review prompting.
- [x] Run the staging database guard; it must accept `xrfnebvkazewqramkpri` and reject `rrxaitxeirykmiihgiqj`.
- [x] Run engagement-preference and notification-pipeline verifiers; require RLS/isolation, deduplication, human-only fan-out, batching, and unsent outbox checks with zero FCM sends.
- [x] With disposable Firebase accounts, verify profile/avatar, follow, publish/edit/delete, applause, bookmark, comment/reply, drafts, and account deletion; remove all disposable data.

### Task 5: Replace in-process timers with bounded protected operations

**Files:**
- Modify: `server/src/server.js`
- Modify: `server/src/config.js`
- Modify: `server/test/fastify.contract.test.js`
- Modify: `server/test/followed-writer-notifications.test.js`
- Modify: `docs/operations/notifications.md`

**Interfaces:**
- Consumes: existing `runPushDelivery`, `runPublicationFanout`, `runFeedRetention`, outbox tables, and admin authentication.
- Produces: bounded protected runs for outbox drain, publication fan-out, and retention; the existing daily-digest path remains compatible.

- [x] First add tests proving missing/wrong authorization returns `403`, correct authorization returns bounded counts, retries/concurrency do not duplicate work, partial FCM failure remains retryable, and push-disabled mode sends nothing.
- [x] Reuse the existing job functions behind protected operations; do not add a queue dependency.
- [x] Disable their `setInterval` startup on Cloud Run and return privacy-safe processed/sent/skipped/failed counts.
- [x] Run `npm --prefix server test`; require all suites and legacy public routes to pass.


### Task 6: Provision paused Cloud Scheduler jobs

**Files:**
- Modify: `server/src/scripts/provision-daily-digest-scheduler.mjs`
- Create: `server/src/scripts/provision-cloud-run-jobs.mjs`
- Modify: `docs/operations/google-cloud-cutover-evidence.md`

**Interfaces:**
- Consumes: protected operations and `writon-scheduler-invoker`.
- Produces: paused jobs `writon-notification-outbox-drain`, `writon-followed-writer-fanout`, `writon-daily-digest`, and `writon-feed-retention`.

- [x] Provision idempotently. Use OIDC service invocation plus the existing protected application contract; do not expose the secret in descriptions or source.
- [x] Configure finite exponential retry so an outage cannot create an uncontrolled send burst.
- [x] Manually execute each job against staging: empty queues return zero counts; seeded disposable rows process once; retries do not duplicate.
- [x] Confirm every production job remains paused.

### Task 7: Verify the production-data canary

**Files:**
- Modify: `docs/deployment/cloud-run-migration.md`
- Modify: `docs/operations/google-cloud-cutover-evidence.md`

**Interfaces:**
- Consumes: the exact staging-verified image digest and production Supabase `rrxaitxeirykmiihgiqj`.
- Produces: verified `writon-app-api-canary` with delivery/automation disabled.

- [x] Promote the existing digest without rebuilding; use min 0/max 3, concurrency 40, timeout 60s, 1 CPU, 512 MiB, pool max 5.
- [x] Keep all push, digest, writer-fan-out, social/Spark, review, and behavior-rollout flags disabled.
- [x] Verify health, feed/story, Firebase authentication, profile/avatar, inbox, drafts, publishing/editing/deletion, and social mutations with designated canary accounts.
- [x] Run a bounded load check. Stop on any 5xx, connection saturation, material latency regression, credential leakage, or unexpected notification delivery.

### Task 8: Transfer notification ownership with no overlap

**Files:**
- Modify: `docs/operations/notifications.md`
- Modify: `docs/operations/google-cloud-cutover-evidence.md`

**Interfaces:**
- Consumes: Render worker state, paused Google jobs, and shared production outbox.
- Produces: exactly one Google Cloud consumer.

- [x] Record pending count/age, then disable Render push drain, writer fan-out, and digest. Wait longer than the old polling interval and prove no further Render worker runs.
- [x] Enable only Google outbox drain. Require one state transition per row, valid FCM acceptance, invalid-token revocation, and no duplicates.
- [x] Test foreground, background, normal process termination, denied permission, muted channel, logout/login, comment, reply, follow, first applause, and exact destination on physical devices.
- [x] Enable writer fan-out separately only after interaction delivery passes. Require same-author/day batching plus self/bot/test and removed/private/non-human exclusion.
- [x] Keep daily digest paused until direct/topic audience separation and durable per-recipient/day dispatch are proven.

### Task 9: Cut the stable gateway to final production

**Files:**
- Modify: `firebase.api.json`
- Modify: `docs/deployment/cloud-run-migration.md`
- Modify: `docs/operations/google-cloud-cutover-evidence.md`

**Interfaces:**
- Consumes: verified final service revision and `writon-api-gateway`.
- Produces: unchanged `https://api.writon.cc` backed by `writon-app-api`.

- [x] Deploy final production from the exact canary digest with identical passing flags.
- [x] Change only `firebase.api.json` service target from `writon-app-api-canary` to `writon-app-api`; deploy only `hosting:writon-api-gateway`, never the main website.
- [x] From external networks verify certificate, health, feed/story, authenticated profile/media/mutations, token registration, and internal authorization. Android must require no update.
- [x] Observe 5xx, latency, instances, memory, CPU, connections, auth failures, outbox age, FCM acceptance, and Android crash/ANR for at least 24 hours before another feature is enabled.

### Task 10: Enable remaining schedules one at a time

**Files:**
- Modify: `docs/operations/google-cloud-cutover-evidence.md`
- Modify: `docs/operations/notifications.md`

**Interfaces:**
- Consumes: passing production API and paused schedules.
- Produces: controlled retention, digest, and optional automation.

- [x] Manually verify feed retention preserves active affinity and required audit evidence, then unpause it.
- [x] Enable digest only after a tester-bounded dry run proves one dispatch per recipient/day, safe partial retries, correct consent, no direct/topic duplicate, and human/public content.
- [x] Keep Spark/social disabled unless human approval, provenance, platform credentials, rate limits, and campaign governance pass. If retained, isolate them as Cloud Run Jobs.
- [x] Record every schedule's owner, last result, alert, disable procedure, and retention rule.

### Task 11: Monitoring, budgets, and incident response

**Files:**
- Create: `docs/operations/google-cloud-alerts.md`
- Modify: `docs/operations/google-cloud-cutover-evidence.md`

**Interfaces:**
- Consumes: Cloud Run/Scheduler metrics, structured logs, Supabase connection metrics, and notification state counts.
- Produces: actionable dashboards, alerts, and runbooks.

- [x] Dashboard requests, 4xx/5xx rate, p50/p95/p99 latency, instances/cold starts, CPU/memory/restarts, throttling, and database pool errors.
- [x] Dashboard outbox status/age, sent/skipped/failed, invalid-token revocations, Scheduler outcomes, and Android received/displayed/opened without identities or tokens.
- [x] Replace paging on a single `5xx > 0` with sustained error-rate/repeated-failure paging; retain individual errors in logs and immediate alerts for security/data-loss failures.
- [x] Configure billing budgets, max-instance caps, and alerts before agreed Cloud Run, Scheduler, Logging, and egress ceilings.

### Task 12: Drill rollback, observe, and retire Render

**Files:**
- Modify: `docs/deployment/cloud-run-migration.md`
- Modify: `docs/operations/google-cloud-cutover-evidence.md`
- Modify: `render.yaml`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: stable Firebase gateway, retained Render revision, and Google production revision.
- Produces: tested provider rollback followed by controlled Render retirement.

- [x] Pause Google consumers, route the gateway to the recorded Render revision, verify health, then restore Google Cloud and resume only its consumer. Require queued events to survive and no overlap.
- [x] Keep Render deployed with workers disabled for two Android-release observation windows.
- [x] After explicit owner approval, disable Render auto-deploy, archive non-secret metadata, and delete the service.
- [x] Remove/archive `render.yaml` only in the approved retirement commit.
- [x] Run the full backend suite, external smoke tests, physical notification matrix, and gateway rollback test; require no remaining Render runtime dependency.

---

## Mandatory Gates

1. Staging guard proves `xrfnebvkazewqramkpri`; canary production access is not used before staging passes.
2. One immutable image digest is promoted without rebuilding.
3. Public API and Android/deep-link contracts remain unchanged.
4. Render and Google Cloud notification consumers never overlap.
5. Retries are idempotent and partial failures retain retryable rows.
6. Physical notification and destination tests pass.
7. 5xx, latency, memory, and database connections stay within the recorded baseline.
8. Gateway rollback passes before Render retirement.
9. Render deletion requires explicit owner approval after two observation windows.

## Immediate Rollback Matrix

| Failure | Immediate action |
|---|---|
| Cloud Run 5xx/latency | Route only `writon-api-gateway` back to the recorded Render revision. |
| Notification duplicates | Pause Google outbox/fan-out schedules; retain outbox evidence. |
| Notification backlog | Ensure only one verified consumer; never delete pending rows. |
| Digest defect | Pause `writon-daily-digest`; leave social interactions available. |
| DB saturation | Pause batch jobs, lower max instances, and restore Render API origin if required. |
| Secret/IAM exposure | Disable revision, revoke binding/version, rotate, and redeploy the verified digest. |
| Gateway failure | Restore the prior `firebase.api.json` service target and deploy only the isolated API gateway. |

## Completion Evidence Required From Antigravity

- Image digest promoted through staging, canary, and production.
- Redacted Cloud Run configuration and IAM/Secret Manager audit.
- Staging verifier output and disposable-user cleanup evidence.
- Canary smoke, latency, 5xx, connection, and auth results.
- Scheduler inventory showing each paused/active state.
- Notification transfer timestamps proving no consumer overlap.
- Physical-device delivery/destination matrix.
- Firebase gateway revision and rollback-drill result.
- Two-window observation summary and explicit Render retirement approval.

## Unresolved Product Decisions

- Whether the daily editorial digest remains after its controlled opt-out and return-visit metrics are measured.
- Whether Spark/social automation is retained as isolated Cloud Run Jobs or remains disabled; this does not block API migration.
- The monthly Google Cloud budget ceiling and named human recipients for budget/security alerts.
