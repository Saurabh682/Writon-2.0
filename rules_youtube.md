# YouTube API & Automation Rules (`rules_youtube.md`)

> **Source Reference**: [Google YouTube Data API v3 Documentation](https://developers.google.com/youtube/v3) & [Google API Resumable Upload Guide](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)

---

## 1. Core Authentication & Identity Rules

### 1.1 OAuth 2.0 Architecture
- **Mandatory OAuth 2.0**: All authenticated write and upload operations must use Google OAuth 2.0 Bearer tokens.
- **Endpoints**:
  - Token refresh endpoint: `https://oauth2.googleapis.com/token`
  - YouTube Data API Base: `https://www.googleapis.com/youtube/v3`
  - Resumable Video Upload Endpoint: `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`
- **Supported Credential Schemes**:
  1. **User / Bot OAuth Refresh Token**: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.
  2. **Direct Access Token**: `YOUTUBE_ACCESS_TOKEN` (in-memory cached or temporary bearer token).
  3. **Read-Only Public API Key**: `YOUTUBE_API_KEY` for public trend scouting without user context.

### 1.2 Required Scopes
Every token generated for WritOn's YouTube autonomous fleet must have appropriate scopes:
- `https://www.googleapis.com/auth/youtube.upload` — Upload videos and Shorts.
- `https://www.googleapis.com/auth/youtube.readonly` — View channel analytics and video statistics.
- `https://www.googleapis.com/auth/youtube.force-ssl` — Read/write comments and community engagement.

---

## 2. Quota Management & Rate Limiting

### 2.1 Daily Quota Allocation (10,000 units default)
YouTube Data API v3 enforces a strict daily quota per project (resets at midnight Pacific Time):
- **Video Upload**: ~1,600 quota units per video.
- **Video Read / List**: 1 quota unit.
- **Search Query**: 100 quota units per search call.
- **Video Update / Metadata**: 50 quota units.

*Operational Policy*:
- Limit video/Shorts publishing to **1-2 per day** during automated runs to stay well within the 10,000 unit ceiling (1,600 x 2 = 3,200 units).
- Cache metadata calls aggressively.
- When scouting, limit search queries to scheduled windows (max 5 searches/day = 500 units).

### 2.2 HTTP 429 & Quota Exceeded (403 quotaExceeded)
- When receiving a 429 (Too Many Requests) or 403 with reason `quotaExceeded` or `rateLimitExceeded`:
  - Log warning with retry time.
  - Implement exponential backoff ($2^n \times 1000\text{ms}$).
  - Mark channel as quota-locked until the Pacific midnight reset.

---

## 3. Video & Shorts Formatting Standards

### 3.1 YouTube Shorts Specifications
- **Aspect Ratio**: Strict 9:16 vertical (1080×1920 pixels).
- **Duration**: ≤ 60 seconds (optimal: 15–45 seconds for writing prompts and craft truths).
- **Language**: **English language only** across titles, descriptions, audio narration, and on-screen text.
- **Hashtags Standard**: Exactly **`#shorts` plus 2 topical tags** (3 tags total, e.g. `#shorts #writingcommunity #writon`). **Always lowercase letters only**; never use uppercase or mixed-case hashtags like `#Shorts` or `#WritingCommunity`.
- **Audio**: Clean voiceover or subtle ambient background music with proper speech clarity.
- **Metadata**:
  - Title: Max 100 characters in English with `#shorts` appended.
  - Description: Max 5000 characters. English prose, direct craft thought, link to WritOn app (`https://writon.cc`), and lowercase hashtags (`#shorts #writingcommunity #writon`).
  - Tags: Max 500 characters total across lowercase tags (`writing`, `craft`, `poetry`, `books`, `writon`, `shorts`).

### 3.2 Anti-Mannered Content Standard
- Apply WritOn's **Anti-Mannered Prose** and **Empirical Human Voice Codex** (`campaign/HUMAN_VOICE_CODEX.md`):
  - No dramatic or hyperbolic clickbait.
  - Direct, grounded craft truths and sensory writing prompts.

### 3.3 YouTube Shorts Demonstration Standard (Mandatory Anti-Quote-Card Doctrine)
- **No Static Quote Cards**: Never present a Short as a static text card with slow fades. Shorts require kinetic type and visual transformation.
- **Show the Move (Before vs After)**: Always put the bad line and the corrected line on screen side-by-side or sequentially with visible strikethrough/highlighting.
- **Audio Padding**: Keep spoken duration $\le 22$ seconds for a 26-second Short to guarantee that auto-captions and mobile UI never clip the payoff.
- **Background Music Level**: Keep piano bed $\le 0.04$ so speech recognition algorithms never insert `[music]` over critical craft words.
- **Always Upload Unlisted First**: All newly generated Shorts must be uploaded with `privacyStatus: 'unlisted'` so the visual and editorial quality can be reviewed before public broadcast.

### 3.4 The 5 Photographic Coffee Desk Visual Archetypes
Derived from WritOn's official morning/midnight craft visual gallery:
1. **The Top-Down Workbench Flatlay**: Overhead view of manuscript sheets, books stack (*Stories / Drafts / Better Endings*), ink jar, red editorial pencil, and artisan ceramic coffee mug. Features curved editorial annotations (`PAGE 2 -> OPENING LINE`, crumpled draft paper, red-ink margin notes).
2. **The Rain-Streaked Window Morning Desk**: 9:16 vertical eye-level view through rainy glass, soft golden morning light, steaming coffee mug with rising vapor, fountain pen, and open notebook with handwritten reflections (`Edit kinder`).
3. **The Coffee-Stain Editorial Ring**: Overhead textured cream sheet with a prominent dried coffee cup ring stain encircling the core craft maxim, red pencil pointer, and tactile paper fiber grain.
4. **The Sunset Sill / Solitary Morning Window**: Silhouette of a terracotta/burgundy ceramic mug steaming on a white painted windowsill overlooking a quiet sunrise/dawn cityscape, alongside a brass-nib fountain pen and folded manuscript page.
5. **The Midnight Draft / Lamp-Lit Desk**: Moody dark-wood desk illuminated by an amber banker's/desk lamp, textured ceramic mug with curling steam, open journal with active crossed-out handwritten lines (`and then...`), brass fountain pen.

### 3.5 Mandatory Voice Standard, Review Gate & Deep SEO Optimization Protocol
- **Official Voice Standard (Nicole / Kokoro TTS)**:
  - **Permanent Voice Model**: Nicole (`af_nicole` / `nicole` via Kokoro TTS) is the verified, permanent voice standard across all YouTube Shorts, Reels, and audio releases. Kokoro delivers superior phoneme clarity, natural human warmth, and zero diffusion grain.
- **Strict Unlisted Review Gate**:
  - **Always Upload Unlisted**: Every newly generated video MUST be uploaded with `privacyStatus: 'unlisted'` so it can be previewed and verified on mobile devices before public release. Never publish directly to public without explicit user confirmation.
  - **Title Dominance Over Tags (The Primary CTR & Algorithmic Hook)**:
    - **Titles Outweigh Tags Overwhelmingly**: As codified in Carina Fragozo's YouTube Creators Masterclass, titles are the primary CTR gate and the strongest metadata signal YouTube uses to index and categorize videos. A weak title results in low CTR and kills distribution regardless of quality.
    - **Searchable + Attractive Balance**: Titles must combine searchability (keywords people search for) with urgency and curiosity (the hook that earns the click).
    - **Title & Thumbnail Synergy (No Text Duplication)**: The on-screen text / thumbnail should have 2–4 punchy words designed for small mobile screens; the title delivers the context and intrigue. Never duplicate thumbnail text in the title.
  - **Structured, Keyword-Dense Descriptions**: Every description must be educational, keyword-rich, and formatted into distinct beats:
    1. *The Core Maxim / Hook* (first 2 lines above the fold).
    2. *The Flawed Draft vs. Solution Breakdown* (educational bullet points).
    3. *WritOn Canonical Ecosystem Links* (`https://writon.cc`, app link, social vanity links).
    4. *Hashtag Cluster*: A focused set of **5 to 8 researched lowercase hashtags** (`#shorts #writingtips #creativewriting #storytelling #showdonttell #amwriting #writingcraft #writon`).
  - **Tags (Minimal Modern Role)**:
    - YouTube Studio helper text explicitly states that tags play a minimal role in video discovery. Do not agonize over filling the 500-character tag box.
    - Use tags strictly for common misspellings (e.g. `writon`, `writeon`, `writ on`), abbreviations, or alternate phrasing.

### 3.6 Mandatory Channel Subscription CTA Protocol
- **Core Directive**: From Short #19 onward and across all future YouTube Shorts and long-form releases, every video MUST incorporate a deliberate, elegant Call-to-Action (CTA) inviting viewers to subscribe to the channel.
- **Three-Tier CTA Surface Architecture**:
  1. **On-Screen Visual End-Card / Badge (The Dwell Beat)**:
     - During the final 4–6 second hold/loop phase, render a dedicated, branded subscription prompt in the parchment aesthetic (`#FAF5EE` card with terracotta `#821D1A` accent):
       * Primary Copy: `SUBSCRIBE FOR DAILY CRAFT FIXES` or `SUBSCRIBE • SLOW WRITING CRAFT`
       * Subtext / Handle: `youtube.com/@writon_socialapp` or `@writon_socialapp`
       * Minimal bell / subscribe indicator icon styled without loud neon colors.
  2. **Description Box Subscription Beat (Canonical Vanity URL)**:
     - Every YouTube video description must include an explicit subscription line right above or within the ecosystem section:
       ```text
       🔔 Subscribe for daily slow-writing craft truths & storytelling fixes:
       👉 https://writon.cc/youtube?sub_confirmation=1
       ```
     - Always use WritOn's official canonical vanity shortcut `https://writon.cc/youtube` (or `https://writon.cc/yt`) with the subscription confirmation parameter.
  3. **Pinned First Comment**:
     - Whenever automated or manual first-comment publishing is enabled, pin the craft discussion prompt paired with:
       ```text
       Subscribe to @writon_socialapp for one quiet craft truth every day. Which writing rule do you break the most?
       ```
- **Voiceover Rule**:
  - Keep voiceover focused on the craft truth itself without begging or speaking long generic outro pitches; let the on-screen kinetic card, description link, and pinned comment carry the subscription conversion cleanly.

### 3.7 Retention Telemetry & Pacing Protocol (Derived from Short #18 Performance)
- **Empirical Baseline (Short #18 "Kill Filter Words")**:
  - Views: 113 (vs 30–80 typical).
  - Stayed to Watch: **25.93%** (vs 13.8%–18.1% typical).
  - 0:00–4.5s Retention: **> 100%** (strong initial hook & re-reading of concrete flawed example).
  - 5.0–9.0s Drop-off: Dropped from 100% to ~46% when single rewrite was unveiled.
  - 14.0–20.0s Tail Drop-off: Tapered to 7.7% during prolonged abstract rule explanation.
- **Mandatory Production Directives for Next Shorts**:
  1. **Dual-Beat / Rapid 2nd Example (Combat 5s–9s Drop-Off)**:
     - Never spend 6+ seconds lingering on a single simple solution. Once the first contrast lands, immediately trigger a second rapid 'before & after' example (e.g., *“She felt the cold wind” → “The icy wind bit her skin”*).
     - Multiple rapid micro-comparisons maintain active engagement and curiosity rather than letting the reader feel they have already extracted the lesson.
  2. **Tightened Micro-Short Duration (10–14s Target for Single Rules)**:
     - For standalone micro-tips, trim spoken and visual duration to 10–14 seconds rather than stretching to 20+ seconds.
     - Cut trailing abstract summaries (*"Let the reader hear it directly"*). End immediately on the punchy craft contrast and a crisp 2–3s subscription hold to force automatic, high-retention looping.
  3. **Preserve Frame-Zero Concrete Hook**:
     - Retain the bold, high-contrast hook text + concrete example right at 0:00 (which drove the >100% 4.5s retention and 25.9% watch rate).


