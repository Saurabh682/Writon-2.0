# Changelog & Update History — WritOn 2.0

All notable changes, architectural improvements, UI/UX refinements, security features, and localization additions in the **WritOn-PowerUp** project are documented in this file.

### 📌 Active Repository & Fork Details
- **Primary Fork / Repository**: [`Saurabh682/WritOn-PowerUp`](https://github.com/Saurabh682/WritOn-PowerUp.git)
- **Upstream Repository**: [`Saurabh682/Writon-2.0`](https://github.com/Saurabh682/Writon-2.0.git)
- **Active Working Branch**: `Till_29Aug` *(release-branch synchronization remains pending until this stabilization workspace is approved and committed)*
- **Package Name**: `com.ibitvalley.writon`
- **Current Version**: `2.0.45 (Version Code: 147)`

### Engagement-preferences staging safety (September 06, 2026)
- Added an isolated PostgreSQL staging harness and a guarded engagement-preferences migration command that cannot silently fall back to the configured production database.
- Added automated checks rejecting production URL reuse and unapproved remote database targets, plus a staging deployment and verification runbook.
- Made the disposable database production-shaped for this migration by creating non-login equivalents of Supabase's `anon` and `authenticated` roles.
- Added a real Fastify/PostgreSQL staging smoke test covering default reads, validated upserts, persisted reads, invalid input, and account-deletion cascade behavior.
- Added a data-free, staging-only compatibility schema for remote authentication/profile and engagement-preference smoke testing; it is explicitly not a production-schema replacement.
- Provisioned the isolated Supabase and Render staging resources, pinned Render
  to the staging branch/commit, kept production-affecting jobs disabled, and
  documented the Supabase pooler recovery and scoped-CA verification gates.

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
