# Recommendation R2 Reading Evidence — Reliability Slice

**Date:** 2026-09-13  
**Status:** Implemented, verified, migrated, deployed to hosted staging, and validated on a physical Android 15 device  
**Production impact:** None

## Existing evidence retained

The Android reader already counts only time while its lifecycle is resumed, resets its checkpoint after resume, flushes every 30 seconds, and caps each contribution at 60 seconds. Loading and background time are excluded. Existing progress, reading history, guest-local learning, and response fields remain unchanged.

## Reliability change

- `POST /api/v1/posts/:id/reading-progress` still accepts the legacy `{ progress, readSeconds }` payload.
- New clients may add an optional UUID `clientMutationId`.
- A private `reading_progress_mutations` ledger accepts each account/story/mutation combination once. A duplicate returns the current reading-history state without adding its seconds again.
- Ledger rows cascade when the account or story is deleted. The ledger uses a 35-day deduplication window with lazy per-user cleanup on the next progress write. Rows contain no story text, title, scroll-position trail, device identifier, or raw interaction stream.
- Android 2.0.69 (168) assigns an identifier before the first send. Failed/non-successful updates enter the existing Room/WorkManager outbox, retain the originating account identity locally, and retries preserve the same identifier. A queued update is ignored while another account is active.
- The completion plausibility guard now uses 200 words per minute for approved canonical forms, with an 8-second poetry floor, 20-second flash-fiction floor, and 45-second essay floor. Missing word count, unknown form, and forms without an approved floor retain the previous `max(30 seconds, reading-time minutes × 30)` rule.
- Both legacy and UUID-idempotent payloads use the same trusted server-side calculation; no expected-time field is accepted from the client.

## Compatibility and deployment order

1. Completed: the guarded runner applied `20260913_reading_progress_idempotency.sql` only to staging ref `xrfnebvkazewqramkpri`.
2. Completed: deploy the compatible server to staging from an overlay of the exact prior staging image.
3. Verify authenticated first delivery, duplicate delivery, offline retry, account isolation, deleted-story behavior, and bounded retention.
4. Test Android foreground, background, and terminated flows on the test device.
5. Do not deploy the new server to another environment until its ledger migration is present.

Older clients require no changes and continue through the original database statement. An updated Android client can still call an older server because the older request parser ignores the additive field, but it will not gain deduplication until the compatible server is active.

## Verification

- Backend: 357/357 tests across 35 files.
- Android JVM: 215/215 tests across 57 result files; no failures, errors, or skips.
- Android release artifact was not generated.
- Hosted staging now contains only the additive private ledger migration. No service, rollout flag, bot function, or production resource was changed.
- Both the guarded apply-and-verify run and a separate verify-only run confirmed 5/5 columns, 3/3 validated key constraints, RLS enabled, client SELECT revoked, and 3/3 indexes.
- Cloud Build `f06783cd-794d-41e2-904a-35f87234eb50` produced immutable image digest `sha256:776b3db7eafcd0531eebcc456f1844ad3089431442de1f28985b202d8651580c` from a 4.3 KiB isolated context. Its only runtime change is the R2 patch to `/app/src/server.js`; every other file comes from prior staging digest `sha256:de399cf3ece5fef1e2579d1192fb3c6ccb06de73b3adc868c09240f1d7c1f77f`.
- Revision `writon-app-api-staging-r2read` passed zero-traffic health/database, public-feed, app-version, unauthenticated-guard, configuration, and ERROR-log checks before receiving 100% of staging traffic. All bot, delivery, digest, social, Spark, review, behavior-rollout, and timer switches remain disabled. Revision `writon-app-api-staging-00013-gig` remains tagged for rollback.
- `npm run verify:staging:reading-progress-e2e` created a disposable Firebase identity, delivered the same seven-second payload twice with one mutation UUID, and received seven seconds from both responses. Direct staging-database verification found one mutation row and seven total reading seconds, proving the duplicate added zero seconds.
- Deleting the disposable account through the staging API cascaded its profile, reading history, and mutation ledger counts back to zero. The verifier did not print or persist the Firebase client key or generated credentials.
- Cloud Build `66a6b17f-f050-473d-878e-7cb1c2e3bb54` produced digest `sha256:7c66b9aad97b93e14b896e9b048121236891e89baa78393fc3e3fdb8d61b0886` from an isolated transform of the exact prior R2 staging image. The transform verified exactly two completion guards before changing them and copied only `server.js` into the final image.
- Revision `writon-app-api-staging-r2form` retained every staging safety setting and passed zero-traffic health/database, public-feed, version, 401 auth-guard, authenticated threshold, cleanup, and ERROR-log checks. It then received 100% of staging traffic; `writon-app-api-staging-r2read` and the earlier `phase45-20260913` revision remain tagged for rollback.
- Tagged-revision and post-promotion proofs both used an 8-second staging poem: 7 seconds with 95% client progress was clamped to 94%, identical delivery remained at 7 seconds and one ledger row, and one new second produced 95% at exactly 8 seconds. Each disposable account deletion returned profile, history, and mutation counts to zero.
- Physical Redmi lifecycle proof used Android 2.0.69 (168) and a disposable signed-in staging account. The reader loaded the known staging poem online, then Wi-Fi and mobile data were disabled for 35 seconds while the reader remained foregrounded. Logcat recorded the expected failed POST attempt and the Room database timestamp advanced, after which Home backgrounding and an app force-stop left the database intact and produced no crash or ANR.
- Wi-Fi and mobile data were restored before relaunch. The Firebase session and Home feed survived process termination. WorkManager diagnostics reported one network-constrained `OutboxSyncWorker` under the unique `writon-outbox-sync` job; after Android's normal backoff it delivered three distinct lifecycle flushes, received HTTP 200 for all three, and finished `SUCCESS`.
- A direct guarded staging query showed three matching private ledger rows, 78 accumulated active-reading seconds, and the original 5% scroll position retained. This is expected: lifecycle flushes accumulate bounded active time independently of scroll progress, while every mutation UUID is accepted once. The remaining enqueued worker is the intended 15-minute periodic job, not a stuck mutation.
- Network connectivity was confirmed restored and the complete device log contained no WritOn fatal exception or ANR. Local test-app cleanup was performed after evidence capture. After owner approval, the disposable account was deleted through the staging API; guarded database verification returned zero profiles, reading-history rows, and mutation-ledger rows for its Firebase UID.

## R2 gate result

- Passed: foreground capture, offline persistence, background transition, process termination, authenticated relaunch, network-constrained retry, successful outbox delivery, server-side ledger verification, and crash/ANR review.
