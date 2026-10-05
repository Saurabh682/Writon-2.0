# Community / Editorial rollout — 2026-10-02

## Production delivery

- Project `writon-app-2020`, Cloud Run service `writon-app-api`, region `asia-south1`.
- Previous serving revision: `writon-app-api-00027-qcz`.
- New serving revision: `writon-app-api-community-editorial-20261002`, 100% production traffic.
- Cloud Build `c003dd68-ccd7-419d-9748-eeb9704c0fca` succeeded, including container smoke tests with actual production dependencies.
- Immutable image: `asia-south1-docker.pkg.dev/writon-app-2020/writon/writon-api@sha256:6cd3a4f584e0d58d0b6ca38ecc4725b3167fe4042980391f990def6e1940342b`.
- Overlay uses the exact previously serving image and copies only its original server.js plus the additive community/editorial route block. No unrelated dirty backend edits, bot changes, migrations, environment configuration changes or email dispatch were included.
- The no-traffic tagged revision passed before promotion. Canonical `https://api.writon.cc` passed the same verifier after promotion.

## Read-only live evidence

Run from `server`: `node src/scripts/verify-source-feeds.mjs --database`.

- 801 published public posts: 614 community, 187 editorial; classification uses provenance, account type and bot registry, not persona names.
- Three pages per feed, 120 observed cards verified against PostgreSQL; no source overlap or duplicates.
- ID/slug reader payloads present, invalid pagination rejected, existing mixed feed shape and guest authentication boundaries preserved.
- No provenance rewriting, deletion, founder assignment or mail was performed.

## Redmi evidence

- Redmi 25028RN03I, Android 15; debug version 2.0.83 (182) installed with `adb install -r`. No data clear or uninstall in this rollout.
- `testDebugUnitTest assembleDebug assembleDebugAndroidTest` succeeded; 249 unit tests.
- Direct instrumentation: live community and editorial story titles load; Home swipe opens Explore, close button returns, Editorial has its own tab, explicit Explore entry opens, system Back closes Explore without popping Editorial. One test passes after fixing callback registration priority.
- Additional direct instrumentation: all 12 notification navigation, activity recreation, Login/Signup UI, Room migration, incoming-link persistence/deduplication/account-isolation and guest inbox tests pass.
- These are not proof of actual Google provider success or FCM delivery. Those manual gates remain open. Offline membership is unit-tested, not yet exercised with the Redmi radios disabled.
- No AAB or Play upload in this delivery.

## Existing issue and remaining work

The signed-in `GET /api/v1/me/engagement-preferences` returned 500 during device checks. Cloud logs show the same error on the retained prior production revision before this rollout. It was not repaired by changing the older API; investigate separately.

Source-safe personalization/session shuffle, bounded ambiguous-content review, public editorial byline changes and topic filters remain pending. Welcome-email catch-up for all eligible Firebase human registrations is recorded in `docs/email/2026-10-01-welcome-repair.md`; provider credentials and inbox verification are still blocking sending. Never override opt-outs or resend previously accepted welcome jobs.

## Rollback

```powershell
gcloud run services update-traffic writon-app-api --project=writon-app-2020 --region=asia-south1 --to-revisions=writon-app-api-00027-qcz=100 --quiet
```

Do not remove the retained revision. A rollback disables the new source endpoints; the client deliberately retains classified cached cards rather than falling back to mixed content.
