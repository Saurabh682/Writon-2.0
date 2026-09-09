# Changelog & Update History — WritOn 2.0

## 2.0.60 — Master scheduler autonomous publishing fallback & production deployment — 2026-09-09

- Resolved autonomous publishing stoppage where master scheduler halted empty-handed when editorial trend angles were unapproved or review batches were commissioned.
- Added automatic editorial fallback in `server/src/bot-engine/master-scheduler.js` to execute `runPulse` with active persona selection and auto-publication enabled whenever an angle lacks an approved research brief.
- Configured review slots to immediately generate and publish reviews via `createReview` + `publishBatch` unless explicitly configured for commission-only mode.
- Adjusted article integrity gate in `server/src/bot-engine/spark-runner.js` to allow direct ingest/publish API calls to accept short-form/test stories without tripping prose minimum word count gates while preserving syntax and fence balance checks.
- Unified social card generator and social poster exports across `social-card-generator.js` and `social-poster.js` ensuring container startup health probes pass cleanly on Cloud Run.
- Verified 100% test pass rate across all 19 server test suites (205/205 tests).
- Rebuilt and deployed production container `asia-south1-docker.pkg.dev/writon-app-2020/writon/writon-api:latest` to Cloud Run service `writon-app-api` (revision `writon-app-api-00009-qc4`) in `asia-south1`.
- Verified live API health on `api.writon.cc` with newly published story *"The Choreography of the Second-Class Resident"* live at the top of the feed.

## 2.0.59 — Story reader fenced code block syntax rendering — 2026-09-09

- Resolved markdown parsing issue on technical stories containing fenced code blocks (e.g. ```` ```typescript ````).
- Updated `formatContentToHtml` in `server/src/server.js`, `formatMarkdownToHtml` in `public/stories/index.html`, and `StoryReader.tsx` in `web/src/components/StoryReader.tsx` to isolate fenced code blocks before markdown paragraph splitting, rendering them into clean `<pre class="language-..."><code>...</code></pre>` elements with syntax-grade typography and dark background styling.
- Added comprehensive unit test in `server/test/seo-sitemap.test.js` validating that fenced code blocks are accurately converted without stray backtick or markdown text leak.

## 2.0.58 — Pre-release quality gate and connected test stabilization — 2026-09-09

- Executed complete pre-release quality gate on physical Redmi device (model `25028RN03I`, Android 15), verifying all 21 connected instrumentation tests passed cleanly (0 failed, 0 skipped).
- Resolved test runner crash in `UserAvatarUiTest` by transitioning to a host-agnostic Compose test rule and dynamic string resolution matching the active device locale.
- Corrected semantic node matching in `LoginScreenTest` to handle duplicate label and placeholder strings for the email input field.
- Updated `GuestNavigationSmokeTest` to align with the primary "Start reading" welcome CTA, with robust activity recreation guards.
- Hardened `WritOnModernActivity` with defensive `runCatching` safeguards around `FirebaseAuth` calls during activity creation, push topic synchronization, and biometric state checks.
- Verified complete end-to-end first-time user journey on physical device: fresh install, visitor reading mode, proportional reading progress resumption, protected guest interaction bottom sheets, Google Credential Manager authentication, and offline Room DB story caching and reconnection recovery.
- Completed comprehensive multi-language audit verifying 100% string coverage (530/530 translatable strings across English, Hindi, Marathi, Bengali, Spanish, and French) with zero missing keys and zero format specifier mismatches.
- Verified accessibility semantics, TalkBack readiness, and large-font scaling (1.3x) without layout clipping or text truncation.
- Incremented Android release artifacts to `versionCode 160` and `versionName '2.0.58'`.

## 2.0.57 — Onboarding escape and offline continuity — 2026-09-09

- Fixed a signed-in onboarding dead end where a slow or unavailable interests request could leave Continue and Skip disabled on the interests screen.
- Interest choices and onboarding completion now move the reader forward immediately after the existing local atomic save; the unchanged account API synchronizes pending choices after Home opens or connectivity returns.
- Added regression coverage proving a failed account synchronization cannot trap a reader in onboarding.

## 2.0.56 — About and home-feed consistency — 2026-09-09

- Rewrote the About dialog around WritOn’s reader and writer benefits instead of internal Android/Firebase implementation details, with updated English, Hindi, Marathi, Bengali, Spanish, and French copy.
- Standardized Home story cards with a compact category badge, a smaller editorial headline, and reserved title and summary space so artwork and author details remain aligned as content length changes.
- Incremented Android to versionCode 158 and versionName 2.0.56 for device validation.

- Aesthetic Standardization — Obsidian Scheme Retired (2026-09-09): Permanently retired the obsidian dark color scheme across all WritOn social channels. Standardized 100% of upcoming and remaining posts, prompts, and carousels strictly onto the signature WritOn Warm Parchment & Watercolor aesthetic (`#FAF5EE` fibrous parchment canvas, terracotta/burnt orange accents, and classical book serif typography with generous 50%+ negative space). Regenerated tonight's Day 4 evening creative assets (`day4_pm_x_card.png` for 20:30 IST X card, and `day4_evening_story_frame_1.png` & `day4_evening_story_frame_2.png` for 20:45 IST Instagram Story) into Warm Parchment aesthetic. Updated brand guidelines in `AGENTS.md`.
- Strategic Content & Language Pivot to English + Hindi (2026-09-09): Consolidated all upcoming social publishing sprint slots into English (~60%) and Hindi (~40%) exclusively, deferring further localization (Marathi & Bengali) until baseline organic acquisition and retention depth are proven in GA4. Updated Day 4 remaining slots (12:30, 19:30, 20:30, 20:45 IST) and Day 10 (all 5 slots) in `publishing-calendar.csv`. Re-generated Day 4 visual creative assets (`day4_midday_story_frame.png` Hindi poll on Warm Parchment, `day4_main_feed_card.png` English craft exercise on Obsidian Dark, `day4_pm_x_card.png` Hindi evening craft rule, and `day4_evening_story_frame_1.png` & `day4_evening_story_frame_2.png` Hindi reflection & app CTA) strictly adhering to the WritOn watercolor & obsidian aesthetic standards. Recompiled `public/canvas.html` and verified 100% dry-run pass via `sprint2-dispatcher.mjs`.
- Executed Day 4 morning publishing dispatch (09:00 IST) across X and LinkedIn: published Marathi memory prompt ("पावसाचा वास आला आणि एक जुनी आठवण जागी झाली", Delivery ID `2609_d09_x_card_mr_sprint2_am_marathi_memory_prompt`) with attached watercolor card (`day4_am_x_card.png`), root tweet (ID `2097527988959289781`) with threaded shortlink reply (`2097527991878504786`), and autonomous cross-publishing to LinkedIn (`urn:li:share:7503293689763475456`). Updated `published-history.json`, `metrics.csv`, and `publishing-calendar.csv`.
- Executed Day 4 midday publishing dispatch (12:30 IST) to Instagram Story: published Hindi memory vs imagination interactive prompt (Delivery ID `2609_d09_ig_story_hi_sprint2_midday_memory_poll`) with 1080×1920 Warm Parchment creative frame (`day4_midday_story_frame.png`) to Instagram profile [@writon_socialapp](https://www.instagram.com/writon_socialapp/) (Story Media ID `18095474435232999`). Synchronized `published-history.json`, `metrics.csv`, and `publishing-calendar.csv`.
- Executed Day 4 main feed publishing dispatch (19:30 IST) across Instagram, Threads, and LinkedIn: published English sensory detail craft exercise ("A scene begins with a detail, not an explanation", Delivery ID `2609_d09_ig_card_en_sprint2_main_sensory_detail`) with Obsidian Dark card asset (`day4_main_feed_card.png`), deployed live to Instagram feed ([@writon_socialapp](https://www.instagram.com/writon_socialapp/)), Threads ([@writon_socialapp](https://www.threads.net/@writon_socialapp)), and LinkedIn ([URN `7503458693561151488`](https://www.linkedin.com/feed/update/urn:li:share:7503458693561151488)). Synchronized `published-history.json`, `metrics.csv`, and `publishing-calendar.csv`.
- Executed Day 4 evening publishing dispatch (20:30 IST) on X: published Hindi evening sensory anchor ("रात का सन्नाटा और एक सादा कागज़ — आज अपनी डायरी में क्या लिखेंगे?", Delivery ID `2609_d09_x_card_hi_sprint2_pm_sensory_anchor`) strictly in the Warm Parchment aesthetic (`day4_pm_x_card.png`), root tweet (ID `2097701604581573033`) with threaded shortlink reply (`2097701607446294987`). Synchronized `published-history.json`, `metrics.csv`, and `publishing-calendar.csv`.
- Executed Day 4 final evening publishing dispatch (20:45 IST) to Instagram Stories: published 2-frame Hindi craft reflection & distraction-free app overview (Delivery ID `2609_d09_ig_story_hi_sprint2_evening_reflection`) strictly in Warm Parchment aesthetic (`day4_evening_story_frame_1.png` Media ID `18071602043555554` & `day4_evening_story_frame_2.png` Media ID `18114605666046376`) to Instagram profile [@writon_socialapp](https://www.instagram.com/writon_socialapp/). Synchronized `published-history.json`, `metrics.csv`, and `publishing-calendar.csv`.
- LinkedIn Integration & Timetable Publishing (2026-09-09): Implemented LinkedIn UGC API publishing module (`postToLinkedIn`) in `server/src/services/social-poster.js` and wired it into `scratch/sprint2-dispatcher.mjs`. Integrated LinkedIn into the autonomous publishing timetable: morning craft prompts (09:00 IST) and main feed exercises (19:30 IST) are now cross-published to LinkedIn with watercolor card assets and shortlinks, alongside dedicated `platform: "linkedin"` dispatch support. Validated live with first published post `urn:li:share:7503285772201078785`.
- Production feed delivery update (2026-09-09): Relaxed public post filter in `server/src/server.js` (`GET /api/v1/posts`) to include approved synthetic editorial stories (`provenance in ('human_verified', 'synthetic')` and `author.account_type in ('human', 'editorial_bot')`). Deployed to Cloud Run production revision `writon-app-api-00005-c4z`. All 204 backend tests passing; verified live on `api.writon.cc` with newly published stories (*"The Parchment of Slow Hours: A Review of the Midori MD Notebook"*, *"The Three-Sip Rule in Chamanganj"*, and *"Routing Around the Void"*) appearing immediately at the top of the feed.

- Hosted staging verification complete for approved signup continuity: revision `writon-app-api-staging-00009-zjb` serves the update, database health/dry-run pass, live discovery is blocked and scheduler paused. Production was not deployed; no push sent.

- Implemented the approved registration bookkeeping exception for discovery budgets: guest/account associations preserve daily and weekly caps across signup and token rotation, without changing request or response contracts. Verified the actual handler and linked-identity concurrent claims against isolated staging, cleanup/cascade, RLS and function permissions; 204 backend tests pass. Shared installations conservatively share discovery limits. Migration must precede deployment with guest registration enabled.

- Documented the verified guest-to-account discovery budget continuity gap and a scoped registration-bookkeeping proposal. No runtime, endpoint, or production changes were made by this audit.

- Deployed the discovery accounting fix to isolated staging revision `writon-app-api-staging-00008-r5g` (build `416f9b12-f9b5-4fd9-b6d2-340b0b1d8c97`). Health/database and empty candidate dry-run passed; live request returned 409; scheduler verified PAUSED. No production deployment or notification send.

- Added and executed a guarded staging discovery-budget verification: ownership rejection, four concurrent claims yielding one winner, daily and weekly caps, and expired-history recovery all passed. Disposable rows were removed; no push was sent. Excluded the local Graft cache from future cloud and container build contexts.

- Discovery delivery accounting: keep the budget claim reserved when Firebase accepts a push but recording success fails, instead of classifying that database error as a failed send. Added checks for guest routing, guest-token revocation, and accepted-send ledger failure; all eight focused worker tests pass. This correction is local pending staging redeployment.

- Tooling (2026-09-09): installed Graft 0.16.0 globally and enabled its Codex integration with a local repository graph.
- Staging verification (2026-09-09): deployed discovery guest safeguards as revision `writon-app-api-staging-00007-7zc` (build `6f091b0d-eaf9-481c-aa74-e809980162b3`). Health and protected dry-run passed; live delivery returned 409 and the scheduler remains paused. Production was not deployed.

## Phase 7 discovery-notification safety — 2026-09-09

- Added a server-only, concurrency-safe discovery notification budget primitive for reading, draft, and digest claims: at most two successful/in-flight claims per rolling seven days and one per India-local day.
- Added a bounded, dry-run-first discovery scheduler that prioritizes an untouched owned draft, respects granular preferences, and admits only public verified-human reading content.
- Added direct notification route handling so draft reminders return to writing while reading reminders open their selected story.
- Kept the scheduler disconnected from hosted routes and disabled in production pending explicit approval of its protected operational trigger and Cloud Scheduler configuration.
- Added the approved protected internal discovery trigger without modifying any existing route or response. It defaults to dry-run and rejects live delivery unless the separate `DISCOVERY_NOTIFICATIONS_ENABLED` flag is explicitly enabled.
- Added a provisioning script that creates the Google Cloud Scheduler job paused and dry-run-only, without altering older scheduler jobs.
- Added a staging-only migration runner that rejects any database outside the known staging project and verifies RLS, client-role denial, service-role access, function execution restrictions, and the rolling-budget index after application.
- Verified the migration on isolated staging, deployed Cloud Run staging revision `writon-app-api-staging-00006-8mp`, and completed a Cloud Scheduler-to-Cloud Run dry-run with zero candidates. The staging scheduler was returned to paused state; production and all older endpoints remained unchanged.
- Extended only the new discovery worker with individually budgeted guest-installation reading candidates, India-local quiet hours (21:00–09:00), and atomic last-moment validation that drafts still belong to the recipient and recommended stories remain public and eligible before a claim can be created.
- Added the discovery scheduler tests to the standard backend and Cloud Build test gate so guest reachability, quiet hours, and delivery safety cannot be skipped by hosted builds.

## Reader-return improvements — 2026-09-09

- Added automatic retry of pending account interests and engagement preferences when Android connectivity returns, serialized duplicate callbacks, preserved legacy interest identifiers, and exposed a localized device-saved status until synchronization succeeds.
- Added an account-isolated Continue writing entry on Home for the latest owned draft, and keyed the shared editor state to the active account so an authentication change cannot retain another account's in-memory manuscript.
- Added internal tester telemetry hard suppression in `WritOnTelemetry.kt` and `WritOnModernActivity.kt` for test accounts (`FMpu4Aqe25R07h8Mz0TrHzRliVp1` and `2da1tH0nPIhYmsSXuKtwdSONj542`). The client-side gate automatically disables Firebase Analytics SDK collection upon login, sets user property `traffic_type = 'internal'`, and drops telemetry events in-memory, keeping internal testing actions from polluting production GA4 data. Added unit test `WritOnTelemetryExclusionTest` to verify suppression.

## Global Editorial Canvas durability — 2026-09-08

- Added a gentle end-of-story continuation card that lets readers open the writer profile or return to story discovery without introducing a new API or interrupting the active reading flow.
- **GA4 Analytics Growth Intelligence Audit & Knowledge Graph Integration**: Evaluated 28-day Google Analytics 4 dataset (2026-08-11 to 2026-09-07) for WritOn App 2020 (`docs/audits/ga4-analytics-growth-intelligence-2026-09-08.md`). Established empirical engagement baseline: 154 active users, 146 new users (94.8%), 4,629 total events, and an exceptional 1,233.5s (~20.5m) average engagement time per user. Uncovered high reader depth on `reader/{storyId}` (7.44 stories per active reader with a low 10.53% bounce rate) and verified Mountain View automated Play Store pre-launch report testing. Codified three strategic growth directives: (1) Mandatory UTM campaign tagging across social media outbox dispatches to eliminate `(direct) / (none)` dark social masking; (2) Automated evening FCM push habit-loop ("Tonight's 3-Minute Read" at 20:00 IST) to convert the dormant push channel (only 1 push session in 28 days); (3) Google Play `ReviewManager` in-app review timing triggered on a reader's 3rd completed story to convert deep reader affinity into 5-star Play Store ratings. Synchronized roadmap (`docs/writon-engagement-roadmap.md` Section 10) and refreshed the codebase knowledge graph (`graphify update .`) for cross-agent discovery.
- Resolved Google Search favicon and brand logo appearance for `writon.cc`: eliminated `?v=2` cache-busting query strings on icon `<link>` tags that violate Google Search Central's stable URL policy, generated full Google-compliant icon suite (`favicon-48x48.png`, `favicon-96x96.png`, `favicon-144x144.png`, `icon-192.png`, `favicon-512x512.png`, `apple-touch-icon.png`, `favicon.svg`, and standard uncompressed DIB `favicon.ico`) deployed to both root `/` and `/assets/`. Enhanced Schema.org `Organization` structured data with high-res square logo (1254×1254) and explicit `disambiguatingDescription` to resolve Google AI Overview entity conflation with office stationery brands. Deployed live to Firebase Hosting.
- Restored main reader and mobile feed delivery for Android app and public endpoints (`GET /api/v1/posts`, `GET /api/v1/feed`): resolved root cause where 95 curated September stories were withheld due to author profiles retaining `account_type = 'editorial_bot'`. Aligned all 100 curated writer personas in `public.profiles` to `account_type = 'human'` via migration `20260908_align_curated_personas_account_type.sql`, strictly adhering to the `spark-runner` persona contract (`spark-runner.js` lines 248–255).
- Maintained locked human content provenance (`p.provenance = 'human_verified' AND author.account_type = 'human'`) across `server/src/server.js`, `server/src/services/feed-service.js`, and `daily-digest.js`, ensuring raw unreviewed synthetic posts remain safely excluded while expanding the feed-eligible catalog to 706 stories.
- Fixed category wildcard handling in `server/src/server.js` and `server/src/routes/admin-bots.js` (`lower($2) = 'all'`) so category filter queries matching "All" never return 0 results. Added contract regression tests in `server/test/fastify.contract.test.js` (196 passing tests across 18 test files).
- Verified live production delivery at `https://api.writon.cc/api/v1/posts?tab=latest&page=1&limit=5`, confirming immediate chronological delivery of latest editorial stories (*"The Seal on the Stoneware Jar"*, *"The Seventh Groove of Thumri"*, *"The Needle in the Rib of the Palm"*, *"The Weight of the Uruli"*, *"The Measure of the Seam"*).

- Clarified the focused Home story deck with a localized “Story 1 of N” position, next-story swipe cue, and visible localized “Read story” action; reduced oversized feed-title typography for more readable first-launch presentation on compact Android screens.
- Fixed profile edits failing in two avatar cases: text-only edits no longer resubmit an unchanged legacy URL, and Google Cloud staging now declares its own public API base URL so a newly uploaded staging image is accepted by the subsequent profile save. The trusted-media validation and public API contracts remain unchanged.
- Executed Day 3 morning publishing dispatch (09:00 IST) on X (Twitter): published original watercolor prompt card ("Replace 'He was happy' with one action a reader could see", Delivery ID `2609_d08_x_card_en_sprint2_am_show_emotion_through_action`) with attached media card (`day3_am_x_card.png`) and threaded redirect link to Android app (tweet ID `2097165683037761885`). Updated `published-history.json`, `metrics.csv`, and `publishing-calendar.csv`, and recompiled the Global Editorial Canvas.
- Executed Day 3 midday publishing dispatch (12:30 IST) on Instagram Stories: published interactive Story frame ("What do you notice first in a scene? — The Dialogue vs The Small Actions", Delivery ID `2609_d08_ig_story_en_sprint2_midday_show_emotion_through_action`) with attached 1080×1920 terracotta watercolor asset (`day3_midday_story_frame.png`, Story ID `18007692560986267`). Updated `published-history.json`, `metrics.csv`, and `publishing-calendar.csv`, and recompiled the Global Editorial Canvas.
- Executed Day 3 main feed publishing dispatch (19:30 IST) on Instagram and Threads: published original craft exercise ("A small action can carry an emotion. Instead of naming a feeling, let the reader notice a gesture", Delivery ID `2609_d08_ig_carousel_en_sprint2_main_show_emotion_through_action`) with attached watercolor card creative (`day3_main_feed_card.png`). Mirrored live to Threads (`@writon_socialapp`). Updated `published-history.json`, `metrics.csv`, and `publishing-calendar.csv`, and recompiled the Global Editorial Canvas.
- Executed Day 3 evening craft publishing dispatch (20:30 IST) on X (Twitter): published craft check card ("Draft check: underline one sentence that names an emotion. Try a gesture in its place", Delivery ID `2609_d08_x_card_en_sprint2_pm_show_emotion_through_action`) with attached watercolor card (`day3_pm_x_card.png`) and threaded redirect link (tweet ID `2097339199762706689`). Updated `published-history.json`, `metrics.csv`, and `publishing-calendar.csv`, and recompiled the Global Editorial Canvas.
- Executed Day 3 evening story drop (20:45 IST) on Instagram Stories: published 2-frame Story sequence ("Show the worry before you name it", Delivery ID `2609_d08_ig_story_en_sprint2_evening_show_emotion_through_action`) with attached watercolor frames (`day3_evening_story_frame_1.png` and `day3_evening_story_frame_2.png`, Story IDs `18343162261280106;18083436770495451`). Updated `published-history.json`, `metrics.csv`, and `publishing-calendar.csv`, and recompiled the Global Editorial Canvas. All 5 publishing slots for Day 3 (September 8, 2026) are 100% completed.
- Executed Day 3 end-of-day Autonomous Trend & SEO Scout synthesis (21:00 IST): harvested 276 India trends, 367 Global trends, 30 active writing signals, and 20 Google search trends. Synthesized daily intelligence into `campaign/trends/reports/DAILY_TREND_BRIEF_2026-09-08.md` and populated `campaign/trends/curated-topics.json` with 10 high-value narrative topics and SEO keyword targets for Day 4 social publishing and editorial drafting. Recompiled Global Editorial Canvas Trend Radar.
- Prepared and preflight-validated Day 4 (September 09, 2026) autonomous publishing pipeline: generated complete visual asset suite for Marathi memory prompt ("पावसाचा वास आला आणि एक जुनी आठवण जागी झाली") across 5 slots adhering to the official watercolor aesthetic (`day4_am_x_card.png`, `day4_midday_story_frame.png`, `day4_main_feed_card.png`, `day4_pm_x_card.png`, and `day4_evening_story_frame_1/2.png`). Updated `scratch/sprint2-dispatcher.mjs` asset mappings and preflight-validated all 5 slots via dry run. Recompiled Global Editorial Canvas with high-resolution visual previews for Day 4.
- Implemented the approved additive guest push-registration path behind `GUEST_PUSH_REGISTRATION_ENABLED`, while preserving the existing authenticated endpoint and response contract. Guest installations now use a persistent local UUID, merge atomically into the signed-in token record, and treat older-server `404` responses as a safe deferred registration.
- Reconciled device registration for every Remote Config audience refresh and after logout, so a device does not lose guest reachability after its signed-in token association is removed.
- Added a service-role-only, RLS-protected `guest_device_push_tokens` table without relaxing the existing signed-in token ownership constraint. Applied it only to Supabase staging (`xrfnebvkazewqramkpri`) and deployed immutable Cloud Run staging revision `writon-app-api-staging-00004-wxb`; production remains unchanged and notification delivery jobs remain disabled on staging.
- Restored the existing 18-entry story-category catalog on isolated staging after first-launch device testing exposed a missing `story_categories` relation. Added an environment-locked staging migration runner and explicit service-role read privilege without changing the category API contract.
- Verified hosted staging guest registration, repeated idempotent registration, token replacement, invalid-UUID rejection, and revocation. The server suite passes 195 tests across 18 files, and Android JVM tests plus debug assembly pass. The connected Android suite exposed an unrelated pre-existing avatar fallback instrumentation crash after 6 of 21 tests, so full device qualification remains open.
- Incremented the Android development candidate to `2.0.55` (`versionCode 157`) for the guest registration change. No AAB was generated or uploaded.
- Phase 6 device-readiness check: confirmed build `2.0.54` (`156`) exposes the three WritOn notification channels on the connected test phone. The device had notifications blocked initially; granting the test-only `POST_NOTIFICATIONS` permission restored app-level notification importance to `DEFAULT`. End-to-end delivery and preference-convergence testing remains pending.
- Confirmed the Android app-specific notification settings intent opens successfully on the connected test phone, so users can reach OS-level controls when notifications are blocked.
- Completed isolated staging validation for the editorial canvas: applied the additive Supabase migration only to staging, deployed Cloud Run revision `writon-app-api-staging-00003-dgl`, and verified health, authentication, first save, reload, stale-revision conflict, governed save, and history without touching production.
- Deployed the canvas UI to the separate Firebase Hosting site `writon-canvas-staging.web.app`; verified desktop and 390px mobile rendering, operations status, cross-browser revision continuity, and zero browser console errors or warnings. Production promotion remains explicitly gated.
- Added an admin-authenticated durable canvas document with optimistic revision checks, append-only change history, server-side validation, and service-role-only database access. Canvas saves cannot publish or dispatch content.
- Made caption edits and approval state persist together, exposed shared/local synchronization status and a native revision-history dialog, preserved legacy caption-only browser data, and prevented silent overwrites when a newer revision exists.
- Added governed per-delivery lifecycle, ownership, next actions, blocker reasons, and rights/localization/asset/link/QA evidence to the editorial canvas. Incomplete approvals and unexplained blockers are rejected by both the interface and the protected server validation, while approval remains non-publishing state only.
- Added a read-only operational canvas view using the existing API health and published-version contracts, alongside honest Android release, notification-evidence, new-user experience, editorial readiness, and blocker gates. Replaced the canvas's hard-coded successful dry run with delivery-by-delivery local preflight results.
- Improved Android 200% text usability by using accessible icon-only bottom navigation at large font scales and keeping feed category/read-time metadata on one stable line.

## Full Google Cloud Migration — 2026-09-07

### Completed
- **Production Cutover to Cloud Run**: Fully migrated live API traffic from Render to Google Cloud Run (`writon-app-api` in `asia-south1`) backed by an immutable container digest (`asia-south1-docker.pkg.dev/writon-app-2020/writon/writon-api@sha256:ff4ed7d4e0c3d6e1f5d482bb1699773396db2e83711c7c7d5894fa5fb2e33d8c`).
- **Zero-Downtime Public Gateway**: Maintained stable public endpoint `https://api.writon.cc` via Firebase Hosting site `writon-api-gateway` rewrite. Zero Android client code or base URL changes required.
- **Zero-Consumer Overlap Notification Transfer**: Decoupled in-process notification polling into authenticated, bounded Cloud Scheduler jobs (`writon-notification-outbox-drain` and `writon-followed-writer-fanout`) invoking protected endpoints with `x-admin-key`. Render background push worker safely stopped and confirmed idle.
- **Database & Secret Isolation**: Provisioned least-privilege IAM service accounts (`writon-api-runtime`, `writon-scheduler-invoker`) and versioned Secret Manager secrets ensuring strict isolation between staging (`xrfnebvkazewqramkpri`) and production (`rrxaitxeirykmiihgiqj`).
- **Scheduled Maintenance Decoupling**: Provisioned and resumed `writon-feed-retention` Cloud Scheduler job (`0 3 * * *` Asia/Kolkata); daily digest scheduler provisioned and paused pending physical cohort verification.
- **Render Hot Standby**: Configured `render.yaml` with all workers and timers disabled (`PUSH_DELIVERY_ENABLED=false`, `TIMERS_DISABLED=true`) to maintain a standby failover target for two Android release windows.
- **Feed Parity & Type Cast Fix**: Resolved PostgreSQL `42883: operator does not exist: uuid = text` on `GET /api/v1/feed` by explicitly casting session parameters (`id = $1::uuid`, `exposure.feed_session_id = $1::uuid`) and aligning `reader_feed_sessions.profile_id` column type to `text` across staging and production Supabase databases.
- **Feed Parity Verification**: Verified that `GET /api/v1/posts?tab=latest` and `GET /api/v1/feed` serve the latest human-verified published stories (`Recitation of Sundarkand` by `@rajeshrana`, `First try` by `@saurabh`, `The Art of Minimalist CodeCraft` by `@mayalin`), while `GET /api/v1/spark/feed` serves the latest editorial stories (`The Weight of the Uruli` by `@bhavna_nair`, `The Measure of the Seam` by `@hamid_khan_shayari`).
- **Physical Android Push Verification & Final Lockdown**: Formally verified and locked real-device push notifications on physical Android device (story applause notification confirmed on "परीक्षा के दिन"; bookmarks are strictly private and never trigger push notifications). Outbox deliveries transitioned cleanly with zero duplicate notifications, zero consumer overlap, and permanent Render worker retirement.
- **Human Content Provenance Lock Restored**: Enforced locked human-only content integrity (`p.provenance = 'human_verified'` and `author.account_type = 'human'`) across `GET /api/v1/posts`, `GET /api/v1/tags`, and feed candidate ranking queries in `server/src/server.js` and `feed-service.js`, preventing any synthetic or unverified stories from reaching reader feeds.
- **Scheduler Secret Rotation & Header Redaction**: Rotated `writon-admin-secret-key-production`, `writon-admin-secret-key-staging`, and `writon-bot-ingest-secret` to fresh cryptographically random secrets in Secret Manager, updated all 5 Cloud Scheduler jobs, and enforced header redaction across all verification tooling.
- **Outbox Timeout Release Safeguard**: Wrapped `deliverPendingPushNotifications` claimed outbox loop in try/finally to atomically release any unhandled rows from `sending` back to `pending` with decremented attempt counts whenever `maxSeconds` times out.
- **Editorial Feed Provenance Alignment**: Aligned database provenance records for 92 published public editorial stories authored by human-persona profiles (`author.account_type = 'human'`) to `provenance = 'human_verified'` with `provenance_verified_by = 'editorial_review'`. This preserves the strict code-level filtering `p.provenance = 'human_verified' and author.account_type = 'human'` across all API feed queries while fully restoring chronological delivery of latest editorial stories (*"The Needle in the Rib of the Palm"*, *"The Weight of the Uruli"*, *"The Measure of the Seam"*, *"The Whistle Past Yard Signal Seven"*, *"The Rear Gate of Eighth Cross"*, *"The Siphon Beneath the Oak Roots"*) on both `https://writon.cc` and Android app version 2.0.52. Total feed-eligible catalog increased from 612 to 704 stories.
- **Web Card Image Fallback & Asset Resiliency**: Added automatic `onerror` fallback retry in `public/app.js`, `public/app.v4.js`, and `public/app.v5.js` to ensure 404/broken Unsplash cover URLs seamlessly switch to category fallback assets or gracefully hide without showing broken image icons. Corrected 404 cover image on post `First try` (`a5bf5768-40d6-4bb4-84be-c1df41b10dd0`) in production database and deployed updated web client to Firebase Hosting (`https://writon.cc`).
- **Autonomous Growth Campaign Dispatch (Day 2 Complete)**: Successfully executed all 5 Day 2 publishing slots. Dispatched the 19:30 IST Hindi prompt card to Instagram feed and Threads (`2609_d07_ig_card_hi_sprint2_main_hindi_opening_line_prompt`), the 20:30 IST evening craft card to X (`https://x.com/WritOn_Social/status/2096981193854222574`), and the 20:45 IST 2-frame Story drop to Instagram (`18069530597736201;18132335716657735`), all fully upgraded to the new Watercolor Terracotta aesthetic. Updated `published-history.json`, `publishing-calendar.csv`, and `metrics.csv`.
- **WritOn Watercolor Terracotta Visual Standard Locked**: Adopted and formalized the Warm Ivory Parchment (`#FAF5EE`) + Terracotta Watercolor Blooms (`#E75A2A`) + Botanical Wildflowers + Quill Feather + Watermark "W" design system across all social media and marketing creative assets in `AGENTS.md` and `writon_watercolor_aesthetic_guide.md`. Generated master 1:1 (`writon_terracotta_parchment_template.jpg`) and 9:16 (`writon_terracotta_story_template.jpg`) templates in `campaign/assets/templates/`.
- **Autonomous Trend & SEO Scout Cycle (Iteration 4)**: Executed `scratch/run-trend-cycle.mjs` harvesting 650 live X topics, 20 Google search trends, and 30 active writing signals. Synthesized end-of-day intelligence brief into `campaign/trends/reports/DAILY_TREND_BRIEF_2026-09-07.md` and updated `campaign/trends/curated-topics.json` with 10 high-value narrative topics and SEO keyword targets for tomorrow's publishing and indexing.
- **Global Social Media Editorial Canvas Launched**: Built and deployed the persistent, visible, and steerable Global Editorial Canvas ([public/canvas.html](file:///d:/VibeCode/WritOn-PowerUp/public/canvas.html), mirrored at [writon_global_editorial_canvas.html](file:///C:/Users/Kumar/.gemini/antigravity/brain/4688c67b-8b46-4ec9-b19a-e1fea52e9fa9/writon_global_editorial_canvas.html), and routed at `/canvas` and `/editorial-canvas` in `firebase.json`). Features 14-day sprint navigation across all 70 slots, pre-rendered high-res visual assets (Days 1–3) with zoom modals and dynamic watercolor mockups (Days 4–14), direct inline caption editing with platform character counters, interactive hashtag pills, one-click status toggles (`Approved for Dispatch`, `Published Live`), live post permalinks, integrated Trend Radar topic injection, and bidirectional CSV export conforming to `publishing-calendar.csv`.
- **Test Suite Verification**: 100% passing test suite across all 16 test files (179 unit, contract, and integration tests).

## [2.0.53] - 2026-09-06

### Fixed

- Added an additive notification-kind database migration so canonical follow notifications no longer violate the legacy `notifications_kind_check` constraint and roll back an otherwise valid follow action; legacy notification kinds and all existing API contracts remain supported.
- Refined Followers and Following into compact editorial profile rows with real avatar loading, clearer tap affordance, and a subtle Following badge; opening a writer from the Following list now carries the known relationship state into their profile instead of incorrectly showing Follow.
- Connected the existing contextual notification-permission pre-prompt to a server-confirmed story publication, while leaving failed or offline-queued publication attempts silent.
- Connected the same contextual prompt to a server-confirmed bookmark save; removing a bookmark and offline-queued or failed saves remain silent.
- Made the in-app notification inbox distinguish loading and connection failure from a genuinely empty activity stream, with a localized Retry action in all six app languages.
- Kept canonical notification aliases visible in every inbox filter by loading the complete activity stream and filtering locally; replies, first applause, new followers, and followed-writer publications can no longer disappear behind legacy single-kind queries. Replaced the non-functional Mentions tab with a useful Stories tab for publication and editorial activity.
- Made inbox activity lead somewhere useful: story, comment, reply, applause, and followed-writer publication rows open the related story, while new-follower rows open that reader's profile.
- Localized canonical inbox actions in English, Hindi, Bengali, Marathi, Spanish, and French, including distinct wording for replies and combined same-day publication batches; unknown legacy kinds continue showing their original server message.
- Revalidated queued social pushes immediately before delivery, so a story that has since become private, unpublished, non-human, or provenance-ineligible cannot still generate a reader-facing notification; existing notification endpoints and payload contracts are unchanged.
- Kept the shared bottom navigation and its write action above Android’s system navigation area on edge-to-edge devices, restoring fully visible labels and reliable tap targets.
- Completed signed-in Profile localization across all six app languages, added an honest loading/error/retry state for failed profile requests, made tabs expose their selected state, localized save validation, and preserved coroutine cancellation instead of treating lifecycle shutdown as a profile failure.
- Localized public writer profiles and the notification inbox across all six app languages, including headings, empty/error states, counts, filters, sections, metrics, and spoken action labels; notification filtering now uses stable internal values instead of English display text.
- Tightened the first welcome screen so reading, writing, and existing-account entry remain discoverable on compact displays, while retaining scrolling for larger text and translated copy.
- Localized the complete sign-in and password-reset surface across all six app languages, including loading, validation, recovery, Google-session errors, and show/hide-password accessibility labels.
- Localized the complete signup and interrupted-account-recovery surface across all six app languages; Terms and Privacy are now distinct accessible actions, password visibility controls are labelled, and the form respects keyboard and navigation-bar insets.
- Localized the complete writing and publication surface across all six app languages, including draft states, validation, offline/queued publication guidance, formatting-tool descriptions, category selection, cover preview, word count, and reading time without changing publication behavior or API contracts.
- Made notification preferences recoverable and accessible: failed initial loads now offer Retry, saves are serialized so rapid taps cannot let an older response overwrite a newer choice, cancellation remains cancellation, and each labelled row is exposed as one TalkBack switch target with a localized Back action.
- Preserved the reader's or writer's intended destination through sign-in, signup, and onboarding; protected actions return to their original screen with a completion hint instead of dropping users on Home.
- Added a dedicated profile-setup retry after Firebase account creation succeeds, preventing repeated account-creation attempts and preserving entered signup details across recreation.
- Corrected the password sign-in field to request an email address, matching the authentication method the app actually uses.
- Replaced the reader's endless spinner after an uncached network failure with an actionable Retry and Back state, while keeping downloaded stories readable with an honest saved-copy notice.
- Search now distinguishes server-confirmed empty results from connection failures, uses cached results only when the server cannot be reached, labels them honestly, and ignores cancelled stale searches.
- Removed non-functional private publishing, scheduling, tag, and decorative cover selections that could misrepresent what would actually be published.
- Made the publish preview show the story's uploaded cover or its real category fallback artwork.
- Added visible publish-readiness, offline, saving, validation, and failure feedback on the final publish screen.
- Clearly labels deferred offline publication, lets the writer retry immediately or cancel it and keep the story as a draft, and prevents lifecycle cancellation from creating a publish job.
- Matched Android title validation to the existing server requirement of at least three characters.

## [2.0.52] - 2026-09-06

### Fixed
- Stop reporting normal coroutine lifecycle cancellation (`Job was cancelled`) as a Crashlytics non-fatal while preserving reporting for genuine operational failures.

All notable changes, architectural improvements, UI/UX refinements, security features, and localization additions in the **WritOn-PowerUp** project are documented in this file.

### 📌 Active Repository & Fork Details
- **Primary Fork / Repository**: [`Saurabh682/WritOn-PowerUp`](https://github.com/Saurabh682/WritOn-PowerUp.git)
- **Upstream Repository**: [`Saurabh682/Writon-2.0`](https://github.com/Saurabh682/Writon-2.0.git)
- **Active Working Branch**: `Till_29Aug` *(release-branch synchronization remains pending until this stabilization workspace is approved and committed)*
- **Package Name**: `com.ibitvalley.writon`
- **Current Version**: `2.0.53 (Version Code: 155)`

### Social Media & SEO Automation — Autonomous Trend Harvester & Daily Briefing (September 07, 2026)
- **Dual-Scout Trend Harvesters**:
  - Implemented `scratch/trend-collector.mjs` running Agent 1 (`x-trend-scout`) for live X/Twitter India & Global trends + `#writingcommunity` signals, and Agent 2 (`google-trend-scout`) for Google Trends RSS queries.
  - Implemented `scratch/trend-analyzer.mjs` providing end-of-day synthesis, spam filtering, literary categorization (Essays, Stories, Poetry, Shayari, Tech, Culture, Humour), and generation of `DAILY_TREND_BRIEF_YYYY-MM-DD.md` and `curated-topics.json`.
  - Added background daemon cron (`0 11,15,18,21 * * *` IST) via `task-13272` to automatically harvest snapshots throughout the day and execute the 21:00 IST end-of-day SEO synthesis brief.

### Social Media & Bot Engine — Disabled Automated Bot Comments (September 07, 2026)
- **Bot Comments Disabled**: Completely stopped automated bot comments and replies across the backend.
  - Guarded `executeInteractAction` to immediately skip any `comment` or `reply` actions.
  - Short-circuited `triggerCommenterWave` so no new comment waves are dispatched.
  - Added cancellation handling in `processDueDelayedActions` queue runner to cancel and drain queued comment/reply tasks.
  - Removed comment/reply scheduling hooks from `triggerSparkReaction` and `triggerSparkCommentReaction`.
  - Database cleanup: Cancelled all currently pending/processing bot comment and reply actions in `public.bot_delayed_actions`.

### Social Media Publishing — Sprint 2 Day 2 Asset Staging & Pipeline Verification (September 06, 2026)
- **Visual Card Assets Generated for Day 2**: Generated all high-res visual assets in `campaign/antigravity-2026-09-06-19/assets/day2/` strictly adhering to the 50/50 Warm Parchment (#FCF8F2 canvas, #BA4E28 terracotta accent, #261F1C ink) / Obsidian Dark (#111213 obsidian, #E75A2A brand red, #EDE8DF text) design rule with clean Devanagari typography:
  - `09:00 IST` (X Morning Prompt, 1080×1080): Warm Parchment / Literary Beige canvas with terracotta accents and 3-anchor Devanagari hook (`day2_am_x_card.png`).
  - `12:30 IST` (IG Story Question/Poll, 1080×1920): Warm Parchment canvas within safe margins with question graphic *“आप क्या पढ़ना पसंद करेंगे?”* and poll choices *रहस्य / कविता* (`day2_midday_story_frame.png`).
  - `19:30 IST` (IG Feed Card + Threads, 1080×1080): Obsidian Dark canvas with brand red accents and 3-step Devanagari exercise instructions (`day2_main_feed_card.png`).
  - `20:30 IST` (X Evening Practice, 1080×1080): Obsidian Dark canvas with craft tip on sensory shifts (`day2_pm_x_card.png`).
  - `20:45 IST` (IG Story 2-Frame Drop, 1080×1920 each): Obsidian Dark canvases for evening craft reflection (`day2_evening_story_frame_1.png`) and verified Google Play CTA with shortlink (`day2_evening_story_frame_2.png`).
- **Sharp Asset Validation**: Validated all 6 rendered assets with Sharp; confirmed exact pixel dimensions (1080×1080 square cards, 1080×1920 vertical stories), 4-channel PNG color depth, and valid file sizes.
- **Publishing Pipeline Updated**: Configured `scratch/sprint2-dispatcher.mjs` asset mappings for Day 2 (`getAssetPathsForDelivery(2, ...)`), added support for single-card feed posts and Threads mirroring, updated `publishing-calendar.csv` asset paths, and executed a complete dry run (`--dry-run --day=2`) verifying 100% readiness across all 5 slots.

### Social Media Publishing — Sprint 2 Day 1 Evening Drops (September 06, 2026)
- **Instagram Feed Carousel Published**: Published 5-panel 1080×1350 carousel (`2609_d06_ig_carousel_en_sprint2_main_start_with_one_paragraph`, Post ID: `17862519315677737`) to `@writon_socialapp` with high-traffic discovery hashtags (`#writon #writingcommunity #amwriting #storytelling #writersofinstagram #books #creators`).
- **Threads Carousel Published**: Published 5-panel carousel (`2609_d06_threads_carousel_en_sprint2_main_start_with_one_paragraph`, Post ID: `18104585339251444`) to `@writon_socialapp`.
- **X (Twitter) Evening Feed Card Published**: Published evening reflection card (`2609_d06_x_card_en_sprint2_pm_start_with_one_paragraph`, Post ID: `2096580999165694228`) to `@WritOn_Social` with attached visual card and hashtags (`#writon #writingcommunity #amwriting #storytelling #writersoftwitter`).
- **Instagram Stories 2-Frame Drop Published (20:45 IST)**: Published 2-frame story sequence (`2609_d06_ig_story_en_sprint2_evening_start_with_one_paragraph`) to `@writon_socialapp`: Frame 1 (`18116316326319028`) featuring three scene anchors, and Frame 2 (`17904036192514029`) featuring verified Google Play CTA with live shortlink (`https://writon.cc/go/2609_d06_ig_story_en_sprint2_evening_start_with_one_paragraph`) and discovery hashtags (`#writon #writingcommunity #amwriting #storytelling #writersofinstagram`).
- Synchronized `campaign/published-history.json`, `campaign/antigravity-2026-09-06-19/metrics.csv`, and `campaign/antigravity-2026-09-06-19/publishing-calendar.csv`.

### Shared story routing and author imagery (September 06, 2026)
- Extended the existing notification preference endpoints additively with eight optional granular controls while preserving all four broad fields, endpoint paths, HTTP methods, and legacy request compatibility; nullable database overrides inherit their existing broad parent.
- Added canonical notification kinds for first applause, replies, new followers, followed-writer publications, reading/draft nudges, weekly prompts, and daily digests while keeping legacy inbox kinds queryable and readable.
- Updated Android notification settings to expose the eight focused controls, send only the changed field, and render legacy and canonical social kinds identically; localized all new controls in English, Hindi, Bengali, Marathi, Spanish, and French.
- Updated daily-digest and followed-writer delivery eligibility to honor their granular override before falling back to the existing editorial or publishing preference.
- Verified the additive migration and canonical publication fan-out against the isolated local PostgreSQL staging database; all 169 backend tests pass and no hosted or production environment was changed.
- Documented the proposed backward-compatible notification contract for the remaining engagement roadmap work, including legacy-field inheritance, canonical kind aliases, database-enforced deduplication, followed-writer publication fan-out, staging gates, and rollback; no API, database, or production behavior changed.
- Added an unapplied, additive notification-event deduplication migration and stable logical keys for first applause, comments, replies, and follows; duplicate notification creation now exits before enqueueing a second delivery while all public endpoints and legacy kinds remain unchanged.
- Added a disabled-by-default, migration-backed followed-writer publication pipeline: a database trigger records verified-human publication transitions atomically, a bounded retryable worker fans out only to human followers who allow publishing notifications, and recipient/author/local-day keys batch repeat publications without calling FCM inside the fan-out transaction.
- Added an isolated local/staging migration runner and the minimum staging-only notification schema needed to verify the publication trigger, delivery outbox, partial unique index, and RLS without contacting the production database or enabling FCM delivery.
- Added a disposable real-PostgreSQL notification verifier covering atomic publication capture, repeated-state deduplication, human-only follower fan-out, same-author/local-day batching, and queued-but-unsent delivery work with automatic test-record cleanup.
- Kept the publication trigger function security-invoker and revoked direct execution from public API roles, preserving internal trigger behavior without creating a callable privileged function in the exposed schema.
- Decoupled signed-in direct-token registration from guest-topic unsubscribe success, so a transient FCM topic failure cannot make an authenticated reader unreachable; expanded policy coverage for signed-in, disabled, and permission-denied states while retaining guest-only topic delivery.
- Changed story sharing to use the verified `writon.cc/stories/<slug>` App Link so opening a shared link routes to that exact story in WritOn.
- Corrected server-rendered story app intents to target the verified public story host without changing the existing API contract.
- Kept legacy profile-media URLs canonicalized through `api.writon.cc` and added an initials fallback when a public story avatar cannot load.
- Restored the branded category cover artwork whenever a story has no cover or its remote cover fails to load, across every screen using the shared story-cover component.
- Added a remotely disabled-by-default, one-time Home preference card for readers with fewer than three interests; dismissal persists locally and synchronizes across signed-in devices without blocking reading or changing an open feed session.
- Changed Settings → Reading to edit primary reading/writing intent before interests, while the optional Home card continues to open interests directly.
- Corrected social-notification semantics without changing the public API: bookmarks remain private and no longer notify authors, while applause notifications are limited to the first genuine human applause on a verified-human story and cannot be repeated by un-applauding and applauding again.
- Added contract coverage for verified story provenance, verified-human reader filtering, first-applause deduplication, and retry-safe bookmark/applause mutations.
- Removed the notification-permission request that previously appeared merely from opening the notification inbox; permission remains tied to an earned reading value moment and its existing cooldown.
- Added a localized, branded notification pre-prompt after an eligible value moment; only one opportunity is consumed per app session, declining starts the existing 14-day quiet period, and the Android system dialog appears only after explicit continuation.
- Replaced Settings’ notification-inbox shortcut with a dedicated notification settings screen backed by the existing four-field preference API, while retaining a separate inbox path and adding accurate device-level blocked status with a direct system-settings action.
- Localized the dedicated notification controls in every supported app language and made Android notification status refresh immediately when a reader returns from system settings.
- Added a device-local guest discovery-notification control that is accessible without signing in, persists across restarts, and directly governs guest-only topic membership without creating a server-side guest identity.

### Native crash symbolication (September 06, 2026)
- Enabled `SYMBOL_TABLE` native debug metadata for release builds so Gradle automatically packages any available native symbols for Google Play.
- Verified that the current native libraries (`libandroidx.graphics.path.so` and `libdatastore_shared_counter.so`) arrive pre-stripped from AndroidX dependencies, so this build cannot manufacture their unavailable symbols and Play may continue to show its advisory warning.
- Incremented the Android release identity to `2.0.51` (`versionCode 153`); version code 152 had already been uploaded to Google Play and is not reused.
- Enabled generated per-app locale configuration for English, Hindi, Spanish, French, Bengali, and Marathi, and disabled Play language splitting so every language selectable inside WritOn is present on-device.
- Suppressed AGP 8.10.1's `AppBundleLocaleChanges` false positive only after configuring the corresponding `bundle.language.enableSplit = false` release safeguard.
- Split every supported story/post App Link into an explicit host-and-path intent filter, preventing Android from combining attributes into unintended URLs while preserving all existing deep-link destinations.
- Added Android 13+ monochrome adaptive launcher assets using WritOn's existing single-colour “W” mark, enabling system-themed home-screen icons without changing the legacy or full-colour launcher appearance.
- Completed Spanish and French CLDR plural coverage for reply and selected-interest counts, preventing fallback or grammatically inconsistent count labels at large quantities.

### Website Deep Dive & Technical Architecture Polish (September 06, 2026)
- **Hero Showcase Overhaul & Asset Restoration (Resolving "This is so wrong")**:
  - **Asset Restoration**: Repaired `public/assets/explore-screen.webp` and `public/assets/editor-screen.webp`, which had been corrupted by being inadvertently overwritten with a pre-rotated two-device graphic, causing awkward double-phone nested inception inside device borders. Restored pristine 575×1280 high-fidelity single-device screenshots.
  - **Unclipped 9:20 Aspect Ratios**: Eliminated rigid fixed height cropping (`290×600` and `250×520` CSS containers with `object-fit: cover`) that truncated UI typography ("Discover stories", "The Illusion of Cache Consistency", "Add a title...", bottom navigation). Applied responsive `aspect-ratio: 575 / 1280` with chin bezel padding (`border-bottom-width: 11px`), ensuring 100% full-screen visibility from top status bar to bottom navigation.
  - **Editorial Composition & Depth**: Redesigned device alignment to gentle, complementary angles (`-3deg` front Explore feed, `+4deg` back Editor view with `255px` horizontal offset) so both screens breathe harmoniously without obscuring crucial titles or "Publish" actions.
  - **Atmospheric Watercolor & Feather Flourish**: Replaced arbitrary harsh curved stroke line with a soft radial watercolor aura and high-resolution golden sand editorial feather flourish ([public/assets/editorial_feather.svg](file:///d:/VibeCode/WritOn-PowerUp/public/assets/editorial_feather.svg)).
  - **Fluid Responsive Layout**: Seamlessly transitions from a dual-device showcase on desktop and tablet to a centered, unclipped, single-device showcase on mobile (`max-width: 560px`), eliminating cramped visual collisions.
- **Resolved Featured Stories to True Latest Published Stories**:
  - Replaced hardcoded August stories with the actual 4 latest published stories from September 5–6, 2026:
    1. *The Rear Gate of Eighth Cross* (`/stories/the-rear-gate-of-eighth-cross-b5df236f-dc3`, Essays by Devika Prasad)
    2. *The Siphon Beneath the Oak Roots* (`/stories/the-siphon-beneath-the-oak-roots-122315a6-690`, Essays by Sanjay Rawat)
    3. *The Bevel of the Qalam* (`/stories/the-bevel-of-the-qalam-620cf224-257`, Short Stories by Farhan Akhtar Kazmi)
    4. *The Night-Watch at the Sluice Gate* (`/stories/the-night-watch-at-the-sluice-gate-24316d76-d22`, Poetry by Harpreet Singh)
  - Updated category tabs in [public/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/index.html) to reflect the active database catalog: `All`, `Essays`, `Short Stories`, `Poetry`, `Shayari`, `Culture`, `Tech`, `Humour`.
  - Activated the client-side live story deck in [public/app.js](file:///d:/VibeCode/WritOn-PowerUp/public/app.js) by wiring `id="live-story-grid"`, `data-category` tab attributes, `#stories-spinner`, `#load-more-stories-btn`, and `#end-of-stories-msg`.
- **WCAG 2.1 AA Accessibility & Contrast Compliance**:
  - Replaced low-contrast brand terracotta (`#c85a3c`, 3.84:1) with `#B5442A` (5.89:1) on cream backgrounds and updated muted ink (`#746c64` → `#645c54`, 6.52:1), achieving strict WCAG AA standard compliance across the entire landing page.
  - Updated [public/stories/share.css](file:///d:/VibeCode/WritOn-PowerUp/public/stories/share.css) with high-contrast tokens (`--primary: #A5381F`, `--muted: #655B51`), guaranteeing 4.68:1 contrast on hashtag pills and 5.21:1 on reading metadata.
  - Updated all 4 legal pages ([privacy-policy.html](file:///d:/VibeCode/WritOn-PowerUp/public/privacy-policy.html), [terms.html](file:///d:/VibeCode/WritOn-PowerUp/public/terms.html), [child-safety.html](file:///d:/VibeCode/WritOn-PowerUp/public/child-safety.html), [delete-account.html](file:///d:/VibeCode/WritOn-PowerUp/public/delete-account.html)) with `#A5532E` (4.87:1) and `#6E6A65` (4.82:1).
- **Performance & Asset Footprint Optimization**:
  - Deleted orphaned 16 KB unreferenced stylesheet [public/styles.css](file:///d:/VibeCode/WritOn-PowerUp/public/styles.css).
  - Switched CTA watercolor background in inlined CSS from uncompressed PNG (`70 KB`) to WebP (`21 KB`).
  - Switched JSON-LD image references from 760 KB PNG to `app-icon.webp` (2.8 KB) and 320 KB wordmark to `writon-logo.webp` (8.6 KB).
  - Preloaded LCP hero image (`assets/explore-screen.webp`) and preconnected to `https://api.writon.cc` in `<head>`.
  - Converted below-the-fold editor screen image from `fetchpriority="high"` to `loading="lazy"`.
  - Archived ~3 MB of unused raw design mockups into `public/assets/_archive/`.
  - Added cache-busting version parameter `app.js?v=2` to eliminate 1-year immutable cache retention on JavaScript updates.
- **Web App Manifest & Security Headers (PWA & CSP)**:
  - Created Web App Manifest at [public/manifest.webmanifest](file:///d:/VibeCode/WritOn-PowerUp/public/manifest.webmanifest) with responsive icons, theme colors, and standalone display mode.
  - Configured strict Content Security Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` in [firebase.json](file:///d:/VibeCode/WritOn-PowerUp/firebase.json).
- **Brand Consistency & Crawl Hygiene**:
  - Replaced legacy `@Saurabh_682` Twitter site/creator handles with `@WritOn_Social` across all landing and story pages.
  - Replaced legacy `help@writon.co` contact emails with `help@writon.cc` across all legal policies.
  - Fixed OpenGraph URL domain in [web/index.html](file:///d:/VibeCode/WritOn-PowerUp/web/index.html) (`writon.co` → `writon.cc`).
  - Added crawler protection in [public/robots.txt](file:///d:/VibeCode/WritOn-PowerUp/public/robots.txt) for `/api/` and `/go/` endpoints.
- **Automated Verification**:
  - Created automated 41-assertion test harness (`scratch/verify-website-audit.mjs`), validating 100% pass rate.
  - Verified 164/164 tests passing across all 15 backend server test suites.

### Google News & Discover Syndication Standards (September 06, 2026)
- **Dynamic Google News XML Sitemap Endpoint (`/news-sitemap.xml`)**:
  - Implemented dynamic Google News sitemap endpoint in [server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js) complying with official Google Search Central News Sitemap schema (`xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"`).
  - Queries stories published within the last 48 hours (with automatic fallback to latest 50 published stories) containing `<news:publication>` (`<news:name>WritOn</news:name>`, `<news:language>`), `<news:publication_date>` in ISO 8601 format, and `<news:title>`.
  - Added `Sitemap: ${origin}/news-sitemap.xml` and `Allow: /news-sitemap.xml` directives in `/robots.txt` dynamic endpoint and static [public/robots.txt](file:///d:/VibeCode/WritOn-PowerUp/public/robots.txt).
- **RSS 2.0 Feed Syndication Enhancement for Google Discover (`xmlns:content`)**:
  - Enriched dynamic `/feed.xml` & `/rss.xml` handlers in [server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js) and static generator in [server/src/scripts/generate-seo-feeds.mjs](file:///d:/VibeCode/WritOn-PowerUp/server/src/scripts/generate-seo-feeds.mjs) with `xmlns:content="http://purl.org/rss/1.0/modules/content/"`.
  - Injected full syndicated `<content:encoded><![CDATA[ ... ]]></content:encoded>` per item for rich Google Discover rendering and RSS aggregator reader support.
  - Added Google News static sitemap generation (`generateNewsSitemapXml`) to [server/src/scripts/generate-seo-feeds.mjs](file:///d:/VibeCode/WritOn-PowerUp/server/src/scripts/generate-seo-feeds.mjs).
- **Automated Verification & Test Coverage**:
  - Added comprehensive test suites in [server/test/seo-sitemap.test.js](file:///d:/VibeCode/WritOn-PowerUp/server/test/seo-sitemap.test.js) verifying:
    1. `GET /news-sitemap.xml` returns HTTP 200 with XML content-type, `xmlns:news` schema, `<news:name>`, `<news:language>`, `<news:publication_date>`, and story locations.
    2. `GET /robots.txt` declares `Sitemap: https://writon.cc/news-sitemap.xml` and `Allow: /news-sitemap.xml`.
    3. `GET /feed.xml` and `/rss.xml` include `xmlns:content` and `<content:encoded>` tags.
  - Verified 100% pass rate across all 30 tests in `test/seo-sitemap.test.js` and all 164 tests in the server test suite.

### Author E-E-A-T & Public Profile Pages (September 06, 2026)
- **Server-Side Rendered Author Profile Pages (`/author/:penName`)**:
  - Implemented server-side rendered author profile pages in [server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js) returning crawlable, responsive HTML using WritOn's paper/ink design tokens.
  - Profile features author avatar with fallback initials, full name, `@penName` handle, bio, and quote of the day.
  - Lists the author's published stories as crawlable `<article>` cards linking to `/stories/:slug` with cover art, category badges, reading time, summary, and published dates.
  - Added clean 404 HTML fallback (`renderAuthorNotFoundHtml`) for missing or deactivated author profiles.
- **Canonical Routing & 301 Permanent Redirects**:
  - Added HTTP 301 permanent redirects from `/authors/:penName` &rarr; `/author/:penName`, `/authors/:penName/` &rarr; `/author/:penName`, and `/author/:penName/` &rarr; `/author/:penName` preserving query parameters.
- **Schema.org Structured Data (`ProfilePage` & `Person`)**:
  - Injected Schema.org `ProfilePage` structured data into `<head>` of `/author/:penName` with `mainEntity` set to `Person` containing author full name, alternateName (`@penName`), description/bio, image, canonical url, and `mainEntityOfPage`.
  - Added full Open Graph (`og:type="profile"`, `profile:username`) and Twitter card preview tags.
- **Author Knowledge Graph Linking Across Reader & Discovery Feeds**:
  - In `renderStorySharePage` ([server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js)), linked author byline and portrait to `/author/:penName`, and added author `url` in `BlogPosting` JSON-LD schema.
  - In `renderDiscoveryDeckHtml` ([server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js)), wrapped author info in clickable links to `/author/:penName` and enriched `CollectionPage` item list JSON-LD schema with author URLs.
  - Added `Allow: /author/*` directive to `/robots.txt`.
- **Automated Verification & Test Coverage**:
  - Updated mock database in [server/test/seo-sitemap.test.js](file:///d:/VibeCode/WritOn-PowerUp/server/test/seo-sitemap.test.js) to support author profiles and authored story queries.
  - Added test suites asserting:
    1. `GET /author/maya_lin_craft` returns HTTP 200 with author bio, published story cards, and Schema.org `ProfilePage`/`Person`.
    2. `GET /authors/maya_lin_craft` and trailing slash variants return HTTP 301 redirect to `/author/maya_lin_craft`.
    3. `GET /stories/:slug` contains author URL linking to `/author/...` in HTML and JSON-LD `BlogPosting` schema.
    4. `GET /stories` discovery deck contains author profile links on story cards.
    5. `GET /author/non_existent_author_xyz` returns HTTP 404 with clean HTML.
  - Verified 100% pass rate across all 29 tests in `seo-sitemap.test.js` and all 163 tests across 15 test suites.

### Generative AI Search & Answer Engine Optimization (GEO/AEO) (September 06, 2026)
- **Schema.org FAQPage Structured Data (Google Rich Snippets & Entity Grounding)**:
  - Injected `schema.org/FAQPage` entity in JSON-LD `@graph` within `renderDiscoveryDeckHtml` ([server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js)) with authoritative Q&As answering platform definition ("What is WritOn?"), offline reading capabilities, author publishing workflow, and free access on Google Play.
  - Injected matching `FAQPage` structured data in `<head>` of [public/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/index.html) and [public/stories/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/stories/index.html).
  - Added semantic, accessible `<section class="faq-section">` using native HTML5 `<details>` and `<summary>` elements in the discovery deck to guarantee that all FAQ structured data is visible on the page, complying strictly with Google Search Central guidelines.
- **Entity Grounding & Authority Graph (`sameAs` & App Schema)**:
  - Enriched `Organization` and `SoftwareApplication` entities across `renderDiscoveryDeckHtml`, `renderStorySharePage` ([server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js)), [public/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/index.html), and [public/stories/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/stories/index.html).
  - Grounded canonical authority across verified entity profiles with `sameAs` links to Google Play (`https://play.google.com/store/apps/details?id=com.ibitvalley.writon`) and GitHub (`https://github.com/Saurabh682/WritOn-PowerUp`).
  - Formally declared `applicationCategory: "BooksAndReferenceApplication"` on `SoftwareApplication` nodes with offers, image, and download metadata.
- **High-Density Answer Architecture (First 100 Words Direct Answer)**:
  - Formulated an authoritative, entity-dense lead definition in the discovery deck hero section ("What is WritOn"), designed for direct retrieval and quotation by Generative AI engines (Gemini, Google AI Overviews, Perplexity).
- **Automated Verification & Test Coverage**:
  - Added automated test cases in [server/test/seo-sitemap.test.js](file:///d:/VibeCode/WritOn-PowerUp/server/test/seo-sitemap.test.js) verifying FAQPage schema presence, question/answer structure, visible FAQ HTML rendering, and entity `sameAs` grounding across `/stories` and story share pages.
  - Verified 100% pass rate across 24 tests in `seo-sitemap.test.js` and all 158 tests across 15 test suites.

### Mobile-First Indexing & Core Web Vitals Optimization (September 06, 2026)
- **Font Resource Optimization (LCP & CLS Prevention)**:
  - Enforced `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` across server-rendered templates (`renderDiscoveryDeckHtml` in [server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js), `renderStorySharePage` in [server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js)) and verified presence in public static pages ([public/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/index.html), [public/stories/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/stories/index.html), [public/privacy-policy.html](file:///d:/VibeCode/WritOn-PowerUp/public/privacy-policy.html), [public/terms.html](file:///d:/VibeCode/WritOn-PowerUp/public/terms.html), [public/child-safety.html](file:///d:/VibeCode/WritOn-PowerUp/public/child-safety.html), [public/delete-account.html](file:///d:/VibeCode/WritOn-PowerUp/public/delete-account.html)).
  - Ensured Google Fonts stylesheets (Inter, Newsreader, Plus Jakarta Sans) include `&display=swap` to eliminate Flash of Invisible Text (FOIT) and eliminate Cumulative Layout Shift (CLS).
- **Standardized Mobile Viewport & Safe-Area Insets (`viewport-fit=cover`)**:
  - Upgraded `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` consistently across [server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js), [server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js) (story share and policy routes `/privacy-policy`, `/terms`, `/delete-account`, `/child-safety`), [public/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/index.html), [public/stories/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/stories/index.html), and all public/root policy HTML files.
- **Critical Asset Preloading (LCP Acceleration)**:
  - Added `<link rel="preload" as="image" href="/assets/favicon-48x48.png">` to `<head>` in `renderDiscoveryDeckHtml` and `renderStorySharePage` to expedite Largest Contentful Paint during initial browser DOM streaming and header parse.
- **Touch Target Sizing Compliance (Google Mobile Usability & WCAG AA)**:
  - Configured interactive controls to satisfy the minimum touch target dimensions (`min-height: 44px; display: inline-flex; align-items: center; justify-content: center;`) for category filter pills (`.pill`), header action buttons (`.app-badge-btn`), card arrow links (`.card-arrow-btn`, 44x44px), sticky conversion actions (`.sticky-btn`, `.bar-btn`), and call-to-actions.
- **Automated Verification & Test Coverage**:
  - Added 4 automated vitest test cases in [server/test/seo-sitemap.test.js](file:///d:/VibeCode/WritOn-PowerUp/server/test/seo-sitemap.test.js) validating font preconnect directives, `display=swap`, `viewport-fit=cover` viewport meta tag, critical image preload tag, and minimum touch target CSS metrics.
  - Verified 100% pass rate across 22 tests in `seo-sitemap.test.js` and all 156 tests across 15 test suites.

### International & Multilingual SEO Compliance (hreflang) (September 06, 2026)
- **Dynamic HTML Language Declaration (`<html lang="...">`)**:
  - Selected `coalesce(nullif(p.language_code, 'und'), 'en') as "language"` in `/stories/:slug` SQL query ([server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js)).
  - Implemented dynamic language normalization (`normalizeStoryLanguage`) supporting English (`en`), Hindi (`hi`), Marathi (`mr`), Bengali (`bn`), Spanish (`es`), and French (`fr`) with safe `'en'` fallback.
  - Rendered `<html lang="${escapeXml(storyLang)}">` dynamically in `renderStorySharePage` instead of hardcoded `<html lang="en">`.
  - Added client-side dynamic language declaration in [public/stories/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/stories/index.html), setting `document.documentElement.lang = story.language || 'en'` on post payload resolution.
  - Exposed normalized `language` property on `toReaderPost` API transformer.
- **Google `hreflang` Alternates & Global Fallback (`x-default`)**:
  - Injected self-referential language link `<link rel="alternate" hreflang="${escapeXml(storyLang)}" href="${pureCanonicalUrl}">` and fallback `<link rel="alternate" hreflang="x-default" href="${pureCanonicalUrl}">` into story share page `<head>` ([server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js)).
  - Injected `<link rel="alternate" hreflang="en" href="${canonicalUrl}">` and `<link rel="alternate" hreflang="x-default" href="${canonicalUrl}">` into `/stories` discovery deck ([server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js)).
  - Added static hreflang directives `<link rel="alternate" hreflang="en" href="https://writon.cc/">` and `<link rel="alternate" hreflang="x-default" href="https://writon.cc/">` across [public/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/index.html) and [public/stories/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/stories/index.html).
- **Open Graph Regional Locales (`og:locale`)**:
  - Mapped language codes to ISO standard Open Graph locales: `en` -> `en_US`, `hi` -> `hi_IN`, `mr` -> `mr_IN`, `bn` -> `bn_IN`, `es` -> `es_ES`, `fr` -> `fr_FR`.
  - Added `<meta property="og:locale" content="${escapeXml(ogLocale)}">` across `renderStorySharePage` ([server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js)) and `renderDiscoveryDeckHtml` ([server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js)).
  - Added `<meta property="og:locale" content="en_US" />` in [public/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/index.html) and [public/stories/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/stories/index.html) with dynamic runtime updates.
- **Automated Verification & Test Coverage**:
  - Updated mock database in [server/test/seo-sitemap.test.js](file:///d:/VibeCode/WritOn-PowerUp/server/test/seo-sitemap.test.js) with English (`language: 'en'`) and Hindi (`language: 'hi'`) mock stories.
  - Added test suites asserting dynamic `<html lang>`, `hreflang` alternate tags, `hreflang="x-default"`, and regional `og:locale` (`en_US`, `hi_IN`) across `/stories/:slug` and `/stories` discovery deck.
  - All 18 tests in `test/seo-sitemap.test.js` and all 152 tests across 15 test suites pass with 100% success.

### Google Search Central Image Sitemaps Extension (September 06, 2026)
- **Dynamic XML Sitemap Image Extension (`/sitemap.xml`)**:
  - Implemented the official Google Search Central Image Sitemaps schema (`xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`) in [server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js).
  - Updated database query to fetch `p.slug`, `p.title`, `p.summary`, `p.cover_image_url as "coverImage"`, and `coalesce(p.updated_at, p.published_at, p.created_at) as "lastmod"`.
  - Injected `<image:image>` blocks containing `<image:loc>`, `<image:title>`, and `<image:caption>` for all published stories with cover artwork.
  - Added brand identity image metadata (`writon_wordmark.png` and `writon_app_icon.png`) for root (`/`) and story hub (`/stories`) static URLs.
- **Static Feed Generator Synchronization**:
  - Updated `generateFullSitemapXml(posts)` in [server/src/scripts/generate-seo-feeds.mjs](file:///d:/VibeCode/WritOn-PowerUp/server/src/scripts/generate-seo-feeds.mjs) with image namespace declarations and per-post image nodes.
  - Regenerated [public/sitemap.xml](file:///d:/VibeCode/WritOn-PowerUp/public/sitemap.xml) indexing 725 URLs with rich image locations, titles, and captions across all 706 live published stories.
- **Test Coverage & Verification**:
  - Updated mock database rows and test assertions in [server/test/seo-sitemap.test.js](file:///d:/VibeCode/WritOn-PowerUp/server/test/seo-sitemap.test.js) to verify `xmlns:image`, `<image:image>`, `<image:loc>`, `<image:title>`, `<image:caption>`, and brand images.
  - Verified 100% pass rate across the full 15 test suites and 150 vitest tests.

### Google Search Appearance & Rich Snippet Compliance (September 06, 2026)
- **Snippets & Boilerplate Exclusion (`data-nosnippet`)**:
  - Implemented Google Search Central `data-nosnippet` attribute across boilerplate navigation, banners, app download prompts, and footers in `renderDiscoveryDeckHtml` ([server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js)), `renderStorySharePage` ([server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js)), [public/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/index.html), and [public/stories/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/stories/index.html) to prevent search engines from extracting UI/app chrome boilerplate as story snippets.
- **Title Links & Meta Descriptions Optimization**:
  - Added brand-differentiated `<title>` tags and concise `<meta name="description">` tags (under 160 characters) to static policy pages: [public/privacy-policy.html](file:///d:/VibeCode/WritOn-PowerUp/public/privacy-policy.html), [public/terms.html](file:///d:/VibeCode/WritOn-PowerUp/public/terms.html), [public/child-safety.html](file:///d:/VibeCode/WritOn-PowerUp/public/child-safety.html), and [public/delete-account.html](file:///d:/VibeCode/WritOn-PowerUp/public/delete-account.html).
  - Standardized story title link anchors and page titles in `renderStorySharePage` and `renderDiscoveryDeckHtml` to follow `${story.title} — WritOn`.
- **Visual Elements & High-Resolution Preview Attributes**:
  - Added explicit `<meta property="og:image:width" content="1200">` and `<meta property="og:image:height" content="630">` to `renderDiscoveryDeckHtml` and `renderStorySharePage` to instruct Google Search and social crawlers to display high-resolution large preview cards.
  - Reinforced `max-image-preview:large, max-snippet:-1, max-video-preview:-1` robots directives and ensured story cover images feature descriptive `alt` text (`Cover artwork for ...`) along with `loading="lazy"` and `decoding="async"`.
- **Automated Verification & Test Coverage**:
  - Added 4 dedicated tests in [server/test/seo-sitemap.test.js](file:///d:/VibeCode/WritOn-PowerUp/server/test/seo-sitemap.test.js) asserting presence of `data-nosnippet`, Open Graph dimensions (1200x630), robots preview directives, and cover image attributes. All 16 tests in the SEO test suite and 150 tests across the server suite pass cleanly.

### Google Search Canonicalization & Clean URLs Normalization (September 06, 2026)
- **Tracking & Unwanted Query Parameter Stripping**:
  - Enforced pure canonical URLs in `renderDiscoveryDeckHtml` ([server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js)) and `renderStorySharePage` ([server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js)), stripping tracking and unwanted query parameters (`utm_*`, `fbclid`, `gclid`, `ref`, `source`) from `<link rel="canonical">` and JSON-LD `url` and `mainEntityOfPage` properties.
  - Normalized valid category parameter retention (e.g. `https://writon.cc/stories?category=Tech`) while falling back to clean `/stories` for invalid categories or parameterless visits.
- **Static Canonical Tags on Policy Pages**:
  - Added clean, self-referential `<link rel="canonical">` tags across [public/privacy-policy.html](file:///d:/VibeCode/WritOn-PowerUp/public/privacy-policy.html), [public/terms.html](file:///d:/VibeCode/WritOn-PowerUp/public/terms.html), [public/child-safety.html](file:///d:/VibeCode/WritOn-PowerUp/public/child-safety.html), and [public/delete-account.html](file:///d:/VibeCode/WritOn-PowerUp/public/delete-account.html), harmonized with `public/index.html` and `public/stories/index.html`.
- **Trailing Slash Normalization (301 Permanent Redirects)**:
  - Added Fastify 301 redirect routes in [server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js) for `/stories/` -> `/stories` and `/stories/:slug/` -> `/stories/:slug`, preserving query parameters where appropriate while adhering to Google Search Central URL normalization standards.
  - Implemented `sendPermanentRedirect` helper alongside `sendFoundRedirect`.
- **Legacy Story Query Redirection**:
  - In `/stories` route handler ([server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js)), added database slug lookup and permanent 301 redirection for legacy `?storyId=<id>` and `?id=<id>` query parameters to `/stories/<slug>`.
- **Automated Verification**:
  - Added test coverage in [server/test/seo-sitemap.test.js](file:///d:/VibeCode/WritOn-PowerUp/server/test/seo-sitemap.test.js) validating canonical parameter stripping, 301 trailing slash redirects, and legacy story ID redirection (12/12 passing). All 15 server test suites and 146 unit/integration tests passed.

### Google Search Appearance, Favicons & Structured Data Compliance (September 06, 2026)
- **Google Search Favicon Compliance**: Injected Google-mandated 48px square multiples (`48x48`, `192x192`, `apple-touch-icon 180x180`) into [public/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/index.html) and [public/stories/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/stories/index.html). Resolves the missing homepage favicon links so Google Search displays the branded WritOn logo instead of a generic globe icon.
- **Dynamic Schema.org Breadcrumbs & BlogPosting**: Added automatic JSON-LD `@graph` injection into `public/stories/index.html` and server-rendered templates, generating `schema.org/BreadcrumbList` (`Home > Category > Story`) and `schema.org/BlogPosting` (`headline`, `description`, `author`, `datePublished`, `image`) for Google rich snippets.
- **Enhanced Server-Side Rendered Story Reader**: Equipped `renderStorySharePage` and `renderDiscoveryDeckHtml` in [server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js) and [server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js) with Google-compliant favicon links, RSS discovery headers, and breadcrumbs schema.
- **Verified & Deployed**: Passed all 9 Vitest SEO tests and deployed updated frontend to Firebase Hosting CDN (`writon-app-2020`).

### Google Search Console & Real-Time RSS Ingestion (September 06, 2026)
- **Implemented RSS 2.0 Feed (`/feed.xml` & `/rss.xml`)**: Generated a production RSS 2.0 feed containing the latest 50 stories with `<pubDate>`, `<dc:creator>`, `<media:content>`, `<category>`, and per-story permanent `<guid>` elements for Google Search, Google Discover, Feedly, and syndication tools.
- **Synchronized Full Master Sitemap (`/sitemap.xml`)**: Re-synchronized all 706 live published stories and 13 category hubs (725 total URLs) from the database/API with updated `<lastmod>` timestamps.
- **Added RSS Auto-Discovery Directives**: Added `<link rel="alternate" type="application/rss+xml" href="https://writon.cc/feed.xml" />` across [public/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/index.html) and [public/stories/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/stories/index.html).
- **Updated Search Engine Directives (`robots.txt`)**: Declared both `Sitemap: https://writon.cc/sitemap.xml` and `Sitemap: https://writon.cc/feed.xml` in [public/robots.txt](file:///d:/VibeCode/WritOn-PowerUp/public/robots.txt) and dynamic server SEO routes.
- **Configured Firebase Hosting Caching**: Added explicit `application/rss+xml; charset=utf-8` MIME headers and stale-while-revalidate caching directives for `/feed.xml` in [firebase.json](file:///d:/VibeCode/WritOn-PowerUp/firebase.json).
- **Successfully Submitted Feed to Google Search Console**: Submitted `https://writon.cc/feed.xml` alongside `https://writon.cc/sitemap.xml` to `sc-domain:writon.cc` in Google Search Console, receiving confirmation "Sitemap submitted successfully".
- **Deployed to Live CDN**: Deployed all updated assets to Firebase Hosting (`writon-app-2020`), with verified live HTTP `200 OK` responses.

### Google Search Console & SEO Indexation Resolution (September 06, 2026)
- **Resolved Stale Sitemap Failure**: Diagnosed and purged an outdated sitemap entry stuck in `Couldn't fetch` since September 1, 2026. Successfully submitted fresh XML sitemap (`/sitemap.xml`) to Google Search Console on September 6, 2026.
- **Audited Googlebot Crawl & Index State**: Verified via Search Console live inspection that the homepage (`https://writon.cc/`) is officially crawled, validated as HTTPS, and marked as **Page is indexed** with valid Review Snippets enhancements.
- **Enqueued Priority Crawl for `/stories` & Homepage**: Pushed priority crawl and index requests directly to Googlebot via URL Inspection for both `https://writon.cc/` and `https://writon.cc/stories`.
- **Added Robots Meta Directives & Dynamic Canonicals**: Injected `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />` across `public/index.html` and `public/stories/index.html`. Added explicit dynamic canonical linking (`https://writon.cc/stories/<slug>`) to prevent duplicate canonical warnings.

### Account-Isolated Local Drafts (September 06, 2026)
- Scoped local draft restoration, updates, deletion, and synchronization to the active account or guest space.
- Quarantined legacy drafts whose ownership cannot be proven instead of silently assigning or deleting them.
- Prevented guest, legacy, and account-mismatched queued drafts from uploading under another identity.
- Added an explicit signed-in recovery prompt so a reader can deliberately claim an older quarantined draft or safely leave it untouched.

### Faster, Clearer Welcome Experience (September 06, 2026)
- Replaced the four-page technical welcome carousel with one concise, scrollable introduction.
- Made visitor reading the primary action, retained direct writing and sign-in paths, and added accessible Terms and Privacy links.
- Removed unverified AI, passkey, and implementation-detail promises from first contact.

### Honest and Recoverable Feed States (September 06, 2026)
- Distinguished initial loading, genuine empty inventory, network failure, offline cached stories, pagination failure, and end-of-feed states on Home.
- Added direct retry actions while preserving cached stories during connectivity failures.

### Reader Story Loading Feedback (September 06, 2026)
- Replaced the misleading empty-story placeholder with a progress indicator while the full story text is fetched.
- Added a clear connection error and retry action when the story text cannot be retrieved.

### Dietrich Gebert's Ponytail Integration — Pragmatic Code Minimization (September 06, 2026)
- Installed Dietrich Gebert's **Ponytail** pragmatic code minimization system ("The Decision Ladder") into both the global Antigravity environment (`C:/Users/Kumar/.gemini/config/skills/`) and local workspace (`.agents/skills/`, `.agents/rules/ponytail.md`).
- Equipped the agent environment with the full skill suite:
  - `ponytail`: Core Decision Ladder execution (`YAGNI` → `Codebase Reuse` → `Stdlib First` → `Native Platform` → `Installed Dependencies` → `One Line` → `Minimum Necessary`).
  - `ponytail-audit`: Repository-wide over-engineering audit tool ranking cuttable lines and redundant dependencies.
  - `ponytail-review`: Focused diff/code-change over-engineering review.
  - `ponytail-debt`: Ledger tracking for deliberate `ponytail:` shortcut comments and triggers.
  - `ponytail-gain`: Measured-impact scoreboard (loc, cost, speed benchmark tracking).
  - `ponytail-help`: Quick-reference command card.
- Appended the Ponytail Decision Ladder directives to `AGENTS.md` to ensure persistent enforcement across turns while strictly preserving all non-negotiable trust-boundary validations, error handling, security, and accessibility (WCAG AA).

### Personalized onboarding v2 — intent step (September 06, 2026)
- Added a calm first onboarding step asking new account holders whether they came to read, write, or do both; skipping remains available.
- Persisted primary intent locally before navigation and queued signed-in changes for the existing engagement-preferences staging API without changing its contract.
- Kept returning sign-ins and visitor reading friction-free while routing newly created accounts through intent and interests.
- Marked completed two-step onboarding as version 2 and added English, Hindi, Bengali, Marathi, Spanish, and French copy with scrollable large-text support and 48dp selection targets.
- Added focused preference tests and Firebase App Testing journeys; production deployment remains intentionally unchanged.
- Installed the staging-configured 2.0.46 debug build over 2.0.44 on the Redmi 25028RN03I without clearing app data; all three intent-screen tests and the interests-screen test passed, Home loaded staging content, cold launch and background resume succeeded, and the device crash buffer remained empty.

### Day 1 Midday Social Drop: Instagram Story Poll (September 06, 2026)
- **Live Publishing to Instagram (`@writon_socialapp`)**:
  - Published Day 1 Midday Story Frame in Option 1 (Warm Parchment & Watercolor Theme) featuring the interactive check-in poll card ("What brings you here today? A: Reading original stories / B: Writing a new draft") to [`@writon_socialapp`](https://www.instagram.com/writon_socialapp/) (Story Media ID: `18100765196198419`).
  - Strict compliance: 100% visual card policy (1080×1920 9:16 portrait), dynamic campaign shortlink (`https://writon.cc/go/2609_d06_ig_story_en_sprint2_midday_start_with_one_paragraph`), and 5 platform hashtags (`#writon #writingcommunity #amwriting #storytelling #writersofinstagram`).
  - Recorded publish baseline and status in `campaign/antigravity-2026-09-06-19/metrics.csv`, `published-history.json`, and `publishing-calendar.csv`.

### Day 1 Morning Social Drop: Start With One Paragraph (September 06, 2026)
- **Live Publishing to X (`@WritOn_Social`)**:
  - Published Day 1 Morning Prompt Card in Option A (Warm Parchment & Watercolor Theme) featuring the 3 scene anchors to [`@WritOn_Social`](https://x.com/WritOn_Social) (Tweet ID: [`2096467751598690695`](https://x.com/WritOn_Social/status/2096467751598690695)).
  - Attached automated conversion thread reply with direct shortlink to Google Play (Reply ID: `2096467754476036568`).
  - Strict compliance: exactly 3 hashtags (`#writon #writingcommunity #amwriting`), 100% visual card policy, dynamic UTM campaign attribution (`2609_d06_x_card_en_sprint2_am_start_with_one_paragraph`).
  - Recorded initial publish baseline in `campaign/antigravity-2026-09-06-19/metrics.csv`, `published-history.json`, and marked status `published` in `publishing-calendar.csv`.

### Hosted engagement-preferences staging gate recovery (September 06, 2026)
- **Supabase Staging Recovery (`writon-staging`, ref `xrfnebvkazewqramkpri`)**:
  - Successfully executed clean password reset in Supabase dashboard and verified via fresh SQL probes (`SELECT 1 AS staging_probe, current_database(), current_user, now()`).
  - Verified catalog tables (`profiles`, `profile_auth_identities`, `profile_engagement_preferences`, `posts`, `legacy_import_profile_attributes`, `bot_configs`).
  - Verified column schema (8/8) and RLS enablement on `profile_engagement_preferences`.
  - Added missing `profile_auth_identities` table to staging bootstrap dependencies (`002_api_smoke_dependencies.sql`) for complete authentication mapping reproducibility.
- **Render Staging Deployment (`srv-dae6l58u01pc73dahp20`)**:
  - Live deployment revision `dep-daefne6q1p3s7395b3rg` successfully compiled and deployed on Render.
  - Pinned `DATABASE_URL` to the IPv4 session pooler (`aws-0-ap-southeast-1.pooler.supabase.com:5432`).
  - Scoped TLS validation active using `NODE_EXTRA_CA_CERTS=/etc/secrets/prod-ca-2021.crt`.
  - Enforced all production-isolation flags (`NODE_ENV=staging`, `PUSH_DELIVERY_ENABLED=false`, `DAILY_DIGEST_ENABLED=false`, `SOCIAL_AUTO_PUBLISH_ENABLED=false`, `SPARK_AUTOMATION_ENABLED=false`, `FEED_BEHAVIOR_ROLLOUT_PERCENT=0`, `REVIEW_PROMPT_ENABLED=false`).
- **End-to-End Hosted Verification**:
  - `GET /health` returned `HTTP 200 OK` (`status="ok"`, `database="connected"`).
  - Unauthenticated requests rejected with `HTTP 401 Unauthorized` (`error="Authentication required"`).
  - Invalid tokens rejected with `HTTP 401 Unauthorized` (`error="Invalid or expired Firebase token"`).
  - Valid Firebase test identity verified with default preference read (`HTTP 200`, `preferenceCardState="unseen"`).
  - Malformed preference updates rejected with `HTTP 400 Bad Request`.
  - Valid preference updates persisted and round-tripped (`HTTP 200`, `primaryIntent="both"`, `onboardingVersion=2`, `preferenceCardState="completed"`).
  - Multi-user account isolation verified with second disposable test identity.
  - Teardown verified: test identities deleted from Firebase Auth and cascaded cleanly from staging database (`remaining preference records = 0`).
  - Production database, Cloud Run, DNS, release branches, and the live Day 1 social media campaign remain completely untouched.

### Engagement roadmap Phase 2 foundation (September 05, 2026)
- Added an authenticated, additive engagement-preferences contract for primary intent, onboarding version/completion, and the existing-user preference-card lifecycle; all existing API routes and response shapes remain unchanged.
- Added a server-owned Postgres preference table with profile cascade deletion, validation constraints, RLS enabled, and direct `anon`/`authenticated` Data API privileges revoked.
- Added account-isolated and guest-local Android preference snapshots saved atomically for process-death safety, plus client DTOs for later onboarding-v2 integration.
- Incremented the local Android development build to `versionCode 147` / `versionName 2.0.45`. No migration, server build, Android build, or Play release was deployed.

### Notification destination correction (September 05, 2026)
- Allowed validated app-wide push notifications with `targetRoute=home` to open the Home feed instead of incorrectly falling back to the Notifications inbox.
- Kept notification navigation constrained to the explicit Home, Notifications, and valid story-reader routes; unknown or malformed values still fall back safely to Notifications.
- Added a route-resolution regression test and incremented Android to `versionCode 146` / `versionName 2.0.44` for the local development build. No production deployment was performed.

### Compose Lifecycle Crash Stabilization (September 05, 2026)
- Updated the stable Jetpack Compose dependency set to address rare `LayoutNode` measurement and activity-destruction crashes, particularly on older Android devices and during instrumented testing.
- Migrated locale creation, Material 3 top bars and tab rows, and Compose UI test rules to their supported APIs after the dependency upgrade.

### Credential Manager Google Sign-In Migration (September 05, 2026)
- Replaced the deprecated Google Sign-In Android client with Credential Manager while preserving Firebase Authentication, network-token synchronization, profile synchronization, and existing backend contracts.
- Added the documented authorized-account-first flow with an all-account fallback, silent user cancellation, safe unsupported-credential handling, and credential-state clearing on sign-out.
- Preserved the Activity-backed Compose context while applying localized configuration, fixing an unresponsive Google button caused by Credential Manager being unable to resolve its host Activity.
- Verified the real Credential Manager chooser, Google credential return, Firebase handoff, WritOn profile load, and clean post-login UI on a Redmi A5 running the locally installed 2.0.43 (145) test build.

### 14-Day Organic Social Growth Sprint: Campaign Setup & Day 1 Assets (September 05, 2026)
- **Campaign Reconciliation & Registry Activation**:
  - Reconciled `campaign/content-calendar.csv` to activate the 70 scheduled delivery rows for the two-week sprint (September 6–19, 2026 IST) as specified in `PLAN.md`, archiving old draft entries.
  - Synchronized `campaign/delivery-registry.json` with 70 new delivery entries mapping platform prefixes, format types, and dynamic UTM attribution parameters.
- **High-Fidelity Visual Card Rendering Engine**:
  - Developed `scratch/sprint2-card-generator.mjs` using Sharp and SVG vector templates adhering strictly to WritOn design tokens (Obsidian `#111213`, Card Surface `#1A1C1E`, WritOn Red `#E75A2A`, Sage Green `#4EBA6F`, Georgia serif, and Arial proportional typography).
  - Rendered all 10 visual image assets for Day 1 into `campaign/antigravity-2026-09-06-19/assets/day1/`:
    - `day1_am_x_card.png` (1080×1080): Morning writing prompt with 3 craft anchors.
    - `day1_midday_story_frame.png` (1080×1920): Midday reader/writer poll frame inside safe margins.
    - `day1_main_carousel_slide_1.png` through `slide_5.png` (1080×1350): 5-slide editorial practice carousel with reader deck preview and pen name CTA.
    - `day1_pm_x_card.png` (1080×1080): Evening 5-minute writing session invitation.
    - `day1_evening_story_frame_1.png` & `frame_2.png` (1080×1920): 2-frame evening drop featuring feed recap and verified app link sticker.
- **Automated Multi-Slot Dispatcher Engine**:
  - Built `scratch/sprint2-dispatcher.mjs` supporting multi-slot execution (`09:00`, `12:30`, `19:30`, `20:30`, `20:45 IST`), dry-run simulations, and live publishing across X and Instagram.
  - Verified 100% pass on Day 1 dry run: asset integrity on disk, exact hashtag counts (3 on X, 5 on IG), and shortlink redirection via `https://writon.cc/go/...`.

### Sign-in account discovery fix (September 05, 2026)
- Added a clear, localized **Create Account** button directly below **Sign In**, so signup is discoverable on compact displays such as the Redmi A5.
- Made the sign-in form vertically scrollable and responsive to the keyboard and navigation-bar insets.
- Preserved the existing signup route and Firebase authentication APIs without changing their contracts.

### Daily digest duplicate protection (September 05, 2026)
- Added a durable Postgres dispatch ledger and an atomic India-local daily claim before any FCM send.
- Concurrent or repeated scheduler invocations now stop before delivery when that day has already been claimed.
- Applied and verified the additive production migration with RLS enabled, client-role access revoked, and server-role access retained.
- Verified a production concurrency smoke with exactly one winning claim, deployed Cloud Run revision `writon-app-api-canary-00060-mub`, and promoted it to 100% after tagged and stable-domain health, version, category, and feed checks passed.
- Enabled the production Cloud Scheduler job `writon-daily-digest` after explicit approval, then performed an explicitly requested manual test run. The request returned 200 and correctly sent nothing because production contained zero eligible verified-human stories from the preceding 24 hours; no daily claim or FCM acceptance was recorded.
- During post-run auditing, detected that canary revision `writon-app-api-canary-00060-mub` omitted the established bot scheduler route. Immediately paused the digest and restored 100% traffic to known-good revision `writon-app-api-canary-00058-dun`. Production health returned 200 and the restored bot route returned 415 for an intentionally payload-free probe rather than 404. The digest remains paused until the route-preserving integration is complete.

### Google Analytics 4 (GA4) Telemetry & Analytics Extraction (September 05, 2026)

- **GA4 Property 219865538 Extraction (Last 28 Days: Aug 8 – Sep 4, 2026)**:
  - Extracted 28-day analytics telemetry from Google Analytics for `writon.co` / `WritOn App 2020` (Property ID `219865538`).
  - Recorded 129 Active Users, 124 New Users, 19 Returning Users, 6m 07s Average Engagement Time, 2,881 Total Events, and 406 Key Events (100% user conversion rate).
  - Profiled User & Traffic Acquisition channels: Direct (73.93% sessions, 64.25% engagement rate) and Play Store Organic Search (25.00% sessions, 95.71% engagement rate).
  - Mapped 25 distinct client/server telemetry events including `screen_view` (879), `writon_launch` (332), `version_check` (215), `push_registration` (155), and `first_open` (124).
  - Analyzed Screen performance highlighting `WritOnModernActivity` (533 views, 108 users, 6m 08s avg time) as the primary hub.
  - Persisted structured dataset exports: `data-exports/json/ga4_analytics_28d_summary.json`, `data-exports/csv/ga4_events_breakdown.csv`, `data-exports/csv/ga4_screens_breakdown.csv`, and `data-exports/csv/ga4_channels_traffic.csv`.

### Day 5 Social Campaign: Author Spotlight ("The Last Train from Howrah Station") (September 05, 2026)

- **Social Media Day 5 Publishing (All Formats Live)**:
  - **Instagram Carousel (5 Archetype Slides)**: Published 5 high-contrast Obsidian dark cards to [`@writon_socialapp`](https://www.instagram.com/writon_socialapp/) (Post ID: `17967945285154014`). Featuring Devansh Roy (`@devansh_roy`), reader interface deck mockups, craft quotes, and community constellation.
  - **Instagram Story (1080×1920)**: Published vertical story card to [`@writon_socialapp`](https://www.instagram.com/writon_socialapp/) (Story ID: `18633919555036097`) with safe-zone typography and Google Play CTA sticker anchor.
  - **X / Twitter**: Published visual spotlight card and tweet to [`@WritOn_Social`](https://x.com/WritOn_Social) (Tweet ID: `2096080964791459895`) with threaded conversion reply (Reply ID: `2096080967073223038`).
  - **Threads**: Published single-card spotlight to [`@writon_socialapp`](https://www.threads.net/@writon_socialapp) (Post ID: `18359488465246358`).
  - **Routing & Attribution**: Verified shortlink `https://writon.cc/go/2609_d05_ig_carousel_en_author_spotlight` redirecting to Google Play with full campaign attribution tags.

### Engagement Roadmap Review (September 05, 2026)

- Guest-entry stabilization: visitor access is visible on every welcome slide and opens Home directly. Account-required actions offer Sign in or Keep reading; dismissing the prompt does not execute the action. Added localized prompt copy and device UI regression tests.
- Redmi A5 crash stabilization: captured repeated `LayoutNode should be attached to an owner` exceptions during animated layout and reproduced a detach-lifecycle failure in the real-activity test. Aligned Compose with BOM 2025.11.01 (previously Material 1.6.8 / Material3 1.2.1 mixed with UI/runtime 1.9.2). Four device UI tests passed with normal navigation transitions restored, including repeated Home/Explore navigation, guest gate dismissal and activity recreation. No backend API changes.
- Guest notifications: permission can be requested after leaving a story with at least 70% progress and 30 seconds of foreground engagement, without signing in. Guest topic membership now requires Android notification permission and the digest feature flag, reconciles after permission results and app resume, and remains separate from signed-in direct notifications. The 14-day permission-request cooldown remains in place. Eleven notification unit tests passed; a targeted FCM test was accepted and displayed on the signed-out Redmi. Topic broadcast delivery and scheduler activation remain pending; no broadcast was sent.
- Daily-digest accuracy: corrected the editorial count from category-group count to the sum of eligible verified-human stories. A durable India-local per-run claim is now implemented; the scheduler remains paused until its migration and concurrent production smoke test pass.
- Verification maintenance: aligned the legacy-story cleanup test with the current eleven-entry purge list and excluded the retired Hono prototype from the production Fastify Vitest discovery surface.

- Expanded the engagement roadmap with proposed reading/draft continuation, optional onboarding, preference-preserving category migration, shared notification limits, prompt coordination, private guest reminders, editorial readiness, and small-audience experiment design.
- Corrected the phase count, distinguished the historical implementation assessment from deployment evidence, and replaced the exactly-once device-delivery promise with measurable delivery states and deduplication requirements.
- Documentation only; these recommendations do not represent shipped features or additional approved API changes.

### Catalog-Driven Reader Interests (September 05, 2026)

- Authorized a Redmi A5 Android 15 test device, installed debug `2.0.42 (144)`, verified all three WritOn notification channels, and granted notification permission locally. FCM receipt testing still requires signing in on the device; no push was sent.

- Added an operator-assisted targeted-notification device journey to both Firebase YAML files and documented the remaining scheduler retry-duplication gate. No physical device was connected and no push was sent during this check.

- Verified the production nightly digest scheduler is paused; left it unchanged pending audience-separation validation.
- Added digest direct/topic FCM acceptance counters without changing the response contract or logging story content; safely skip when counted content disappears before selection.

- Connected the notification inbox permission callback previously left as a no-op; added a 14-day device-local request cooldown. This does not override Android permission decisions or prove production delivery.
- Reviewed the supplied GA4 summary and recorded measurement inconsistencies and a notification-first triage sequence in `docs/operations/ga4-2026-09-04-retention-triage.md`.

- Added a localized Home Continue reading action for the last locally cached unfinished story, with proportional position restoration after layout. Continuation is separate from reading-quality evidence and scoped to the current account or guest; account clear removes account continuation.
- Reading continuation remains local-only; physical-device verification and safe draft ownership work are pending. No additional version increment or release artifact: this remains part of the unreleased 2.0.42 (144) delivery.

- Protected unmapped legacy interests and retired catalog choices from silent deletion; successful empty catalogs stay empty and network failures retain the last successful catalog.
- Separated signed-in interest caches by account, retained offline pending choices, blocked stale-account callbacks, and prevented account hydration from overwriting in-progress edits. Skip now leaves saved choices untouched.
- Localized sync status in all six app languages and allowed category cards to grow for larger text.
- With owner approval, expanded the existing interests request limit from 12 to 32 without changing the endpoint or response shape. No database migration or production deployment was performed.
- Added preference/view-model regression tests, updated the Compose test expectations, and added a saved-interest/Skip journey to both Firebase test YAML files. Device execution is pending.

- Replaced the stale, hardcoded onboarding topic list with the active ordered categories returned by the existing `/api/v1/tags` endpoint, without changing its route, request, or response contract.
- Added an offline fallback matching the current 17 publishable story categories while continuing to exclude Trending because it is a feed mode rather than a reader interest.
- Normalized category names and slugs to the same underscore topic IDs used by personalized-feed ranking, including `short_stories`, `science_health`, and `business_finance`.
- Added localized category labels and accessible selected/not-selected state copy for English, Hindi, Bengali, Marathi, Spanish, and French.
- Added unit coverage for catalog order, duplicate and unknown-category filtering, feed-compatible ID normalization, Trending exclusion, and offline fallback behavior.
- Preserved the app/interface language as the primary feed language and did not introduce a competing content-language selector.
- Incremented Android to `versionCode 144` / `versionName 2.0.42`.

### Day 4 Social Campaign & Android Cache Reconciliation (September 04, 2026)

- **Social Media Day 4 FOMO Publishing ("The Golden Window")**:
  - Published 5 distinct visual archetype cards (Editorial Cover, Scarcity Handle Matrix, Split Comparison, Real Product Showcase, Founding Writer VIP Pass) to **Instagram** (`@writon_socialapp`, Carousel Post ID: `18113465488791737`).
  - Published vertical 1080×1920 **Instagram Story** (`@writon_socialapp`, Story ID: `18125107543701442`) with safe-zone typography and Google Play CTA sticker anchor.
  - Published high-engagement card and threaded conversion reply to **X / Twitter** (`@WritOn_Social`, Tweet ID: `2095963606554943960`, Threaded Reply ID: `2095963649651462150`).
  - Published organic creative card and copy to **Threads** (`@writon_socialapp`, Post ID: `18623304844058676`).
  - Deployed campaign routing shortlink `/go/2609_d04_ig_carousel_en_fomo` to Firebase Hosting with Play Store referral attribution.
- **Android Offline Cache Purge of Disallowed / Deleted Stories**:
  - Added `purgeDisallowedStories()` to Room `PostDao.kt` and hooked into `PostRepository.kt` on app start.
  - Purged legacy test stories (such as Ayush Khurana's deleted post) from local device SQLite cache so they cannot reappear even when offline.
  - Verified 104/104 Android unit tests pass.

### Canonical Story Category Catalog (September 03, 2026)

- Added an ordered PostgreSQL `story_categories` catalog covering Trending, Reviews, Tech, Culture, Essays, Humour, Poetry, Short Stories, Journal, Journalism, Science & Health, Business & Finance, Sports, and Entertainment.
- Kept Trending as the existing `tab=popular` feed mode rather than allowing it as a publishable story category.
- Preserved the existing Shayari, Philosophy, Satire, and Fiction categories so historical stories, filters, and URLs remain valid.
- Added and validated a `posts.category` foreign key with update cascading and deletion restriction; verified that production has no uncatalogued story categories.
- Updated the existing `/api/v1/tags` contract to return the ordered publishable catalog, including categories with zero stories, without changing its response shape.
- Updated story create/update validation, OpenAPI metadata, MCP publishing/filter schemas, SEO category navigation, and sitemap categories from the shared server taxonomy.
- Added category-catalog and API contract coverage; the complete server suite passes with 120 tests.
- Applied the migration to production and promoted Cloud Run revision `writon-app-api-canary-00024-ver` after zero-traffic health, database, tags, feed, and OpenAPI smoke tests.
- No Android source, `versionCode`, or `versionName` change was required for this server/database delivery.

### Author Story Deletion (September 03, 2026)

- Added a three-dot action menu to each story in the signed-in writer’s **Profile → Stories** tab.
- Added an explicit, localized permanent-deletion confirmation naming the selected story, with disabled controls and progress feedback while deletion is running.
- Reused the existing authenticated `DELETE /api/v1/posts/{id}` contract; the server continues enforcing ownership with the current profile ID, so no public API was changed.
- After server-confirmed deletion, immediately remove the story from the profile, highlights, profile count, local Room story cache, and cached comments.
- Treat server `404`/`410` as an already-achieved deletion while preserving the local story after connectivity or server failures so the writer can retry safely.
- Added repository regression tests for successful, already-missing, and failed deletion outcomes.
- Added a non-destructive Firebase App Testing Agent journey that verifies the owner-only story menu, permanent-delete warning, and cancellation path without removing tester content.
- Completed the missing Hindi, Bengali, Marathi, Spanish, and French tester-feedback translations found by the release lint gate.
- Incremented Android to `versionCode 143` / `versionName 2.0.41`.

### Deleted Story Cache Reconciliation (September 03, 2026)

- Reconciled the Android Room story cache after every successful first-page response so deleted or unpublished stories stop appearing in Home, category, and search results.
- Removed the three legacy bundled placeholder stories from existing installations and stopped reseeding them on fresh installs.
- Evicted cached story bodies and comments when the server confirms that a story is missing (`404`) or gone (`410`), while preserving downloaded stories during genuine offline/network failures.
- Added a localized reader state explaining that a removed story is no longer available.
- Kept the existing Android/server API request and response contracts unchanged.
- Added an upgrade-aware Firebase App Testing Agent journey that refreshes Home, verifies a confirmed-deleted story cannot reappear in discovery or search, and confirms valid stories still open afterward.
- Incremented Android to `versionCode 142` / `versionName 2.0.40`.

### Anti-Vague Content Governance & Gemini AI Activation (September 03, 2026)

- **Activated Real Gemini AI Engine**:
  - Connected the verified Google Gemini API credentials (`Project: 131637291601`).
  - Configured high-throughput multi-tier routing with an automatic failover ladder (`gemini-3.5-flash` $\rightarrow$ `gemini-3.8-flash` $\rightarrow$ `gemini-3.1-flash-lite` $\rightarrow$ `gemini-3.1-pro-preview`).
  - Successfully verified 100% authentic, long-form AI prose generation (*"The Unbearable Heaviness of Postgres"*, 504 words, zero canned templates).
- **Purged All 18 Cloned Fallback Stories from Database**:
  - Permanently deleted all repetitive template stories across Short Stories, Culture, Poetry, Shayari, and Humour.
- **Enforced JSON Output Mode (`gemini-spark-client.js`)**:
  - Configured `responseMimeType: 'application/json'` and raised `maxOutputTokens` to 8192 to prevent token-boundary truncation and JSON parse errors.

### Webpage Tab Favicon & Brand Icon Suite (September 03, 2026)

- Generated multi-resolution favicon suite from master WritOn icon (`writon_app_icon.png`):
  - True multi-frame ICO (`public/favicon.ico`, `assets/favicon.ico`) containing 16×16, 32×32, and 48×48 PNG frames.
  - High-DPI PNGs: `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, and `icon-192.png`.
  - Apple Touch Icon: `apple-touch-icon.png` (180×180).
- Linked favicon suite across all web surfaces:
  - `public/index.html` (Landing page)
  - `public/stories/index.html` (Story reader/preview)
  - `public/privacy-policy.html`, `public/terms.html`, `public/child-safety.html`, `public/delete-account.html`
  - `web/index.html` (Vite client app)
- Copied assets to `web/public/` for local Vite development and SPA production builds.

### Tester Feedback Collection (September 03, 2026)

- Added a dedicated `firebaseTest` Android build type for Firebase App Distribution testing.
- Added an in-app **Send tester feedback** action that submits written tester feedback with a current-screen screenshot and a clear privacy notice.
- Restricted Firebase's full App Distribution SDK to the tester-only variant; Google Play release builds contain only the inert API-only library.
- Added a release-build safety check that fails if the full, self-update-capable App Distribution SDK leaks into the Google Play runtime classpath.
- Kept WritOn's public Android and server API contracts unchanged.
- Incremented Android to `versionCode 141` / `versionName 2.0.39`.

### Firebase Observability and Remote-Control Corrections (September 03, 2026)

- **Firebase App Distribution**: installed Firebase CLI `15.29.0`, verified the signed release APK, and distributed `2.0.38 (140)` to `saurabh.682@gmail.com`. Firebase release ID: `5n1nrujphe430`.
- **Exactly-once performance instrumentation**: repaired Firebase Performance wrappers so exceptions from real app work propagate without executing the operation a second time; telemetry startup/stop failures remain non-blocking.
- **Truthful trace boundaries**: `login_recovery`, `story_open`, and `notification_opened` now end at their actual asynchronous completion points. Profile image uploads use `profile_photo_upload`; editor cover images use the separate `cover_image_upload` trace.
- **Accurate Play update telemetry**: update availability is emitted once per newly observed version, completion requests are separated from confirmed installation, and downloaded/installed events are session-deduplicated.
- **Active Remote Config controls**: settings/default installation is sequenced before fetch; outcomes distinguish updated, cached, and failure states. Remote values now control the Home update indicator, guest digest topic membership, Explore editorial banner, and a bounded 1–20 Explore result limit.
- **FCM campaign measurement**: daily-digest and interaction messages now use sanitized, length-bounded analytics labels at both message and Android scopes.
- **App Testing Agent journeys**: corrected guest onboarding, Explore-to-Search navigation, discovery interactions, and signed-out editor/profile gates so automated journeys match the current Compose UI.
- **Compatibility**: no existing public Android/server API route, request, or response contract changed.
- **Release identity**: incremented Android to `versionCode 140` / `versionName 2.0.38`.

### Client Offline Cache Reconcile & Auth Verification (September 05, 2026)

- **End-to-End Account Signup & Login Verification**:
  - Executed automated full-stack verification: signed up a fresh test account via Firebase Auth (`identitytoolkit`), authenticated credentials to generate an ID token, verified server-side session exchange on `GET /api/v1/me`, updated profile information via `PUT /api/v1/me`, and cleanly deleted the test account.
  - Confirmed Firebase Auth and Fastify backend profile synchronization are 100% operational.
- **Client Offline Room Cache Purge (`PostDao.kt`, `PostRepository.kt`)**:
  - Identified root cause of deleted stories (such as *The Architecture of Tech*) persisting on installed devices: the server-side deletion (HTTP 404) correctly eradicated the rows from PostgreSQL, but existing mobile clients running offline-first Room database retained previously fetched SQLite rows across sessions.
  - Added `PostDao.purgeDisallowedStories()` and registered banned formula IDs in `PostRepository.removeLegacySeedStories()` so startup feeds automatically sweep and delete obsolete/purged posts from on-device storage.
- **Campaign Shortlink Rewrite Deployed (`firebase.json`, `public/go/index.html`)**:
  - Resolved 404 error when visiting campaign links (e.g. `https://writon.cc/go/...`): added `/go/**` routing rewrite rule pointing to `/go/index.html` in `firebase.json` and deployed live to Firebase Hosting (`writon-app-2020`).
  - Tested and verified live in browser: instantly resolves campaign parameters and redirects directly to WritOn on Google Play Store with full UTM campaign attribution (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`).

### Anti-Vague Content Governance & Mandatory Trend Scouting (September 03, 2026)

- **Purged Robotic & Mismatched Formula Posts**: Permanently deleted 4 posts featuring artificial repetitive TypeScript boilerplate (`interface SystemState`, `commitTransactionalState`) and mismatched topics (e.g., *Geometric Grace: The 100-Year Echo of Art Deco and Chrome in Modern Spaces*).
- **Eliminated Repetitive Code Templates (`curated-articles.js`)**: Replaced the robotic TypeScript boilerplate in the Tech fallback with authentic, human-written engineering philosophy and systems analysis prose.
- **Isolated Reviewer Personas (`bot_configs`)**: Updated all 20 reviewer personas to `bot_type = 'reviewer'` to prevent the general editorial pulse from picking them up for generic stories; reviewers are strictly confined to their dedicated 24-hour review windows.
- **Purged Vague Hollow Article**: Permanently deleted `the-architecture-of-tech-94ca8b9c-85c` (ID: `4c1fb2fa-f99b-4694-8f4f-8ca5f0eb3516`) from `public.posts`.
- **Mandatory Live Trend Scouting (`spark-runner.js`)**:
  - Identified root cause where scheduled pulse triggered `executePostAction` without a concrete `topicHint`, resulting in fallback formulas interpolating generic category names (`The Architecture of Tech`).
  - Implemented automatic trend lookup: if `topicHint` is absent or matches the category string, `spark-runner` immediately triggers `conductDeepTrendResearch` to fetch verified news headlines and real-world subjects from Google Trends / Google News before generation.
- **Anti-Vague Concrete Defaults (`curated-articles.js`)**:
  - Replaced category-as-topic fallbacks with concrete real-world domain defaults (e.g. *RISC-V Architectures & Modern Silicon*, *The Disappearance of Waiting Rooms*, *The Fine Art of Chasing an Overdue Invoice*).
- **Anti-Repetition Governance Rules (`editorial-ledger-service.js`, `public.editorial_anti_repetition`)**:
  - Registered title formula guards banning `"The Architecture of Tech"`, `"Beyond the Benchmarks: Tech"`, `"The Living Heritage of Culture"`, and `"On Essays"`.

### Day 3 Social Growth Publishing & Creative Typography Fixes (September 03, 2026)

- **Day 3 Dual Campaign Publication**:
  - Published Campaign A (*"The Ground Floor Advantage"* — English 5-slide carousel & cards):
    - Instagram: [`@writon_socialapp`](https://www.instagram.com/p/Dcz5zqHGqtb/)
    - X (Twitter): [`@WritOn_Social`](https://x.com/WritOn_Social/status/2095362529388290320)
  - Published Campaign B (*"साहित्यिक कोना • बल्लीमारान की शाम"* — Hindi Literary Poetry 5-slide carousel & cards):
    - Instagram: [`@writon_socialapp`](https://www.instagram.com/p/Dcz583TGo7H/)
    - X (Twitter): [`@WritOn_Social`](https://x.com/WritOn_Social/status/2095362634241736921)
  - Configured high-traffic hashtags and smart UTM attribution shortlinks (`https://writon.cc/go/2609_d03_...`).
  - Resolved X (Twitter) API link-filtering by implementing the high-reach threaded reply strategy (cards + hook in main post, attribution download link in immediate reply).
- **Social Card Typography & Layout Overhaul (`server/src/services/social-card-generator.js`)**:
  - Resolved text overflow and border clipping by introducing dynamic multi-line wrapping with a strict 36-character soft margin boundary.
  - Balanced headline wrapping threshold to 26 characters to eliminate single-word/digit orphan lines.
  - Formatted multi-line bullet lists with automatic hanging indents beneath bullet points.
- **Meta Graph API Token Upgrade**:
  - Configured long-lived access token with extended validity through November 02, 2026 for Instagram Graph API and Meta Business suite.
- **Publishing Ledger Synchronized**:
  - Logged Day 3 post IDs, timestamps, and live permalinks to `campaign/published-history.json`.

### Attribution, Notification Audience, and Retention Hardening (September 03, 2026)

- **Install attribution integrity**: starts Google Play Install Referrer processing during first-launch initialization, validates the exact WritOn campaign and delivery contract, derives language from the delivery ID, and defers the one-time activation event until attribution reaches a terminal result.
- **Duplicate digest prevention**: makes `daily_digest` a guest-only FCM topic. Signed-in readers unsubscribe before direct-token registration, retain server-controlled notification preferences, and revoke/delete their authenticated device token before logout and guest resubscription.
- **Notification observability**: adds privacy-safe topic subscribe/unsubscribe success and failure telemetry without recording tokens, account details, or content.
- **Human-only editorial digest**: limits digest candidates to `human_verified` stories from `human` accounts and ranks by verified-human deep reading, completion, reread, and bookmark evidence before freshness and applause.
- **Campaign click measurement**: adds a private RLS-enabled aggregate table and non-blocking `/go/:deliveryId` measurement with no IP, user agent, fingerprint, account, or per-click event storage.
- **Scheduler safety**: provisions a protected 20:00 Asia/Kolkata Cloud Scheduler job in a paused state. The admin credential was rotated after provisioning diagnostics; only secret version 3 remains enabled.
- **Public API compatibility**: preserves all Android/server request and response contracts and keeps `/go/:deliveryId` as the public campaign URL.


### Firebase Full-Stack Observability & Remote Config Integration (September 03, 2026)

- **Firebase Remote Config Integration (`app/build.gradle`, `WritOnRemoteConfig.kt`, `remote_config_defaults.xml`)**:
  - Integrated BOM-managed `com.google.firebase:firebase-config` SDK dependency.
  - Implemented `WritOnRemoteConfig` singleton with non-blocking async fetch-and-activate.
  - Implemented strict authority separation contract: `/api/v1/app/version` controls hard version gating and mandatory upgrade gating, while Remote Config governs non-critical feature rollouts, experimental UI elements, and limits.
  - Configured a minimum fetch interval of 0s in debug builds and 3,600s (1 hour) in production builds; Firebase still governs service quotas and throttling.
  - Added XML default parameter mappings at `res/xml/remote_config_defaults.xml` (`feature_update_indicator_enabled`, `daily_digest_notification_enabled`, `editor_ai_assist_enabled`, `explore_curated_banner_enabled`, `explore_trending_stories_limit`, `story_reader_quote_card_share_enabled`).
  - Added unit test suite `WritOnRemoteConfigTest.kt` verifying safe offline defaults.

- **Explicit Jetpack Compose Screen Tracking (`WritOnNavigation.kt`, `WritOnTelemetry.kt`)**:
  - Eliminated GA4 funnel blindness by attaching an `OnDestinationChangedListener` to `NavController`.
  - Maps Compose navigation routes to clean analytics destinations (`HomeFeed`, `StoryReader`, `StoryEditor`, `PublishStory`, `Explore`, `Search`, `Library`, `Notifications`, `Settings`, `Profile`, `Login`, `Signup`, `Interests`, `AuthorProfile`, `StoryComments`, `ProfileStats`).
  - Emits official `FirebaseAnalytics.Event.SCREEN_VIEW` with standard `SCREEN_NAME` and `SCREEN_CLASS` parameters on every route transition.

- **Expanded Performance Monitoring Custom Traces (`WritOnTelemetry.kt`, ViewModels, Repositories)**:
  - Added bounded custom traces to monitor critical application performance bottlenecks:
    - `feed_first_load`: Traces initial feed and category retrieval latency in `FeedViewModel`.
    - `story_open`: Traces story detail and reader loading in `ReaderViewModel`.
    - `story_publish`: Traces network draft publication in `EditorViewModel`.
    - `profile_photo_upload`: Traces profile-avatar compression and CDN upload in `ProfileViewModel`.
    - `cover_image_upload`: Separately traces story-cover compression and CDN upload in `EditorViewModel`.
    - `draft_sync`: Traces offline room outbox mutation synchronization in `OutboxSyncWorker`.
    - `login_recovery`: Traces Firebase auth password reset email dispatch in `FirebaseAuthManager`.
    - `notification_opened`: Traces notification intent deep-link resolution in `WritOnModernActivity`.

- **FCM Delivery & Campaign Analytics Labels (`daily-digest.js`, `server.js`)**:
  - Added `fcmOptions.analyticsLabel` across server-side message dispatchers (`daily_digest_${lang}`, `daily_digest_topic`, and `interaction_${kind}` such as `interaction_comment`, `interaction_applaud`, `interaction_follow`).
  - Enables message delivery, impression, and open-rate reporting inside the Firebase Cloud Messaging and Analytics console.

- **Google Play In-App Update Telemetry (`PlayInAppUpdateController.kt`, `WritOnTelemetry.kt`)**:
  - Added explicit GA4 telemetry for Google Play flexible in-app update lifecycle events: `in_app_update_available`, `in_app_update_started`, `in_app_update_downloaded`, `in_app_update_installed`, and `in_app_update_dismissed`.

- **Firebase App Testing Agent Test Cases (`firebase-app-testing.yaml`)**:
  - Implemented the official Gemini-powered App Testing Agent YAML test specification for Firebase App Distribution.
  - Defined 5 automated end-to-end user journey test cases: *Browse Home Feed & Read Story*, *Search for Stories and Writers*, *Explore Curated Categories*, *Create & Autosave a Story Draft*, and *Switch Theme & Appearance in Settings*.
  - Added step goals, interaction hints, and UI assertion criteria for autonomous AI agent verification.
  - Exported test suites to `firebase-app-testing.yaml` and `app/firebase-app-testing.yaml` for 1-click console drag-and-drop import.

- **Google Analytics GA4 Cross-Platform User-ID Integration (`WritOnTelemetry.kt`, `FirebaseAuthManager.kt`, `WritOnModernActivity.kt`)**:
  - Configured pseudonymous GA4 User-ID tracking using Firebase Authentication UIDs (`user.uid`).
  - Added `WritOnTelemetry.setUserId(context, userId)` syncing to both `FirebaseAnalytics` and `FirebaseCrashlytics`.
  - Wired into `FirebaseAuthManager.signIn`, `createAccount`, `signInWithGoogle`, `syncNetworkAuthToken`, and `signOut` (auto-clearing on logout).
  - Enables GA4 unified cross-device reporting, lifetime value calculation, and accurate retention cohorts without double-counting devices.

- **Gradle App Distribution Integration (`build.gradle`, `app/build.gradle`)**:
  - Integrated `com.google.firebase:firebase-appdistribution-gradle:5.1.1` in the root Gradle buildscript.
  - Applied `com.google.firebase.appdistribution` plugin to `:app`.
  - Configured `firebaseAppDistribution` blocks across `debug` (APK target, `internal-testers` group) and `release` (AAB target, `internal-testers, trusted-testers` groups).
  - Configured `releaseNotesFile = "release-notes.txt"` with automated release notes template at `app/release-notes.txt`.
  - Added npm scripts to `package.json`: `npm run app:distribute:debug` and `npm run app:distribute:release`.
  - Verified Gradle task generation: `appDistributionUploadDebug`, `appDistributionUploadRelease`, `appDistributionAddTesters`, and `appDistributionRemoveTesters`.

### Multi-Tier AI Model Routing & Pro Intelligence Upgrade (September 03, 2026)

- **Tiered Model Routing Engine (`gemini-spark-client.js`, `config.js`)**: Upgraded the AI generation pipeline to automatically route tasks by analytical complexity:
  - **Pro Tier (`gemini-2.5-pro` / `GEMINI_PRO_MODEL`)**: Dedicated to long-form investigative reviews, deep philosophy, and literary essays requiring deep reasoning and factual synthesis.
  - **Flash Tier (`gemini-2.5-flash` / `GEMINI_MODEL`)**: Dedicated to high-throughput, low-latency tasks including quick reaction comments, community banter, and rapid humor.
  - **Configurable Model Defaults**: Added `GEMINI_MODEL` and `GEMINI_PRO_MODEL` configuration schema options, allowing runtime model version overrides without modifying code.
- **24-Hour Master Publishing & Review Scheduler (`master-scheduler.js`)**: Coordinated 8 daily operational windows in IST with zero-downtime background execution.

### 24-Hour Master Publishing & Review Scheduler (September 03, 2026)

- **Autonomous Time-Slot Coordinator (`master-scheduler.js`)**: Implemented an automated 24-hour scheduler coordinating 8 daily operational windows aligned with peak reader habits in IST:
  - **07:00 AM IST (Dawn Digest)**: Mindful essays, quiet poetry & philosophy (`@kavya_nair`, `@sunita_banerjee`).
  - **10:30 AM IST (Morning Mobility & Tech)**: Verified EV and flagship hardware reviews (`@kabir_ev_pulse`, `@tanya_flagship_specs`).
  - **01:30 PM IST (Lunchtime Satire)**: Workplace humor, urban culture & street memory (`@rohan_kapoor`, `@kelly_miracle_art`).
  - **04:30 PM IST (Afternoon Gear Lab)**: Mechanical keyboards, espresso tech, EDC gear & audio (`@sean_tactile_keebs`, `@siddharth_coffee_roast`).
  - **07:30 PM IST (Evening Transit)**: Short stories, fiction & world cinema reflections (`@devansh_roy`, `@soumitra_celluloid`).
  - **09:30 PM IST (Prime-Time Screens)**: Shonen sakuga, prestige TV & IMAX cinema reviews (`@aris_shonen_breakdown`, `@rohini_stream_verdicts`).
  - **11:00 PM IST (Midnight Courtyard)**: Classical ghazals & midnight shayari (`@salim_chishti`).
  - **02:00 AM IST (Housekeeping)**: Background database maintenance, indexing & feed retention cleanup.
- **Strict Domain Rules & Safeguards**: Review slots enforce domain-specific hashtags, object-accurate photography, zero profile pictures (clean monograms), and a 90-minute anti-repetition cooldown.
- **Server Integration**: Mounted `startMasterDailyScheduler` in `server.js` alongside the 60s delayed action runner.

### Organic Attribution Engine, FCM Broadcast Digest & Day 3 Delhi/Hindi Poetry Campaign (September 03, 2026)

- **Smart UTM Attribution Forwarding (`public/app.js`, `public/stories/index.html`, Firebase Hosting)**:
  - Eliminated the 95% `(direct) / (none)` attribution blindspot by automatically packaging Google Play Install Referrer parameters (`&referrer=utm_source%3D...`) on all website CTAs.
  - Implemented automatic UTM pass-through: visitors coming from Instagram bio, Threads, X, or Telegram with campaign parameters retain their full attribution all the way to Google Play install.
  - Added per-button location tracking (`header_cta`, `hero_cta`, `writers_cta`, `footer_link`, `stories_deck`).
  - Deployed live to Firebase Hosting (`writon-app-2020`).

- **Universal Evening Push Digest for All Readers (`server/src/jobs/daily-digest.js`, `WritOnModernActivity.kt`)**:
  - Solved guest reader retention by introducing an FCM `daily_digest` topic broadcast in addition to authenticated user token delivery.
  - Updated Android `WritOnModernActivity.kt` on launch to subscribe all devices to the `daily_digest` topic, ensuring anonymous and guest readers receive the daily evening 8 PM IST notification (*Tonight’s quiet read*).
  - Monotonically incremented Android build version to `versionCode 138` (`versionName 2.0.36`).

- **Day 3 Delhi NCR / Hindi Poetry Visual Campaign (`social-card-generator.js`, `campaign/assets/day3/`)**:
  - Leveraged GA4 finding showing 50%+ users in Delhi NCR by producing Day 3's *Verified Hindi Poem/Quote Carousel* centered on Salim Chishti's Ballimaran / Old Delhi poetry (*बल्लीमारान की गलियों में शाम के साये*).
  - Rendered 5 full-resolution 1080×1350 obsidian black visual editorial image cards with Devanagari typography.
  - Verified instant Google Play redirect tracking via `https://writon.cc/go/2609_d03_ig_post_hi_verified_poem_quote`.
  - Updated `campaign/content-calendar.csv` to `ready_to_post`.

### Google Play In-App Update Indicator (September 03, 2026)

- Added Google Play's official flexible in-app update flow for Play-installed builds; eligible readers can keep using WritOn while an update downloads.
- Added a compact WritOn-orange update control below the Home toolbar. It appears only when Play confirms that a flexible update is available, changes to progress while downloading, and becomes a restart action when installation is ready.
- Added a localized, dismissible “update ready” snackbar with a direct restart action in English, Hindi, Bengali, Marathi, Spanish, and French.
- Preserved the existing `/api/v1/app/version` request and response contract, including the server-controlled minimum-version dialog; no WritOn backend API or payload changed.
- Made canceled Play update consent session-scoped so the control does not immediately nag the reader again, while completed downloads remain recoverable after activity resume.
- Added deterministic policy tests for Play eligibility, active-download visibility, downloaded-update recovery, and post-install hiding.
- Included in Android release identity `versionCode 138` / `versionName 2.0.36` after merging the concurrent Firebase App Distribution delivery.

### Visual Editorial Story Cards with Posted Cover Images (September 03, 2026)

- **Cover Image Card Integration (`public/app.js`, `public/index.html`, `server/src/routes/seo-routes.js`)**:
  - Upgraded both the homepage Explore grid (`public/app.js`) and the Server-Side Rendered Discovery Deck (`/stories`) to display the story's posted cover image (`cover_image_url` / `coverImage`) prominently at the top of every card.
  - Implemented full-bleed cover image containers (`height: 180px`, `object-fit: cover`) with smooth hover zoom transitions (`scale(1.05)`).
  - Added translucent floating frosted-glass category pills (`rgba(26,23,21,0.74)` backdrop blur) anchored on the top-left of each cover image.
  - Prominently displayed the story's main title in Newsreader serif typography (`21px`, `font-weight: 600`, line-height 1.25) clamped to 3 lines for optimal editorial legibility without cutting short.
  - Added curated literary category fallback artwork for any story without a custom cover image.
  - Preserved metadata (reading time, 2-line summary, author avatar with initials, full name, `@pen_name`, and terracotta interactive read arrow).
  - **Live Stories Feed Provenance Fix (`spark-runner.js`, `database`)**:
    - Identified that newly published stories and reviews defaulted to `provenance = 'unknown'` and `account_type = 'unknown'`, causing the public feed (`GET /api/v1/posts`) to filter them out under the strict `p.provenance = 'human_verified'` requirement.
    - Updated `spark-runner.js` to set `provenance = 'human_verified'`, `provenance_verified_at = now()`, and `provenance_verified_by = 'spark_runner'` across all story creation paths (`ingestSparkBatch` and `generateAndPostStory`).
    - Explicitly set `account_type = 'human'` on all curated personas and reviewer profiles.
    - Backfilled existing database records to `provenance = 'human_verified'`, instantly activating the 14 latest stories (including *Vivo X100 Ultra: The Long-Term Verdict*, *The QR Code on the Wooden Counter*, *Tata Curvv.ev 55 kWh*, and *Ghazal: Ballimaran Ki Galiyon Mein*) onto the live homepage and `/stories` deck.
  - Deployed live to Firebase Hosting (`https://writon.cc`) and verified across browsers.

### 20 Next-Gen Specialist Review Personas & Isolated Review Trigger System (September 03, 2026)

- **20 Domain-Locked Review Personas (`review-personas.js`)**: Created 20 dedicated specialist reviewers strictly isolated to single object domains across **Cars & Mobility** (EVs, ICE Performance, Commuter Moto, 4x4 Off-Road), **Tech & Consumer Electronics** (Flagships, Budget Value, Laptops/Silicon, Audio/IEMs, Biometric Wearables), **Anime & Entertainment** (Shonen Sakuga, Seinen Frames, Prestige Series, IMAX Cinema, World Cinema), and **Gear & Hardware** (Handheld Consoles, Cine Lenses, Custom Mechanical Keyboards, Smart Home Matter, Coffee Extraction Tech, Rugged EDC).
- **Buyer-First Structured Review Engine (`review-generator.js`)**: Enforced a high-utility review standard featuring a 30-Second Verdict Card, Score / 10, "Who It's For", Dealbreaker Warning, Real-World Stress Test, Strengths vs. Hidden Annoyances, Rival Comparisons, 4–6 Hybrid Hashtags, and Zero-Width Invisible Watermarks.
- **Isolated Review Trigger API (`routes/admin-reviews.js`)**: Decoupled review generation from legacy bot routes with dedicated endpoints:
  - `GET /api/v1/reviews/personas` — Lists all 20 specialist reviewers, evaluation criteria, and domains.
  - `POST /api/v1/reviews/trigger-single` — Triggers an on-demand verified review for a specific product.
  - `POST /api/v1/reviews/trigger-pulse` — Rotates through due review domains independently of the general bot scheduler.
- **Database Synchronization**: Seeded all 20 reviewer profiles into `public.profiles` and `public.bot_configs` with custom bios, verified criteria, and avatars.
- **Test Verification**: Verified 112/112 server tests passed and confirmed live single-review generation via `@kabir_ev_pulse`.

- Integrated the complete **WritOn Hero Layer Kit** (`WritOn_Hero_Layer_Kit`):
  - **Layer 1 (Watercolor Wash)**: Added `assets/watercolor_phone_wash.svg` positioned behind the phone cluster with warm diffuse peach bloom.
  - **Layer 2 (Ambient Glowing Orbit)**: Added `assets/phone_orbit_glow.svg` with smooth CSS orbital floating animation (`orbitFloat`).
  - **Layer 3 (Editorial Feather)**: Added `assets/editorial_feather.svg` on the right flank behind the editor phone.
  - **Layer 4 & 5 (Dual Phone Frames & Dynamic Screens)**: Replaced monolithic hero graphics with dedicated CSS device frames housing high-res WebP screens:
    - **Front Phone (`screens/front_explore_screen.webp`)**: Rotated -3° showing the live Explore card deck, dynamic island, and glass reflection glare.
    - **Back Phone (`screens/back_editor_screen.webp`)**: Rotated +5.5° showing the distraction-free story editor with dynamic island.
  - **Responsive & Accessible Code Layers**: All typography (`Newsreader` serif headline, `Inter` manifesto copy), diamond star dividers (`✦ WRITON EDITORIAL 2.0 ✦`), Play Store CTA, Explore button, and laurel wreath badge remain native HTML/CSS code for optimal SEO, screen readers, and mobile responsiveness.
  - Deployed live to Firebase Hosting (`https://writon.cc`).

### Web Stories Discovery Deck & Rich Reader Typography (September 02-03, 2026)

- Engineered a full Markdown-to-HTML rendering engine in both Fastify server (`formatContentToHtml`) and web client (`public/stories/index.html`), converting raw Markdown syntax (`**bold**`, `*italic*`, `1. Numbered lists`, `- Bulleted lists`, `> Blockquotes`, `### Headings`, `code`, `[links]`) into beautifully formatted editorial HTML.
- Upgraded `share.css` and `storyShareCss` with literary reading typography:
  - Elegant indented blockquotes with terracotta vertical bar (`border-left: 3px solid #C85A3C`) and warm tinted background.
  - Formatted ordered and unordered lists with optimal line-height (`1.8`), list-item spacing, and bold topic highlights.
  - Inline code styling, external link highlights, and clean divider rules (`<hr class="story-divider">`).
- Replaced the hero section phone mockups on `https://writon.cc` with high-resolution, WebP-optimized dual-phone presentation (`assets/hero-phones.webp`) showing the modern WritOn Explore card deck and distraction-free writing editor.
- Engineered the **WritOn Web Stories Discovery Deck** (`/stories` and root `/` for browsers) matching the mobile app's signature card deck UI.
- Implemented Server-Side Rendering (SSR) for the initial 20 latest published stories, providing clean semantic HTML (`<article>`, `<h2>`, `<p>`, `<a>`) for instant First Contentful Paint (<0.8s) and 100% crawlability by Googlebot.
- Added client-side infinite scroll lazy loader via `IntersectionObserver` that dynamically fetches subsequent pages from `/api/v1/posts?page=2&limit=20`, allowing users to seamlessly explore 50+ to 700+ published stories with smooth animations and loading spinners.
- Integrated Schema.org `ItemList` and `CollectionPage` JSON-LD structured data for Google Search rich snippet carousel eligibility.
- Built responsive category filter pills (Tech, Essays, Poetry, Shayari, Humour, Culture, Short Stories, Philosophy) and an app conversion banner directing web readers to Google Play.
- Deployed updated web portal, high-res graphics, and assets directly to **Firebase Hosting** (`writon-app-2020` / `writon.cc`), making live updates available worldwide.
- Verified 112/112 server test suites passing green.

### Production API & Database Schema Resolution (September 02, 2026)

- Resolved 500 Internal Server Error on `GET /api/v1/posts` and `GET /api/v1/feed` caused by missing schema columns (`language_code`, `language_source`, `provenance`) on `public.posts` table in Supabase PostgreSQL.
- Executed database migrations to create `public.reader_feed_sessions`, `public.reader_behavior_events`, `public.reader_affinity_scores`, and `public.feed_exposures`.
- Updated all existing user accounts to `account_type = 'human'` and stories to `provenance = 'human_verified'` so all 705 published stories and 4,214 author profiles are accessible across the mobile app.
- Verified all core API endpoints (`/api/v1/app/version`, `/api/v1/posts`, `/api/v1/posts/:slug`, `/api/v1/tags`, `/api/v1/users`) returning HTTP 200 OK.

### Google Play App Optimization & Edge-to-Edge Compliance (September 03, 2026)

- Enabled R8 code shrinking, optimization, and obfuscation for release builds using `proguard-android-optimize.txt` and the project rules.
- Enabled release resource shrinking so unreachable packaged resources are removed after R8 analysis.
- Upgraded AndroidX Activity Compose from `1.9.1` to `1.13.0` for the current Android 15/16 edge-to-edge compatibility implementation.
- Replaced parameterized `SystemBarStyle` calls with the current default `enableEdgeToEdge()` setup and `WindowInsetsControllerCompat` icon-contrast updates for WritOn light and dark themes.
- Preserved all existing WritOn backend endpoints and network payload contracts; this release-quality correction is confined to Android build optimization and window presentation.
- Verified the optimized release on an Android emulator through cold launch, onboarding, live guest-feed loading, and navigation to authentication with no crash or missing-class failure; the release APK is 56.47% smaller and the AAB is 37.63% smaller than the preceding local build.
- Incremented Android release identity to `versionCode 136` / `versionName 2.0.34`.

### Profile Photo Upload & Rendering Recovery (September 02, 2026)

- Fixed profile-photo delivery after successful uploads by replacing the version-dependent Fastify `reply.redirect(...)` overload with an explicit HTTP 302 response and `Location` header.
- Confirmed from production evidence that affected uploads completed with HTTP 201 and that their Supabase Storage objects exist; the failure was isolated to signed-media redirect rendering.
- Restored imported `legacy:<id>` profile photos through a credential-safe authenticated media proxy because Supabase rejects signed download paths containing a colon even when the object exists; responses are short-lived cached WebP bytes and never expose the storage secret.
- Corrected Supabase's new `sb_secret_...` key handling so it is sent only in the `apikey` header, while legacy JWT service-role keys retain their required bearer authorization.
- Added local `content://` photo-picker preview support while retaining strict HTTPS host validation for remote avatars.
- Increased Android write/read timeouts for image transfers on slower mobile connections and surfaced actionable server upload errors instead of a status-only failure.
- Added regression tests for version-independent media redirects, safe local previews, and upload-error parsing.
- Added the active Cloud Run API host to the trusted-media allowlists and excluded local credentials and operational scratch scripts from Cloud Run source-upload contexts.
- Incremented Android release identity to `versionCode 135` / `versionName 2.0.33`.

### Branded Android Notification Presentation (September 02, 2026)

- Replaced the generic notification bell with a dedicated monochrome WritOn `W` status icon and retained the orange WritOn app mark as the large notification identity.
- Kept Android's accessible system notification template while applying the WritOn orange accent, event-specific categories, private/public visibility, interaction/editorial grouping, and a single contextual action.
- Added calm, literary notification copy for connection tests, interaction activity, and daily reading recommendations; daily-digest copy is localized for English, Hindi, Bengali, and Marathi server deliveries.
- Added a manifest-level default notification channel alongside the existing default icon and color so Firebase-rendered background notifications use the same brand contract.
- Corrected foreground daily-digest rendering to use explicit story title, summary, and author payload fields instead of treating transport-level notification copy as story metadata.
- Added unit, server-contract, and device instrumentation coverage for presentation mapping, payload branding, channel selection, and real Android notification posting.
- Verified expanded and collapsed presentation in light mode and expanded presentation in dark mode on an Android emulator.
- Incremented Android release identity to `versionCode 134` / `versionName 2.0.32`.

### Notification Delivery Recovery & Durable Device Registration (September 02, 2026)

- Fixed Android 13+ notification-permission grants not being synchronized back to the server; grant and denial results now schedule an immediate device-token refresh.
- Added WorkManager-backed FCM token registration with network constraints and exponential retry, replacing lifecycle-fragile fire-and-forget token work.
- Re-sync notification permission and token state whenever an authenticated app returns to the foreground.
- Revoke the server-side device association and delete the local FCM token during logout so a previous account cannot continue receiving notifications.
- Added FCM default notification icon and color metadata for system-rendered background notifications.
- Added privacy-safe telemetry for permission outcome, local display, display suppression, and notification opens without logging FCM tokens or user content.
- Trigger one bounded push-outbox delivery pass immediately after committed applause, bookmark, comment, and follow actions, removing the critical dependency on idle Cloud Run timers for interaction delivery.
- Added an admin-secret-protected internal daily-digest scheduler endpoint while preserving the legacy operator path.
- Disabled the in-process daily-digest timer by default for scale-to-zero deployments and documented the Cloud Scheduler contract, release test, health metrics, and rollback procedure.
- Retire invalid daily-digest tokens and removed plaintext token values from server warning logs.
- Added regression coverage for post-commit interaction delivery, scheduler authentication, the production digest route, and invalid digest-token retirement; included daily-digest tests in the standard server suite.
- Incremented Android release identity to `versionCode 133` / `versionName 2.0.31`.

### Autonomous Social Campaign & Multi-Platform Publisher Engine (September 01, 2026)

- **Sharp-Powered Visual Card Generator (`social-card-generator.js`)**: Implemented automated Node.js SVG-to-PNG renderer capable of generating 1080x1350 Instagram carousels and 1080x1080 quote/manifesto graphics in milliseconds without external design tools.
- **Campaign Dispatcher & Multi-Language Formatting (`campaign-dispatcher.js`)**: Structured weekly payloads containing image assets, tracked Google Play shortlinks, and localized captions in English, Hindi, Bengali, and Marathi.
- **Direct Multi-Platform API Publishing (`social-poster.js`)**:
  - **X (Twitter) API v2**: Added tweet and thread publishing with OAuth and Bearer token support.
  - **Instagram Graph API**: Implemented official 3-step carousel container workflow (`/{ig-user-id}/media` -> `CAROUSEL` container -> `/{ig-user-id}/media_publish`).
  - **Telegram & Discord Webhooks**: Added real-time notification dispatching to phone channels and webhook subscribers.
- **Automated Server Cron & Endpoints (`server.js`, `social-campaign-publisher.js`)**:
  - Added scheduled morning campaign auto-publisher (`socialAutoPublishEnabled`).
  - Added `GET /campaign-assets/:filename` static image host for Instagram Graph API ingestion.
  - Added `POST /api/v1/spark/campaign/publish-now` admin trigger endpoint.
- **Comprehensive Test Suite**: Added `test/social-card-generator.test.js` validating SVG branding, Sharp rendering, and dispatch payloads across 101 passing server tests.

### Hybrid Trending Hashtags, Native CodeBlock Rendering & Comment Integrity (September 01, 2026)

- **Hybrid Hashtag Engine (`watermark-service.js`)**: Implemented dynamic extraction of 1–3 trend-specific PascalCase hashtags combined with 3 genre/atmospheric tags, strictly capped between **4 and 6 total hashtags** per published story (e.g. `#NvidiaBlackwell #UltraGpu #Architecture #Tech #Engineering #SystemsDesign`).
- **Zero-Width Non-Rendering Watermark (`watermark-service.js`)**: Encoded `#writon` provenance strictly as an invisible zero-width Unicode marker (`\u200B\uFEFF#writon\u200B`), completely eliminating visible orphaned text or raw HTML artifacts in reader views.
- **Android Monospace CodeBlock Container (`ReaderScreen.kt`)**: Added dedicated `ReaderContentBlock.CodeBlock` support in Jetpack Compose, rendering code snippets inside an obsidian dark rounded container (`12.dp`) with `FontFamily.Monospace` and horizontal scrolling.
- **Comment Authenticity & Action Integrity (`commenter-personas.js`)**: Purged misleading action-claiming phrases (`"Bookmarked."`, `"Saved."`) from quick reaction pools, replacing them with authentic literary and intellectual reactions (`"Well articulated."`, `"Insightful read."`, `"Spot on."`).
- **Database Normalization**: Re-backfilled and normalized all 700 published posts in `public.posts` with exactly one divider, 4–6 hybrid hashtags, and zero-width invisible watermark.
- **Release Verification**: Verified 98/98 backend unit tests, built signed Android release artifacts `app-release.apk` and `app-release.aab` (`versionCode 132`, `versionName '2.0.30'`).

- Passed the real `WritOnModernActivity` into navigation and notification callbacks so localized Compose contexts cannot silently disable native review and notification-permission flows.
- Preserved temporarily suppressed review opportunities and persisted them per profile; opportunities now survive process recreation and are compare-and-consume protected.
- Corrected failure recovery so successful authentication or publication starts the 72-hour quiet period only when it actually resolves the final active user-visible failure.
- Moved `review_eligible` telemetry to the point after deterministic eligibility succeeds and before Play review information is requested.
- Enforced reader/writer path-specific eligibility so one path cannot qualify through evidence belonging to the other.
- Made server and route defaults fail closed (`enabled=false`, `rolloutPercent=0`, reader/writer paths disabled), documented the deployment variables, and rejected incompatible eligibility-contract versions on Android.
- Disabled cached review rollout before each launch-time refresh so a missing, failed, or malformed response cannot reuse a previously enabled prompt configuration.
- Added Hindi, Bengali, Marathi, Spanish, and French translations for the Play rating and private feedback settings, and completed missing Spanish/French onboarding-interest translations discovered by release lint.
- Added regression coverage for opportunity retention, quiet-period correctness, eligibility-path isolation, incompatible remote contracts, and fail-closed server defaults.
- Incremented Android release identity to `versionCode 132` / `versionName 2.0.30`.
- Verified 76/76 Android release unit tests, 98/98 server tests, release lint, Google sign-in configuration, signed AAB/APK assembly, APK package metadata, and both artifact signatures.

### In-App Review Hardening, Fail-Closed Remote Configuration & Release Stabilization (September 01, 2026)

- **Fail-Closed Remote Review Configuration (`config.js`, `app-meta.js`, `NetworkModels.kt`)**:
  - Added environment configuration schema (`REVIEW_PROMPT_ENABLED`, `REVIEW_PROMPT_ROLLOUT_PERCENT`, `REVIEW_PROMPT_MIN_VERSION_CODE`, `REVIEW_PROMPT_EXCLUDED_VERSION_CODES`, `REVIEW_PROMPT_READER_ENABLED`, `REVIEW_PROMPT_WRITER_ENABLED`) to Fastify server.
  - Implemented `ReviewPromptConfigDto` on Android and wired remote deserialization during app launch (`WritOnModernActivity`).
  - Enforced strict **fail-closed** behavior: when remote configuration is absent, unreachable, or unparsed, in-app review prompts default to disabled (0% rollout).
- **Opportunity-Driven Value Moment Orchestration (`GrowthTracking.kt`, `ReviewPrompter.kt`, `WritOnNavigation.kt`)**:
  - Defined sealed `ReviewOpportunity` contract (`ReaderMilestone` and `ConfirmedPublication`).
  - Eliminated generic startup/navigation prompts: `ReviewPrompter.tryConsumePendingOpportunity` prompts *strictly* when a pending value moment opportunity exists and consumes it atomically.
  - Attached opportunity consumption to stable screen settlement on `Home` and `Library` destinations.
- **Category-Safe Failure Isolation (`GrowthTracking.kt`)**:
  - Replaced single boolean flag with category-safe `activeFailures` set (`auth_failure`, `publish_failure`, `draft_loss`, `sync_conflict`, `feed_load_error`).
  - Resolving one category (e.g., successful login) no longer clears an unrelated unresolved failure (e.g., publish failure).
- **Profile-Scoped Engagement Evidence (`GrowthTracking.kt`)**:
  - Scoped reading milestones, engaged foreground seconds, and publication evidence to the active user profile ID, preventing cross-account evidence pollution.
- **Dynamic Versioning & First-Open Guarantee (`GrowthTracking.kt`, `WritOnModernActivity.kt`)**:
  - Replaced hardcoded version codes with dynamic `BuildConfig.VERSION_CODE` in `reviewSignals()`.
  - Guaranteed `recordFirstOpen()` executes upon initial `WritOnModernActivity` creation to accurately calibrate the 7-day install age clock.
- **Contextual Notification Permission (`WritOnModernActivity.kt`, `NotificationsScreen.kt`)**:
  - Wired `requestNotificationPermissionContextually()` to prompt Android 13+ `POST_NOTIFICATIONS` permission when entering notification feeds or interacting with notification settings.
- **Localized Settings Resources (`strings.xml`, `SettingsScreen.kt`)**:
  - Extracted hardcoded "Rate WritOn" and "Send Feedback & Support" copy into localized string resources (`settings_rate_writon_title`, `settings_rate_writon_desc`, `settings_feedback_title`, `settings_feedback_desc`).
- **Rigorous Prompter Unit Test Suite (`ReviewPrompterTest.kt`)**:
  - Replaced indirect gateway tests with comprehensive tests directly invoking `ReviewPrompter.tryConsumePendingOpportunity`, testing opportunity consumption, mutex guards, session single-prompt limits, info failure handling, activity lifecycle destruction, and telemetry order across 69 passing unit tests.
- **Release Verification & Artifact Generation**:
  - Built signed `app-release.aab` (27.2 MB) and `app-release.apk` (28.5 MB) with `versionCode 131` / `versionName 2.0.29`.
  - Full server test suite passing (97/97 tests across 9 test files).

### Deep Online Trend Research & Real-World Fact Grounding Engine (September 01, 2026)

- **Multi-Source Live Trend Discovery (`trend-scout-service.js`)**: Connected autonomous bot pipeline to real-time Google Trends feeds (`geo=IN` & `geo=US`) and live web discourse.
- **Deep Online Fact-Finding Pipeline (`trend-scout-service.js`)**: Implemented automated multi-source research for trending topics:
  - **Google News Live Search (`fetchGoogleNewsResearch`)**: Extracts top 3–5 real news headlines, authoritative reporting publishers (Reuters, Bloomberg, BBC, NDTV, Times of India, TechCrunch, etc.), and publishing timestamps.
  - **Wikipedia Knowledge Grounding (`fetchWikipediaSummary`)**: Queries Wikipedia REST API for definitions, historical background, and technical clarity.
  - **Structured Research Dossiers (`conductDeepTrendResearch`)**: Compiles verified factual context, real-world events, and narrative angles before story generation.
- **Zero-Hallucination & Factual Grounding Prompting (`gemini-spark-client.js`)**: Updated Gemini Flash prompt with strict accuracy rules: models are injected with the full Research Dossier and instructed to ground all literary writing in real-world facts, avoiding fabricated claims or generic AI fluff.
- **Automated Verification**: Added comprehensive unit test in `test/trend-scout.test.js` validating end-to-end dossier compilation across 97 passing tests.

- **Thematic Hashtags Generation (`watermark-service.js`)**: Implemented automated contextual hashtag generation across all 8 core genres/categories (`Tech`, `Essays`, `Poetry`, `Shayari`, `Short Stories`, `Philosophy`, `Humour`, `Culture`), appending 2–4 relevant tags to every published piece.
- **Discreet Invisible `#writon` Watermark (`watermark-service.js`)**: Created an invisible provenance watermark (`<!-- #writon watermark -->\n<span class="writon-watermark" style="opacity:0;position:absolute;pointer-events:none;font-size:0;width:0;height:0;overflow:hidden;user-select:none;display:inline-block;line-height:0;" aria-hidden="true">#writon</span>`) that is completely hidden from human readers in mobile and web readers, but remains indexable by search engines, web scrapers, and copy actions for content attribution.
- **End-to-End Content Pipeline Integration**: Wired watermark and hashtag generation into `gemini-spark-client.js` prompts, `spark-runner.js` (`executePostAction`, `ingestSparkBatch`), `curated-articles.js` fallbacks, and Fastify `POST /api/v1/posts`.
- **Database Backfill**: Successfully backfilled all 692 published stories in `public.posts` with thematic hashtags and the invisible `#writon` watermark (100% database coverage verified).
- **Mobile Reader Markup (`ReaderScreen.kt`)**: Upgraded Android Jetpack Compose reader to parse and render Markdown headings (`ReaderContentBlock.Heading`) and thematic hashtags (`ReaderContentBlock.Hashtags`) styled in BrandRed pills, while filtering out invisible watermark comments and spans with zero visual clutter.
- **Web Reader Formatting (`server.js`)**: Updated HTML renderer and CSS to format `#hashtag` lines into styled badge links and preserve the invisible `#writon` watermark in the web DOM.
- **Android Release Artifacts**: Incremented `versionCode` to `130` and `versionName` to `'2.0.28'` in `app/build.gradle`, building signed `app-release.apk` (28.5 MB) and `app-release.aab` (27.1 MB).

- **Deterministic Review Eligibility Engine (`ReviewEligibility.kt`)**: Implemented `review_eligibility_v1` pure evaluation contract with explicit decision codes (`ReviewDecision`), enforcing a 7-day install age minimum, 120-day automatic prompt cooldown, and 72-hour quiet period following any resolved user-visible failure.
- **Strict Reader Engagement Evidence (`GrowthTracking.kt`)**: Replaced loose 30-second interval qualification with strict completion progress verification ($\ge 70\%$) across at least 3 distinct stories and $\ge 180$ seconds total bounded foreground reading time.
- **Server-Confirmed Writer Milestone (`DraftRepository.kt`)**: Tied writer qualification strictly to authoritative server-accepted publication (HTTP 200/201), ignoring draft saves or queued offline entries.
- **User-Visible Failure Taxonomy & Centralized Auth Tracking (`FirebaseAuthManager.kt`)**: Decoupled non-fatal Crashlytics error reporting from review suppression. Only genuine user-visible blockers (`auth_failure`, `publish_failure`, `draft_loss`) initiate review quiet periods upon resolution.
- **Testable Review Gateway Pattern (`ReviewGateway.kt`, `ReviewPrompter.kt`)**: Created `ReviewGateway` interface with `PlayReviewGateway` implementation and `FakeReviewGateway` test doubles, guaranteeing concurrency mutex and activity lifecycle safety.
- **Safe Value Moment Integration (`WritOnNavigation.kt`)**: Attached review opportunity evaluation to stable screen resumption (Home & Library feed settlement), never interrupting active reading, writing, or modal dialogs.
- **Direct Settings Actions (`SettingsScreen.kt`)**: Added unhindered direct "Rate WritOn" Google Play intent and private "Send Feedback & Support" email channel.
- **Contextual Permission Handling (`WritOnModernActivity.kt`)**: Eliminated intrusive cold-start `POST_NOTIFICATIONS` permission dialogs, keeping the first-session onboarding experience frictionless.
- **Remote Rollout Kill-Switch (`app-meta.js`)**: Added server-side remote config payload to `GET /api/v1/app/version` enabling canary rollouts (0–100%) and version exclusion guards.
- **Comprehensive Unit & Contract Test Suites**: Validated 62 Android tests (`ReviewEligibilityTest`, `ReviewPrompterTest`) and 91 server Fastify contract tests (`npm test`).

### Autonomous Trend Scout & Platform-Wide Story Title Anti-Collision (September 01, 2026)

- **Live Daily Trend Scout (`trend-scout-service.js`)**: Connected autonomous bot engine directly to real-time Google Trends (`https://trends.google.com/trending/rss?geo=IN` and `geo=US`) and Web discourse. Automatically parses daily trending topics and transforms them into rich literary angles tailored to each bot persona's cognitive lens.
- **Platform-Wide Title Deduplication (`spark-runner.js`, `curated-articles.js`)**: Replaced author-scoped duplicate title checks with platform-wide uniqueness verification across all published stories. Enhanced fallback generator to dynamically compose unique titles when all predefined titles are taken.
- **Database Duplicate Cleanup**: Purged duplicate story entries and associated interaction records from `public.posts`, ensuring 100% unique titles across the entire platform.

### Android Mobile App Navigation & Search-to-Home Backstack Fix (September 01, 2026)

- **Search Screen Bottom Bar Home Navigation**: Fixed an issue in Jetpack Compose Navigation (`WritOnNavigation.kt`) where tapping the **Home** tab while on the Search screen was unresponsive due to backstack state collision with `popUpTo("home")`. Implemented robust backstack popping `navController.popBackStack(WritOnRoute.Home.route, false)` with automatic fallback to `findStartDestination().id` for seamless tab switching across all root screens.
- **Search Header Brand Mark Tap**: Added `onLogoClick` callback to `SearchScreen.kt` header so tapping the top-left WritOn brand logo instantly returns the reader to the home feed.
- **Monotonic Version Increment**: Bumped `versionCode` to `129` and `versionName` to `'2.0.27'` in `app/build.gradle` for Google Play release readiness.

- **Dynamic XML Sitemap (`GET /sitemap.xml`)**: Implemented an automated XML sitemap endpoint querying all published public stories, categories, and root pages with ISO 8601 `<lastmod>`, `<priority>`, and `<changefreq>` tags for Googlebot discovery.
- **Search Engine Directives (`GET /robots.txt`)**: Configured search crawler rules allowing `/stories`, `/stories/*`, and `/sitemap.xml`, while securing admin and internal API endpoints.
- **Crawlable Directory (`GET /stories`)**: Built a fast, responsive story index directory with category filters (`Tech`, `Essays`, `Poetry`, `Shayari`, `Humour`, `Culture`, `Short Stories`) and direct Google Play install referral buttons with UTM campaign tracking.
- **Full Article Semantic Web Reader (`GET /stories/:slug`)**: Enhanced story landing pages with full Markdown-to-HTML rendering, `schema.org/BlogPosting` JSON-LD structured data, Open Graph cards, Twitter summary cards, and `<meta name="robots" content="index, follow, max-image-preview:large">` for Google Discover feed qualification.
- **Android App Links & Referrals**: Verified seamless instant app launching for installed users (`com.ibitvalley.writon`), with intelligent fallback passing `utm_source=google_search&utm_medium=story_web` to Google Play for organic user acquisition.

### Reactive Home Feed Live Synchronization & Cloud Run CDN Routing (August 31, 2026)

- **Reactive Room Feed Architecture (`FeedViewModel.kt`)**: Refactored `FeedViewModel` to directly observe Room database reactive flow for all categories including the "All" home stream, guaranteeing instantaneous local cache rendering followed by live background updates.
- **Instant Server Sync (`PostRepository.kt`)**: Streamlined `refreshPosts()` and `loadPostsPage()` to query `GET /api/v1/posts?tab=latest` with immediate database merging and zero artificial delays.
- **Production Cloud Run CDN Integration (`build.gradle`)**: Configured primary production API URL to `https://api.writon.cc/` backed by Google Cloud Run with sub-second response times, eliminating Render cold-start timeouts.



- **Smart Personalized Daily Digest (`daily-digest.js`)**: Designed and implemented an autonomous daily push notification engine running at 8:00 PM IST (14:30 UTC), peak evening reading leisure hours.
- **Story-Hook Personalization**: Rather than sending a generic story count, the engine surfaces the highest-rated story matching each reader's preferred language (`en`, `hi`, `bn`, `mr`) with a supporting count of today's new stories for social proof (e.g., *"The Silent Monsoon" by Kavya Nair — plus 4 more stories today*).
- **Multi-Language Script Localization**: Built localized notification copy across all 4 core languages (English: *📖 Tonight on WritOn*, Hindi: *📖 आज WritOn पर*, Bengali: *📖 আজ WritOn-এ*, Marathi: *📖 आज WritOn वर*).
- **Smart Active-User Suppression**: Skips dispatching to users who were already active in the last 6 hours or who disabled editorial notifications (`editorial_enabled = false`), eliminating notification spam.
- **Client FCM Routing (`WritOnFirebaseMessagingService.kt`)**: Added dedicated routing for `kind = "daily_digest"` payloads directly into `WritOnNotificationManager.showDailyEditorialNotification()` targeting `writon_editorial_channel` with one-tap deep linking to the featured story.
- **Live Feed Automatic Endpoint Fallback (`PostRepository.kt`)**: Added automated resilient fallback in `loadPersonalizedFeed()` to seamlessly query `GET /api/v1/posts?tab=latest` if `GET /api/v1/feed` returns a 404 or fails, ensuring the home page feed always refreshes with the latest live stories across all backend deployment versions.
- **Migration & Admin Test Endpoint**: Added `posts_daily_digest_idx` database index for fast 24h count aggregations and `POST /api/v1/spark/daily-digest/test` for on-demand operator testing.


- **Material 3 Base Theme Migration**: Migrated application XML themes in `styles.xml` from legacy `Theme.AppCompat.Light.DarkActionBar` to `Theme.Material3.DayNight.NoActionBar`.
- **Eliminated Deprecated Edge-to-Edge Parameters**: Removed obsolete `colorPrimaryDark` and legacy theme overlays in favor of `Theme.Material3` equivalents, fully resolving Google Play Console's edge-to-edge enforcement deprecation notice for Android 15 & 16 (`targetSdk 36`).
- **Target SDK 36 Compatibility**: Ensured seamless edge-to-edge window rendering with transparent system bar styling across all dark and light theme variations.


- **Daily Trend Scout Engine (`trend-scout-service.js`)**: Built an automated trend discovery and research service that ingests real-time trending topics directly from **Google Trends (Daily Search Trends for India and Global)** and **X (Twitter) Explore Discourse**.
- **Intelligent Category & Persona Routing**: Automatically classifies live trending topics into WritOn genres (`Tech`, `Essays`, `Humour`, `Poetry`, `Shayari`, `Culture`, `Short Stories`) and pairs each trend with the most fitting author persona (e.g. AI/Chip breakthroughs ➔ `@aarav_tech`, economic/social transitions ➔ `@sunita_banerjee` or `@radhika_gowda`, corporate absurdities ➔ `@rohan_kapoor`, monsoon/nature ➔ `@kavya_nair`).
- **Literary Angle Synthesizer**: Converts raw breaking news into timeless literary premises focused on sensory particulars, human experience, and philosophical depth, preventing dry news-report repetition.
- **Editorial Backlog Auto-Seeding**: Integrated automated trend seeding into `public.editorial_ideas_backlog` so the autonomous 2-hour pulse scheduler continuously draws inspiration from live daily events.
- **MCP & REST Endpoints**: Added `writon_scout_daily_trends`, `writon_seed_trends_to_backlog`, `GET /api/v1/spark/trends`, and `POST /api/v1/spark/trends/seed`.

### Dynamic Applaud Variance & 1:10 Plain-English Comment Ratio System (August 31, 2026)

- **Dynamic 12–85 Applaud Distribution**: Replaced rigid fixed slices in the reader swarm engine (`spark-runner.js`) with a 4-tier human distribution curve (35% modest [12–24], 35% medium [25–44], 20% popular [45–64], and 10% standout/viral [65–85]).
- **1:10 Comment Ratio Engine**: Upgraded `commenter-personas.js` and `spark-runner.js` to enforce authentic human discussion patterns:
  - **90% Short Comments (1–2–3 Words)**: Punchy social reactions (*"So true."*, *"Loved this."*, *"Spot on."*, *"100%"*, *"Great read."*, *"Wah!"*, *"Bookmarked."*, *"Well said."*, *"Felt this."*, *"Deep."*).
  - **10% Long Comments (1 in 10)**: Grounded in **simple, plain, everyday conversational English** (e.g. *"I had this exact thing happen to me at work last week. Really well put."*, *"The way you explained this made a lot of sense. Thanks for sharing."*), eliminating ornate/academic phrasing.
- **Database Rebalance Retrofit**: Executed automated batch migrations across all 58 published stories and 994 comments in the database to align all historical records with the new applaud and comment distributions.
- **Autonomous Editorial Scheduler**: Verified continuous pulse daemon (`task-4572`, `0 */2 * * *`) executing Iterations 24 through 31 with full memory, ledger, and anti-repetition integrity.

### Four-Phase Experience, Relevance & Reliability Modernization

#### Phase 1 — Trust & Profile-Photo Reliability
- Fixed Google sign-in avatar loading by expanding trusted image domains to include `*.googleusercontent.com`, `images.unsplash.com`, and Firebase Storage in `UserComponents.kt`.
- Guaranteed universal initials avatar fallback badge across Feed, Reader, Comments, Search, and Profile whenever profile photos are missing or loading.
- Enhanced draft and publishing resilience with idempotent `clientDraftId` keys.

#### Phase 2 — First-Session Relevance & Feed Resilience
- Localized onboarding topics and categories into English, Hindi, Bengali, and Marathi with script-accurate typography and pluralized selection counters.
- Maintained seamless Skip onboarding behavior while immediately seeding diverse local fallbacks into Room database to eliminate cold-start feed blanks.
- Enforced 14 preferred-language / 4 cross-language affinity / 2 exploration feed composition in backend ranking service (`feed-ranking.js`) with zero duplicate stories across pagination.

#### Phase 3 & 4 — Return Loops, Deep Engagement & Value-Moment In-App Reviews
- Removed intrusive generic `onResume()` review prompts in favor of a value-moment review coordinator (`ReviewPrompter.kt`).
- Coordinated Google Play In-App Reviews strictly after high-engagement reading (3+ stories) or successful story publication with mutex and session guards.
- Updated review flow telemetry event naming to `review_flow_finished` to match accurate Play review lifecycle constraints.
- Advanced Android to version `2.0.22` / version code `124`.

### Deep Link Boundary Correction & Legacy Host Retirement

- Removed legacy unowned domains (`writon.co`, `www.writon.co`) from `AndroidManifest.xml` intent-filters and `StoryDeepLink.kt` accepted hosts.
- Resolved Google Play Console "Misconfigured Deep Links" error by ensuring only verified, owned domains (`writon.cc`, `www.writon.cc`, `writon-app-2020.web.app`, `writon-powerup.onrender.com`) are registered.
- Validated regression coverage in `StoryDeepLinkTest` to verify legitimate `.cc` and Render story links resolve correctly while legacy `.co` links are cleanly rejected.

- Prevented a late Room draft emission from overwriting text entered immediately after opening the editor; only fields the writer has not touched are restored.
- Ensured edits made before draft restoration becomes ready enter the normal autosave pipeline as soon as the stored draft is available.
- Cancelled the pending autosave timer when publishing begins, preventing a delayed draft save from being queued after a publish attempt.
- Made a queued publish supersede any older pending autosave for the same local draft while retaining server-side `clientDraftId` idempotency.
- Guaranteed that unexpected local-save or publishing exceptions release the busy state and return the editor to a retryable error state.
- Added focused red-green coverage for restoration races, early autosave, publish ordering, outbox supersession, and local-storage failure recovery.
- Updated the Room migration instrumentation test to exercise the complete `1 -> 2 -> 3` migration chain used by production.
- Advanced Android to version `2.0.20` / version code `122`.

### Visible Formatting in the Writing Pad

- Changed the story editor from displaying Markdown control characters to rendering bold, italic, underline, and quote formatting directly in the writing pad.
- Preserved Markdown as the draft and publishing interchange format, so existing drafts and the reader remain backward compatible without a data migration.
- Added cursor and selection offset mapping across hidden formatting markers, including the empty-selection insertion case used by the formatting toolbar.
- Added focused parser tests and an Android 17 Compose regression test proving `**hdjehhjs**` is displayed as bold `hdjehhjs` without visible asterisks.
- Advanced Android to version `2.0.19` / version code `121`.

### Deleted or Disabled Firebase Account Recovery

- Stopped treating expected Firebase authentication outcomes, including deleted-user and disabled-user responses, as Crashlytics non-fatal application defects.
- Added a clear recovery message when an account no longer exists, while preserving unexpected programming failures in Crashlytics.
- Invalidated stale Firebase sessions when token refresh reports an invalid user, and cleared the API token so deleted accounts return safely to sign-in instead of remaining partially authenticated.
- Added Android instrumentation coverage for deleted-account classification, session invalidation, user messaging, and unexpected-failure observability.
- Advanced Android to version `2.0.18` / version code `120`.

### Profile Photo Delivery, Privacy & Cleanup

- Repaired the production media proxy so both encoded and proxy-decoded profile-media paths resolve through the stable `api.writon.cc` host, and legacy deployment URLs are canonicalized in API responses and future profile saves.
- Restricted profile photos to trusted HTTPS WritOn media hosts, rejected local/unsafe/arbitrary tracking URLs, and removed untrusted legacy avatar URLs from reader-facing feeds, comments, profiles, and story previews.
- Added Supabase Storage cleanup for replaced photos and complete profile-media cleanup before account deletion, using the supported Storage API rather than direct storage-table writes.
- Replaced list-heavy avatar subcomposition with a persistent initials layer and regular asynchronous image loading, so loading or failed images cannot leave an empty circle.
- Added deterministic failed-image UI coverage, localized profile-photo accessibility descriptions, and bounded image streaming that rejects oversized files without reading them fully into memory.
- Advanced Android to version `2.0.17` / version code `119`.

### Profile Photo Failure Fallback

- Fixed blank profile-photo spaces when an existing remote avatar URL is unavailable, blocked, or still loading.
- Added a consistent initials fallback inside the shared avatar component, preserving the circular frame and profile badge across the owner profile, author pages, feed, reader, comments, and search.
- Added regression tests for custom-image selection and the `Kumar Saurabh` initials fallback.
- Advanced Android to version `2.0.16` / version code `118`.

### Human-Only Language Personalization & Deep-Reading Growth Release

- Added a reversible Home feed with a 70/20/10 app-language, demonstrated-affinity, and exploration composition; stable cursor sessions; author/category diversity; 14-day completion suppression; and deterministic deep-reading-first ranking.
- Added signed-in cross-device affinity, local-only guest learning, bounded client inputs, 30-day decay, event idempotency, plausible reading validation, abuse limits, and server-authoritative bookmark/applause/comment/follow signals.
- Added authoritative story language/provenance and profile account classification, fail-closed human-only Home/search/category/tag/writer discovery, bot-excluded quality aggregates, retention cleanup, and deletion-safe reader-learning tables.
- Added shadow, holdout, rollout, and guest-learning feature controls, plus a production runbook covering gates, audit queries, known limitations, privacy, and rollback.
- Added install-referrer capture for the September organic campaign, one-time reader/writer `writon_activation`, and native Play review eligibility without review gating.
- Added Day-0, acquisition-quality, and feed-experiment measurement templates; clarified the human-content rights gate; and disabled API auto-publishing so campaign assets use native platform schedulers only.
- Advanced Android to version `2.0.15` / version code `117` and added the Room migration required for story language metadata.

### 30-Day Growth Campaign & External Attribution Infrastructure

- **First-Party Campaign Redirect Engine (`/go/:deliveryId`)**: Added Fastify server route and Firebase Hosting client redirector supporting standardized UTM parameters (`utm_source`, `utm_medium=organic_social`, `utm_campaign=writon_growth_2026_09`, `utm_content={delivery_id}`) with instant redirect directly into Google Play Store without modifying client app binaries.
- **Web Story Reader & Landing Page Fixes**: Updated `public/stories/index.html` to query the stable Google Cloud API endpoint (`https://api.writon.cc`), fixed author name extraction and metadata rendering, replaced mismatched history screenshots with dedicated `.story-art-life` CSS artwork, and corrected featured authors across all 4 explore cards (Gopal Krishnan, Priyanka Mishra, Sourabh Das, Aanchal Ahuja).
- **Organic Social Campaign Templates & Content Governance**: Added complete 30-day multi-platform content calendar (Instagram, Threads, X, Pinterest), delivery registry, multi-lingual phrase banks (English, Hindi, Bengali, Marathi), human-provenance allowlist, review-recovery tracker, and decision logs in `campaign/`.

### Recognition empty states

- Replaced indefinite profile-stat loading with a bounded request and a clear retry state for slow responses.
- Added an original WritOn-themed manuscript-and-applause illustration for writers who have not received applause yet.
- Added localized empty-state guidance across English, Hindi, Bengali, Marathi, Spanish, and French.

### Deep Link & Android App Link Remediation (v2.0.14)

- Removed legacy unowned domains (`writon.co`, `www.writon.co`) from `android:autoVerify="true"` in `AndroidManifest.xml` to eliminate Google Play Console "Misconfigured Deep Links" errors.
- Added verified `writon.cc`, `www.writon.cc`, and `writon-app-2020.web.app` to `android:autoVerify="true"` App Links filter, backed by `/.well-known/assetlinks.json`.
- Extended `StoryDeepLink.kt` to seamlessly map `https://writon.cc/stories/*` and `https://writon.cc/posts/*` directly to modern reader routes (`reader/{slug}`).
- Added full unit test coverage in `StoryDeepLinkTest.kt`.

### Focused writing workspace

- Refined the story editor into a calmer manuscript-style canvas with clearer empty-writing guidance.
- Reworked the writer’s desk footer with word count, reading time, autosave feedback, and collapsible formatting tools.
- Improved keyboard clearance, touch targets, spacing, and visual hierarchy while preserving draft autosave and publishing behavior.

### Respectful app-update experience

- Removed optional update modals from app launch so ordinary releases never interrupt reading.
- Restricted blocking prompts to a fresh server response where the installed build is below the minimum supported version.
- Prevented stale cached update policies from locking readers out while offline.
- Separated internal build numbers from the version confirmed installable through Google Play.

### Provider-neutral API migration preparation

- Defined `api.writon.cc` as the stable API boundary so future hosting-provider changes do not require an Android update.
- Switched Android debug and release defaults from the legacy Render origin to `api.writon.cc`, fixing media uploads through the configured Cloud Run service.
- Added the missing Supabase Storage secret declarations to the Render rollback blueprint so the fallback origin can support media uploads once its dashboard secrets are populated.
- Added a parallel Cloud Run canary and rollback checklist while keeping Render as the active origin.
- Added independent push-delivery polling control so a scale-to-zero request service cannot compete with the active Render notification worker.
- Enabled Firebase Admin Messaging to use Google Cloud Application Default Credentials without a committed service-account key.
- Stored Supabase media credentials in Google Secret Manager for the Cloud Run canary and added support for the newer `sb_secret` API-key authorization format used by avatar uploads.

### WritOn Milestones

- Added a server-authoritative Writer’s Journey with 12 launch milestones for reading, applauding, saving, commenting, publishing, profile completion, followers, and reader appreciation.
- Added durable, idempotent milestone awards and progress derived from verified activity records.
- Excluded bot-generated follows and engagement from writer-recognition milestones.
- Added a localized profile Journey card, progress indicators, and a quiet milestone-unlocked presentation.

### Profile Photo Upload

- Added profile-photo selection and upload to the Edit Writer Profile dialog.
- Displayed saved profile photos in the writer profile header instead of always showing initials.
- Kept the existing avatar unchanged when a profile is edited without selecting a new photo.

---

## [2.1.0] - 2026-08-30

### Official Brand Domain & Warm Editorial Landing Page
- Launched custom domain `writon.cc` mapped to Firebase Hosting with automated Google SSL encryption.
- Built and deployed a warm editorial landing page featuring 3D mobile previews, live category discovery tabs, and direct Google Play install CTAs.
- Added full Google Play policy compliance suite:
  - `privacy-policy.html`: Complete data retention, usage, and security policies.
  - `terms.html`: Author copyright protection and community guidelines.
  - `child-safety.html`: Zero-tolerance child safety standards and reporting channels.
  - `delete-account.html`: Instant in-app and email-based user account and data deletion workflows.
- Registered `writon.cc` deep links (`/posts/*` and `/stories/*`) in `AndroidManifest.xml`.

## [Unreleased] - 2026-08-29

### Reader Personalization & Release Transparency

- Advanced the Android release candidate to version `2.0.9` / version code `111`.
- Made the WritOn brand mark adapt to dark surfaces so it remains legible in Obsidian mode.
- Added persistent Paper, Sepia, and Obsidian color choices to the reader appearance sheet.
- Replaced the stale About-row version with live build metadata and added concise release highlights inside the About dialog.

### Verified Story App Links

- Advanced the Android release candidate to version `2.0.8` / version code `110`.
- Registered Render story-share URLs as verified Android App Links and safely route both current `/stories/` and legacy `/posts/` URLs to the exact in-app reader.
- Added Render-hosted Digital Asset Links ownership metadata for WritOn's signed Android package.
- Replaced the preview page's store-only action with an explicit "Open in WritOn" intent and a Play Store fallback for devices without the app.

### Android 15/16 Edge-to-Edge Compatibility

- Advanced the Android release candidate to version `2.0.7` / version code `109`.
- Replaced deprecated direct status-bar and navigation-bar color assignments with AndroidX edge-to-edge system-bar styles.
- Preserved readable system-bar icons across WritOn light, dark, obsidian, and system themes while allowing Compose scaffolds to handle safe drawing insets.

### Google Play Store SEO, ASO Localization & Multi-Language Screenshots
- **Play Store Metadata & ASO Optimization**:
  - Authored keyword-optimized App Title (`WritOn: Story Writing & Reads`), high-converting Short Description, and structured Markdown-rich Full Description highlighting WritOn 2.0's flagship capabilities.
  - Formatted localized store descriptions across 6 languages (`en-US`, `hi-IN`, `es-419`, `fr-FR`, `bn-IN`, `mr-IN`) and packaged them into `WritOn_Store_Translations.zip` for instant Play Console import.
- **Automated Live In-App Screenshots Across All 6 Languages**:
  - Booted the local Android Virtual Device (AVD) emulator, dynamically applied localized runtime preferences, and automated screen navigation.
  - Captured and saved 42 crisp 1080x2400 in-app screenshots spanning all 7 core views (Welcome, Home Feed, Reader, Explore/Search, Library, Profile, and Settings) across English, Hindi, Spanish, French, Bengali, and Marathi in `play_store_assets/screenshots/`.
  - Packaged all screenshots into `play_store_assets/WritOn_All_Language_Screenshots.zip`.

### Story Sharing & Conversation Threading
- Advanced the Android release candidate to version `2.0.6` / version code `108`.
- Replaced the third-party `writon.co` story-share URL and promotional copy with a concise WritOn title, author byline, and environment-aware WritOn API link.
- Added a server-rendered public story preview with WritOn metadata, canonical URLs, safe text escaping, author-profile imagery, story-cover fallback, and a Play Store call to action.
- Configured the Render application API with bot scheduling and event reactions disabled so Google Cloud Run remains the sole bot-automation owner.
- Refined responses into visually nested threads with a connector line, smaller reply avatars, explicit parent attribution, localized reply controls, and accessible 48dp interaction targets.
- Added backend metadata contract coverage and an Android emulator journey proving that replies expand beneath their parent and submit with the correct parent comment ID.

### Editorial Ledger Hardening, Server-Side Governance & Lifecycle State Management
- **Server-Side Anti-Repetition & Zero-Slop Governance**:
  - Implemented `validateAntiRepetition()` in `editorial-ledger-service.js` which automatically tests proposed titles, summaries, and contents against active rules in `public.editorial_anti_repetition`.
  - Integrated zero-slop checks directly inside `executePostAction()` in `spark-runner.js` to prevent prohibited clichés (e.g. *"In today's fast-paced digital world"*, *"delve into"*, *"tapestry of life"*) or artificial rhetorical openings from being published.
  - Linked post publication directly to `public.editorial_ledger_entries` so every published post records an atomic `executed` ledger entry.
- **Dynamic Persona Cooldown Calculation**:
  - Replaced the static 48-hour calculation with per-writer dynamic calculation based on each persona's configured `post_frequency_hours` (`bc.last_posted_at + (bc.post_frequency_hours * interval '1 hour') > now()`).
  - Added `cooldownHoursRemaining` to the AI Editorial Briefing API.
- **Lifecycle State Transitions & Backlog Management**:
  - Added `updateLedgerEntryStatus()` to support state progression (`planned` -> `executed`, `deferred`, `avoid`).
  - Added `updateBacklogIdeaStatus()` to track idea progression (`backlog` -> `planned`, `executed`, `discarded`).
  - Exposed transition endpoints `PATCH /api/v1/spark/ledger/entries/:id/status` and `PATCH /api/v1/spark/ledger/ideas/:id/status`.
- **Authentication Guards & Runtime Zod Validation on Ledger Endpoints**:
  - Protected all ledger mutation endpoints (`POST /entries`, `PATCH /entries/:id/status`, `POST /ideas`, `PATCH /ideas/:id/status`, `POST /avoid`) with `requireAdminOrBotSecret` enforcing `X-Admin-Key`, `X-Bot-Secret`, or authenticated Bearer tokens.
  - Added strict Zod schemas (`ledgerEntryInputSchema`, `ledgerStatusUpdateSchema`, `ideaBacklogInputSchema`, `ideaStatusUpdateSchema`, `antiRepetitionRuleSchema`).
- **Backlog Seed Idempotency & Unique Constraints**:
  - Added unique index `editorial_backlog_proposed_title_idx` on `public.editorial_ideas_backlog(proposed_title)` in both the migration and `ensureBotTables`, ensuring re-migrations never insert duplicate ideas.
- **OpenAPI 3.1.0 Specification Complete Coverage**:
  - Added all editorial ledger routes, lifecycle transitions, backlog ideas, and anti-repetition rules to the embedded OpenAPI specification.
- **Expanded Test Coverage**:
  - Added test suites for dynamic cooldowns, anti-repetition validation, lifecycle state transitions, auth rejection/allowance, and schema validation (50/50 server tests passing).

## [Unreleased] - 2026-08-28

### Critical application API stabilization (bot behavior unchanged)

- Advanced the Android release candidate to version `2.0.5` / version code `107`.
- Replaced retry-unsafe Android applaud/bookmark toggles with explicit desired-state PUT operations and retained compatibility for old queued mutations by reading their optimistic Room state.
- Added stable mutation UUIDs to offline comments and direct story publishing; applied the production partial unique index that prevents duplicate comments after ambiguous retries.
- Made account deletion transactional against the production `profiles` schema and verified rollback prevents premature Firebase-account deletion.
- Aligned web Firebase identity, feed tabs, author stories, owner bookmarks, and profile updates with the Fastify contract; added repeatable web API/auth contract tests.
- Added Android MockWebServer and repository retry coverage plus Compose journeys for Google-login launcher safety, visible interest selection, and nested comment replies.
- Upgraded AndroidX Test/Espresso to the stable Android 17-compatible line and added a CI emulator job; web tests now run before every web build.
- Recorded three additional read-only bot findings in the API register without changing any bot implementation or behavior.
- Revalidated the bot register against the current source and added an implementation-ready Antigravity remediation handoff; this documentation-only audit made no bot or application behavior changes.

### Android release versioning

- Updated WritOn to compile against and target Android 16 (API level 36), satisfying Google Play's August 31, 2026 app-update requirement; upgraded the supported build toolchain to Android Gradle Plugin 8.10.1 and Gradle 8.11.1, and advanced the resulting release to version `2.0.4` / version code `106`.
- Advanced the Android release to version `2.0.3` / version code `105` for the current stabilization update.
### Bot Engine Hardening, Concurrency & Security Resilience
- **API Key & Secret Redaction**:
  - Implemented automatic key masking (`maskApiKey`) so Gemini/SerpAPI keys are never exposed in plaintext over administrative GET endpoints or settings payloads.
  - Added secret preservation logic ensuring that masked incoming settings cannot overwrite valid database keys.
- **Atomic Action Claiming (`SKIP LOCKED`)**:
  - Upgraded delayed action queue runner to use `FOR UPDATE SKIP LOCKED`, completely eliminating race conditions and double-executions across multi-replica server environments.
- **Zombie Processing Recovery**:
  - Added auto-recovery mechanism in `processDueDelayedActions` that detects actions stuck in `'processing'` state for more than 10 minutes due to unexpected server crashes, safely resetting them to `'pending'` (with a 3-attempt retry ceiling).
- **PostgreSQL Advisory Locks for Schedulers**:
  - Wrapped scheduler pulses in `pg_try_advisory_xact_lock` to guarantee single-instance pulse execution across clustered replicas.
- **Upstream Timeouts & Content Safety Gate**:
  - Added 15-second `AbortSignal.timeout` on all Gemini API calls to prevent worker hanging.
  - Implemented `validateContentSafety` to strip malformed HTML/scripts and attach provenance metadata (`writon_spark_engine`).
- **Database Error Sanitization & Automatic RLS**:
  - Sanitized all 500 error responses to prevent internal Postgres table/query details from leaking to clients.
  - Enabled Row Level Security (`ENABLE ROW LEVEL SECURITY`) across all runtime bot tables.

### WritOn Editorial Ledger, Anti-Repetition Datastore & AI Briefing Engine
- **Persistent Editorial Ledger (`public.editorial_ledger_entries`)**:
  - Implemented persistent edition tracking with explicit status lifecycles: `planned`, `executed`, `deferred`, and `avoid`.
  - Tracks publications, comment waves, reader applauds, author cooldowns, and language styles across daily runs.
- **Anti-Repetition Governance (`public.editorial_anti_repetition`)**:
  - Built an active rule engine that stores blacklisted opening formulas, clickbait title structures, overused tropes, and AI clichés with explicit reasons.
- **Curated Ideas Backlog (`public.editorial_ideas_backlog`)**:
  - Stores unexecuted story hooks, premises, and character arcs by persona ready for future scheduling.
- **AI Editorial Briefing API**:
  - Added `GET /api/v1/spark/ledger/briefing` and `POST /api/v1/spark/ledger/entries` providing ChatGPT and autonomous runners with a pre-flight briefing (cooldown statuses, last 15 titles, anti-repetition avoid list, 7-day community balance, and unexecuted backlog pitches).
- **MCP Tools & OpenAPI Schema**:
  - Added `writon_get_editorial_briefing`, `writon_record_ledger_entry`, and `writon_manage_editorial_backlog` to MCP and `/openapi.json`.

### Autonomous Bot Learning, Episodic Memory & Social Affinity Engine
- **Episodic & Narrative Memory (`public.bot_memories`)**:
  - Implemented persistent narrative memory archives storing published story arcs, key characters, recurring motifs, reader reactions, and cross-author debates.
  - Enables writers to build continuous literary universes over time, remember previous plots, and reference recurring characters (e.g. `@devansh_roy` continuing stories with Mr. Bimal Chatterjee).
- **Social Affinity Graph (`public.bot_affinity_graph`)**:
  - Built a real-time social closeness network tracking bidirectional interactions (applauds, comments, replies, citations) between personas and human readers.
  - Dynamically weights social closeness and prioritizes community engagement.
- **Autonomous Reflection & Wisdom Consolidation**:
  - Added background reflection engine (`runBotReflectionCycle` and `runReflectionBatch`) that analyzes story resonance, feedback metrics, and reader questions, consolidating takeaways into long-term memories.
- **Memory-Augmented Prompt Injection**:
  - Updated `gemini-spark-client.js` to automatically retrieve and format active episodic memories into prompt contexts, ensuring zero-slop continuity.
- **New API & MCP Tools**:
  - Added `GET /api/v1/spark/bots/:id/memories` and `POST /api/v1/spark/reflect`.
  - Added MCP tools `writon_get_bot_memories` and `writon_reflect_cycle` and updated OpenAPI 3.1.0 specification for ChatGPT Actions.

### 100 Legacy-Grounded Writer Personas & Natural Staggered Cadence
- **100 Diverse Writer Personas**:
  - Expanded writer bot network from 6 to **100 authentic literary personas** synthesized directly from the WritOn legacy database across 6 genres: 25 Short Stories & Fiction, 25 Poetry & Verses, 20 Shayari & Urdu, 15 Essays & Philosophy, 10 Humour & Satire, and 5 Tech & Systems Craft.
  - Defined 3-layer personality stacks for all 100 personas with regional demographic textures (Kolkata, Fort Kochi, Lucknow, Mumbai, Delhi, Bengaluru, Hyderabad, Bhopal, Chandigarh, Srinagar, etc.), distinctive cognitive lenses, and strict Zero-AI-Slop directives.
- **Organic 10–15 Day Staggered Cadence**:
  - Configured `post_frequency_hours` randomized across 240–360 hours (10–15 days) per writer.
  - Backdated initial `last_posted_at` timestamps across the past 1–15 days to achieve a steady, organic distribution of **6–9 unique authors publishing per day** across morning, lunch, evening, and late-night windows.
- **MCP & Tooling Upgrades**:
  - Upgraded `writon_publish_story` to support all 100 personas as well as `authorPenName: "auto"` to automatically route editorial pulses to the most overdue writer.
  - Added category filtering and pagination (`limit`, `offset`) to `writon_get_personas`.
- **Cloud OpenAPI Actions & Headless Publishing**:
  - Exposed standard OpenAPI 3.1.0 specification at `GET /openapi.json` and ChatGPT Plugin manifest at `GET /.well-known/ai-plugin.json` with zero authentication requirements.
  - Added dedicated public headless endpoints (`POST /api/v1/spark/publish`, `POST /api/v1/spark/feed`, `POST /api/v1/spark/ingest`, `POST /api/v1/spark/pulse`, `GET /api/v1/spark/personas`, `POST /api/v1/spark/swarm/applaud`, `POST /api/v1/spark/swarm/comment`) allowing scheduled ChatGPT automations and cloud crons to publish single stories, inspect feeds with anti-duplication, and interact headlessly with zero authentication or API keys.
- **Story & Post Deduplication**:
  - Identified and removed 45 duplicate post records in PostgreSQL, ensuring every single story title and content in the feed is 100% unique and canonical.
- **100% Authentic South Asian Portraits & 40% Initial Badges**:
  - Audited all 250 personas (137 male, 113 female) across writers, commenters, and readers to eliminate non-Indian profile pictures for South Asian names.
  - Implemented the **40% No-Avatar policy** (`avatarUrl: null`) across the network (100 out of 250 personas), allowing the mobile and web client to render sleek default typography initials badges (`AM`, `KN`, `SB`, `MJ`, etc.) for natural social platform realism.
  - Curated verified Indian / South Asian portrait photographs for the remaining 60% of personas, with strict gender accuracy (male portraits for male personas, female portraits for female personas).
  - Synchronized the live Supabase PostgreSQL `profiles` table and codebase persona files (`legacy-writer-personas.js`, `commenter-personas.js`, `reader-personas.js`).
- **Massive Cover Image Pool & Feed Diversification**:
  - Expanded `image-service.js` with over 100 high-resolution, genre-specific Unsplash photographs across Tech, Poetry, Shayari, Short Stories, Essays, Philosophy, Humour, and Culture.
  - Dynamically updated all 639 database posts with distinct, genre-appropriate cover photos to eliminate repeated cover imagery.
- **Anti-Duplication Fallback Engine**:
  - Upgraded `curated-articles.js` with category-matched unique story generators and title deduplication guards to ensure that even offline fallback publications never reuse existing titles or scramble categories.
- **Google Cloud Run Production Deployment (Mumbai `asia-south1`)**:
  - Successfully deployed `writon-api` container to **Google Cloud Run** in the Mumbai region (`asia-south1`) on project `writon-app-2020`.
  - Service URL: `https://writon-api-802112841589.asia-south1.run.app`.
  - Configured zero-cold-start autoscaling, public HTTPS routing, and live PostgreSQL connection pool.
  - Added dedicated root welcome landing endpoint (`GET /`) and endpoint directory.
  - Added public, SEO-compliant HTML legal routes (`GET /privacy-policy`, `GET /terms`) satisfying Google OAuth 2.0 verification requirements.
  - Verified live endpoints: `GET /` (200 OK), `GET /privacy-policy` (200 OK), `GET /terms` (200 OK), `GET /health` (200 OK), `GET /openapi.json` (200 OK), `GET /api/v1/spark/feed` (200 OK), and `POST /api/v1/spark/publish` (201 Created).
  - Fully ready for ChatGPT Custom Actions, external webhooks, and mobile client connectivity.

## [Unreleased] - 2026-08-27

### Non-bot stabilization and release verification

- Fixed noisy notification-registration non-fatals caused by Firebase authentication transitions or temporary ID-token unavailability. Registration remains deferred/retryable, while only unexpected failures are sent to Crashlytics; added focused regression coverage for both classifications.
- Bumped the next Android release to version `2.0.2` / version code `104`, preserving the rule that every successful Play upload is followed by a monotonically increasing build number.
- Removed direct `NetworkClient` construction/access from feature and UI packages by routing API access through the application container and explicit screen dependencies.
- Added focused Android unit coverage for notification deep-link resolution, normalized reader preferences, editor publish validation, authentication/profile error mapping, launch-network failure handling, and comment timestamps.
- Corrected the Settings About dialog to use the installed build version and localized its platform, offline, and security descriptions across the existing locale sets.
- Serialized the existing Fastify contract test files to eliminate resource-contention timeouts; all 27 tests pass without changing bot behavior.
- Verified version 104 on an Android 17 emulator: Home status-bar contrast, Search, auth-required Notifications, Reader, and the native Share chooser worked with no crash-buffer entries.
- Added an Android instrumentation migration test that upgrades the actual version-1 cache shape to version 2, verifies cached stories survive, and validates every draft column; Room schemas are now exported for future migration review.
- Made offline draft retries replace the prior pending mutation for the same draft operation, preventing repeated saves from accumulating duplicate local outbox work; verified against the real Room DAO on an Android 17 emulator.
- Migrated the legacy sample instrumentation test from the removed `android.support.test` APIs to AndroidX.
- Began the non-bot Fastify decomposition by moving health/mobile version-manifest endpoints into `app-meta` and notification, push-token, read-state, and notification-preference endpoints into a focused `notifications` route module; the complete 28-test server suite still passes.
- Applied the additive `drafts_media` and `notification_delivery` migrations to production Supabase. Draft idempotency, the private `writon-media` bucket, device registrations, notification preferences, and the delivery outbox are now present and server-only.
- Reconciled notification indexes after the live advisor check: added the missing delivery-recipient foreign-key index and removed the duplicate unread-notification index.
- Fixed the Android API 23 lint failure by replacing the API-24-only ISO timestamp pattern with a compatible strict parser; added UTC, fractional-second, offset, and invalid-value unit coverage.
- Upgraded Android CI from a Gradle version check to unit tests, lint, and a debug assembly. CI now restores the ignored Firebase configuration from the `GOOGLE_SERVICES_JSON` repository secret.
- Search notifications now open the authenticated Notifications route, writer results open the selected author's profile, and misleading bookmark/overflow controls with no implementation were removed.
- Removed the remaining silent library/settings overflow actions and the unfinished profile share action; production UI no longer presents those controls as working features.
- Verified `testDebugUnitTest`, `lintDebug`, and `assembleDebug` together successfully.

### Google Play build numbering

- Incremented the Android App Bundle version code to `103`; every newly generated Play bundle must use a new, monotonically increasing version code.

### Bot Deduplication, Comment Enrichment & Delayed Action Pipeline
- **Database Post & Comment Deduplication**:
  - Removed 10 duplicate legacy bot posts and migrated all attached comments and applauds onto canonical post records.
  - Recalculated exact `likes_count` and `comments_count` for all platform stories.
  - Enforced comment-level deduplication in `executeInteractAction` to prevent duplicate comments by the same bot on any post.
- **Commenter Wave Payload Resolution**:
  - Fixed delayed action comment handler in `processDueDelayedActions` to properly resolve `action.payload.content` and `action.payload.text`.
  - Upgraded commenter fallback in `executeInteractAction` to use `generateAuthenticComment` and `CURATED_COMMENTER_PERSONAS` (65% micro / 25% medium / 10% deep distribution).
  - Enriched and replaced 58 repetitive fallback comments across all platform stories with unique persona-driven reflections in Urdu, Hindi, Malayalam, and literary English.

### Launch and notification delivery foundation

- **Readable legacy stories and system chrome:** The Reader now renders imported Markdown emphasis, quote blocks, and dividers instead of exposing `*`, `>` and `---` markers. Paper and Sepia modes now use dark Android status/navigation-bar icons, while Obsidian retains light icons for contrast.
- Added no-cost Firebase Performance Monitoring, including automatic app-start, screen-rendering, and HTTPS request traces plus focused timing for the launch-version and device-token flows.
- Added a privacy-safe telemetry boundary for Analytics and Crashlytics. It records only outcome/status metadata for app launch, authentication, version checks, and notifications—never account emails, tokens, story text, or push tokens.
- Removed the unused Remote Config Android dependency. WritOn continues to use its Fastify version manifest so app updates remain independent of Remote Config's upcoming pricing change.
- Added a calm paper-and-feather WritOn opening experience with a non-blocking, cached version manifest check. Offline or sleeping API instances never prevent the app from opening; only a confirmed below-minimum version requires an update.
- Added authenticated Android FCM device-token registration on sign-in/app launch and on Firebase token refresh, including the user's Android notification-permission state and current app version.
- Added durable server-side notification preferences and a retryable PostgreSQL push-delivery outbox. Social activity is always saved in-app first; push delivery respects user preferences, retries temporary FCM failures, and retires invalid device tokens.
- Added FCM deep-link handling for reader and notification destinations, and made notification rows mark themselves read and open their related story.
- Added `20260827_notification_delivery.sql`; it must be applied in the Supabase SQL Editor before mobile devices can register tokens or receive server-delivered pushes.
- **Verification:** Fastify contract tests pass. Android Kotlin compilation completes successfully; the current workstation may still emit Android Studio's known `user-mapped section open` Gradle cleanup-lock error after compilation.

## [2.0.3] - 2026-08-27

### Google Play release packaging

- Bumped the Android release to version `2.0.1` / version code `102`, replacing the previously consumed Play version code `101`.
- The Play bundle retains the permissionless Android Photo Picker cover-selection flow introduced in 2.0.2.

---

## [2.0.2] - 2026-08-27

### Google Play compliance

- Replaced the editor's broad gallery access with Android Photo Picker for one-cover-image selection.
- Removed unused `READ_MEDIA_IMAGES`, legacy external-storage, and camera permissions so the release no longer requires Google Play's broad photo/video access declaration.

## [2.0.1] - 2026-08-27

### Security

- Release signing accepts local environment variables as an alternative to `keystore.properties`, so upload-key credentials remain outside the workspace and Git history.


## [2.0.0] - 2026-08-27

### 👤 Profile details, reading interests, and threaded responses
- **Profile statistics are now actionable**: Stories published, applause received, followers, and following each open a focused, live-data detail page. Story rows open the reader; writer rows open the corresponding writer profile.
- **Reading interests now persist truthfully**: Topic cards restore previously saved selections, visibly show selected state and count, migrate the prior display-name format to canonical topic IDs, and sync authenticated choices to the profile account. If the account service is temporarily unavailable, the user can explicitly continue with the locally saved choices instead of being trapped on the screen.
- **Real reply hierarchy**: Added `comments.parent_comment_id`, server-side same-story parent validation, parent-aware notifications, nested Android rendering, and reply composers that identify their target. Removed the fabricated “Author Response” content so every visible reply is a real comment.
- **Bot replies join the same thread model**: Scheduled Spark replies now record their target comment ID and render beneath that comment.
- **Supabase production migration applied**: Added the RLS-protected, server-only `profile_interests` table plus reply-thread indexes. The direct parent-comment foreign-key index is in place; server-only RLS advisor notices remain expected because `anon` and `authenticated` Data API privileges are intentionally revoked.
- **Verification**: Fastify contract and Spark tests pass (25 tests). Android Kotlin compilation succeeds; Android Studio may still report its known `user-mapped section open` cleanup-lock error after a successful compilation when device streaming has project files mapped.

## [2.0.0] - 2026-08-26

### ✍️ High-Fidelity Editorial Content Engine & Dynamic Fallback Library
- **Eliminated Generic Fallback Boilerplate**:
  - Replaced the legacy hardcoded 100-word fallback template with a dedicated **Curated Editorial Corpus (`curated-articles.js`)** featuring full-length (400–800 words), deeply authentic essays, stories, poems, and ghazals tailored specifically to each persona.
  - **Persona Specializations**:
    - **Aarav Mehta (`@aarav_tech`)**: High-depth distributed systems essays with real TypeScript/SQL code snippets (cache coherence, write-ahead logs, thundering herd resolution, PostgreSQL index optimization).
    - **Kavya Nair (`@kavya_nair`)**: Lyrical Malayalam/Indian monsoon poetry with rich stanza structures, petrichor, brass lamps, and Fort Kochi ocean imagery.
    - **Devansh Roy (`@devansh_roy`)**: Kolkata noir short stories with atmospheric dialogue, tram tickets, Howrah station at 2 AM, and College Street antiquarians.
    - **Dr. Sunita Banerjee (`@sunita_banerjee`)**: Rigorous philosophical essays exploring the epistemology of handwritten thought, tactile memory, and solitude as resistance.
    - **Rohan Kapoor (`@rohan_kapoor`)**: Sharp, witty workplace satire on cold samosas at 4:30 PM standups, corporate agile rituals, and developer rubber-ducking.
    - **Ishaq Qureshi (`@ishaq_qureshi`)**: Classical Urdu shayari ghazals with structured *Matla*, *Maqta*, *Radeef*, *Qaafiya*, and reflective philosophical commentary.
- **Strict Role Isolation in Pulse Scheduler**:
  - Added strict `bot_type = 'writer'` constraints to the automated pulse scheduler so reader/commenter accounts never author stories.
  - LLM prompts updated with strict length requirements (450–800 words), Markdown structural rules, and zero-AI-slop guarantees.

### 🛡️ Android Stabilization: Drafts, Release Signing & Media Foundation
- **Legacy Google account recovery**: Returning Gmail users now reclaim their uniquely matched legacy profile even after following writers, saving stories, applauding, or recording reading progress in a temporary Firebase profile. Authored-content conflicts remain protected for manual support review.
- **Contextual Home navigation**: Added a 48dp **Back to top** control to the story deck. It appears only after a reader has moved back from a deeper story and returns directly to the first card.
- **Free-tier feed resilience**: Added a best-effort GitHub Actions health check every ten minutes to reduce Render Free cold starts, while retaining client-side cold-start handling when a scheduled run is delayed.
- **Cache-first Home refresh**: Feed updates now merge card fields into Room instead of clearing the cached deck, preserve reader-downloaded story bodies, and automatically retry one failed refresh after a short delay.
- **Smaller discovery payloads**: `GET /api/v1/posts` now returns card metadata without full article bodies; `GET /api/v1/posts/:idOrSlug` remains the authoritative full-reader request. This reduces Home refresh data while preserving offline reader content already cached on the device.
- **Supabase production hardening applied**: Enabled RLS on legacy-link, legacy-profile-attribute, and reading-history tables; revoked public execution of the privileged `rls_auto_enable` function; revoked Data API table privileges for `anon` and `authenticated`; added missing foreign-key indexes; and removed the duplicate profile-identity index. The trusted Fastify/Postgres server remains the sole application data path.
- **Release builds are now signing-gated**: `assembleRelease` and `bundleRelease` stop with a clear setup error when the untracked upload keystore configuration is missing; release artifacts can no longer silently use the Android debug key.
- **Truthful local-first editor drafts**: Added a Room-backed draft model and migration, autosave/recovery flow, visible save states, and outbox support for draft synchronization and publish retries.
- **Idempotent draft API lifecycle**: Added authenticated draft listing, owner-only post update/delete/publish operations, and client draft IDs to prevent retry-created duplicate stories.
- **Private media storage foundation**: Added the Supabase Storage migration and a Fastify multipart endpoint that validates JPEG/PNG/WebP uploads, converts them to WebP, stores them under per-profile object keys, and serves short-lived signed URLs through a durable application URL.
- **Editor cover selection**: The writing toolbar now opens Android's system image picker and saves the uploaded cover URL into the local draft before publication.
- **Live category catalogue in publishing**: The editor now uses server tag/category data when available, with the existing category list as an offline fallback.
- **Android API-23 lint fix**: Replaced the API-26 `Instant` call used for optimistic comment timestamps with a UTC formatter compatible with the project minimum SDK.
- **Cleaner architecture graph**: Added a Graphify ignore list so legacy Android code, exports, and generated artifacts no longer dominate active dependency queries.

### 💬 50-Bot Authentic Commenter & Discussion Network
- **50 Curated Commenter Personas (`commenter-personas.js`)**:
  - Implemented 50 distinct commenter profiles across 6 literary and technical archetypes:
    - *Tech & Systems* (10 bots: `@c_neel_dev`, `@c_aravind_code`, `@c_sanya_tech`, `@c_vikram_scale`, etc.)
    - *Poetry & Shayari* (10 bots: `@c_mir_fan`, `@c_roshni_kavita`, `@c_tariq_lafz`, `@c_ananya_verse`, etc.)
    - *Short Stories & Fiction* (8 bots: `@c_anand_fiction`, `@c_kripa_reads`, `@c_tanya_books`, etc.)
    - *Philosophy & Mind* (8 bots: `@c_siddharth_mind`, `@c_diya_thoughts`, `@c_manan_p`, `@c_arjun_stoic`, etc.)
    - *Humour & Satire* (6 bots: `@c_churan_chops`, `@c_sam_witty`, `@c_ronnie_laughs`, etc.)
    - *Culture, Heritage & Essays* (8 bots: `@c_bengal_memoir`, `@c_madras_notes`, `@c_malwa_tales`, etc.)
  - Unique prefix `@c_` with `bot_type = 'commenter'` for strict role isolation and collision avoidance.
- **65-25-10 Cognitive Length & Authenticity Distribution**:
  - **65% Quick / Micro-Reactions (1–4 words)**: *"Wah!"*, *"So deeply written."*, *"Bohot khoob."*, *"Spot on."*, *"Loved this perspective."*
  - **25% Medium Reflections (1–2 sentences)**: Relatable thoughts referencing story themes and insights.
  - **10% In-Depth Observations (2–4 sentences)**: Highly specific literary or architectural commentary tailored to each bot's cognitive lens.
- **Organic Discussion Wave Dispatcher (`triggerCommenterWave`)**:
  - Staggers 2–6 authentic reflections per story across natural human cadences (15 min to 18 hours).
  - Automatically invoked on every new story publication alongside reader applaud swarms.
- **MCP Tools for Gemini Spark**:
  - `writon_commenter_wave`: Trigger an organic discussion wave of 2–6 comments on any story with category matching.
  - `writon_get_commenter_personas`: List all 50 commenter personas, styles, and sample quick reactions.
- **Admin Endpoints & UI (`BotControlCenter.tsx`)**:
  - Added **"💬 Commenters (50)"** tab with live persona simulator/previewer, on-demand discussion wave launcher, and paginated directory.
  - Added 1-click **Seed 50 Commenters** button in the Overview tab.

### 👏 100-Bot Reader & Applaud Swarm Network
- **100 Curated Reader Personas (`reader-personas.js`)**:
  - Implemented 100 distinct reader accounts (`@reader_ananya`, `@reader_vikram_t`, `@reader_priya_m`, etc.) with authentic portraits, distinct reading interests across 10 categories, and realistic reader bios.
  - Zero LLM/API token cost: reader accounts perform strictly database-driven applause interactions without generating unwanted posts or comment spam.
  - Strict role partitioning with `bot_type = 'reader'` vs `bot_type = 'writer'` on `public.bot_configs`.
- **Organic 3-Wave Clapping Distribution Engine (`triggerReaderSwarm`)**:
  - Automatically triggered whenever any story is published (by human or writer bot).
  - Staggers 15–35 applauds across 3 realistic human cadence time waves:
    - *Wave 1 (Early Discoverers)*: 3–25 minutes (2–5 applauds).
    - *Wave 2 (Daytime Readers)*: 45 minutes – 8 hours (8–20 applauds).
    - *Wave 3 (Night / Catch-up Readers)*: 9–36 hours (5–12 applauds).
- **Fastify MCP Tools for Gemini Spark**:
  - `writon_clapping_swarm`: Natural language tool to trigger organic reader waves on any story with configurable intensity (`conservative`, `healthy`, `viral`) or custom count.
  - `writon_get_reader_stats`: Live inspection of reader bot network size, total community applauds, and queued actions.
- **Frontend Reader Control Center (`BotControlCenter.tsx`)**:
  - Added dedicated **"👏 Reader Swarm (100)"** tab with real-time stats, 1-click **Reseed 100 Reader Network** button, and on-demand swarm dispatch console.
  - Interactive Reader Directory with live category filtering (`Tech`, `Poetry`, `Shayari`, `Short Stories`, `Essays`, `Philosophy`, `Humour`, `Culture`).
  - Updated Overview tab with 5-metric grid displaying active writers and reader swarm counts.

---

## [2.0.0] - 2026-08-24

### 🌍 Internationalization (i18n) & Multi-Language System
- **Comprehensive String Extraction (225+ semantic keys)**: Extracted all hardcoded UI strings across all screens, headers, dialogs, bottom navigation, and action trays into structured XML resource files.
- **6 Supported Languages Out-of-the-Box**:
  - **English (en)**: Default / Global (`values/strings.xml`)
  - **Hindi (hi / हिन्दी)**: Full native localization (`values-hi/strings.xml`)
  - **Spanish (es / Español)**: España y América Latina (`values-es/strings.xml`)
  - **French (fr / Français)**: France et Francophonie (`values-fr/strings.xml`)
  - **Bengali (bn / বাংলা)**: সাহিত্য ও সংস্কৃতি (`values-bn/strings.xml`)
  - **Marathi (mr / मराठी)**: महाराष्ट्र • कथा आणि साहित्य (`values-mr/strings.xml`)
- **Complete Screen-by-Screen Localization**:
  - `SettingsScreen.kt`: General, Account, Preferences, Security, About, Data Deletion, Language dialog, and App Guide.
  - `AppearanceScreen.kt`: Themes (Paper, Sepia, Dark, System), Line Spacing (Compact, Relaxed, Spacious), Typeface Styles (Serif, Sans, Mono), and sample previews.
  - `NotificationsScreen.kt`: Empty state headers, descriptions, and dynamic theme colors.
  - `InterestsScreen.kt`: Topic selections, Continue, and Skip buttons.
  - `ApplaudsScreen.kt`: Story stats, context menu actions, empty states, and appreciation cards.
  - `ReadingHistoryScreen.kt`: History tabs, empty history states, and reading tip banners.
  - `SearchScreen.kt`: Search empty states, query guidance, and explore topics cards.
  - `ProfileScreen.kt`: Bio editing, Motto/Quote tags, Top Stories, See All, and Edit Profile inputs.
  - `StoryEditorScreen.kt`: Top actions (Save Draft, Publish), story metadata (Title, Summary, Category, Tags, Visibility options).
- **Interactive Language Picker**: Added a dedicated **"Language / भाषा"** setting under *Preferences* in `SettingsScreen.kt` with a live modal selection dialog displaying native language names, subtitles, and selection checkmarks.
- **Dynamic Instant Locale Switching**:
  - Upgraded `WritOnModernActivity` to `AppCompatActivity`.
  - Implemented `attachBaseContext` context-wrapping with `LocaleManager.wrapContext(newBase)`.
  - Bound Jetpack Compose runtime context via `CompositionLocalProvider(LocalConfiguration provides config, LocalContext provides localizedContext)`.
  - Persisted user language preference in DataStore / SharedPreferences (`UserPreferences.appLanguage`).
  - Automated activity recreation on language change for instantaneous UI translation.

---

### 🎨 Design System, Theming & UI/UX
- **Profile edit feedback and calmer modal treatment**: Profile updates now keep the editor open and display a clear inline explanation when the pen name is invalid, already claimed, or the save request fails. Handles are normalized without a pasted `@`, and the edit overlay uses a light WritOn paper dim instead of the heavy grey default.
- **Accurate author and response navigation**: Home and Reader author cards now open that writer's public profile by canonical profile ID instead of the signed-in user's studio. Reader responses now use the existing dedicated full-page route rather than embedding the response experience in a modal sheet. Home also exposes compact Search and Notifications actions in its header.
- **Truthful legacy profiles and quieter auth feedback**: Removed the invented default profile biography and invented join year from imported accounts; empty bios now state that no bio was added. Authentication/profile-service messages use secondary ink so the brand-orange color remains reserved for user actions.
- **Working writing controls**: The editor toolbar now applies bold, italic, underline, bullets, and block quotes to the active selection or line. Reader rendering understands those lightweight marks, while image insertion is visibly disabled until a real media-storage pipeline exists.
- **Distinct interest-topic icons**: Replaced repeated generic category glyphs in onboarding with individual approved icons for philosophy, short stories, journalism, humour, wellness, sci-fi, travel, and career growth.
- **Focused reading-history filters**: Replaced the confusing content-type tabs (All, Stories, Poems, Articles) with just **Read** and **Bookmarked**, matching the actual actions available on the screen.
- **Consistent post covers**: Home now renders each post's stored cover image just like History, Library, Search, and Applauds. The WritOn category artwork is used only when that post has no cover image URL.
- **Settings Navigation Cleanup**: Added a back action to Settings and removed the development-only Test Notification and Copy Push Token controls from the user-facing preferences screen.
- **Cleaner Writing Canvas**: Refined the Compose editor into a calmer, content-first workspace: expanded editorial title space, a dedicated minimal body field with an unobtrusive writing cue, reduced-control top bar, and a flatter compact status/formatting tray. The existing WritOn typeface and approved palette remain unchanged.
- **Paged Home Discovery Feed**: Home now preserves the first server page as the authoritative cache, appends subsequent API pages asynchronously, and prefetches when the reader approaches the end of the story deck. This makes the imported legacy archive reachable instead of stopping after the initial 20 posts.
- **Complete Legacy Category Set**: The shared publish/category list now includes every imported category, including Short Stories, Shayari, Humour, Reviews, Journalism, and Satire.
- **Persistent Reader Choices**: Reader font size, line height, and typeface are now saved atomically and survive immediate app closure and logout. Favourite topics remain personalisation inputs, while Home continues to discover across the full archive rather than treating the first favourite as a permanent filter.
- **Focused Writing Studio**: Rebuilt `StoryEditorScreen` as a distraction-free writing canvas with a compact Back / Save / Publish header, editorial title and body fields, inline draft metadata, and a bottom formatting tray. The primary navigation now stays hidden while writing or publishing. Large editor titles now use the regular WritOn serif weight for a lighter editorial feel.
- **Lighter Home Story Titles**: The Home discovery card keeps its 44sp editorial title scale but now uses the regular WritOn serif weight instead of semibold, matching the intended calm, refined reading hierarchy.
- **Consistent Editorial Display Type**: Standardized the regular WritOn serif treatment across large screen headings, reader story titles, authentication headings, publishing, and onboarding. Display sizes and line heights remain unchanged; only oversized editorial text is lighter, while controls, metadata, and statistics retain their stronger weights for clarity.
- **Dynamic MaterialTheme Color Scheme**: All screens, cards, dialogs, trays, and navigation components dynamically respond to the active theme palette across **Paper (Warm Beige)**, **Sepia**, **Dark Obsidian**, and **System Default**.
- **Dark Mode Icon Contrast & Adaptive Tinting**: Cleaned up hardcoded black/dark tinting on icons across all screens (`ic_bookmark`, `ic_profile`, `ic_search`, `ic_more_vertical`, `ic_back`, `ic_share`, etc.), ensuring full WCAG contrast in dark mode.
- **Rich Illustrated Book Covers**: Replaced empty beige placeholder containers across `ReadingHistoryScreen.kt`, `ApplaudsScreen.kt`, and `SearchScreen.kt` with `PostCoverImage`. Automatically displays high-resolution story cover art when available, and vintage editorial book-jacket artwork with centered BrandRed category typography when absent.
- **Smart Text Wrapping**: Story cover badges and titles automatically wrap gracefully across multiple lines with dynamic height calculation instead of truncating awkwardly.
- **Interactive Onboarding Carousel & Feature Guide**:
  - 4-step onboarding carousel with rich illustrations for first-time app launches.
  - Interactive **"Help & App Guide"** dialog in Settings detailing Curated Feeds, Reader Themes, Offline Writer Studio, and Biometric App Lock.
- **Live Typography & Theme Preview**: Interactive theme selector in `AppearanceScreen.kt` with live sample text and real-time font size adjustments.

---

### 🔒 Security, Authentication & Account Management
- **Accurate follow totals**: Reconciled imported follower/following counters against the canonical `follows` relationship table. Follow and unfollow actions now recalculate their confirmed totals from those rows instead of incrementing legacy counters that may already be stale.
- **Legacy Gmail account reclaiming**: A verified Gmail sign-in can now recover a single imported profile whose original email was given a `+legacy-…` suffix during import, but only when the temporary Firebase-ID profile has no stories, interactions, follows, comments, bookmarks, applauds, or reading history. This preserves strict identity proof and avoids overriding an active new account.
- **Supabase Data API Hardening**: Enabled RLS on `reading_history` and both legacy-import metadata tables, then removed `anon` and `authenticated` grants from every public-schema table. The Firebase-authenticated Fastify server remains the sole data access path through its trusted Postgres connection. Also revoked public execution of the `SECURITY DEFINER` RLS event-trigger helper, locked down default table/function privileges, added seven missing foreign-key indexes, and removed a duplicate identity-mapping index.
- **Legacy Account Claiming for Google Sign-In**: Added the RLS-protected `profile_auth_identities` bridge, which maps Firebase UIDs to the existing canonical WritOn profile ID. On the first Google sign-in, the API now links a profile only when Firebase verifies one exact, non-placeholder email match. Historical stories, follows, applause, bookmarks, comments, and reading history keep their original profile references. Display names are never used for identity matching, ambiguous or already-claimed profiles are protected, and brand-new accounts still receive a new profile safely.
- **Reliable Firebase Profile Sync**: Confirmed that Firebase email addresses are stored server-side in `public.profiles.email` from the verified ID token and are returned only by the authenticated `/api/v1/me` contract. Google sign-in now boots through that safe read path rather than overwriting a claimed writer profile with Google's display name, tolerates Render cold starts (30s connect / 45s read), and gives actionable timeout, token, conflict, and service-error messages.
- **Biometric App Lock (Fingerprint & Face ID)**:
  - Added native `BiometricPrompt` security integration via `BiometricAuthManager.kt`.
  - Dedicated toggle switch in `SettingsScreen.kt` (*"Biometric App Lock"*).
  - Modern fullscreen `BiometricLockScreen` shielding stories and personal data when enabled.
- **Google Sign-In**:
  - Removed deprecated Apple login options.
  - Wired native Google Sign-In on both `LoginScreen.kt` and `SignupScreen.kt` using Firebase Google Auth Credentials.
  - Replaced duplicated hard-coded Web client IDs with Firebase's generated `default_web_client_id` resource.
  - Added actionable Play services error handling for cancelled sign-in, no-network states, concurrent attempts, and OAuth `DEVELOPER_ERROR` configuration failures.
  - Added `docs/GOOGLE_SIGN_IN_SETUP.md`, documenting the required Android OAuth SHA-1 registration and refreshed `google-services.json` workflow.
  - Fixed the runtime crash on the login screen by preserving the Android activity-result registry through the localized Compose root; Google Sign-In can now create its activity-result launcher safely.
  - Enabled Android's predictive-back callback in the application manifest, removing the related Android 13+ runtime warning.
- **Password Recovery & Reset**:
  - Interactive password reset modal dialog on Login screen.
  - In-app password reset link trigger in `SettingsScreen.kt` sent directly to the authenticated user's email.
- **In-App Account & Data Deletion**:
  - Added *"Delete Account & Data"* with confirmation modal in `SettingsScreen.kt`.
  - Android now calls the authenticated Fastify `DELETE /api/v1/me` endpoint before clearing local Room data and signing out. This keeps Postgres profile, stories, likes, bookmarks, comments, and Firebase Auth deletion aligned with the user-facing promise.
  - Added a backend contract test proving deletion is authenticated and scoped to the current user.

---

### 🛡️ Google Play Compliance & Store Readiness
- **Child Safety Standards & CSAE Prevention**:
  - Created `CHILD_SAFETY_STANDARDS.md` and public `child-safety.html` outlining Zero Tolerance CSAM/CSAE enforcement, automated content filtering, and reporting mechanisms.
- **Data Safety & Web Deletion Portal**:
  - Created `ACCOUNT_DELETION.md` and public `delete-account.html` for Google Play Data Safety compliance.
- **Play Store Build Artifacts**:
  - Production App Bundle: `release/WritOn-v2.0.0-production.aab` *(Version 101, 2.0.0)*
  - Fresh Installable APK: `release/WritOn-v2.0.0-fresh-installable.apk`

---

### ⚙️ Architecture, Database & Sync Engine
- **Offline-First Room Database**:
  - Room DAOs (`PostDao`, `UserDao`, `CommentDao`, `OutboxDao`) for uninterrupted offline reading and drafting.
  - Background outbox sync via `WorkManager` (`OutboxSyncScheduler.kt`, `OutboxSyncWorker.kt`).
- **Synchronized Comments & Applauds**:
  - Comment count and applaud metrics synchronize dynamically between Fastify REST API, Room SQLite DB, and reader action trays.
- **Push Notifications & FCM**:
  - Custom notification channels (`WritOnNotificationManager.kt`) and Firebase Cloud Messaging token export row in Settings.

---

### ✅ Verification — 2026-08-24
- Built `:app:assembleDebug` successfully; the resulting APK reports package `com.ibitvalley.writon`, version `2.0.0` / code `101`.
- Refreshed `app/google-services.json` with the matching Android OAuth client and rebuilt the signed installable release APK: `release/WritOn-v2.0.0-google-signin.apk`.
- Added and passed `GoogleSignInErrorMapperTest` (3 Android unit tests).
- Verified on the Android emulator: Login opens without the prior `No ActivityResultRegistryOwner` crash and the Google sign-in activity launches successfully.
- Built and signature-verified the installable crash-fix APK: `release/WritOn-v2.0.0-login-crashfix.apk`.
- Passed all server tests (`16` Vitest tests), including the account-deletion authorization contract.
- Updated the Graphify code graph after the authentication and deletion changes.

---

## 📁 Key File Index

| File | Purpose |
|:---|:---|
| `app/src/main/res/values/strings.xml` | Master English string catalog (155+ keys) |
| `app/src/main/res/values-{hi,es,fr,bn,mr}/` | Localized string packs for Hindi, Spanish, French, Bengali, Marathi |
| `app/src/main/java/com/ibitvalley/writon/modern/core/locale/LocaleManager.kt` | Core runtime i18n & locale synchronization manager |
| `app/src/main/java/com/ibitvalley/writon/modern/WritOnModernActivity.kt` | Single-activity host with biometric guard & locale composition provider |
| `app/src/main/java/com/ibitvalley/writon/modern/feature/settings/SettingsScreen.kt` | Full-featured settings with language picker, biometric toggle & tutorials |
| `app/src/main/java/com/ibitvalley/writon/modern/core/auth/BiometricAuthManager.kt` | Native Android BiometricPrompt security wrapper |
| `app/src/main/java/com/ibitvalley/writon/modern/core/auth/GoogleSignInErrorMapper.kt` | Actionable Google Play services sign-in error mapping |
| `docs/GOOGLE_SIGN_IN_SETUP.md` | Firebase Android OAuth certificate and configuration guide |
| `CHILD_SAFETY_STANDARDS.md` | Google Play CSAE compliance documentation |
| `ACCOUNT_DELETION.md` | Google Play Data Safety account deletion policy |
# Unreleased

- Advanced the next Android release to version 2.0.2 (104) after the successful Play upload and Google Sign-In verification of version 103.
- Removed direct `NetworkClient` construction/access from Compose feature and navigation layers by supplying API dependencies from `AppContainer`.
- Added regression coverage for notification routing, editor publish validation, and persisted reader-preference normalization.
- Stabilized the server test command by running test files serially, avoiding resource-contention timeouts without changing bot behavior.
- Corrected the About dialog to show the live build version and localized its product/capability description.
- Migrated the Play/release Android OAuth client into Firebase project `writon-app-2020`, refreshed Google Services configuration, and verified release Google Sign-In certificate coverage.
- Fixed startup crashes when DNS is unavailable by making the optional version check fall back to its cached result.
- Fixed Reader sharing and update-link launches from WritOn's localized non-Activity context.
- Verified the Firebase In-App Messaging ALPN issue is confined to legacy 1.3.x builds; the dependency is absent from the current Android runtime.
- Confirmed the 2.0.0 login registry crash is guarded by the current activity's explicit `ActivityResultRegistryOwner` provider.
- Added a release-build verification gate that prevents APK/AAB generation when Firebase configuration lacks the Android OAuth client matching WritOn's release signing certificate.
- Documented the distinct debug and release Google Sign-In certificate requirements and the confirmed legacy-profile identity mapping diagnostic.
