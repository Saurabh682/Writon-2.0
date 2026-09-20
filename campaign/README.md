# WritOn 30-Day Organic Social Growth Campaign (writon_growth_2026_09)

## Campaign Purpose and Goals
This campaign aims to kickstart organic growth for WritOn across key social channels (Instagram, Threads, X, Pinterest) over 30 days.

**Goals:**
- **Baseline:** ~47
- **Committed Outcome:** B+53
- **Stretch Outcome:** B+103

The campaign is organic-only. Asset scripts create review packages but cannot publish; approved posts must be scheduled in each platform's native scheduler. See `launch-readiness.md` before treating any calendar status as launch approval.

## File Usage
- `content-calendar.csv`: The day-by-day plan for all social posts. Update statuses here as content moves through the pipeline.
- `delivery-registry.json`: Source of truth for UTM parameters and delivery metadata.
- `phrase-bank.md`: Approved copy, CTAs, and hashtags for each language and platform.
- `metrics-template.csv`: Daily tracker for impressions, reach, engagement, and conversion metrics.
- `weekly-decision-log.md`: Record of performance insights and strategic adjustments made at the end of each week.
- `incident-log.md`: Tracker for takedowns, rights disputes, platform restrictions, or negative feedback.
- `human-content-allowlist.csv`: Registry of verified human-authored content with consent records.
- `review-recovery-log.md`: Audit and response log for app store reviews.
- `day-0-baseline.csv`: Verified acquisition, retention, product-health, rating, and audience baseline.
- `acquisition-quality-report.csv`: Delivery-level first-open and activation funnel.
- `feed-experiment-report.csv`: Holdout, ranking-quality, diversity, integrity, and latency comparison.
- `launch-readiness.md`: Fail-closed approval and operating checklist.
- `GOOGLE_PLAY_GROWTH_PLAYBOOK.md`: Empirical Google Play Console growth guide, ASO strategy, CRO experiments, and Android Vitals thresholds.

## Attribution Model
- **Post-Attributed:** Direct clicks on a specific link (via UTM).
- **Platform-Attributed:** Uplift in traffic/installs from a specific platform during the post's active window (e.g., via referrers or promo codes).
- **Unattributed Uplift:** Overall increase in organic traffic/installs compared to the baseline, not directly linked to a specific post or platform.

## Tracking & Delivery IDs
- **Delivery ID Format:** `{YYMM}_d{day}_{platform}_{format}_{language}_{creative}` (e.g., `2609_d01_ig_reel_en_manifesto`)
- **Platform Shortcodes:** `ig` (Instagram), `threads` (Threads), `x` (X), `pin` (Pinterest), `fb` (Facebook)

## UTM Contract
- `utm_source`: `{platform}`
- `utm_medium`: `organic_social`
- `utm_campaign`: `writon_growth_2026_09`
- `utm_content`: `{delivery_id}`
- **Link Format:** `https://writon.cc/go/{delivery_id}`

## Privacy Rules
- **No PII in tracking:** Never include user IDs, names, or any personally identifiable information in UTM parameters or delivery IDs.

## Human-content gate

`human-content-allowlist.csv` is authoritative for excerpts, poems, quotations, and author spotlights. A planning-calendar status does not override an empty or incomplete allowlist. Incomplete or disputed records are replaced with approved evergreen brand content.

## Content State Machine
Content moves through these statuses:
`idea` &rarr; `sourced` &rarr; `rights_verified` &rarr; `copy_ready` &rarr; `localized` &rarr; `designed` &rarr; `QA_passed` &rarr; `scheduled` &rarr; `published` &rarr; `measured`

## Weekly Production Cycle Summary
- **Monday-Tuesday:** Idea generation, sourcing, rights verification.
- **Wednesday:** Copywriting and localization.
- **Thursday:** Design and asset creation.
- **Friday:** QA and scheduling.
- **Weekend:** Monitoring, moderation, and metrics review.
