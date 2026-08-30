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

Run the canary for 7–14 days before cutover. Route `api.writon.cc` to Cloud Run only after all checks pass. Keep Render deployed and current for at least two Android releases. A rollback changes the domain origin back to Render; the Android application does not change.

Before retiring Render, replace its notification polling loop with an authenticated scheduled Cloud Run job or endpoint and verify delivery under scale-to-zero.

## Firebase gateway deployment

Deploy the isolated gateway configuration without modifying the main `writon.cc` Hosting site:

```powershell
npx --yes firebase-tools@latest deploy --only hosting:writon-api-gateway --config firebase.api.json --project writon-app-2020
```

Then add `api.writon.cc` as a custom domain for the `writon-api-gateway` site in Firebase Hosting and apply the DNS records Firebase provides. Do not update the Android base URL until `https://api.writon.cc/health` succeeds with a valid Google-managed certificate.
