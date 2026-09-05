# Engagement preferences staging gate

This gate validates the additive engagement-preferences migration without using WritOn's production database or API.
The bootstrap also creates local, non-login `anon` and `authenticated` roles so Supabase privilege statements are exercised under ordinary PostgreSQL.

## Local isolated database

1. Start Docker Desktop.
2. Run `docker compose -f docker-compose.staging.yml up -d` from the repository root.
3. From `server`, set only the command-scoped variable `STAGING_DATABASE_URL=postgresql://writon_staging:local_staging_only@127.0.0.1:55432/writon_staging`.
4. Run `npm run db:staging:engagement-preferences`.
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

## Hosted staging status (2026-09-06)

- Supabase project: `writon-staging` (`xrfnebvkazewqramkpri`, Singapore).
- Render service: `writon-api-staging` (`srv-dae6l58u01pc73dahp20`).
- Render source: `codex/staging-engagement-preferences` at commit
  `1d0b94218c6baf75b62a071d5b7f83f249422119`.
- Push delivery, daily digest, social auto-publishing, Spark automation,
  behavior rollout, and review prompts remain disabled.
- The service is suspended while the Supabase shared-pooler password-rotation
  cool-down completes. Repeated `28P01` responses followed several password
  rotations; Supabase documents that continued failed pooler traffic can extend
  the temporary lockout.
- A temporary staging-only `NODE_TLS_REJECT_UNAUTHORIZED=0` diagnostic setting
  distinguished the TLS-chain error from the credential failure. Replace it
  with scoped Supabase CA trust before using this environment beyond the smoke
  test.

### Hosted recovery gate

1. Keep Render suspended for at least two uninterrupted minutes.
2. Resume without rotating the database password again.
3. Require `GET /` to return HTTP 200 with a successful database probe.
4. Run the authenticated engagement-preferences staging verifier.
5. Replace the process-wide TLS diagnostic bypass with scoped Supabase CA trust
   and repeat steps 3 and 4.
6. Keep all production-affecting switches disabled until every gate passes.
