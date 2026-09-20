# Recommendation R0 Baseline and Invariant Audit

**Date:** 2026-09-13  
**Scope:** Read-only review of Android, `/api/v1/feed`, ranking, rollout, and the available GA4 evidence.  
**Production effect:** None. No endpoint, database, flag, cloud service, or production ranking was changed.

## Decision

R0 is **started but not complete**. WritOn already has a coherent deterministic feed pipeline and stable session snapshots, but the available analytics export cannot measure the recommendation outcomes required for a rollout decision. Behavior rollout should remain at `0` until production-like data separates real readers from developer/synthetic traffic and the invariants below are verified.

The Android **Help me find a read** control is not part of `/api/v1/feed`. It is an explicit chooser over the unchanged popular-post response and is measured separately.

## Current pipeline, as implemented

| Stage | Current implementation | Evidence |
|---|---|---|
| Source | Up to 300 recent public, published stories | `server/src/services/feed-service.js` `loadFeedCandidates` |
| Eligibility filter | `provenance = human_verified`, human author, and no story completed at least 95% by this reader in the last 14 days | `loadFeedCandidates` |
| Hydration | Explicit interests; topic, author, and language affinities; freshness; quality; recent exposure; quick-exit and repetition penalties; bounded guest vectors | `toCandidate`, `loadFeedCandidates` |
| Scoring | Base/control/behavior/guest-behavior/shadow modes with version `writon-feed-v1` | `server/src/services/feed-ranking.js` |
| Selection | Stable 80-item session snapshot; 7 preferred, 2 affinity, 1 exploration positions per ten where inventory permits; maximum two stories per author per 20 and fewer than three same-category stories in the previous nine positions | `composeFeed` |
| Delivery | Existing `/api/v1/feed`, cursor replay, private no-store response; unchanged legacy fallback remains in Android | `server/src/routes/feed.js`, Android repository |
| Side effects | Feed sessions/exposures plus validated, idempotent signed-in impression/open/quick-exit/share ingestion | `createFeedSession`, `recordBehaviorEvents` |

## Exact current scoring modes

- **Base/shadow visible ordering:** `0.50 explicit interest + 0.25 human quality + 0.25 freshness - penalties`.
- **Behavior/guest behavior:** `0.35 topic affinity + 0.30 deep-read fit + 0.15 author affinity + 0.10 freshness + 0.10 human quality - penalties`.
- **Control:** freshness minus penalties.
- **Shadow:** shows the base score while storing the behavior score for comparison.
- A deterministic seed jitter only breaks ties; it is not an engagement signal.

## Available 28-day baseline

The supplied GA4 export covers **2026-08-08 through 2026-09-04**, before Android 2.0.68 and before the finder events existed.

| Measure | Available value | Interpretation limit |
|---|---:|---|
| Active users | 129 | Small sample; test accounts visibly affect totals |
| New users | 124 | Does not identify who received a personalized feed |
| Returning users | 19 | About 15% of active users; not a feed-treatment result |
| Average engagement per user | 367 seconds | One or two highly active users can materially move it |
| Story-reader users | 7 | Too small for form/language conclusions |
| Story-reader views | 47 | Multiple views by the same readers |
| Activation users | 4 | Confirms the wider onboarding problem, not ranking quality |
| App removals | 40 | Same-window ratio is directional, not a user-level uninstall cohort |

The export has no trustworthy baseline for feed-session exposure, second-story completion, completion by form/language, fallback rate, unique-author exposure, new-writer exposure, empty-feed rate, or recommendation-driven D7 return.

## Findings that must be resolved before R3–R7

1. **Human-quality contamination is not fully excluded.** The candidate query restricts story authors to human accounts, and behavior-event ingestion restricts readers to human accounts. However, the `human_quality` CTE joins reading-history and bookmark owners without requiring `reader.account_type = 'human'`. Synthetic activity could influence quality if it exists in those tables. Correct and regression-test this internal ranking issue before behavioral rollout.
2. **Deep-read fit is not yet a prediction.** It currently resolves to the strongest topic/author affinity available; it does not normalize active reading by content form. Do not describe it as predicted completion.
3. **The documented freshness decay is inaccurate.** Code uses `exp(-ageDays / 30)`, whose half-life is about 20.8 days. It is not a 30-day half-life. Either document it as a 30-day e-folding time or change it deliberately in a later shadow experiment.
4. **Affinity rebuilding is on the feed request path.** `refreshReaderAffinities` runs synchronously before a new signed-in session is composed. Production p95 evidence is required; if material, move refresh to a bounded update path without weakening consistency.
5. **Content-form metadata is absent.** Category is currently the topic identity. Poetry, flash, essay, review, and other forms cannot yet be compared within trustworthy cohorts.
6. **The GA4 sample mixes generations and likely tests.** The export spans old app versions and shows obvious single-user distortions. It cannot prove a recommendation improvement.
7. **Current rollout state must be reverified before any canary.** Deployment evidence records `FEED_BEHAVIOR_ROLLOUT_PERCENT=0`; Android personalization is independently Remote-Config gated. Do not infer every live flag from code defaults.

## Missing measurement contract

Before changing ranking, produce a daily, privacy-safe aggregate by ranking version and treatment containing:

- feed sessions and unique human readers;
- first-page item count, empty/sparse response, fallback pool count, and API p50/p95;
- eligible impressions, opens, quick exits, 70% reads, 95% completions, and bookmarks;
- second distinct story open and completion within the same day/session window;
- unique authors exposed, first-time authors exposed, and maximum author/category concentration;
- language and future content-form distribution;
- D1/D7 qualified return, with exact denominator;
- crash/ANR and feed 5xx counts;
- excluded synthetic/developer event counts reported separately, never blended into outcomes.

Do not send titles, story text, author names, raw search text, push tokens, or fine-grained scroll trails to analytics.

## R0 completion checklist

- [ ] Re-export at least four equivalent weeks after internal/test traffic is labelled or excluded.
- [ ] Verify production and holdout flag values read-only.
- [ ] Produce the aggregate measurement contract above from server-authoritative rows.
- [ ] Verify no duplicate/ineligible story in a feed session.
- [ ] Verify language inventory and exposure denominators separately for English, Hindi, Marathi, Bengali, and `und`.
- [ ] Correct or explicitly accept the three code/document gaps: quality quarantine, deep-read naming, and freshness definition.
- [ ] Record baseline p50/p95 and fallback/empty rates before any non-zero behavior rollout.

## Next safe implementation step

R1 began locally on 2026-09-13 with additive, editorially reviewable metadata definitions for `contentForm`, measured word count, and dominant script. The existing normalized language and provenance fields remain authoritative. Missing and mixed-script values remain safe and old API clients remain unchanged. The schema and backfill are not yet applied to hosted staging or production; R1 remains gated on staging coverage and editorial accuracy review. Predictive scoring, ADK, embeddings, and collaborative filtering remain out of scope until R0 and R1 evidence is sufficient.
