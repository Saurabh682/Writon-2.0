# Cloud Run migration and stable API endpoint

## Goal

Expose the WritOn application API through `https://api.writon.cc` so Android clients do not depend on a hosting provider hostname. Render remains the production origin until the Cloud Run canary passes functional and operational checks.

The gateway uses the dedicated Firebase Hosting site `writon-api-gateway`. This supports rewrites to Mumbai Cloud Run, whereas Cloud Run's preview domain-mapping feature does not support `asia-south1` and is not recommended for production.

## Target layout

```text
Android / web -> api.writon.cc -> selected origin
                                  |-- Render (current / rollback)
                                  `-- Cloud Run writon-app-api-canary (candidate)

Both origins -> Supabase Postgres and Storage
Cloud Run     -> Firebase Admin through its Google service identity
Render        -> notification outbox worker during the canary
```

## Required Cloud Run configuration

- Project: `writon-app-2020`
- Region: `asia-south1`
- Service: `writon-app-api-canary`
- Container port: `3001` (Cloud Run supplies `PORT` at runtime)
- Authentication: public invocation; application endpoints enforce Firebase ID tokens
- Minimum instances: `0`
- Maximum instances: `3` during the canary
- Concurrency: `40`
- Timeout: `60s`
- CPU: `1`
- Memory: `512Mi`
- `SPARK_AUTOMATION_ENABLED=false`
- `PUSH_DELIVERY_ENABLED=false`
- `DATABASE_POOL_MAX=5` to cap Supabase connections while instances autoscale
- `PUBLIC_API_BASE_URL=https://api.writon.cc` only after the domain is routed and verified

Secrets must be supplied through Secret Manager, not committed or passed in deploy logs:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGINS` when web origins are restricted

No Firebase private-key JSON is required on Cloud Run. Grant the Cloud Run service account the minimum Firebase permissions needed for token verification, user deletion, and FCM delivery. During the canary FCM delivery stays on Render.

## Stable-domain rules

1. The Android release base URL is `https://api.writon.cc/`.
2. Public routes remain under `/api/v1`; breaking changes require a new API version.
3. Hosting URLs such as `*.onrender.com` and `*.run.app` are diagnostic origins only.
4. Do not enable provider-specific certificate pinning in the Android client.
5. Keep DNS TTL low during cutover and retain a tested rollback origin.
6. Story URLs and Digital Asset Links remain on `writon.cc`; API routing must not replace the public editorial domain.

## Canary verification

- `/health` returns success and reports the expected app version.
- Public feed and individual stories load.
- Firebase login and `/api/v1/me` work with a real Play-signed account.
- Profile creation, editing, avatar upload, and avatar retrieval work.
- Draft creation, publishing, updating, and deletion work.
- Applause, save, follow, comment, and nested reply mutations are idempotent.
- Notification registrations reach the API; Render drains the shared outbox during the pilot.
- Milestones are awarded once and bot activity does not count.
- Story share previews use the author image and open the installed app.
- Database connections stay within the Supabase pool limit under concurrent load.
- Cloud Logging contains no credentials or bearer tokens.
- Billing budget alerts and a maximum-instance cap are active.

## Cutover and rollback

**Cutover Status (2026-09-07):**
`https://api.writon.cc` is now live and fully cut over to Cloud Run production service `writon-app-api` (`asia-south1`) via Firebase Hosting gateway `writon-api-gateway`. All notification outbox drains, publication fanout, and reader feed maintenance run via authenticated Cloud Scheduler jobs with zero consumer overlap.

**Render Standby & Rollback Drill:**
Render (`https://writon-powerup.onrender.com`) remains deployed as a warm disaster-recovery standby with background workers disabled (`PUSH_DELIVERY_ENABLED=false`, `TIMERS_DISABLED=true`) for two Android-release observation windows (Sept 7–21, 2026).

Because Firebase Hosting rewrites (`firebase.api.json`) can only proxy to internal Cloud Run services (and not arbitrary external hosts like Render), rollback follows a two-tier strategy:

1. **Tier 1 (Instant In-Place Rollback, <30s):**
   Revert 100% of Cloud Run traffic to the previous known-good revision:
   ```bash
   gcloud run services update-traffic writon-app-api --to-revisions=<PREVIOUS_REVISION>=100 --region=asia-south1 --project=writon-app-2020
   ```
2. **Tier 2 (DNS Disaster Recovery to Render for Regional Outage):**
   - Pause Cloud Scheduler outbox jobs:
     ```bash
     gcloud scheduler jobs pause writon-notification-outbox-drain --location=asia-south1 --project=writon-app-2020
     gcloud scheduler jobs pause writon-followed-writer-fanout --location=asia-south1 --project=writon-app-2020
     ```
   - At your DNS provider / Cloudflare, update the CNAME for `api.writon.cc` to point directly to `writon-powerup.onrender.com`.
   - Re-enable background workers on Render (`TIMERS_DISABLED=false`, `PUSH_DELIVERY_ENABLED=true`) and redeploy Render.
   - Once GCP service is restored, re-point DNS back to Firebase Hosting and resume Cloud Scheduler jobs. Zero Android client changes required in either tier.

## Firebase gateway deployment

Deploy the isolated gateway configuration without modifying the main `writon.cc` Hosting site:

```powershell
npx --yes firebase-tools@latest deploy --only hosting:writon-api-gateway --config firebase.api.json --project writon-app-2020
```

`api.writon.cc` is verified operational on `writon-app-api` with valid Google-managed SSL certificate and zero 5xx errors.

## Cutover Evidence & Operations

Current compatibility and rollback baseline is recorded in:
- [Google Cloud Cutover Evidence & Rollback Baseline](../operations/google-cloud-cutover-evidence.md)
- [Monitoring, Alerting & Incident Response](../operations/google-cloud-alerts.md)
- [Implementation Plan](../plans/2026-09-07-google-cloud-full-migration.md)
