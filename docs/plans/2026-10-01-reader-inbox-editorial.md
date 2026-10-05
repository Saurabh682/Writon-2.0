# Reader reliability, link inbox and transparent Editorial delivery

Approved scope: 2026-10-01. Deliver independently; do not wait for the provenance audit to ship reader/authentication fixes.

## Batch 1 — Reader and Google sign-in

- [x] Reuse the existing Room ID-or-slug lookup; do not introduce a second cache mapping.
- [x] Scope Reader and Comments ViewModels to navigation entries.
- [x] Replace blank reader states with loading, retry or unavailable-story controls.
- [x] Preserve pending routes across recreation without replaying consumed launch intents.
- [x] Migrate Login/Signup from GoogleSignInClient to the existing Credential Manager helper.
- [x] Show chooser/authentication progress, handle cancellation and prevent duplicate requests.
- [x] Add cancellation, recreation and progress-control regression checks.
- [x] Run the complete Android unit suite and compile instrumentation tests after final edits: 242 tests, zero failures/errors/skips; device-test sources compile.
- [ ] On Redmi: cold/warm links, slug and ID links, interruption/recreation, offline cached/uncached recovery, removed story, Google success/cancellation/failure and signup.
- [ ] Generate an independently verified release candidate only after device gates pass.

## Batch 2 — Persistent bell inbox

- [x] Add an additive Room 6→7 migration for a device-local incoming-story inbox; support guests and signed-in users with account isolation.
- [x] Persist incoming shared links and push targets before navigation; retain data-message targets during FCM receipt. System-handled background notification targets are captured when tapped.
- [x] Reconcile slug entries to canonical story IDs, deduplicate repeated deliveries and retain read items until explicit dismissal.
- [x] Make the bell useful with unread indication, clear source/read states, open/retry and dismiss actions.
- [x] Add unit and instrumentation checks for canonical deduplication, migration, read-versus-dismiss behavior, guest access and database reopen persistence.
- [ ] Execute instrumentation on Redmi: verify migration preserves data, guest and signed-in inbox flows, canonical merging and interruption/process recovery.
- [ ] Inspect actual FCM payload shapes in foreground/background/terminated states; do not promise background receipt visibility when Android handles the tray itself.

## Batch 3 — Editorial/Home pilot

- [ ] First run a bounded read-only source audit: size ambiguous records and export evidence for operator review.
- [ ] Classify from bot registry and editorial records, never from persona names or account type alone; do not bulk-retag historical posts as human.
- [ ] Replace fictional-persona public reader bylines with **WritOn Editorial** and prominent **AI-generated** disclosure; retain internal identifiers.
- [x] Add separate community/editorial endpoints and additive fields while preserving every legacy endpoint, field and alias. Deployed to Google Cloud production on October 2; see the rollout record.
- [x] Locally put Editorial in Explore's navigation slot; preserve Explore via a native left-to-right swipe drawer plus an explicit Explore button and existing routes.
- [ ] Support All / WritOn Editorial / AI-generated filters, with movie trivia, phone/car/movie/sports/sound-system topics.
- [ ] Label sourced analysis/specification comparisons honestly; never imply firsthand testing without evidence.
- [ ] Home uses a session-stable varied human-story selection. No synthetic backfill; insufficient content offers Editorial, Explore and Write routes.
- [ ] Test source isolation, ambiguity handling, pagination/shuffle stability, empty states and preserved Explore access.

### October 2 separation correction

Home and Editorial no longer observe every shared Room row as feed membership. Each deck observes only IDs returned by its source endpoint, with separate offline membership (up to 200 cards). Successful empty pages replace stale membership; failed requests retain only previously classified cards. Before the first source-safe request, old mixed cache rows are deliberately not guessed to be human.

Community requires human_verified + human account type and excludes synthetic, editorial_bot and bot-registry authors. Editorial includes those explicit editorial/bot signals. Ambiguous records are not silently classified; no historical provenance is rewritten. Existing /api/v1/posts and recommendation endpoints remain unchanged. These two new surfaces temporarily bypass mixed personalized fallback; source-safe ranking and session shuffle are still pending.

Deployment completed in order: isolate the additive API changes from unrelated dirty backend edits, build and smoke-test an overlay of the exact production image, deploy without traffic, verify endpoints against real registry records, promote production, then install Android 2.0.83 (182). The Redmi live-feed/drawer check and 12 reader/inbox/auth-UI regressions pass. See `docs/operations/2026-10-02-community-editorial-rollout.md` for evidence, rollback and remaining manual gates.

Local verification: all 249 Android unit tests pass; assembleDebug and compileDebugAndroidTestKotlin succeed. All 75 Fastify contract tests pass, including classification-predicate, pagination and legacy-response checks. These mocked API checks do not replace live PostgreSQL/source-audit verification. Graphify AST refresh succeeds (SQL parser remains unavailable). Graft source graph refreshes automatically; persistent-memory daemon remains unavailable.

## Release boundaries

- Keep all hosted API work on Google Cloud; no Render dependency.
- Do not change bot generation, persona selection or publishing behavior without separate approval.
- Do not delete existing stories or modify older API contracts.
- Provenance cleanup must not block Batches 1–2.
- Run regressions per batch. Record device evidence separately from compilation/unit results.
- Increment versionName and versionCode once before release artifacts; include verified changes only in supported-locale Play notes.

## Verification evidence — 2026-10-01

- `./gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin` — successful.
- `adb devices` — no connected device; instrumentation execution and provider/account testing are pending, not claimed as passed.
- No release artifact, deployment, database update or bot change was made for Batch 1.

### Batch 2 local verification

- `./gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin` — successful; 245 tests, zero failures/errors/skips.
- Instrumentation checks added for Room migration/reopen persistence, guest UI actions, account isolation and retained read links. Compiling these checks is not equivalent to executing them.
- Prefer an in-place phone update first to verify migration preserves existing drafts, cached reads and pending mutations. Do not test migration solely through a clean reinstall.
- Google sign-in uses the Activity provided by `LocalActivityResultRegistryOwner`: the app deliberately supplies a `createConfigurationContext` context through `LocalContext`, so casting that localized context to Activity is invalid.
- Background notification payloads handled by Android cannot be stored before tap through `onMessageReceived`; their launch extras are captured on tap. Data messages received by the service are stored before returning.
- Graphify's code graph was refreshed; SQL indexing remains unavailable. The installed memory-only `graft` CLI has no `build` command and its daemon did not start; source-graph refresh is handled by the Graft MCP tools instead. Persistent memory saving is unavailable in this environment.

### Redmi execution — 2026-10-01

- Device: Redmi 25028RN03I, Android 15. Debug 2.0.82 (181) installed; no release bundle generated.
- Direct `adb shell am instrument` execution passes all 12 targeted database, guest inbox, Login/Signup UI and linked-reader checks. The three navigation checks pass in two separate runs as well.
- Initial Gradle-managed runs exposed incorrect auth selectors; corrected them and made Login scrollable with keyboard insets. The corrected Gradle batch passed 11/12, with one cold-start timeout; preserve this intermittent observation for further cold-launch testing.
- Gradle's connected-test runner removes test packages on cleanup. Reinstalled the debug app and used direct instrumentation for the final runs, leaving the app installed. This is not proof of preserving the operator's original installed data: migration checks use seeded fixtures.
- Opened a real public slug link and inspected the reader controls/title and loaded body text; background/foreground launch was exercised. Offline recovery, removed stories, Google chooser success/cancellation and real FCM receipt remain manual gates.
- Complete Android unit suite rechecked: 245 tests, zero failures/errors/skips. Graphify refreshed to 9,649 nodes; 53 SQL files remain unindexed because the SQL parser is missing, and 105 configuration/source files produced no nodes.
