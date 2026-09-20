# Engagement preferences staging gate

This gate validates the additive engagement-preferences migration without using WritOn's production database or API.
The bootstrap also creates local, non-login `anon` and `authenticated` roles so Supabase privilege statements are exercised under ordinary PostgreSQL.

## Local isolated database

1. Start Docker Desktop.
2. Run `docker compose -f docker-compose.staging.yml up -d` from the repository root.
3. From `server`, set only the command-scoped variable `STAGING_DATABASE_URL=postgresql://writon_staging:local_staging_only@127.0.0.1:55432/writon_staging`.
4. Run `npm run db:staging:engagement-preferences`. This applies both the
   profile-interest storage used by onboarding and the engagement-preference
   snapshot, then verifies RLS and the required index.
5. Run `npm run verify:staging:engagement-preferences` to exercise the real route and database.
6. Run the server contract suite with `npm test`.

The migration command never falls back to `DATABASE_URL`. It rejects an identical production URL and rejects remote hosts unless `ALLOW_REMOTE_STAGING=true` is explicitly supplied.

## Remote staging

Use a separate Supabase project and separate Render service. Set `NODE_ENV=staging`, disable push delivery, daily digests, social publishing, and automation, and provide the staging database through `STAGING_DATABASE_URL`. Do not point a staging Android build at `api.writon.cc`.

For the narrow remote API smoke test, apply `server/staging/bootstrap/001_profiles.sql`, `server/staging/bootstrap/002_api_smoke_dependencies.sql`, and then the engagement-preferences migration. These staging-only dependencies contain no production data and are not a substitute for restoring and validating the complete production schema before broader app testing.

Required safe defaults:

- `PUSH_DELIVERY_ENABLED=false`
- `DAILY_DIGEST_ENABLED=false`
- `SOCIAL_AUTO_PUBLISH_ENABLED=false`
- `SPARK_AUTOMATION_ENABLED=false`
- `FEED_BEHAVIOR_ROLLOUT_PERCENT=0`
- `REVIEW_PROMPT_ENABLED=false`

After migration verification, deploy the server to the staging service, check `/health`, then exercise authenticated GET and PUT requests using staging-only Firebase users. Only after those checks pass should an Android debug build be compiled with `-PWRITON_DEBUG_API_BASE_URL=https://<staging-host>/` and installed on a tester device.

Production promotion remains a separate, explicit decision.

For the additive published-story and owned-comment editing contract, run
`npm run db:staging:owned-content-edits` from `server` with the same guarded
`STAGING_DATABASE_URL` and `ALLOW_REMOTE_STAGING=true`. The runner refuses any
connection string that does not contain the dedicated staging project ref
`xrfnebvkazewqramkpri`, then verifies both timestamp columns after applying the
idempotent migration. It never falls back to `DATABASE_URL`.

For the milestone journey dependency, run `npm run db:staging:milestones` with
the same guarded environment. It applies only the additive `user_milestones`
table and verifies its four columns, RLS, and profile lookup index. This runner
is also hard-locked to the dedicated staging project and never reads
`DATABASE_URL`.

### Local notification-pipeline gate

With the isolated container healthy, run `npm run db:staging:notification-pipeline` and then `npm run verify:staging:notification-pipeline` with the same command-scoped `STAGING_DATABASE_URL`. The first command applies the staging-only dependency schema, notification delivery tables, logical-event deduplication, and followed-writer publication event pipeline. It requires the event table, delivery outbox, partial unique index, publication trigger, and RLS before succeeding. The second command uses disposable staging records to verify atomic event capture, repeat-state deduplication, human-only fan-out, same-author/local-day batching, and an unsent outbox row, then removes those records. The worker feature flag remains disabled and neither command sends FCM messages.

## Hosted staging status (2026-09-06 - PASSED)

The hosted staging recovery gate has successfully passed on Render and Supabase with full audit verification.

- **Supabase Staging Project**: `writon-staging` (`xrfnebvkazewqramkpri`, Singapore).
  - Clean password reset performed in dashboard; tested and verified via SQL editor and external client.
  - Session pooler endpoint: `aws-0-ap-southeast-1.pooler.supabase.com:5432`, database `postgres`, user `postgres.xrfnebvkazewqramkpri`.
  - Staging catalog verified: `profiles`, `profile_auth_identities`, `profile_engagement_preferences`, `posts`, `legacy_import_profile_attributes`, `bot_configs`.
  - Column count (8/8) and RLS enablement verified for `profile_engagement_preferences`.
- **Render Staging Service**: `writon-api-staging` (`srv-dae6l58u01pc73dahp20`).
  - Deploy revision: `dep-daefne6q1p3s7395b3rg` (Live).
  - Environment `DATABASE_URL` updated to IPv4 session pooler (`port 5432`).
  - TLS configured with scoped Supabase CA certificate via `NODE_EXTRA_CA_CERTS=/etc/secrets/prod-ca-2021.crt`.
  - Safety flags enforced: `NODE_ENV=staging`, `PUSH_DELIVERY_ENABLED=false`, `DAILY_DIGEST_ENABLED=false`, `SOCIAL_AUTO_PUBLISH_ENABLED=false`, `SPARK_AUTOMATION_ENABLED=false`, `FEED_BEHAVIOR_ROLLOUT_PERCENT=0`, `REVIEW_PROMPT_ENABLED=false`.
- **Hosted Verification Evidence (2026-09-06 11:09 IST)**:
  - `GET /health` -> `HTTP 200` (`status="ok"`, `database="connected"`, `databaseTime="2026-09-06T05:39:11.977Z"`).
  - Unauthenticated `GET /api/v1/me/engagement-preferences` -> `HTTP 401 Unauthorized` (`error="Authentication required"`).
  - Invalid token `GET /api/v1/me/engagement-preferences` -> `HTTP 401 Unauthorized` (`error="Invalid or expired Firebase token"`).
  - Authenticated `GET /api/v1/me/engagement-preferences` (User A) -> `HTTP 200` default preferences (`preferenceCardState="unseen"`, `onboardingVersion=0`).
  - Invalid `PUT /api/v1/me/engagement-preferences` -> `HTTP 400 Bad Request` schema rejection.
  - Valid `PUT /api/v1/me/engagement-preferences` -> `HTTP 200` (`primaryIntent="both"`, `onboardingVersion=2`, `preferenceCardState="completed"`).
  - Persisted `GET /api/v1/me/engagement-preferences` -> `HTTP 200` round-trip verified matching updated snapshot.
  - Account Isolation: Disposable User B authenticated `GET` -> `HTTP 200` clean default preferences, confirming zero leakage across accounts.
  - Cleanup: Test accounts deleted from Firebase Auth and cascaded from staging database (`remaining preference records = 0`).

## Google Cloud Run Staging Status (2026-09-07 - PASSED)

- **Service**: `writon-app-api-staging` on Cloud Run (`asia-south1`)
- **Service URL**: `https://writon-app-api-staging-802112841589.asia-south1.run.app`
- **Image Digest**: `asia-south1-docker.pkg.dev/writon-app-2020/writon/writon-api@sha256:ff4ed7d4e0c3d6e1f5d482bb1699773396db2e83711c7c7d5894fa5fb2e33d8c`
- **Database**: Strictly isolated staging Supabase (`xrfnebvkazewqramkpri`) mounted via Secret Manager.
- **Enforced Safety Configuration**:
  - `min-instances=0`, `max-instances=1`, `concurrency=20`, `timeout=60s`, `cpu=1`, `memory=512Mi`
  - `NODE_ENV=staging`, `PUSH_DELIVERY_ENABLED=false`, `DAILY_DIGEST_ENABLED=false`, `FOLLOWED_WRITER_NOTIFICATIONS_ENABLED=false`, `SOCIAL_AUTO_PUBLISH_ENABLED=false`, `SPARK_AUTOMATION_ENABLED=false`, `FEED_BEHAVIOR_ROLLOUT_PERCENT=0`, `REVIEW_PROMPT_ENABLED=false`, `TIMERS_DISABLED=true`
- **Verification Matrix (2026-09-07 11:01 IST)**:
  - Database Guard: PASSED (accepts `xrfnebvkazewqramkpri`, rejects `rrxaitxeirykmiihgiqj`).
  - Notification Pipeline Staging: PASSED (atomic events, human-only fan-out, batching, unsent outbox, zero FCM sends).
  - Engagement Preferences Staging: PASSED (defaults, persistence, validation, deletion cascade).
  - E2E Lifecycle Smoke: PASSED 100% (disposable Firebase accounts, profile, drafts, publication, story edit, public discovery, follow, applause, bookmark, comments, replies, deletion cascade, and Firebase Auth account purge).
