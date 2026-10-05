# Google Cloud production API

## Current architecture

- Public API: `https://api.writon.cc`, routed through the Firebase Hosting API gateway to Cloud Run.
- Runtime: `writon-app-api` in project `writon-app-2020`, region `asia-south1`.
- Background jobs: Cloud Scheduler invokes the configured Cloud Run jobs/services; do not run duplicate in-process workers in request-serving instances.
- Secrets: Google Secret Manager; Firebase Admin uses the Cloud Run service identity.
- Database and media: Supabase Postgres and Storage remain the configured data services.
- Public story and account pages: Firebase Hosting at `https://writon.cc`.

Render was the former API host during migration. It is no longer an application, API, or rollback dependency. Historical incident and migration records may mention it; they are not operational instructions.

## Runtime settings

- `PUBLIC_API_BASE_URL=https://api.writon.cc` for generated links and metadata.
- `SPARK_AUTOMATION_ENABLED` and `PUSH_DELIVERY_ENABLED` must be explicitly set for each service. Set Spark off on request-serving services and only on for the dedicated service that owns that work.
- `DATABASE_POOL_MAX` must stay within the Cloud Run instance and Supabase connection budget.
- Cloud Run request-serving instances use `K_SERVICE` to avoid starting in-process timers.

Supply database and provider secrets only through Secret Manager. Do not commit credentials or pass them in deployment logs.

## Deployment and verification

Deploy the API through the approved Google Cloud release workflow for `writon-app-api`; deploy the isolated Firebase Hosting API gateway separately when its configuration changes. Do not point clients directly at revision-specific `run.app` hosts.

Before routing or releasing a change, verify:

- `/health`, Firebase authentication, feed, story detail, publishing, replies, media upload, notifications, and account deletion.
- Story previews, Android App Links, and public deletion/privacy pages.
- Cloud Scheduler jobs have a single active consumer and notification delivery has no duplicate workers.
- Cloud Logging contains no credentials or bearer tokens; Cloud Run instance and Supabase connection limits remain within budget.
- Rollback is to a previously verified Cloud Run revision via traffic allocation, not to a retired third-party host.

Operational evidence and alert procedures are maintained in:

- [Google Cloud cutover evidence](../operations/google-cloud-cutover-evidence.md)
- [Monitoring and incident response](../operations/google-cloud-alerts.md)
- [Google Cloud migration plan](../plans/2026-09-07-google-cloud-full-migration.md)
