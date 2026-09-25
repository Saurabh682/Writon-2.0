# LinkedIn Marketing API & Automation Rules (`rules_linkedin.md`)

> **Source Reference**: [LinkedIn Marketing Developer Platform](https://learn.microsoft.com/en-us/linkedin/marketing/) & [LinkedIn Posts API (2026-09 Versioned)](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/recent-changes?view=li-lms-2026-07)

---

## 1. Core Authentication, Protocol & Identity Rules

### 1.1 Mandatory Headers & Versioning
- **Active Marketing API Version**: `Linkedin-Version: 202609`.
- **Restli Protocol Version**: `X-Restli-Protocol-Version: 2.0.0`.
- **Authentication**: `Authorization: Bearer <TOKEN>`.
- **Capability-Aware Refresh**: Check `has_refresh_grant` before calling OAuth refresh. Token refresh without grant causes fatal loop; fail early with explicit capability alert.

### 1.2 Restli Header Capture & Idempotency Invariant
- Every post dispatch to `POST https://api.linkedin.com/rest/posts` returns HTTP 201.
- **Critical Header**: Capture `x-restli-id` (case-insensitive header) as the canonical LinkedIn Post URN (`urn:li:share:...` or `urn:li:ugcPost:...`).
- **Missing Header (201 without x-restli-id)**:
  - Must be classified as `UNKNOWN`, never `EXPLICIT_FAIL` or blind retry.
  - Check connection scope for `r_member_social`. If absent, transition intent to `QUARANTINED` for operator confirmation.

---

## 2. Rate Limiting & 24-Hour Quota Architecture

### 2.1 24-Hour Window Limits
- LinkedIn Marketing API Community Management tier enforces 24-hour window quotas:
  - **Development Tier Application Calls**: 500 requests per 24 hours.
  - **Development Tier Member Calls**: 100 requests per 24 hours.
- Counters are **not** authoritative live headers in the API; they are tracked as local 24-hour rolling estimates against portal-configured ceilings.

### 2.2 HTTP 429 Adaptive Backoff
- Inspect `Retry-After` header. If absent, apply exponential backoff (2s, 4s, 8s, 16s) with randomized jitter.
- Quota alerts must trigger when rolling 24h attempts reach 80% of configured ceilings (400 for app, 80 for member).

---

## 3. Creative Formats & Media Lifecycle

### 3.1 Supported Post Formats
- `SINGLE_IMAGE`: 1 image asset via `/rest/images?action=initializeUpload`.
- `MULTI_IMAGE`: Organic carousel consisting of 2 to 20 images. (Note: `CAROUSEL` type in Posts API is sponsored-only; organic multi-image must use `MULTI_IMAGE`).
- `DOCUMENT`: 1 PDF document via `/rest/documents?action=initializeUpload`.
- `VIDEO`: Multipart resumable upload via `/rest/videos?action=initializeUpload` (`WAITING_UPLOAD` $\rightarrow$ `PROCESSING` $\rightarrow$ `AVAILABLE`).
- `TEXT_ONLY`: Commentary-only post without media attachments.

### 3.2 Immutability & Approval Freeze
- Database trigger `trg_freeze_approved_candidate_version` strictly locks candidate text, format, and assets once `approved_at IS NOT NULL`.
- No updates or deletions are permitted on frozen candidate versions or attached assets.

### 3.3 Hashtags Standard
- Exactly **around 3 relevant lowercase tags placed at the end** of the post commentary (e.g. `#writing #storytelling #craft` or `#tech #engineering #software`). Never stuff excessive hashtags.

---

## 4. Multi-Surface Analytics & Scopes

- Member Creator Post Analytics: `/rest/memberCreatorPostAnalytics?postUrn=...`
- Member Creator Video Analytics: `/rest/memberCreatorVideoAnalytics?videoUrn=...`
- Organization Share Analytics: `/rest/organizationalEntityShareStatistics?shares=List(...)`
- **Null Safety**: Metrics unsupported on a specific surface must be stored as explicit `null`, not coerced to `0`.

---

## 5. Strict Operational Invariant

> [!CAUTION]
> **NEVER POST TEST THINGS ONLINE.**
> All unit tests, development calibrations, CLI checks, and automated validations must run with `--dry-run` or against offline mocked fixtures. Under no circumstances should test or placeholder copy be dispatched to a live LinkedIn member or organization feed.

---

## 6. Founder-Channel Strategy & Cadence Mandates

### 6.1 Positioning & Audience
- LinkedIn is WritOn's **Founder Channel**, NOT a high-frequency prompt dump.
- **Audience**: Working writers, journalists, series writers, translators, and editors in Indian languages (Hindi, Marathi, Bengali, English).
- **Core 30-Day Goal**: Recruit the first **25 founding writers**. Optimize for DMs, conversations, and writer signups, NOT vanity impression counters.

### 6.2 Cadence, Schedule & Anti-Saturation Rules
- **Maximum 1 Post Per Day & 3 Posts Per Week**: Strictly enforced via Gate `LI19_SINGLE_DAILY_CADENCE` and Gate `LI20_SCHEDULE_DAY_WINDOW`. Never publish multiple posts on the same calendar day, and never publish two posts inside 24 hours to prevent audience self-cannibalization.
- **Fixed Publishing Days**: **Monday, Wednesday, Friday only**. Skip weekends and off-days entirely for this audience.
- **Anchor Publishing Time Window**:
  - **Primary Slot**: **9:00 AM IST** (Window: 8:30 AM – 10:00 AM IST).
  - **Secondary Backup Slot**: **12:30 PM – 1:30 PM IST** (defer testing second slot until a solid baseline of 20+ posts is reached; hold 9:00 AM slot fixed for minimum two weeks).
- **The 30-Minute Engagement "Golden Hour" Protocol**:
  - A post at 9:00 AM that the founder can actively tend beats a theoretically "optimal" slot that goes unattended.
  - The publisher/operator must remain active on LinkedIn for ~30 minutes immediately following dispatch:
    1. Respond directly to every comment and language declaration.
    2. Leave 2–3 thoughtful, authentic comments on target writers' posts in the feed.
    3. Early algorithmic velocity depends on immediate author reciprocity.
- **Content Mix (3 Core Pillars)**:
  1. **Build in Public (~50%)**: Transparent founder voice. What broke, why specific architectural or design choices were made (e.g., quiet library vs algorithmic dopamine), real telemetry numbers.
  2. **Founding-Writer Spotlights**: Showcasing authentic writers, excerpts, and why they joined WritOn (social proof).
  3. **Weekly Craft Carousel (1x/week)**: Deep craft utility (e.g., *"Write your opening sentence last"*), structured as a clean, high-contrast, swipeable document/carousel.

### 6.3 Voice & Hook Standards
- **Direct Founder Voice**: Speak in first-person as the builder (`Saurabh Kumar`).
- **Zero Label Openings (Gate `LI18`)**: Never open a post with internal taxonomy tags like *"The Craft of Writing: Verified writing walkthrough"*. The first line is the hook; make it an arresting, direct statement.
- **Trust & Bylines (Gate `LI17`)**: Prohibit synthetic house personas or unearned academic titles (e.g., *"Dr. Sunita Banerjee"*, *"Aarav Mehta"*). Articles created in-house must be labeled strictly as **WritOn Editorial** or carried in the founder's authentic voice.
- **Carrying the Link**: Always anchor calls-to-action to an authentic narrative or specific founding invitation. Avoid bare links without earned context.


