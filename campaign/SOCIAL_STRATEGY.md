# 📜 WritOn Social Media Growth Strategy & Operations Protocol
**Canonical Cross-Agent Synchronization & Autonomous Execution Standard**
*Version: 2.1.0 • Last Updated: 2026-09-12 • Target Campaign: `writon_growth_2026_09`*

> **For All AI Agents & Collaborators:**  
> This document is the single source of truth for WritOn's social media strategy, daily schedule, aesthetic standards, multi-agent synchronization, and metrics harvesting. Treat all contracts in this file as strictly binding across chat sessions.

---

## 1. Executive Strategy & North Star Goals

- **Product:** WritOn — A calm, distraction-free home for reading verified stories and writing offline-first literature.
- **Primary Organic Objective:** Drive high-intent reader and writer installations on Google Play Store without paid ads.
- **Brand Aesthetic Commitment:** **Warm Ivory Parchment & Watercolor Bloom** (`#FAF5EE` base, terracotta blooms `#D45226`, Newsreader/Noto Serif Devanagari typography, 50%+ negative space, true curly quotes). Strictly **zero obsidian dark mode**.
- **Master Editorial Brain (`campaign/EDITORIAL_BRAIN.json`):** Single source of truth for high-resonance propositions, hooks, and creative intelligence. All copy across all platforms must consult the brain to maintain unified voice and prevent self-competition.
- **Strong Proposition > Neutral Framing:** Never use filing-cabinet titles (*"Week-one practice recap"*). Lead with point of view, tension, transformation, or curiosity.
- **Dual-Format Publishing Mandate (Video + Stills Pairing):** Always pair video with still image assets for every release. Video (Reels/Shorts) drives cold-audience discovery and non-follower reach (averaging 32+ views vs ~7–11 for cold statics), while static/carousel cards provide high-dwell saveability, readable craft depth, and profile conversions. Every major proposition should ship as both a HyperFrames 9:16 vertical video and a Warm Parchment carousel/still.
- **Tone & Copywriting Rule (Anti-Mannered Prose):** Direct, honest craft statements. Never substitute an ornamental metaphor for a concrete craft instruction. Respect reader attention.

---

## 2. Daily Publishing Schedule (Asia/Kolkata — IST)

| Slot Time | Surface & Platform | Content Format & Theme | Target Objective |
| :--- | :--- | :--- | :--- |
| **09:00 IST** | **X (Twitter)** + **LinkedIn** + **Threads** + **Pinterest** | Rendered 1080×1080 Craft Card / 1080×1350 Pin + Shortlink | Morning creative inspiration, writing habit activation, evergreen visual indexing |
| **12:30 IST** | **Instagram Story** + **9:16 Vertical Reel** + **YouTube Shorts** | Interactive Story Poll + HyperFrames Video / Shorts with Piano Audio | Midday community pulse check, high-reach algorithmic discovery |
| **19:30 IST** | **Instagram Feed** + **Threads** + **LinkedIn** | 5-Slide Carousel (1080×1350) or Long-Form Narrative | Evening deep craft breakdown, save-for-later reference |
| **20:30 IST** | **X** + **LinkedIn** + **Threads** + **Reddit** | 1080×1080 Card / Long-Form Craft Self-Post | Community discussion, Reddit craft insights, replies |
| **20:45 IST** | **Instagram Stories** | 2-Frame Story Sequence (Daily Takeaway + CTA) | Nightly bedtime reflection, Play Store shortlink tap |

---

## 3. Platform-Specific Copy & Hashtag Governance

To maximize algorithmic reach and prevent spam penalties, each platform adheres to strict contracts:

- **X (Twitter):**
  - **Language Directive:** **English language only** across all posts, prompts, and threaded replies. Defer regional language text on X to ensure consistent algorithmic distribution to the global writing community.
  - **Format Support:** Supports both high-DPI cards and **native vertical video (`.mp4`)** via chunked media upload (`mimeType: 'video/mp4'`).
  - **Targeted Hashtags (Maximum 1–2 Tags; Never 3 or More)**:
    * Stuffing tags hurts reach on X. Hashtags act only as supporting topic signals rather than primary discovery drivers.
    * Use `#writingcommunity`, and add `#writingtips` as a second tag only if character budget allows. Never use 3 or more tags on X.
    * On long posts (mirror / "As you know" styles), drop hashtags before trimming illustrative examples.
    * When tagging stories (e.g. essays), pick 1 or 2 tags max (e.g. `#essays` plus one topical tag).
    * **Strict Spacing Rule**: Always space tags cleanly (`#tag1 #tag2`). Never run tags together (`#tag1#tag2`) which breaks discovery parsing.
    * Early engagement and authentic replies are the real organic growth lever at low follower counts, not heavy tagging.
  - Clean root tweet with attached rendered video or card.
  - Shortlink (`https://writon.cc/go/{delivery_id}`) posted in the immediate reply to protect feed reach.
- **Instagram:**
  - **3 to 5 Targeted Lowercase Hashtags**: E.g., `#writon #writingcommunity #storytelling #books #reading`. Avoid stuffing 10+ tags; maintain high visual aesthetic.
  - Rich captions with clear paragraph breaks. No loud promotional buttons on the cards.
- **Threads:**
  - **Exactly 1 Topic Tag**: Use a single relevant topic tag (e.g. `#writingcommunity` or subject tag) to match Threads' native topic categorization.
- **LinkedIn (Founder / Brand Long-Form):**
  - Substantive 3–4 paragraph narrative expanding on writing discipline, engineering craft, or editorial philosophy.
  - **Around 3 Relevant Lowercase Hashtags** placed at the end of commentary: E.g., `#writing #storytelling #craft` or `#engineering #tech #software`.
- **Pinterest:**
  - Title maximum **100 characters**, description maximum **800 characters**, alt text maximum **500 characters**.
  - Exactly **3 to 5 high-intent craft & literature hashtags**: `#writon #writingcommunity #amwriting #storytelling #quotes`.
  - Direct canonical destination link to `https://writon.cc` or delivery shortlink (`https://writon.cc/go/{delivery_id}`).
  - Exclusively Warm Ivory Parchment & Watercolor aesthetic (2:3 vertical or 1080×1350 portrait cards). Strictly zero dark mode.
- **Reddit (Communities & Profile Posts):**
  - **Strictly Zero Hashtags:** Reddit does not use hashtags; hashtags are automatically stripped by `RedditClient.submitPost()` to prevent promotional spam flags.
  - **Direct Statement Format:** Informative craft breakdown or question without marketing adjectives.
  - **Mandatory Link Flairs:** Check subreddit requirements via `getPostRequirements()` and attach appropriate link flair before submitting.
  - **Target Subreddits:** `r/writon`, `r/writing`, `r/writingprompts`, `r/selfpublish`, `r/writers`.
- **YouTube Shorts & Community:**
  - **Live Channel**: `WritOn — Calm Reading & Writing`
  - **Handle**: `@writon_app` (`https://www.youtube.com/@writon_app`)
  - **Language**: **English language only** across titles, descriptions, and videos.
  - **Hashtags Standard**: Exactly **`#shorts` plus 2 topical tags** (3 tags total, strictly lowercase, e.g. `#shorts #writingcommunity #writon`).
  - **Format**: Vertical 9:16 video (1080×1920), ≤ 60s (ideal 15–45s).
  - **Title**: ≤ 100 chars with `#shorts` appended.
  - **Description**: Craft context, app shortlink `https://writon.cc`, and lowercase tags: `#shorts #writingcommunity #writon`.
  - **Quota Discipline**: Max 1–2 uploads per day (1,600 units/upload out of 10,000 daily project quota).
- **Weekly Language Directive (Active: Sept 13–20, 2026):**
  - **English Content Only**: Post exclusively English-language content across all publishing channels (YouTube Shorts, X, Instagram, LinkedIn, Threads, Pinterest, and Reddit).
  - Defer regional language releases (Hindi, Marathi, Bengali) until the following sprint. All captions, card copy, audio, and titles this week must be in English.
- **Multilingual Localizations (Future Sprints):**
  - **Hindi Days:** `#writon #हिंदीसाहित्य #लेखन #कहानी` (Devanagari text).
  - **Marathi Days:** `#writon #मराठीसाहित्य #लेखन`.
  - **Bengali Days:** `#writon #বাংলাসাহিত্য #গল্প`.

---

## 4. Multi-Chat State Synchronization Contracts

When switching between chats, agents, or CLI runners, sync state using these canonical files:

1. **Publishing Calendar Contract:**  
   [`campaign/antigravity-2026-09-06-19/publishing-calendar.csv`](file:///d:/VibeCode/WritOn-PowerUp/campaign/antigravity-2026-09-06-19/publishing-calendar.csv)  
   Tracks date, slot, platform, theme, delivery ID, caption, asset paths, and published status.
2. **Execution History Ledger:**  
   [`campaign/published-history.json`](file:///d:/VibeCode/WritOn-PowerUp/campaign/published-history.json)  
   Contains live post IDs, tweet IDs, threads IDs, and LinkedIn URNs for idempotency (skips duplicate dispatches).
3. **Growth Analytics Ledger:**  
   [`campaign/analytics-ledger.json`](file:///d:/VibeCode/WritOn-PowerUp/campaign/analytics-ledger.json)  
   Persists harvested views, impressions, reach, likes, and comments over time.
4. **Interactive Dashboard & Staging Host:**  
   Hosted live at **`https://writon-canvas-staging.web.app/canvas`** (mirrored in `public/canvas.html`).
5. **Bot Genesis Protocol (Factory Blueprint):**  
   [`campaign/BOT_GENESIS_PROTOCOL.md`](file:///d:/VibeCode/WritOn-PowerUp/campaign/BOT_GENESIS_PROTOCOL.md)  
   The standardized 7-phase operating procedure for creating, hardening, and evolving bots for any platform (Reddit, Telegram, Pinterest, Bluesky, Substack, etc.) across independent chat sessions while maintaining unified state across the entire bot fleet.

---

## 5. Architectural Suggestions: How to Make the Strategy More Flexible

To ensure our social engine can dynamically adapt to algorithm changes, viral trends, and new channels, adopt the following enhancements:

### Suggestion 1: Dynamic Trend-Pivoting (Feedback-Driven Scheduling)
- **Current Behavior:** Slots follow a rigid 14-day pre-planned theme.
- **Flexible Upgrade:** If the morning trend harvester detects a surging literary topic on X/Google, or [Pinterest Trends](https://trends.pinterest.com/) indicates an emerging writing search term (e.g. *#WorldPoetryDay*, *NaNoWriMo*, *dark academia writing aesthetic*, or seasonal reading surges), the scheduler dynamically injects that theme into the 19:30 IST slot while pushing the planned evergreen card back by 1 day.

### Suggestion 2: Zero-Cost Expansion to High-Conversion APIs
Hook up two additional free APIs directly into `server/src/services/social-poster.js`:
- **Telegram Channel Bot API (100% Free):** Direct push delivery to readers without algorithmic suppression. High conversion for Android APK/Play Store links.
- **Pinterest API v5 (100% Free):** Long-term visual search indexing for our Warm Parchment quote cards with evergreen 6-month shelf lives.

### Suggestion 3: Automated A/B Headline Testing
- Render **two headline variants** per prompt (Variant A: Direct Craft Tip; Variant B: Provocative Question).
- Test on X/Threads at 09:00 AM; the variant with higher engagement dictates the Instagram Carousel headline at 19:30 PM.

### Suggestion 4: Automated Audience Retargeting Trigger
- When `social-analytics-harvester.mjs` detects a post exceeding **50+ impressions or 5+ likes**, automatically queue an author spotlight or deep-dive follow-up story on that exact theme.

---

## 6. Standard CLI Execution Commands

- **Simulate / Dry-Run a Day:**
  ```bash
  node scratch/sprint2-dispatcher.mjs --dry-run --day=7
  ```
- **Execute a Specific Slot:**
  ```bash
  node scratch/sprint2-dispatcher.mjs --day=7 --slot=12:30
  ```
- **Reddit Dry-Run Campaign Post:**
  ```bash
  node scripts/reddit_publisher.mjs --day=1 --dry-run
  ```
- **Reddit Live Custom Post:**
  ```bash
  node scripts/reddit_publisher.mjs --subreddit=writon --title="Crafting Deep Prose" --body="Words should breathe."
  ```
- **Reddit Community Trend Scout (Keyword / JSON Mode):**
  ```bash
  node scripts/reddit_scout.mjs --subreddits=writing,screenwriting --keyword=dialogue --json
  ```
- **Pinterest Dry-Run Campaign Post:**
  ```bash
  node scripts/pinterest_publisher.mjs --day=1 --dry-run
  ```
- **Pinterest Live Custom Pin:**
  ```bash
  node scripts/pinterest_publisher.mjs --title="Crafting Tension" --description="Start in the middle." --image="path/to/card.png"
  ```
- **Pinterest Account & Board Scout:**
  ```bash
  node scripts/pinterest_scout.mjs --boards --json
  ```
- **LinkedIn Dry-Run Brain Publish:**
  ```bash
  node scripts/linkedin_publisher.mjs --brain --dry-run
  ```
- **LinkedIn Scout & Telemetry Audit (Dry Run):**
  ```bash
  node scripts/linkedin_scout.mjs --dry-run
  node scripts/linkedin_scout.mjs --harvest-window=24h --json
  ```
- **Run Live Growth Analytics Harvester:**
  ```bash
  node scratch/social-analytics-harvester.mjs
  # Or fetch all social, Reddit & Pinterest metrics:
  node scripts/fetch_social_metrics.mjs
  ```
- **Deploy Staging Dashboard:**
  ```bash
  npx firebase-tools deploy --only hosting:writon-canvas-staging
  ```

---

## 7. Reddit Autonomous Suite: Architecture & Operational Findings

### A. Autonomous Multi-Agent Architecture
The Reddit pipeline is integrated directly into WritOn's daily dispatch and tracking infrastructure:
- **Core API Client:** [`server/src/services/reddit-client.js`](file:///d:/VibeCode/WritOn-PowerUp/server/src/services/reddit-client.js) — Zero-dependency native `fetch` client with OAuth2 token caching, 401 auto-renewal, 429 adaptive backoff, and hashtag sanitization.
- **Posting Integration:** [`server/src/services/social-poster.js`](file:///d:/VibeCode/WritOn-PowerUp/server/src/services/social-poster.js) (`postToReddit`) and [`server/src/jobs/social-campaign-publisher.js`](file:///d:/VibeCode/WritOn-PowerUp/server/src/jobs/social-campaign-publisher.js) (Step 6).
- **Standalone CLI Publisher:** [`scripts/reddit_publisher.mjs`](file:///d:/VibeCode/WritOn-PowerUp/scripts/reddit_publisher.mjs) for manual, dry-run, or ad-hoc subreddit dispatches with automatic `campaign/published-history.json` logging.
- **Trend & Question Scout:** [`scripts/reddit_scout.mjs`](file:///d:/VibeCode/WritOn-PowerUp/scripts/reddit_scout.mjs) with `--keyword` filtering and `--json` pipeable output to feed the Global Editorial Canvas.
- **Metrics Tracking:** [`scripts/fetch_social_metrics.mjs`](file:///d:/VibeCode/WritOn-PowerUp/scripts/fetch_social_metrics.mjs) (`fetchRedditMetrics`) collecting score, upvote ratio, comments, and views into `metrics.csv`.

### B. Critical Operational Findings & Reddit Policy Realities (2024–2026)
1. **Responsible Builder Policy Restriction on New Accounts:**
   - Under Reddit's updated policies, brand-new accounts (0 karma, recently registered) are blocked from self-serve OAuth2 script app creation at `reddit.com/prefs/apps` with the error: `In order to create an application or use our API you can read our full policies here: .../Responsible-Builder-Policy`.
   - New accounts must submit an official Developer App Registration form at `developers.reddit.com`.
2. **Human Developer vs. Automated Account Separation:**
   - Reddit Developer Platform enforces a strict boundary: developers cannot register their own personal account as a bot.
   - The developer account (human identity) registers and manages a distinct **Automated Account** (bot identity, e.g. `writon_publisher`).
3. **Asynchronous Approval Queue & Support Ticket Status:**
   - Submitting the DevPlatform registration or Data API Request form places the automated account into a review queue.
   - **Current Operational Status (Updated 2026-09-12 22:30 IST):** Reddit Data Team sent automated rejection on ticket #18442809 (*"not in compliance with Responsible Builder Policy and/or lacks necessary details"*). 
   - Standalone Data API access for new accounts is strictly gated by Reddit. Practical paths forward: (a) Use an established personal account with karma on `old.reddit.com/prefs/apps`, (b) Submit a non-commercial mod-tool appeal reply to Zendesk, or (c) Migrate to Devvit (@devvit/public-api).
4. **Bypass via Established Accounts:**
   - Established Reddit accounts (older personal accounts with existing karma and post history) are exempt from the new-account block and can create `script` apps on `old.reddit.com/prefs/apps` immediately without waiting for review.
5. **Content Best Practices for Reddit:**
   - Strictly zero hashtags: Reddit community culture views hashtags as low-effort spam. `RedditClient` automatically strips `#tags` before posting.
   - Pre-flight flair negotiation: Reddit subreddits often enforce flair rules; `getPostRequirements()` and `getLinkFlairs()` must run prior to submission to prevent rejected posts.

### C. Reference Documentation
- **Full Architecture & AI Maintenance Manual:** [`REDDIT_BOTS.md`](file:///d:/VibeCode/WritOn-PowerUp/REDDIT_BOTS.md)
- **API Standards & Rate Limits:** [`rules.md`](file:///d:/VibeCode/WritOn-PowerUp/rules.md)
- **Complete 19-Domain Endpoint Directory:** [`reddit_api_reference.md`](file:///d:/VibeCode/WritOn-PowerUp/reddit_api_reference.md)
- **Changelog & Release Notes:** [`CHANGELOG.md`](file:///d:/VibeCode/WritOn-PowerUp/CHANGELOG.md) (v2.0.65)

### D. Active Registration & Support Ticket Status (2026-09-12)
- **Ticket Type:** Official Reddit Data API Access Request Submission
- **Received From:** Reddit Support (`support@reddit.zendesk.com`)
- **Submission Timestamp:** 2026-09-12 11:28 IST
- **Target Bot Username:** `writon_publisher`
- **Application Name:** `WritOn Publisher`
- **Platform URL:** `https://writon.cc`
- **Intended Subreddits:** `r/writon`, `r/test`, `r/writing`, `r/writingprompts`, `r/selfpublish`
- **Current Status:** Ticket received and under review. Once Reddit Support processes the request, the Responsible Builder restriction on `writon_publisher` will be removed to permit script app credential generation on `old.reddit.com/prefs/apps`.

---

## 8. Pinterest Autonomous Suite: Architecture & Operational Realities

### A. Autonomous Multi-Agent Architecture
The Pinterest pipeline establishes evergreen visual discovery for WritOn's quotes, prompts, and craft cards:
- **Core API Client:** [`server/src/services/pinterest-client.js`](file:///d:/VibeCode/WritOn-PowerUp/server/src/services/pinterest-client.js) — Zero-dependency native `fetch` client with OAuth2 Bearer token caching, automatic refresh exchange, 401 token refresh retry, adaptive 429 backoff, Base64 local image upload, and analytics retrieval.
- **Posting Integration:** [`server/src/services/social-poster.js`](file:///d:/VibeCode/WritOn-PowerUp/server/src/services/social-poster.js) (`postToPinterest`) and [`server/src/jobs/social-campaign-publisher.js`](file:///d:/VibeCode/WritOn-PowerUp/server/src/jobs/social-campaign-publisher.js) (Step 7).
- **Standalone CLI Publisher:** [`scripts/pinterest_publisher.mjs`](file:///d:/VibeCode/WritOn-PowerUp/scripts/pinterest_publisher.mjs) for manual, dry-run, or campaign package dispatches with automatic `campaign/published-history.json` logging.
- **Account & Board Scout:** [`scripts/pinterest_scout.mjs`](file:///d:/VibeCode/WritOn-PowerUp/scripts/pinterest_scout.mjs) with `--boards`, `--profile`, and `--json` pipeable output for dashboard consumption.
- **Metrics Tracking:** [`scripts/fetch_social_metrics.mjs`](file:///d:/VibeCode/WritOn-PowerUp/scripts/fetch_social_metrics.mjs) (`fetchPinterestMetrics`) tracking impressions, saves, and clicks into `metrics.csv`.

### B. Reference Documentation
- **Full Architecture & AI Operations Manual:** [`PINTEREST_BOTS.md`](file:///d:/VibeCode/WritOn-PowerUp/PINTEREST_BOTS.md)
- **API Standards & Rate Limits:** [`rules_pinterest.md`](file:///d:/VibeCode/WritOn-PowerUp/rules_pinterest.md)
- **Complete Endpoint Directory:** [`pinterest_api_reference.md`](file:///d:/VibeCode/WritOn-PowerUp/pinterest_api_reference.md)
- **Vitest Unit Test Suite:** [`server/test/pinterest-client.test.js`](file:///d:/VibeCode/WritOn-PowerUp/server/test/pinterest-client.test.js) (10 tests passing)

### C. Active Developer Platform Ticket Status (2026-09-12)
- **Ticket Type:** Pinterest Developer Platform App Intake Submission (`https://developers.pinterest.com/apps/connect/`)
- **Received From:** The Pinterest Platform Team
- **Submission Timestamp:** 2026-09-12 11:45 IST
- **Application Name:** `WritOn by iBitValley`
- **Company Name:** `iBitValley`
- **Account Handle:** `@writon_socialapp`
- **Website URL:** `https://writon.cc`
- **Privacy Policy:** `https://writon.cc/privacy-policy`
- **App Purpose:** `Personal API access (single, personal use)` — Automated publishing of daily creative writing prompts, literary craft truths, and author insights to brand boards.
- **Use Cases:** Pin creation & scheduling, Reporting
- **Current Status:** Application under review by Pinterest Platform Team (*"Thank you for submitting a request to build an app on our API. Your request is under review. We'll send you another note once there's a change to its status."*). Once approved, app credentials (`PINTEREST_ACCESS_TOKEN`, `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`) will be activated in `server/.env`.

### D. Pinterest Trends Radar Integration (https://trends.pinterest.com/)
- **Visual Search Demand Compass**: [Pinterest Trends](https://trends.pinterest.com/) serves as our macro-horizon keyword engine, identifying high-intent writing, reading, and literature queries weeks before peak seasons.
- **Priority Writing & Literary Clusters**:
  - *Creative Writing & Prompts:* "creative writing prompts", "story starters", "dialogue prompts", "character development template", "novel plotting outline".
  - *Literary & Poetry Aesthetics:* "poetry aesthetic", "dark academia quotes", "deep thought quotes", "classic literature quotes", "annotated books aesthetic".
  - *Writer Habits & Sanctuary:* "daily writing routine", "distraction free writing", "writers notebook", "coffee and writing".
- **Editorial Canvas Ingestion Workflow**:
  1. Harvest rising 30-day and 90-day search trajectories across the US, UK, and India literary demographics on `trends.pinterest.com`.
  2. Map rising keywords directly into the Global Editorial Canvas Trend Drawer (`public/canvas.html`).
  3. Seamlessly weave trending keywords into Pin descriptions (enforcing the 800-character limit) and image alt-text (500-character limit) to maximize evergreen algorithmic distribution and save rates.

---

## 9. Canonical Branded Vanity Shortlink Registry (`writon.cc/:slug`)

To reinforce brand authority, maintain clean aesthetics, and accurately aggregate click telemetry across platforms, **all public copy, bios, posts, comments, stories, and prompts must exclusively use WritOn vanity shortlinks** instead of raw platform URLs:

| Channel / Surface | Canonical Shortlink | Shortcut Alias | Resolved Destination |
| :--- | :--- | :--- | :--- |
| **Instagram** | `https://writon.cc/instagram` | `https://writon.cc/ig` | `https://www.instagram.com/writon_socialapp/` |
| **X (Twitter)** | `https://writon.cc/x` | `https://writon.cc/twitter` | `https://x.com/WritOn_Social` |
| **Threads** | `https://writon.cc/threads` | — | `https://www.threads.net/@writon_socialapp` |
| **YouTube** | `https://writon.cc/youtube` | `https://writon.cc/yt` | `https://www.youtube.com/@writon_app` |
| **LinkedIn** | `https://writon.cc/linkedin` | — | `https://www.linkedin.com/in/writon-story-writing-and-reads` |
| **Reddit** | `https://writon.cc/reddit` | — | `https://www.reddit.com/r/writon/` |
| **Medium** | `https://writon.cc/medium` | — | `https://medium.com/@saurabh.682` |
| **Google Play** | `https://writon.cc/play` | `https://writon.cc/app`, `https://writon.cc/android` | `https://play.google.com/store/apps/details?id=com.ibitvalley.writon` |

### The New Link Rule
Whenever an AI agent, bot, or team member introduces any new public destination or campaign profile:
1. It must never be published as a raw third-party URL.
2. It must be registered as a `/:slug` route in `server/src/routes/vanity-redirects.js` and `firebase.json` (or via `public.custom_links`).
3. Deploy to Firebase Hosting edge (`firebase deploy --only hosting:writon-prod`).

