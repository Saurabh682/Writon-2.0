# Antigravity handover: isolated staging recovery

> **Archived 2026-09-26:** This handover records the completed 2026-09-06 recovery and its former hosting setup. Do not use its Render service or URL; current deployment guidance is in [Google Cloud production API](deployment/cloud-run-migration.md).

Prepared 2026-09-06. Objective: finish the hosted engagement-preferences staging gate without affecting the current Play Store app or production backend. This handover supersedes earlier claims that Supabase support is definitely required.

## Scope and locations

- Workspace: `D:/VibeCode/WritOn-PowerUp`.
- Branch: `codex/staging-engagement-preferences`.
- Local HEAD at handover: `9b6a833464fa564cf42b9333509645d84255369b` (documentation); implementation commit: `1d0b94218c6baf75b62a071d5b7f83f249422119`.
- Supabase staging project: `writon-staging`, ref `xrfnebvkazewqramkpri` (Singapore). Its dashboard branch label says PRODUCTION, but this is the separate staging project.
- Database settings: https://supabase.com/dashboard/project/xrfnebvkazewqramkpri/database/settings
- Render service: `writon-api-staging`, ID `srv-dae6l58u01pc73dahp20`.
- Render settings: https://dashboard.render.com/web/srv-dae6l58u01pc73dahp20/env
- Staging URL: https://writon-api-staging.onrender.com
- Supabase session pooler: `aws-0-ap-southeast-1.pooler.supabase.com:5432`, database `postgres`, username `postgres.xrfnebvkazewqramkpri`. Copy fresh settings from Connect rather than assuming these never change.

Do not change production APIs, DNS, production database, published update metadata, or release branches. API contract changes require discussion with Kumar. The workspace contains extensive unrelated modified/untracked Android and web work: preserve it; do not reset, clean, bulk-stage, or merge the workspace. No Android artifact or version increment is needed for this recovery.

## Evidence and uncertainty

1. Earlier Render logs showed `SELF_SIGNED_CERT_IN_CHAIN`. A temporary `NODE_TLS_REJECT_UNAUTHORIZED=0` diagnostic setting was subsequently removed from the observed environment list.
2. The public Supabase CA was downloaded to `server/staging/prod-ca-2021.crt` and uploaded to Render as secret file `prod-ca-2021.crt`. Observed environment key: `NODE_EXTRA_CA_CERTS=/etc/secrets/prod-ca-2021.crt`. Recheck its saved value and runtime availability.
3. Pooler requests repeatedly returned HTTP 500 / PostgreSQL `28P01`, password authentication failed for postgres. Direct IPv6 connection returned `ENETUNREACH` from Render. A dedicated-role attempt returned `(EAUTHQUERY) user not found in the database`.
4. SQL Editor explicitly reported that `writon_staging_api` did not exist. Later creation attempts were unreliable; existence and grants remain unverified. Do not assume that role was created successfully.
5. Multiple dashboard resets, SQL password changes, session/transaction pooler switches, and Render redeploys were attempted. Browser inputs sometimes failed, were read-only, were truncated in Monaco, or did not persist. A disappearing dialog, zero error matches, or a successful tool call was incorrectly treated as proof of successful execution. These are NOT reliable confirmations.
6. SQL Editor eventually displayed `28P01` too. This could involve managed credential synchronization, failed edits, stale results, or a transient pooler state. The previous assertion of a confirmed Supabase platform defect was too strong. Do not escalate to support before verifying a fresh SQL result and one consistent credential end to end.
7. Render reported Live even while database requests failed. A suspension dialog was opened and canceled at the end; do not assume the service is suspended. Recheck live status.
8. No known-good current password is provided here. Earlier tool diagnostics exposed temporary staging credentials; treat those as compromised and never reuse them. After recovery, rotate any surviving exposed credentials and remove password-bearing saved SQL snippets. Do not paste passwords or full connection strings into logs, this handover, or chat.

## Code findings verified for this handover

Fresh handover probe: `/health` timed out after 20 seconds with no response (HTTP status unavailable). This does not reconfirm `28P01` or establish an outage; Render free-instance cold starts can exceed this interval. The authentication errors above are prior-session evidence. No cloud settings were changed while preparing this handover.

- `server/src/routes/app-meta.js`: `/health` executes `select now() as database_time`; this is the correct first database health probe.
- `server/src/server.js`: JSON `GET /` only returns metadata and does not test the database. HTML `GET /` queries story columns absent from the minimal staging bootstrap (including slug, summary, category and publication fields). A later undefined-column error on HTML root must not be mistaken for continued credential failure.
- `server/src/config.js`: running server consumes `DATABASE_URL`. The isolated migration/verifier scripts consume `STAGING_DATABASE_URL`, deliberately refusing silent fallback to production.
- `server/src/server.js`: runtime pool still specifies `ssl: { rejectUnauthorized: false }`. Connection-string SSL parameters can affect the effective pg configuration. CA installation alone does not prove certificate validation. Inspect effective behavior without logging credentials; use verified CA and hostname validation, and test rejection of untrusted certificates before calling TLS secure. Do not deploy a production-wide TLS change as part of staging recovery.
- `server/src/scripts/verify-engagement-preferences-api-staging.mjs`: uses a real database but an in-process Fastify instance with injected test identity. Passing it does NOT prove hosted Firebase authentication or Render routing.
- Narrow bootstrap files: `server/staging/bootstrap/001_profiles.sql`, `002_api_smoke_dependencies.sql`; migration: `server/migrations/20260905_profile_engagement_preferences.sql`. Remote application of all files was previously reported but requires catalog verification because of the SQL editor input failures.
- Earlier session reported 142/142 server tests and local isolated migration/API smoke passing. These were not rerun for this documentation handover and do not establish hosted readiness.

## Recovery sequence

1. Inspect the exact project, service, deployed branch and revision. Verify all safety flags below. Pause staging clients if necessary to obtain a quiet diagnostic window; do not rotate credentials repeatedly during retries.
2. Run a fresh `SELECT 1 AS staging_probe, current_database(), current_user;` in the staging SQL Editor. Verify the complete query text and the returned row, with a fresh execution timestamp. Monaco's hidden textarea is not proof of the editor model content. Prefer a reliable authorized CLI/connector over brittle UI typing when available.
3. If that fresh query fails authentication, use the supported Supabase dashboard password-reset mechanism once. Record explicit success and verify a fresh SQL probe afterward. Avoid direct `ALTER ROLE postgres PASSWORD` as a managed-service repair shortcut. If a correctly confirmed reset still leaves SQL Editor broken, collect timestamped, redacted results for Supabase support; do not delete/recreate the project automatically.
4. When SQL works, query `pg_roles` for the dedicated role and verify `rolcanlogin`. If using a dedicated backend role, grant only needed schema/table/sequence access; account for RLS on engagement preferences. Do not describe a role with blanket BYPASSRLS as least privilege. Keep migrations under a suitable migration identity.
5. Validate the same credential using a trusted-CA PostgreSQL client against the dashboard-provided IPv4 session pooler before updating Render. Keep secrets in protected input/environment and redact outputs. Never weaken global TLS or introduce persistent temporary dashboard tokens.
6. In Render, edit the environment section explicitly, find the row by key (not numeric textarea index), save, and verify persistence through nonsecret host/user/port metadata plus an in-memory equality check. Percent-encode the password exactly once. Confirm `NODE_EXTRA_CA_CERTS` and remove any TLS bypass. Then deploy exactly once and wait for that revision to become live.
7. Require HTTP 200 from `/health` with `database=connected`. Inspect recent logs from the new instance, not old log history. If HTTP 500 changes to a schema error, proceed to schema validation rather than another password reset.
8. Verify the staging bootstrap and migration in PostgreSQL catalogs. Run the guarded migration and local-injection verifier against ONLY the staging database (explicit remote opt-in). Check their destructive test cleanup target before executing; they use a dedicated test profile.
9. Test actual hosted authentication: missing/invalid credentials rejected; valid authorized test identity can GET, PUT, and GET `/api/v1/me/engagement-preferences`; verify persistence, validation, account isolation and deletion using disposable staging records. Do not confuse the injected-identity verifier with this test.
10. Resolve missing-schema/background-job errors needed for the narrow staging scope. The minimal bootstrap is not a complete app backend. Validate the complete schema before broad Android tests. Only then build a debug app pointed at staging for device tests; production promotion remains separate.

Required flags: `NODE_ENV=staging`, `PUSH_DELIVERY_ENABLED=false`, `DAILY_DIGEST_ENABLED=false`, `SOCIAL_AUTO_PUBLISH_ENABLED=false`, `SPARK_AUTOMATION_ENABLED=false`, `FEED_BEHAVIOR_ROLLOUT_PERCENT=0`, `REVIEW_PROMPT_ENABLED=false`. Earlier pool size was 5 and port 10000. Verify other startup jobs independently; these flags do not necessarily disable feed-retention cleanup.

## Completion evidence

- Explicit successful fresh SQL probe and `/health` response.
- Deployed revision, redacted connection metadata, and certificate-validation evidence.
- Staging migration/catalog checks and hosted authenticated preference round trip.
- Safety flags and confirmation no production changes were made.
- Updated `docs/engagement-preferences-staging.md` and `CHANGELOG.md`; graphify update after code changes. Preserve unrelated changes and avoid auto-merging into production.

Official references: https://supabase.com/docs/guides/database/connecting-to-postgres and https://supabase.com/docs/guides/database/postgres/roles .
