## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Documentation & Changelog Maintenance
- Always update `CHANGELOG.md` with any new features, bug fixes, UI/UX refinements, security updates, or architectural changes made during any task.
- For every delivery that changes or updates the Android app, increment both `versionName` and `versionCode` once before generating release artifacts. The version code must always increase and must never reuse a Google Play version code.
- Whenever a new Android App Bundle (`.aab`) is generated, include in the final handoff:
  - a concise internal Google Play release name using the exact `versionName` and the build's primary user-facing theme;
  - ready-to-paste Google Play release notes for every currently supported store locale (`en-US`, `en-IN`, `hi-IN`, `mr-IN`, and the configured Bengali locale);
  - notes based only on changes actually present and verified in that bundle, avoiding unmeasured claims such as “ultra-fast” or “instant”;
  - correct Google Play locale tags and the `<locale>...</locale>` format;
  - no generic rating/review solicitation in release notes; rely on the app's native, eligibility-controlled review flow instead.
- Ensure all branches (`Till_29Aug`, `production`, and `main`) are kept synchronized with the latest `CHANGELOG.md` and release builds.

## Google Play Growth, ASO & Android Vitals Protocol
- Full empirical strategy, acquisition telemetry analysis, and CRO procedures are documented in [`campaign/GOOGLE_PLAY_GROWTH_PLAYBOOK.md`](file:///d:/VibeCode/WritOn-PowerUp/campaign/GOOGLE_PLAY_GROWTH_PLAYBOOK.md).
- **Core Operating Mandates**:
  - **Explore-First Over Paid Ads**: Organic acquisition is overwhelmingly (>99%) driven by **Google Play Explore** ("Suggested for you", "Similar apps"). Direct creative optimization to Store Listing Conversion Rate Optimization (CRO) rather than burning early ad spend.
  - **First 3 Screenshots & Anti-AI Slop**: Over 80% of store visitors decide based on the first 3 screenshots. Screenshots must use WritOn's official Warm Parchment visual aesthetic (`#FAF5EE`), crisp high-contrast typography, and literal feature utility. Never use generic neon AI mockups or isometric device frames.
  - **In-App Review API Timing**: Prompt for Google Play reviews strictly after high-satisfaction milestone beats (e.g. piece published, reading goal met, streak milestone). Never prompt on cold app launch.
  - **Review Response SLA**: Monitor and reply to 100% of reviews under 500 total ratings to defend store rating $\ge 4.5$.
  - **Android Vitals Algorithmic Gate**: Maintain user-perceived crash rate $< 0.3\%$ (Google threshold: 1.09%) and ANR rate $< 0.1\%$ (Google threshold: 0.47%). Exceeding vitals thresholds instantly kills Google Play Explore distribution.

## Push Notification & Device Reachability Rules
- **Always Ping Unregistered App Downloaders via FCM Topic**:
  - Every automated digest, scheduled push notification, and manual test fire dispatch MUST broadcast to the Firebase Cloud Messaging topic `daily_digest` in addition to direct tokens.
  - Devices that have downloaded the app but remain unregistered (guest readers) automatically subscribe to the `daily_digest` topic.
  - Never emit push dispatches solely to `device_push_tokens` direct recipients without the accompanying `daily_digest` topic broadcast.
  - Ensure notification payloads intended for unregistered readers contain appropriate visual presentation: `channelId: 'writon_editorial_channel'`, `icon: 'ic_stat_writon'`, `color: '#E75A2A'`, `priority: 'high'`, and an actionable `targetRoute`.

## Production Email & Writer Engagement Subsystem
- Full architecture, component registry, data contracts, and AI operations are documented in [`EMAIL_SYSTEM.md`](file:///d:/VibeCode/WritOn-PowerUp/EMAIL_SYSTEM.md).
- Operational setup procedures and DNS configuration are in [`docs/email/SETUP.md`](file:///d:/VibeCode/WritOn-PowerUp/docs/email/SETUP.md).
- **Core Operating Mandates**:
  - **Database Schema & Seeding**: All 7 core email engagement tables (`public.user_email_preferences`, `email_jobs`, `email_delivery_events`, `email_suppressions`, `email_daily_capacity`, `email_preference_audit`, `writer_engagement_events`) are active on the production PostgreSQL database (`rrxaitxeirykmiihgiqj`). All 3,980 existing human profiles have seeded rows defaulting to `false` (explicit opt-out for legal privacy compliance).
  - **New Joiner Welcome Pipeline**: `ensureProfileForId` in `server/src/server.js` detects new registrations via `(xmax = 0)` and triggers `enqueueWelcomeEmail`:
    - Seeds `user_email_preferences` with `lifecycle_enabled = true`.
    - Enqueues the Welcome email into `public.email_jobs` with craft truth tip (*"Write Your Opening Sentence Last"*).
    - Uses signed HMAC-SHA256 URL-safe unsubscribe links with scope `lifecycle`.
    - Idempotent deduplication via `(profile_id, event_key, template_key, template_version)` prevents duplicate sends.
  - **In-Process Delivery Worker**: `server/src/server.js` polls the outbox every 60 seconds (`setInterval`) when `runtimeConfig.email?.enabled` is active, claiming jobs with `FOR UPDATE SKIP LOCKED` and dispatching via Resend with stable idempotency keys.
  - **One-Email-Per-7-Days Cadence**: Enforce maximum 1 optional email per rolling 7 days across all categories per recipient.
  - **Zero Tracking Pixels**: Never inject tracking pixels, redirect wrappers, or dark mode backgrounds; strictly preserve the Warm Ivory Parchment (`#FAF5EE`) aesthetic.
  - **Testing Commands**: Run `npx vitest run test/email-queue.test.js` or `node server/src/scripts/send-sample-emails.mjs --to=<email>`.

## Autonomous Bot Factory & Genesis Protocol
- Standard Operating Procedure for creating, integrating, or upgrading bots for **ANY** new platform (Reddit, Telegram, Pinterest, Bluesky, Substack, etc.) across independent chat sessions is maintained in [`campaign/BOT_GENESIS_PROTOCOL.md`](file:///d:/VibeCode/WritOn-PowerUp/campaign/BOT_GENESIS_PROTOCOL.md).
- Whenever instructed to build a bot for any platform, follow the 7-phase protocol, preserve zero-dependency `fetch` design, update [`campaign/SOCIAL_STRATEGY.md`](file:///d:/VibeCode/WritOn-PowerUp/campaign/SOCIAL_STRATEGY.md) and [`CHANGELOG.md`](file:///d:/VibeCode/WritOn-PowerUp/CHANGELOG.md), and wire into `social-poster.js`, `social-campaign-publisher.js`, and `fetch_social_metrics.mjs`.

## Reddit Autonomous Bot Suite
- **CURRENT STATUS: OPERATIONS PAUSED**: All automated and programmatic Reddit posting, browser automation, and scheduled feed publishers are strictly **PAUSED** by operator directive (`REDDIT_PAUSED=true`). All agents, subagents, and automated jobs must skip Reddit dispatches.
- Full architecture, component registry, data contracts, and AI upgrade instructions are maintained in [`REDDIT_BOTS.md`](file:///d:/VibeCode/WritOn-PowerUp/REDDIT_BOTS.md).
- Operational standards and rate limit policies are documented in [`rules.md`](file:///d:/VibeCode/WritOn-PowerUp/rules.md).
- Complete Reddit API endpoint directory is in [`reddit_api_reference.md`](file:///d:/VibeCode/WritOn-PowerUp/reddit_api_reference.md).
- Any AI agent modifying or extending Reddit bot functionality must consult [`REDDIT_BOTS.md`](file:///d:/VibeCode/WritOn-PowerUp/REDDIT_BOTS.md) first, preserve zero-dependency `fetch` design, and run `npx vitest run test/reddit-client.test.js`.
- **Anti-Ban Sentinel Guardrails & Publishing Rules**:
  - **No Outbound Link Dumping on Young Accounts**: Never publish direct links to `writon.cc` from accounts < 30 days old or with < 100 organic comment karma.
  - **Single-Domain Subreddit Prohibition**: Never populate a new subreddit exclusively with outbound links to a single domain. Posts must be 100% self-contained text/markdown discussions.
  - **9:1 Self-Promotion Ratio**: Maintain at least 9 authentic, non-promotional craft discussions/comments for every 1 post referencing WritOn.
  - **Appeal Constraint**: The `reddit.com/appeal` form strictly enforces a **hard 250-character limit**; use the verified 238-character template in [`rules.md`](file:///d:/VibeCode/WritOn-PowerUp/rules.md).

## Pinterest Autonomous Bot Suite
- Architecture, component registry, and AI upgrade instructions are documented in [`PINTEREST_BOTS.md`](file:///d:/VibeCode/WritOn-PowerUp/PINTEREST_BOTS.md).
- Operational standards and rate limit policies are documented in [`rules_pinterest.md`](file:///d:/VibeCode/WritOn-PowerUp/rules_pinterest.md).
- Complete Pinterest API v5 endpoint directory is in [`pinterest_api_reference.md`](file:///d:/VibeCode/WritOn-PowerUp/pinterest_api_reference.md).
- Any AI agent modifying or extending Pinterest bot functionality must consult [`PINTEREST_BOTS.md`](file:///d:/VibeCode/WritOn-PowerUp/PINTEREST_BOTS.md) first, preserve zero-dependency `fetch` design, and run `npx vitest run test/pinterest-client.test.js`.

## YouTube Autonomous Bot Suite
- Architecture, component registry, and AI upgrade instructions are documented in [`YOUTUBE_BOTS.md`](file:///d:/VibeCode/WritOn-PowerUp/YOUTUBE_BOTS.md).
- Operational standards, quotas (10,000 units/day ceiling, 1600 units/upload), and rate limit policies are documented in [`rules_youtube.md`](file:///d:/VibeCode/WritOn-PowerUp/rules_youtube.md).
- Complete YouTube Data API v3 and resumable media upload endpoint directory is in [`youtube_api_reference.md`](file:///d:/VibeCode/WritOn-PowerUp/youtube_api_reference.md).
- Any AI agent modifying or extending YouTube bot functionality must consult [`YOUTUBE_BOTS.md`](file:///d:/VibeCode/WritOn-PowerUp/YOUTUBE_BOTS.md) first, preserve zero-dependency `fetch` design, and run `npx vitest run test/youtube-client.test.js`.

## LinkedIn Autonomous Bot Suite
- Architecture, component registry, and AI upgrade instructions are documented in [`LINKEDIN_BOTS.md`](file:///d:/VibeCode/WritOn-PowerUp/LINKEDIN_BOTS.md).
- Operational standards and rate limit policies (Marketing API version `202609`, Community Management 24h limits) are documented in [`rules_linkedin.md`](file:///d:/VibeCode/WritOn-PowerUp/rules_linkedin.md).
- Complete LinkedIn Marketing Posts API and media endpoint directory is in [`linkedin_api_reference.md`](file:///d:/VibeCode/WritOn-PowerUp/linkedin_api_reference.md).
- **Dedicated Studio**: Backed by `server/src/routes/admin-linkedin.js` and rendered at `public/linkedin.html` (`/linkedin-studio`).
- **Strict Invariant**: **NEVER POST TEST THINGS ONLINE**. All testing, validation, and calibration must specify `--dry-run`. Run `node scripts/linkedin_publisher.mjs --brain --dry-run` or `node scripts/linkedin_scout.mjs --dry-run`.

## Social Media Publishing Rules
- **Weekly Language Directive (Active: Sept 13–20, 2026)**:
  - **Post English-Language Content Only**: Across ALL platforms (YouTube Shorts, X, Instagram, LinkedIn, Threads, Pinterest, Reddit) for this entire week. Defer regional languages (Hindi, Marathi, Bengali) until the next sprint cycle.
- **Dual-Format Publishing Mandate (Video + Stills Pairing)**:
  - **Always pair video with still image assets for every release**: Video (Reels/Shorts) drives cold-audience discovery and non-follower reach, while static/carousel cards provide high-dwell saveability, readable craft depth, and profile conversions.
  - For every high-impact craft truth, story release, or editorial prompt, generate and dispatch both:
    1. A **9:16 Vertical Video / Reel / Short** (`.mp4` via HyperFrames) optimized for rapid hook delivery (0:00 cut hook) and algorithmic distribution.
    2. A matching **Warm Parchment Visual Card or Carousel Deck** (1080×1350 or 1080×1080) for permanent feed display, saves, and multi-slide reading.
- **Strict Prohibition on Duplicate Media & Unsolicited Cross-Posting (Single-Delivery Invariant)**:
  - **Never Publish the Same Creative Asset Multiple Times**: Each slot in `publishing-calendar.csv` is mapped to an exact, unique delivery asset. Under no circumstances should a generic video file (e.g. `writon_reel_with_audio.mp4`) or past creative card be uploaded repeatedly across days or slots.
  - **No Side-Channel Cross-Posting**: Only publish to the exact platform and surface specified by the calendar row (e.g., an X card slot must not silently push an Instagram Feed post, and an Instagram Story slot must never dispatch an unrequested Reel to the feed).
  - Every feed post, reel, or carousel on Instagram, X, Threads, or LinkedIn must be a unique, dedicated asset created specifically for that scheduled delivery.
- **Visual Design Standard (WritOn Watercolor Aesthetic)**: All quote cards, craft truths, prompts, and carousel slides MUST strictly follow the official brand watercolor aesthetic documented in `writon_watercolor_aesthetic_guide.md`:
  - **Base Canvas**: Warm Ivory Parchment (`#FAF5EE`) with natural fibrous paper texture.
  - **Corner Accents**: Soft terracotta / burnt orange watercolor blooms (`#E75A2A` / `#D45226`) in diagonal corners with organic water-bleeding edges.
  - **Illustrative Details**: Delicate botanical wildflower stems (bottom-left) and vintage quill feather with subtle gold/ink flourishes (bottom-right).
  - **Watermark**: Faint capital serif 'W' watermark centered at ~8% opacity (`#E8DFD3`).
  - **Typography & Space**: Classical book serif (`Newsreader`/`EB Garamond` in English; `Noto Serif Devanagari` in Hindi) with generous **50%+ negative space**, true curly quotes (`“ ”`), and subtle `@writon_socialapp` centered at the base. Zero loud promotional buttons or heavy UI borders.
  - **Strictly No Obsidian / Dark Mode**: The obsidian dark color scheme is completely retired. **ALL** social media posts and stories across all platforms and time slots (morning, midday, evening, night) must exclusively use the Warm Parchment and Watercolor aesthetic. Never use black/dark background cards.
- **Copywriting Standard — Anti-Mannered Prose (Direct Statement Rule)**:
  - Eliminate mannered prose, decorative flourishes, and ornamental metaphors. Never substitute a metaphor for a direct statement (e.g. say *"a parameter worth varying"*, not *"a dial worth turning"*; say *"this point still matters"*, not *"this point earns its keep"*).
  - Copy and cards must exist to convey the craft idea clearly and concisely, not to perform writerly virtuosity for the audience.
  - When a literal phrase is available, always use it. Respect reader attention by avoiding unnecessary figurative gymnastics.
- **Zero Decorative Code Blocks in Literary Write-Ups (Mandatory Anti-Code Standard)**:
  - **Never inject synthetic, decorative, or pseudo-code blocks into essays, memoirs, cultural commentaries, or short fiction**. Fictionalized interfaces, mock TypeScript algorithms, or fake physics/probability formulas (`interface PointResult`, `calculateUpsetProbability`, etc.) break immersion, violate technical fidelity, and read as artificial contrivances.
  - Express technical or data-mediated observations strictly through natural, precise literary prose (e.g. contrast scoreboard metrics, telemetry latency, or dashboard analytics directly in sentences). Reserve actual code snippets exclusively for genuine technical documentation, software engineering tutorials, or developer tools.
- **HyperFrames Video Rendering Pipeline**:
  - Use HyperFrames (`npx hyperframes render` / skills under `.agents/skills`) to generate animated 9:16 vertical video Reels/Stories (`.mp4`) for high-impact social releases, craft prompts, or product teasers.
- **Hashtags Standard — Comprehensive Discovery & Strictly Lowercase (Never Omit Subject Tags)**:
  - **Always Include Rich Topical & Discovery Hashtags Alongside `#writon`**: Never publish social media posts (X, Threads, Instagram, LinkedIn, YouTube Shorts), stories, or external dispatches with only `#writon` or a single lonely tag. Every post must carry a full set of relevant topical tags reflecting the story's subject, location, craft, and domain:
    * *Tech & Engineering*: `#writon #tech #hardware #apple #repairability #delhi #engineering #smartphones`
    * *Essays & Environment*: `#writon #essays #delhi #airquality #pollution #environment #urbanlife #culture`
    * *Literature & Craft*: `#writon #writingcommunity #amwriting #storytelling #books #reading #slowreading`
    * *Poetry & Shayari*: `#writon #poetry #ghazal #urdupoetry #writingcraft #poetics`
  - **Target Density**: Minimum 3–5 relevant hashtags on X (budgeted within the 280-char window) and 5–8 hashtags on Threads, Instagram, LinkedIn, and YouTube Shorts.
  - **Strictly Lowercase**: Always use small letters (all lowercase) for all hashtags across all platforms and slots. Never use PascalCase or uppercase letters in hashtags.
- **Mandatory All-RSS Feed Synchronization**:
  - Whenever stories, reviews, or essays are created, modified, republished, or regenerated in the database, **ALL public RSS feeds must be regenerated and updated immediately**:
    1. **Primary SEO & Discover Feed**: `node server/src/scripts/generate-seo-feeds.mjs` (`public/feed.xml`, `public/sitemap.xml`, `public/news-sitemap.xml`)
    2. **Reddit Community Feed**: `node server/src/scripts/generate-reddit-feed.mjs` (`public/reddit-feed.xml`)
    3. **Pinterest Visual Feed**: `node server/src/scripts/generate-pinterest-feed.mjs` (`public/pinterest-feed.xml` + high-DPI rendered cards)
  - Never update one RSS feed in isolation while leaving others stale. Always run the full trifecta to ensure all consumer pipelines (Google Discover, Reddit bridges, Pinterest autopublishers, RSS aggregators) stay 100% in sync with the live database.
- **Canonical Branded Vanity Shortcuts (`writon.cc/:slug`)**:
  - **Always use official WritOn vanity links instead of raw third-party platform URLs** across all communications, social media posts, bios, stories, and bot dispatches:
    - Instagram: `https://writon.cc/instagram` (alias: `https://writon.cc/ig`)
    - X (Twitter): `https://writon.cc/x` (alias: `https://writon.cc/twitter`)
    - Threads: `https://writon.cc/threads`
    - YouTube: `https://writon.cc/youtube` (alias: `https://writon.cc/yt`)
    - LinkedIn: `https://writon.cc/linkedin`
    - Reddit: `https://writon.cc/reddit`
    - Medium: `https://writon.cc/medium`
  - **New Link Rule**: Whenever any new official profile, publication, or campaign destination is introduced, it must be registered as a `writon.cc/:slug` vanity redirect in `server/src/routes/vanity-redirects.js` and `firebase.json` rather than exposing raw external URLs.
- **Social Media Strategy & Cross-Agent Sync Document**:
  - Full operating procedures, slot timings, hashtag rules, and synchronization contracts are maintained in [`campaign/SOCIAL_STRATEGY.md`](file:///d:/VibeCode/WritOn-PowerUp/campaign/SOCIAL_STRATEGY.md). All AI agents must consult this doc to maintain 100% synchronization across conversations.

## Global Editorial Canvas
- The primary working interface for inspecting, previewing, and steering WritOn's autonomous content and publishing pipelines is the **Global Editorial Canvas** ([public/canvas.html](file:///d:/VibeCode/WritOn-PowerUp/public/canvas.html), mirrored at [writon_global_editorial_canvas.html](file:///C:/Users/Kumar/.gemini/antigravity/brain/4688c67b-8b46-4ec9-b19a-e1fea52e9fa9/writon_global_editorial_canvas.html) and live at `/canvas`).
- Features:
  - **14-Day Sprint Navigation**: Seamlessly inspect and steer all 70 sprint deliveries across Days 1 to 14.
  - **Real Visual Previews**: Rendered high-resolution card previews for Days 1–3 with click-to-zoom modals and dynamic watercolor mockups for Days 4–14.
  - **Tactile Steerability**: Direct inline caption editing with character limits, hashtag pills, and one-click status toggles (`Approved for Dispatch`, `Published`).
  - **Live Trend Radar**: Integrated topic drawer linking harvested X & Google trends directly to draft slots.
  - **Bidirectional Sync**: LocalStorage persistence with full CSV export (`publishing-calendar.csv` contract).
  - **Live Staging URL**: Continuously deployed and hosted live at **https://writon-canvas-staging.web.app/canvas** (via Firebase Hosting target `writon-canvas-staging`). Always synchronize changes to this URL.

## Ponytail (Pragmatic Code Minimization & The Decision Ladder)
Before writing any code, stop at the first rung that holds:
1. **Does this need to be built at all?** (YAGNI) — speculative needs = skip them.
2. **Does it already exist in this codebase?** — reuse existing helpers, utils, or patterns; never duplicate logic a few files over.
3. **Does the standard library already do this?** — use stdlib first.
4. **Does a native platform feature cover it?** — HTML5 elements, CSS, database constraints, native OS APIs.
5. **Does an already-installed dependency solve it?** — use it; never add a new dependency for what existing code or small functions can do.
6. **Can this be one line?** — make it one line.
7. **Only then:** write the minimum amount of code that works.

Rules:
- The ladder runs *after* understanding the problem: read the code it touches, trace the real flow end-to-end, then climb.
- Bug fix = root cause, not symptom: fix at the shared root rather than patching callers individually.
- No unrequested abstractions: no single-implementation interfaces, single-product factories, or speculative configs.
- Deletion over addition. Boring over clever. Fewest files possible.
- Mark deliberate shortcuts with a `ponytail:` comment naming ceiling and upgrade trigger.
- **Never simplify away:** trust-boundary validation, data-loss prevention, security/auth, and accessibility (WCAG AA).
## Human Voice & Empirical Craft Standards (Derived from 612 Live Human Posts)
- **Empirical Corpus Baseline**:
  - All editorial bots and story generators must adhere to the findings documented in [`campaign/HUMAN_VOICE_CODEX.md`](file:///d:/VibeCode/WritOn-PowerUp/campaign/HUMAN_VOICE_CODEX.md) and [`data-exports/analysis/live_db_empirical_craft_report.json`](file:///d:/VibeCode/WritOn-PowerUp/data-exports/analysis/live_db_empirical_craft_report.json).
  - **Concision & Length Restraint**: Human writing averages ~207 words/post; avoid the typical AI default of 400+ words of decorative exposition. Respect reader attention and negative space.
  - **Sentence Rhythms & Pacing**: Median sentence length in human prose is 10 words (with high natural variance: short dialogue beats or tactile fragments alongside rolling descriptions). Do not force uniform 15-word sentences.
- **Zero Throat-Clearing Openings**:
  - Open scenes *in media res*, on a physical action, a concrete dialogue beat, or an immediate observation (e.g. rain falling on a desk rose, water brought at 5:55 PM, or an urgent WhatsApp argument).
  - Strictly avoid generic rhetorical preambles (*"In today's fast-paced world"*, *"Throughout history"*, *"When we examine"*).
- **Physical Sensory Anchors**:
  - Anchor abstract emotional or cultural claims to physical objects present in the scene (*paani*, *chashma*, *teak wood*, *rain on the glass*, *mustard oil*, *soot-black clay diya*).
- **Ending Restraint**:
  - End on an unresolved sensory image, a physical consequence, or a lingering quiet pause. Never conclude with an artificial summary, moral lesson, or TED-talk takeaway.
- **The 4 Distinct Voice Archetypes (Anti-Averaging)**:
  - When generating copy, assign one of the 4 defined archetypes via `getCraftVoicePrompt()` in `server/src/services/human-voice-prompt.js`:
    1. *The Spare & Restrained* (sensory grounding, tactile omission)
    2. *The Conversational & Vulnerable* (domestic friction, personal hypocrisy, self-doubt)
    3. *The Lyrical & Resonant* (internal cadence, acoustic pauses, bilingual code-switching)
    4. *The Analytical & Precise* (frictional trade-offs, exact domain nouns)
- **Community Comment Craft**:
  - 92% of genuine human comments are brief (≤ 10 words; median 2 words). When bots interact as readers, they must post brief, grounded reactions to a specific line or image, never full-paragraph thesis summaries.
- **Voice Linter & Corpus Diagnostics**:
  - Run `node scripts/human_voice_linter.mjs --text="..."` to evaluate candidate copy and compute a Humanity Score (0–100) before publishing.
  - Run `node scripts/study_human_corpus.mjs --live` to re-analyze live human posts and refresh empirical benchmarks.

## Master Editorial Brain & Creative Insight Reservoir (`campaign/EDITORIAL_BRAIN.json`)
- **The Single Source of Truth for Creative Content & Hooks**:
  - All automated content generators, social media dispatchers (X, LinkedIn, Threads, Instagram, Reddit, YouTube Shorts), push notification writers, and AI subagents MUST consult and pull from [`campaign/EDITORIAL_BRAIN.json`](file:///d:/VibeCode/WritOn-PowerUp/campaign/EDITORIAL_BRAIN.json) via `server/src/services/editorial-brain.js`.
- **Core Creative Rules**:
  1. **Strong Proposition > Neutral Framing**: Never use filing-cabinet titles (*"WritOn Editorial Notebook: Week-one practice recap"*). Always lead with point of view, tension, transformation, or curiosity to give the reader unfinished business.
  2. **0:00 Cut Hook (Never Bury the Hook)**: The sharpest, strongest sentence MUST be placed at 0:00–0:02 in video and within the first 80 characters above the fold in written posts. Never spend the first seconds introducing what should have been the first seconds.
  3. **The 5 Hook Archetypes**:
     * *Contrarian Craft Rule* (e.g. *"Don't start with weather."*)
     * *Transformation / Before-and-After* (e.g. *"Never write 'He was happy'. Show one visible action."*)
     * *Counterintuitive Inversion* (e.g. *"Write your opening sentence last."*)
     * *Craft Philosophy & Sensory Truth* (e.g. *"A scene begins with a detail, not an explanation."*)
     * *Manifesto & Cultural Identity* (e.g. *"A social network built around writing, not selfies."*)
  4. **Cadence & Spacing (Anti-Self-Competition)**: Maintain at least 48 hours separation before repeating a proposition archetype across public channels.
  5. **Standardized Cold-Audience Measurement**: Record organic reach at fixed post ages (1h → 6h → 24h → 72h → 7d) to evaluate authentic pull without time confounders.
  6. **YouTube Shorts Demonstration & Workbench Rule (Mandatory Anti-Quote-Card Doctrine)**:
     - **Ban Static Quote Cards on YouTube Shorts**: Never publish raw centered quotes or static wisdom cards on cream parchment. YouTube Shorts is a visual, kinetic video medium; static quote cards get swiped and rejected by the algorithm.
     - **The Demonstration Standard (Show, Don't Preach)**: Every craft Short MUST show a concrete sentence, mistake, or live edit on-screen rather than asserting abstract wisdom. If the claim is "don't do X, do Y," the video must put line X and line Y side-by-side on screen.
     - **The 18–20s High-Velocity Timeline Contract (Zero-Plateau Gate)**:
       * *0.0s – 0.8s (Immediate Interactive Hook & Audio Cue)*: Lead with a micro-challenge or urgent question (e.g. `MAKE THIS LINE FEEL DANGEROUS.` / *without changing the dialogue*), paired instantly with a crisp tactile foley sound (deadbolt snap, typewriter click, pencil strike). Never open with a passive lesson title or "BROKEN DRAFT".
       * *0.8s – 1.8s (Flawed Sentence Visible)*: Present the flawed line clean and legible.
       * *1.8s – 2.5s (Snap Diagnosis / Highlight)*: Snap an immediate visual highlight or marker onto the exact offending word or phrase.
       * *2.5s – 3.5s (Kinetic Directive Badge & Word Collapse)*: Deploy a concise micro-directive (e.g. `DELETE ONE WORD.`) and dissolve/collapse the highlighted problem.
       * *3.5s – 7.0s (Live Healed Sentence Stagger)*: Reveal the healed sentence line-by-line in sync with the voiceover. Use only clean, contextual pills (e.g. `Physical Threat`) — never clinical/branded labels like `HEALED SENTENCE`.
       * *7.0s – 11.0s (Craft Consequence)*: Show the immediate craft rationale on screen (e.g. `Now the threat is in the room, not in the modifier.`).
       * *11.0s – 17.0s (Closing Maxim & Contrast)*: Present the memorable rule with high visual hierarchy (e.g. `Dialogue carries the words. Action carries the threat.`).
       * *17.0s – 18.0s / 20.0s (Loop Hold)*: Seamless loop back to the opening sound/hook. Spoken voiceover must never exceed 16–18s to guarantee mobile captions never truncate the closing line.
     - **The 1.5-Second Visual Progression Invariant**:
       * Text or UI states MUST NOT remain static without micro-movement, highlight, badge entry, or line reveal for more than 1.5 seconds at any point in the video. Constant kinetic progression prevents the 4–6 second swipe-away plateau.
     - **Shorts Hook Rule (Address Transformation, Never Name Technique)**:
       * The opening line must address the concrete transformation or emotional challenge, not state or name the writing technique.
       * *Prefer*: `MAKE HER TERRIFYING.`, `MAKE THIS LINE HURT.`, `MAKE THE ROOM FEEL EMPTY.`, `MAKE US DISTRUST HIM.`
       * *Avoid*: `How to write anger`, `Stop telling emotions`, `Writing Tip: Show Don't Tell`, `Use physical actions instead of adjectives`.
       * Teach the rule only after curiosity has been created.
     - **Target-Highlight Rule (Surgical Mistake Isolation)**:
       * When identifying the weak element, highlight ONLY the exact word or phrase being diagnosed and removed.
       * Never highlight surrounding neutral language (e.g. highlight only `furious` when the directive is `DELETE THE EMOTION`, not `furious at him`).
     - **Anti-Formula Variation Invariant**:
       * Preserve the retention grammar (`Challenge → Flawed Example → Isolate Fault → Directive → Rewrite Builds → Principle`) while forcing variation in: hook wording, command type, animation style, final lesson construction, and emotional payoff. Prevent viewers from predicting the video format in second 1.
     - **Audio Mix Safety**: Keep backing piano volume $\le 0.04$ or mute music during key diagnosis beats so auto-captions never flag `[music]` over the spoken words. Procedural tactile sound effects (clicks, strikes) must snap precisely at frame 0.0s and key transformation beats.
     - **Voice Standard & Review Gate (Nicole / Kokoro TTS)**:
       * *Permanent Voice Model*: Nicole (`af_nicole` @ 1.20–1.25x speed via Kokoro TTS) is the verified, permanent voice standard across all YouTube Shorts, Reels, and audio releases, providing crisp phoneme clarity, natural human warmth, and zero diffusion grain.
       * *Local Frame Review First*: Always extract key milestone frames and inspect locally before committing an upload.
       * *Upload Unlisted First*: Always upload newly rendered YouTube Shorts with `privacyStatus: 'unlisted'` so visual and editorial fidelity can be previewed and verified before public release.
       * *Deep SEO & Metadata Excellence*: Every Short upload must carry properly researched, high-intent search titles (e.g. `How to Write Menace Without Adverbs`), structured 3-part educational descriptions, a generous cluster of 8–12 researched lowercase hashtags, and 15–25 comprehensive lowercase search tags.
  7. **Photographic Coffee Desk Visual Archetypes**:
     - Integrate WritOn's official morning & midnight coffee visual archetypes into the video composition backgrounds:
       1. *The Top-Down Workbench Flatlay*: Manuscript sheets, books stack (*Stories/Drafts/Better Endings*), ink jar, red editorial pencil, curved editorial arrows, and top-down espresso mug.
       2. *The Rain-Streaked Window Morning Desk*: Eye-level view through rainy glass, golden morning sun, steaming ceramic mug, fountain pen, open notebook (`Edit kinder`).
       3. *The Coffee-Stain Editorial Ring*: Textured cream paper with an authentic dried coffee cup ring stain encircling the core craft maxim and red pencil.
       4. *The Sunset Sill / Solitary Morning Window*: Silhouette of a steaming ceramic mug on a windowsill overlooking dawn/sunrise, fountain pen, and folded manuscript.
       5. *The Midnight Draft / Lamp-Lit Desk*: Moody dark wood illuminated by an amber lamp, steaming ceramic mug, open notebook with active strikethroughs (`and then...`), brass fountain pen.

## Specialist Review Architecture & Quality Codex
- **Core Operating Doctrine**:
  1. **Never Pretend to Have Touched the Product**: Zero synthetic hands-on sessions, zero fabricated track-listening anecdotes (*"On Artist's 'Track'"*), and zero invented lab bench tests in research-based reviews.
  2. **Never Hide Behind Generic Disclaimers**: Zero cowardly hedging, placeholder competitors (*"the category benchmark"*), or boilerplate templates (*"Published positioning..."*, *"Where it cuts corners: Evidence limits"*, *"deserves a place on a shortlist"*).
  3. **The Four Grounding Pillars**:
     - *Verified Hardware Specifications*: Official manufacturer data sheets (impedance, sensitivity, weight, materials).
     - *Independent Laboratory Measurements*: Published spectral sweeps, acoustic curves, and optical bench test data (RTINGS, DxOMark).
     - *First-Principles Engineering Inference*: Transparent circuit load-line calculations, voltage-divider math ($V_{\text{load}} = V_s \times \frac{Z_l}{Z_{\text{out}} + Z_l}$), optical perspective geometry, and damping factor derivations.
     - *Clearly Bounded Subjective Evidence*: Cross-reviewer consensus from credible specialist communities (Headphones.com, GoldenSound).
  4. **Actionable, Divergent Buying Decisions**: Always provide crisp, divergent purchasing guidance (*"Choose [Product A] if..."*, *"Choose [Product B] if..."*).
- **Strict Provenance & Calibration Standard**:
  - Whenever unit conversions or circuit consequences are stated, specify the exact reference convention (e.g. noting if a manufacturer's sensitivity specification leaves the reference unit unstated).
  - Scope claims to specific amplifier models/archetypes (e.g. *"Bottlehead Crack-class high-output-impedance OTL"*) rather than generalizing across diverse topologies.
  - Ban unevidenced reviewer superlatives (*"undisputed reference benchmark"*, *"unmatched neutrality"*, *"pristine midrange"*, *"zero roll-off"*, *"near-perfect synergy"*, *"colossal soundstage"*); use measured research language (*"established reference standard"*, *"linear midrange tracking"*, *"minimal sub-bass attenuation"*).
  - Enforce bibliographic closure: every cited hardware specification or laboratory sweep must have its official manufacturer or laboratory source entry in the References section.
- **15 Automated Quality Gates**:
  - Implemented in `server/src/bot-engine/review-generator.js` and validated via `validateReviewQualityGate()`.
  - All review generators, editors, and publishing bots must pass all 15 gates before saving or publishing review content.

## Classical Poetry & Ghazal Prosody Standards (Poem-First Doctrine)
- **The Poem-First Doctrine**:
  - **The poem must breathe first**: Never attach a museum audio guide to verse. Never interleave line-by-line pedagogical commentary, "verse reflections", or classroom explanations between couplets.
  - Structure: (1) Brief 2–3 sentence sensory setting $\to$ (2) Complete ghazal/poem uninterrupted $\to$ (3) Complete English translation placed strictly *after* the entire poem $\to$ (4) Optional short "Notes on form" (Bahr, Radif, Qafiya, Matla, Maqta).
- **Metrical Rigor (Ilm-e-Arooz)**:
  - When composing classical ghazals, every misra must scan consistently in a declared, recognized classical Bahr (e.g. *Bahr-e-Hazaj Musaddas Saalim* `Mafā'īlun Mafā'īlun Mafā'īlun`, *Bahr-e-Ramal*, *Bahr-e-Rajaz*).
  - Never publish *be-bahr* (metrically irregular or uneven) verses. Scansion must be mathematically uniform across all ash'aar.
- **Urdu Diction & Prosodic Integrity (Tehzeeb-e-Sukhan)**:
  - Enforce genuine, unforced Urdu diction. Never double roots (e.g. *rawaan* and *rawaani*) merely to force a rhyme.
  - Ensure words match their true semantic definition (e.g. *giraani* for gravity/heaviness of silence; *zabaani* for oral memory) rather than twisting words into unrelated English meanings.
  - Syntactic naturalness: avoid clumsy inversions in the Maqta when incorporating the Takhallus.

## Categorization Architecture: Poetry vs. Essays Feed Purity
- **Strict Separation of Creative Work vs. Craft Reflection**:
  - **Poetry**: Reserved strictly for the creative poetic work itself (poems, ghazals, nazms, rubā'iyāt, free verse). A reader clicking "Poetry" expects verses to read, feel, and recite—not an essay analyzing poetics.
  - **Essays**: Dedicated to criticism, poetics, reflections on literary craft, mechanical labor, and literary arguments.
  - **Rule of Form over Subject**: If a piece discusses poetry, scansion, meter, or the discipline of composition without presenting a finished poem as the primary creative work, it belongs strictly in **Essays**, tagged with topical discovery tags (e.g. `#poetry #ghazal #writingcraft #urdupoetry #poetics`).
  - Only when a finished poem is the primary presentation (with commentary serving merely as a subordinate frame) may a piece be categorized under Poetry.

## Continuous Cloud Learning & Knowledge Persistence Protocol
- **Never Leave Learnings Trapped in Local Sessions**:
  - Whenever an editorial craft insight, classical prosody correction, persona voice calibration, or architectural truth is derived, corrected, or approved during any chat session, it MUST ALWAYS be persisted immediately to Google Cloud across all three operational tiers:
  1. **Tier 1 — Google Cloud SQL / PostgreSQL Database (`public.bot_memories` & `public.posts`)**:
     - **Episodic Memory Ledger**: Record a persistent memory row in `public.bot_memories` (type `philosophical_reflection` or `story_arc`, `importance_score >= 0.90`) linked to the relevant `bot_id` and `target_post_id`. Future autonomous bot runs load these memories into prompt context via `learning-service.js`, guaranteeing that corrected mistakes are never repeated across sessions.
     - **Canonical Post Records**: Directly update the canonical `public.posts` record in Cloud SQL so live mobile app users, web readers, and API consumers immediately receive the calibrated prose.
  2. **Tier 2 — Google Cloud / Firebase Hosting Edge CDN (`writon-prod`)**:
     - **Static Semantic Prerenders**: Re-render static HTML story bundles under `public/stories/${slug}.html` and `public/stories/${slug}/index.html` with zero-delay server-rendered semantic content.
     - **Mandatory All-3 RSS Feed Synchronization**: Regenerate `public/feed.xml` (SEO), `public/reddit-feed.xml` (Reddit), and `public/pinterest-feed.xml` (Pinterest).
     - **Edge CDN Deployment**: Immediately deploy to production edge via `npx firebase deploy --only hosting:writon-prod` (`writon-app-2020.web.app` / `writon.cc`).
  3. **Tier 3 — Master Editorial Brain & Persona Registries**:
     - **Editorial Brain Reservoir**: Record the proven proposition, 0:00 cut hook, and anti-pattern warnings in [`campaign/EDITORIAL_BRAIN.json`](file:///d:/VibeCode/WritOn-PowerUp/campaign/EDITORIAL_BRAIN.json) so cross-platform social dispatchers and shorts generators leverage the insight.
     - **Persona Cognitive Prompts**: Synchronize the writer persona prompt in [`server/src/bot-engine/legacy-writer-personas.js`](file:///d:/VibeCode/WritOn-PowerUp/server/src/bot-engine/legacy-writer-personas.js) and voice archetypes in `server/src/services/human-voice-prompt.js`.

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
