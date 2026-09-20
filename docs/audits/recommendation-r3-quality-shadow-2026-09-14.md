# Recommendation R3 Quality Shadow — Staging and Production Evidence

**Date:** 2026-09-14  
**Environment:** dedicated staging plus production shadow-only collection  
**Visible production impact:** none; v1 ordering and public contracts are unchanged

## Outcome

R3's engineering, hosted-staging validation, and production shadow launch are complete. WritOn still returns the current visible `writon-feed-v1-shadow` order and unchanged `/api/v1/feed` payload. Eligible signed-in sessions additionally persist a private `writon-feed-r3-shadow-v1` comparison for later outcome analysis.

R3 is not approved for visible production ranking. Production is collecting private comparisons, but the real-traffic gate cannot be closed until representative non-test sessions establish language coverage, feed availability, and author/category concentration outcomes.

On 2026-09-14, a final isolation audit found that the first staging implementation reused human-only quality and exposure inputs in the visible v1 scorer. The tiny staging fixture happened to preserve its order, but code-level parity was not guaranteed for representative traffic. The corrected implementation keeps the original v1 evidence and repetition penalty intact and supplies separate human-only counters exclusively to `writon-feed-r3-shadow-v1`. That correction now runs in both staging and production shadow collection.

## Ranking safeguards

- Quality is decay-free and computed only from distinct human-reader completions and bookmarks; recent-exposure penalties likewise ignore non-human accounts.
- Human-only counters are private R3 inputs. They do not replace the legacy evidence or repetition penalty consumed by the visible v1 scorer.
- Evidence is compared within canonical content-form cohorts rather than comparing poetry dwell with essays.
- Fewer than five human readers leaves a story exactly neutral at `0.5`.
- Mature ratios use cohort priors and Bayesian shrinkage; malformed, negative, or impossible counters are bounded safely.
- Freshness remains a separate capped contribution and does not inflate the quality measure.
- Existing pool composition, pagination snapshots, diversity rules, holdout assignment, endpoints, response fields, aliases, and fallbacks remain intact.

## Data boundary

Migration `20260914_feed_quality_shadow.sql` adds one private table. It has nine expected columns, eight validated constraints, four indexes, row-level security, revoked `anon`/`authenticated` privileges, and deletion cascades from feed sessions, profiles, and stories. No story text or raw reading trail is stored.

Migration `20260914_reader_feed_session_profile_fk.sql` repairs environments whose feed-session table predated its profile foreign key. It clears only identifiers whose profiles no longer exist and adds the intended validated `ON DELETE CASCADE` relationship. Production had four such orphan identifiers; verification after migration found zero.

The guarded staging runner is locked to Supabase ref `xrfnebvkazewqramkpri` and the staging-only Secret Manager entry. Apply-and-verify and independent verify-only checks both passed.

## Hosted proof

- Corrected Cloud Build `34a2a887-56de-406c-a85d-ca34be09ceda` succeeded from the isolated overlay context.
- The overlay used exact R2 staging digest `sha256:7c66b9aad97b93e14b896e9b048121236891e89baa78393fc3e3fdb8d61b0886` and copied only the two ranking services plus the new quality normalizer.
- Resulting immutable digest: `sha256:3c41759430f9b088d111d9c80fd71b1a27c0c693ab0526391b52e0be097c6d02`.
- Final revision `writon-app-api-staging-r3shadow3` first served zero traffic and passed database health, public posts, app-version, guest-feed, environment-safety, authenticated shadow, cleanup, and ERROR-log checks.
- The tagged R3 guest feed and then-current R2 staging feed each returned the same three story IDs in the same language with the same `writon-feed-v1-guest_base` public ranking version.
- A disposable eligible Firebase reader completed two staging stories and received visible `writon-feed-v1-shadow`. The same feed session stored one matching private R3 row at neutral `0.5` with model `writon-feed-r3-shadow-v1`.
- Deleting that account through the staging API returned profile, history, mutation, session, and shadow-row counts to zero.
- After these gates, corrected R3 received 100% of dedicated staging traffic. Earlier R3 and R2 revisions remain available as rollback points.
- Post-promotion health returned HTTP 200 with the database connected, and revision ERROR logs remained empty.

## Production shadow proof

- Cloud Build `69262d1c-427e-4522-82a3-869f5fc5003f` produced immutable digest `sha256:1e4a5dd769ebf9c3ce88ff47f3db5f5d1f43d4bdf82110a19065f7efc5c835a5` from an overlay of the exact preceding production image.
- Revision `writon-app-api-r3shadow` initially served zero traffic. Health/database, top public posts, 20-item guest feed, and tagged ERROR-log checks passed.
- An eligible disposable Firebase reader received `writon-feed-v1-shadow`; the feed transaction stored 80 visible rows and 80 private `writon-feed-r3-shadow-v1` rows. All quality values stayed neutral at `0.5` for the small sample.
- Account deletion then returned profile, reading-history, feed-session, and shadow-row counts to zero.
- The revision passed a 5% production canary with HTTP 200 health/feed traffic and no ERROR-or-higher logs, then advanced to 100% shadow collection. The prior production revision remains available for rollback.
- Final public smoke checks returned database-connected health, five public posts, and 20 guest feed items under unchanged `writon-feed-v1-guest_base` ranking.

## Verification

- Focused quality/ranking tests cover zero and small samples, cohort isolation, malformed counters, human-reader-only evidence, private schema, pool fill, language coverage, author/category diversity, and holdout preservation.
- The previously hosted implementation passed 365/365 tests across 36 files after staging promotion.
- The final backend state, including the feed-session deletion-integrity migration, guarded production checks, and aggregate observation report, passes 370/370 tests across 36 files.
- Android 2.0.70 (169), which removes the repeated preference-sync popup, passes 215/215 release JVM tests, release lint, and debug instrumentation-source compilation. The installed Redmi build was opened through Home, story, and back navigation twice without the popup recurring or a fatal crash.
- Repeatable commands are available for guarded staging migration/API checks and exact-production readiness, migration verification, and authenticated canary proof in `server/package.json`.

## Remaining R3 gate

1. Collect representative human shadow sessions before any visible-ranking rollout. Compare empty-feed rate, language coverage, author and category concentration, new-writer exposure, second-story completion, and D7 qualified return against the recorded visible v1 order and stable holdout.
2. Keep R4 and any visible R3 weight change held until those outcomes pass. Do not advance on clicks alone.

## Observation baseline

The read-only `report:production:feed-quality-shadow` command now produces aggregate structural evidence from server-authoritative feed sessions, exposures, private shadow ranks, posts, and human-profile classification. It outputs no user, story, or author identifiers. Its first seven-day snapshot at `2026-09-14T15:44:36.571Z` found zero retained non-test human shadow sessions after the disposable verification account was deleted. This is a valid measured zero, not evidence of parity or improvement; the gate therefore remains `awaiting_non_test_sessions` and R4 remains held.
