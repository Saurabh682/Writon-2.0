## graphify (Default Codebase Knowledge Graph)

This project has an active knowledge graph at `graphify-out/` with 9,500+ nodes, god nodes, community structure, and cross-file relationships.

Rules (Mandatory by Default):
- **Default for all codebase tasks**: For ANY question or investigation into how code works, architecture, where functions/classes live, caller/callee graphs, or blast radius, query the graph FIRST via the `graphify` MCP tool (`query_graph`) or CLI `graphify query "<question>"`.
- **Relationship & concept paths**: Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts to return scoped subgraphs rather than loading full files.
- **Dirty graph tolerance**: Dirty `graphify-out/` files after hooks or incremental updates are expected; never skip graphify because of uncommitted graph files.
- **Broad navigation**: If `graphify-out/wiki/index.md` exists, use it for broad orientation instead of raw source browsing.
- **Sync on edits**: After adding or modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).


## Documentation & Changelog Maintenance
- Always update `CHANGELOG.md` with any new features, bug fixes, UI/UX refinements, security updates, or architectural changes made during any task.
- For every delivery that changes or updates the Android app, increment both `versionName` and `versionCode` once before generating release artifacts. The version code must always increase and must never reuse a Google Play version code.
- Whenever a new Android App Bundle (`.aab`) is generated, include in the final handoff:
  - a concise internal Google Play release name using the exact `versionName` and the build's primary user-facing theme;
  - ready-to-paste Google Play release notes for every currently supported store locale (`en-US`, `en-IN`, `hi-IN`, `mr-IN`, and the configured Bengali locale);
  - notes based only on changes actually present and verified in that bundle, avoiding unmeasured claims such as “ultra-fast” or “instant”;
  - correct Google Play locale tags and the `<locale>...</locale>` format;
  - **Strict character limit constraint**: Google Play Console enforces a **hard maximum limit of 500 characters** per `<locale>...</locale>` block. Every locale's release notes text must strictly stay well below 500 characters (target: ~300–400 characters);
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
- **Official Test Phone / Test ID Designation**:
  - Whenever the operator/user refers to "test phone" or "test id", this refers strictly to:
    - **Profile ID**: `FMpu4Aqe25R07h8Mz0TrHzRliVp1`
    - **User**: Usha Srivastava (`ushasrivastava532@gmail.com`)
    - **Device**: Redmi test phone (Android 15)
    - **Target Token**: Active token in `public.device_push_tokens` where `profile_id = 'FMpu4Aqe25R07h8Mz0TrHzRliVp1'` and `revoked_at IS NULL`.
  - **Quick CLI Test Dispatcher**: Run `node server/src/scripts/send-test-push.mjs` (optionally `--story=<storyId>`) to immediately deliver a test push notification to this test phone.

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
- **Think Brain Rules 130–140: Devansh Regression Prevention, Representation vs. Record & Market Discipline**:
  - **Rule 130 (`DEVANSH_PROP_CLUSTER_HARD_FAIL`)**: The Kolkata atmospheric stage set is permanently retired (tea stall, radio static, tram tracks, monsoon rain, notebook with bleeding ink, stray dog, tea as emotional punctuation, old shopkeeper dispensing wisdom, wet jute / rusted tin, clay cups, wet newspaper, wiping rag, tarpaulin, dying battery/screen, named shopkeepers like Bhabani-da/Haren-da/Bimal). If 3+ appear together in a draft: **ABORT BEFORE DRAFTING**.
  - **Rule 131 (`REAL_PERSON_PRIVATE_MEMORY_FAIL`)**: For any real deceased or biographical figure, NEVER invent private conversations, studio habits, cigarettes shared at 3 AM, unverified gestures, or imagined final moments. Use strictly documented historical facts, attributed quotes, or explicit critical analysis.
  - **Rule 132 (`DECORATIVE_SOURCE_FAIL`)**: Source substitution invariant: if a real current event or person can be swapped for any generic figure with <20% change in the text (e.g. *"didn't know who X was, but understood silence"*), the source is decorative. The source must create a concrete informational problem or transmission conflict.
  - **Rule 133 (`THEMATIC_APHORISM_DIALOGUE_FAIL`)**: Secondary characters must never deliver polished, quote-card aphorisms (*"When a man who keeps the rhythm goes..."*, *"You worry about the silicon. I worry about the tea."*) to summarize the piece's thesis. Dialogue must create interpersonal resistance and pressure under real stakes.
  - **Rule 134 (`SHORT_STORY_ENGINE_GATE`)**: A Short Story requires `PROTAGONIST_WANTS + OBSTACLE + DECISION + CHANGED STATE`. Hearing news, pondering mortality, drinking tea, and closing a notebook is a mood vignette, not a story.
  - **Rule 135 (`AMBIENT_MELANCHOLY_ENDING_FAIL`)**: Flags endings constructed of autopilot sensory decay props (tea cooling, rain falling on glass, notebook closing, solitary droplet, silent street observation). End on a behavioral consequence or decision that alters a relationship or state.
  - **Rule 136 (`DEVANSH_SOURCE_MECHANIC_REQUIREMENT`)**: Devansh Roy engages with sources, obituaries, and cultural records strictly through **Relationship Compression & Media Provenance** (`PUBLIC LABEL → documented history → what label preserves → what label erases → why media needs compression → what compression costs`). Generic grief and melancholy are prohibited.
  - **Rule 137 (`REPRESENTATION_VS_RECORD_GATE`)**: For sources featuring AI images, trading screens, or viral claims, contrast the visual representation directly against the primary record or regulatory filing (SEC Form 8-K, formal agreements, statutory disclosures, raw ledger balance). Interrogate how the representation distorts, simplifies, or dramatizes the legal/accounting transaction.
  - **Rule 138 (`TITLE_CONCEPT_CONTRACT`)**: Titles referencing a "Ledger", "Balance Sheet", or "Audit" must materially engage with ledger mechanics, accounting entries, equity dilution, or reconciliation, never using "ledger" as an abstract or decorative metaphor.
  - **Rule 139 (`CURRENT_EVENT_STORY_GATE`)**: Current event narratives must give the protagonist active agency (`SOURCE_EVENT + PROTAGONIST_WANTS + OBSTACLE + DECISION + CHANGED STATE`). Rejects passive observers watching viral posts or news tickers without friction or a consequential decision.
  - **Rule 140 (`MARKET_CAUSALITY_DISCIPLINE`)**: Market moves require multi-factor grounding (analyst upgrades, foundry developments, statutory appropriations, macro sentiment), never simplistic monocausal attribution to a single social media post.
- **Think Brain Rules 141–147: Narrative Consequence, Metaphor Dependency, Arshdeep Cooldown & Local Price Discipline**:
  - **Rule 141 (`NARRATIVE_CONSEQUENCE_TEST`)**: For Short Stories, enforce concrete narrative architecture (`INCITING_CHANGE + CHOICE/ACTION + COST_OF_CHOICE + OBSERVABLE_CONSEQUENCE`). Rejects mood vignettes where a character merely opens a screen/catalog, reflects with a friend, and closes the tab with a deferred non-action ("not yet", "some stories aren't meant to be started yet"). A scene is not automatically a story.
  - **Rule 142 (`METAPHOR_DEPENDENCY_FAIL`)**: Rejects premises where a real product or event primarily exists to symbolize a generic life condition (ambition, freedom, grief, hesitation, escape, "moving forward") without its specific mechanical, commercial, or physical properties driving the conflict. Replacement invariant: if replacing the subject with a camera, laptop, train, or watch preserves 70%+ of the piece, the premise is insufficiently bound to the subject.
  - **Rule 143 (`SUPPORTING_CHARACTER_AS_THESIS_MOUTHPIECE_FAIL`)**: Supporting characters must never serve as convenient mouthpieces delivering the author's philosophical thesis (*"The machine is only as fast as the story you are trying to outrun"*, *"not with the hunger of a consumer, but with the quiet appraisal of a novelist..."*). Dialogue must create authentic human friction under real-world stakes (*"Two-ten on road," he said. "They never put that number in the headline."*).
  - **Rule 144 (`CODE_POLICY_STRICT_ENFORCEMENT`)**: Code blocks (`interface`, `function`, `type`, `const`) in Short Stories, Essays, Culture, and non-software premises trigger automatic hard critic failure (`WRITER_RULE_VIOLATION: CODE_INSERTED_WHEN_FORBIDDEN`). Pseudocode interfaces disguising human emotions or desires as algorithms (`interface Aspirations`, `return false; // The logic of the 'not yet'`) are completely banned.
  - **Rule 145 (`ARSHDEEP_TITLE_COOLDOWN`)**: Enforces lexical title token cooldowns per persona. For Arshdeep Singh / Gurpreet Sandhu, heavily penalize repeated tokens (`geometry`, `dust`, `static`, `baseline`, `lines`, `underdog`, `choosing`) for at least 8–10 pieces following *The Geometry of the Underdog*.
  - **Rule 146 (`HOUSE_STYLE_PROP_DENSITY`)**: Detects and purges synthetic WritOn perfume clusters (rain + garage dust/grease + phone screen glow + dark room + deferred "not yet" ending). If 3+ appear together without subject necessity, require domain-specific substitutions (dealer quotation, chain lube, torque wrench, leaking workshop roof, lathe, invoice).
  - **Rule 147 (`NUMERICAL_PRECISION_AND_LOCAL_REALITY`)**: Enforce factual numerical precision and regional reality for product launches (e.g. Jawa 42 All Stars starts at ₹1.85 lakh ex-showroom / ₹1.90 lakh Black; Jalandhar on-road pricing is ₹2.10 lakh, 294.72cc, 27.32 PS, 26.84 Nm). Ground conflict in the gap between headline price and actual local on-road cost versus competing household/workshop obligations. Strictly eliminate cross-story contamination (e.g. Boston attic / Clancy leaks in Punjab garage stories).
- **Think Brain Rules 148–150: Grounded Observation, Persona Cognitive Affinity & Summary Evidence Binding**:
  - **Rule 148 (`ABSTRACT_ESSAY_WITHOUT_WORLD_FAIL`) & (`GRAND_TERM_EVIDENCE_CHECK`)**: An essay cannot operate purely on unanchored sociological or economic vocabulary (*"performative noise"*, *"civic utility"*, *"financialized"*, *"transactional pressure"*, *"digital friction"*). If an essay contains 3+ such high-altitude abstractions without anchoring them in concrete human behavior (people turning pages, arriving late, ordering tea, quiet awkwardness), a specific physical setting, and an argumentative complication/counter-evidence, **the draft must be rejected**. Conceptual vocabulary is not evidence.
  - **Rule 149 (`PERSONA_COGNITIVE_AFFINITY_ROUTING`)**: `authorPenName="auto"` must resolve to the author whose established worldview and beat naturally fit the intellectual territory of the piece, never merely the author with an expired cooldown. Civic, literary, and reading-culture essays belong to essayist personas (e.g. Dr. Sunita Banerjee, Devansh Roy), not domestic romance or family fiction writers unless specifically approached through personal domestic intimacy.
- **Think Brain Rules 151–155: Detail Provenance, False Specificity, Claim Magnitude & Geographic Grounding**:
  - **Rule 151 (`CONCRETE_DETAIL_PROVENANCE_FAIL`)**: In non-fiction Essays, every high-granularity real-world fact (exact seat counts, specific timestamps, transit schedules, exact currency figures, verbatim overheard dialogue) must have a documented provenance: (A) firsthand persona memory, (B) verified citation/source, or (C) empirical field data. Never invent pseudo-reportage to cure abstraction.
  - **Rule 152 (`FALSE_SPECIFICITY_FAIL`)**: Rejects counterfeit authority where precise numbers (*"thirty-two chairs"*, *"twenty-six occupied"*, *"eight-fifteen metro"*) are synthetically hallucinated to make unobserved scenes feel witnessed. Specificity without provenance is high-grade AI slop. When actual counts/times are unobserved, generalize honestly (*"a crowded corner"*, *"most tables filled"*, *"the evening train"*) or clearly frame the scene analytically rather than as counterfeit reportage.
  - **Rule 153 (`CLAIM_MAGNITUDE_DISCIPLINE`)**: Rejects inflated sociological conclusions. If evidence demonstrates one localized social arrangement (e.g. silent reading in a café), do not conclude that *"it proves society has changed"* or *"restores lost civic Eden"*. Enforce proportional, modest verbs: *demonstrates, permits, suggests, creates a small opening for*.
  - **Rule 154 (`PERSONA_GEOGRAPHIC_INTEGRITY`)**: Do not silently relocate personas without contextual justification. Dr. Sunita Banerjee is based in Delhi (Mayur Vihar / Shantiniketan). If an essay engages a setting in another city (e.g. Connaught Place, Khan Market, or Kolkata), it must ground the geography through documented reporting, an acknowledged visit, or an analytical non-eyewitness framework.
- **Think Brain Rules 156–159: Example Scope Binding, Variant Separation, Unsourced Discourse & Persona Cognition Lock**:
  - **Rule 156 (`EXAMPLE_SCOPE_BINDING`)**: If evidence describes one subtype or venue (e.g. café-based Silent Book Club chapters), do not silently generalize to the entire movement or category. Use explicit scope bounds (*"at café-based gatherings"*, *"in such café meetings"*).
  - **Rule 157 (`FORMAT_CORE_VS_VARIANT`)**: Distinguish an organization's core invariant mechanics (e.g. no assigned reading, shared silent reading, bring your own book) from variable local implementations (café, park, library, bar, online; purchasing food/drink; timing; discussion length). Generalize the core, qualify the variant.
  - **Rule 158 (`UNSOURCED_DISCOURSE_FAIL`)**: Flag synthetic consensus discourse (*"people often believe..."*, *"critics tend to say..."*, *"the phenomenon is usually seen as..."*) unless substantiated by external citation. Own the essayist's interpretative move honestly using epistemic attribution (*"it is tempting to interpret..."*, *"one possible reading is..."*).
  - **Rule 159 (`PERSONA_COGNITION_LOCK`)**: When an author persona is already distinct and recognizable through the structure and cadence of their analytical thinking, **DO NOT ADD** regional props, nostalgic artifacts (fountain pens, brass inkstands, tea stalls, rain), or food rituals merely to amplify voice distinctiveness. Intellectual method is the voice.
- **Think Brain Rules 160–164: Comedy Density, Observational Grounding, Narrator POV & Rohan Kapoor Engine**:
  - **Rule 160 (`COMEDY_QUOTABLE_DENSITY`)**: Prevent "every line auditioning for a quote card" fatigue. If 3+ consecutive paragraphs contain an aphorism, punchline, or metaphorical flourish (*"People speak in full verbs"*, *"the faint dignity of intention"*), force at least one plain, unadorned narrative action paragraph. Comedy requires dead space and breathing room to let the situation carry the weight.
  - **Rule 161 (`HUMOUR_BEHAVIOR_FIRST`)**: Prioritize concrete, observed behavioral friction (repeatedly adjusting a working HDMI cable, nodding gravely at an automated OTP notification, hoping the missing attendee stays absent to delay starting, ceremonial "giving two minutes back") over abstract cultural commentary, grand rhetorical metaphors, or generic satire slogans. Let the administrative system behave absurdly on its own without the narrator over-explaining every beat.
  - **Rule 162 (`COMIC_OMNISCIENCE_CHECK`)**: In first-person observational humor, the narrator must not mind-read other characters (*"Nikhil felt the cold creep of four o'clock"*, *"Nikhil was paralyzed by fear"*). Reframe internal emotional states as observable inference (*"Judging by the blank slide deck on his second monitor, Nikhil had reached the stage of the afternoon where a meeting could still be mistaken for progress"*).
  - **Rule 163 (`ROHAN_KAPOOR_ENGINE_LOCK`)**: Rohan Kapoor's core cognitive lens is: **Bureaucratic systems that convert delay, uncertainty, and non-action into respectable, documented process.** Strong subjects: meeting choreography, calendar holds, performance reviews, OKRs, attendance tracking, compliance modules, expense approvals, and escalation hierarchies. Prohibitions: Never reduce him to fixed prop clusters (office samosas, Gurgaon traffic, Outlook UI) or generic "corporate life sucks" tropes.
  - **Rule 164 (`SYSTEMIC_COMEDY_INVARIANT`)**: Humour gets stronger when the institution's procedural mechanics produce the absurdity organically. The narrator is an observer inside the machine, not an essayist trying to out-clever the scene with ornamental figures of speech. Delete "gilding the samosa" metaphors when the behavioral beat has already landed.

- **HyperFrames Video Rendering Pipeline**:
  - Use HyperFrames (`npx hyperframes render` / skills under `.agents/skills`) to generate animated 9:16 vertical video Reels/Stories (`.mp4`) for high-impact social releases, craft prompts, or product teasers.
- **Hashtags Standard — Targeted, Spaced & Strictly Lowercase (Platform-Specific Density)**:
  - **X (Twitter) — Maximum 1–2 Targeted Hashtags (Never 3 or More)**:
    * Stuffing tags hurts reach on X; hashtags serve only as a minor supporting signal, not primary discovery.
    * Use `#writingcommunity`, and add `#writingtips` as a second tag on posts that have character room. Never use 3 or more tags on X.
    * On long posts (mirror / "As you know" styles), drop tags before trimming the example.
    * Pick 1 or 2 tags maximum (e.g. `#essays` plus one topical tag). Always ensure proper spacing between tags (never concatenate like `#tag1#tag2`).
    * Understand that early engagement/replies are the real lever at low follower counts, not tagging.
  - **Instagram**: 3 to 5 targeted tags per post (e.g. `#writon #writingcommunity #storytelling #books`).
  - **LinkedIn**: Around 3 relevant craft/domain tags at the end of the post (e.g. `#writing #storytelling #craft`).
  - **YouTube Shorts**: `#shorts` plus 2 topical tags (3 tags total, e.g. `#shorts #writingcommunity #writon`).
  - **Threads**: Exactly 1 relevant topic tag (e.g. `#writingcommunity` or story topic).
  - **Reddit**: **Strictly 0 hashtags** (hashtags are auto-stripped to avoid spam flags).
  - **Strictly Lowercase & Spaced**: Always use small letters (all lowercase) and space tags cleanly. Never run tags together.
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
     - **HOOK_AS_CHALLENGE**:
       * Opening copy must create a transformation problem or urgent challenge, not merely name the lesson.
       * *Weak*: `WRITE JEALOUSY`, `WRITE ANGER`, `WRITE BETTER DIALOGUE`.
       * *Strong*: `MAKE JEALOUSY VISIBLE.`, `MAKE HER TERRIFYING.`, `MAKE THIS LINE HURT.`, `STOP WRITING "SHE REALIZED."`.
     - **NO_EMPTY_TRANSITION_BEAT**:
       * After identifying and removing the weak element, the replacement text must begin within ~0.5–0.8 seconds.
       * Never show a category label (`THE BEHAVIOR`, `THE EVIDENCE`) alone on an empty screen for a full second. Stagger the category pill and the first line of the rewrite together immediately after the directive beat.
     - **Static Hook & Auto-Caption Safe Zone Invariants**:
       * Big bold hook words (e.g. `Plus Jakarta Sans 900`) must be statically rendered from frame 0.0s (`opacity: 1`, no initial fade or scale animation) so the page is never blank and thumbnail previews are instantly legible.
       * Content layers must sit at `top: 480px` (optical center) with a ~250px clearance below the header badge to prevent collision with YouTube/Instagram auto-caption stickers (CC overlay at y ≈ 280–380px).
     - **Ending Maxim Cooldown**:
       * Keep aphorisms grounded in specific behavior. Do not make every ending purely poetic; reserve high-aphorism endings for when the behavioral contrast explicitly earns it, and rotate with direct instructional conclusions.
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
