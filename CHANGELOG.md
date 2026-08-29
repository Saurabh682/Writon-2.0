# Changelog & Update History — WritOn 2.0

All notable changes, architectural improvements, UI/UX refinements, security features, and localization additions in the **WritOn-PowerUp** project are documented in this file.

### 📌 Active Repository & Fork Details
- **Primary Fork / Repository**: [`Saurabh682/WritOn-PowerUp`](https://github.com/Saurabh682/WritOn-PowerUp.git)
- **Upstream Repository**: [`Saurabh682/Writon-2.0`](https://github.com/Saurabh682/Writon-2.0.git)
- **Active Working Branch**: `Till_29Aug` *(release-branch synchronization remains pending until this stabilization workspace is approved and committed)*
- **Package Name**: `com.ibitvalley.writon`
- **Current Version**: `2.0.6 (Version Code: 108)`

---

## [Unreleased] - 2026-08-29

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
