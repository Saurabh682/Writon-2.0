# Personalised Reader Feed: Operations and Rollout

This document is the production runbook for ranking version `writon-feed-v1`. The feature is deliberately reversible: Home can return to the language-and-interest feed without changing search, category, following, popular, or chronological interfaces.

## Eligibility boundary

Every Home-feed candidate must satisfy all of the following:

- The story is public and published.
- `posts.provenance = human_verified`.
- The author has `profiles.account_type = human`.
- The story has an explicit language code. `und` remains eligible only as inventory fallback and never counts toward the preferred-language quota.

Public search, category results, tag counts, and writer discovery apply the same human-only boundary. A direct historical story link may remain resolvable for compatibility, but ineligible stories cannot be recommended.

`brand`, `synthetic`, and `unknown` are never admitted by ranking or diversity fallback. Account type and provenance cannot be changed through public APIs.

## Ranking contract

Candidate allocation happens before ranking. With sufficient inventory, a 20-item page contains 14 app-language stories, four demonstrated cross-language/adjacent-interest stories, and two exploration stories. Sparse inventory is filled with demonstrated cross-language interest and then globally strong verified-human stories; stories are never duplicated to meet a quota.

Within a pool:

```text
score =
    0.35 * topic_affinity
  + 0.30 * predicted_deep_read_fit
  + 0.15 * author_affinity
  + 0.10 * freshness
  + 0.10 * verified_human_quality
  - repetition_penalties
  - quick_exit_penalties
```

Signal weights are: open `+0.5`, 30 seconds `+2`, 70% progress `+4`, completion `+5`, bookmark `+5`, later-day reread `+6`, comment `+3`, follow `+4`, applause `+1`, share `+3`, quick exit `-2`, and each three unopened impressions `-0.25`. Scores are clamped and decay with a 30-day half-life. A single action is counted once per reader/story unless the definition explicitly requires another session or day.

The first 20 permit at most two stories from one author and at most three stories from one category in any consecutive ten positions. Completed stories are suppressed for 14 days. Feed sessions store a stable snapshot so new actions affect the next session, not an open page sequence.

## Reader data

Signed-in events and aggregates are account-based and sync across devices. Client-written events are limited to impression, open, quick exit, and share; reading progress, bookmarks, applause, comments, and follows remain server-authoritative. Idempotency keys, exposure validation, plausible-duration caps, profile classification, and rate limits prevent duplicate or synthetic activity from affecting ranking.

Guests learn only in Android application storage. Requests contain the app language and small bounded topic/author/language vectors. They contain no device fingerprint, account-like identifier, or raw reading history. The server may keep a short-lived anonymous feed-session snapshot for stable pagination, but does not build a durable guest profile. Clearing app data or reinstalling resets guest learning.

Retention:

- Raw signed-in behavior events: 90 days.
- Feed sessions and exposure rows: 30 days.
- Aggregated signed-in affinity: until account deletion.
- Guest affinity: Android application-storage lifetime.
- Account deletion cascades through feed sessions, events, exposure rows, and aggregate affinity.

## Deployment order

1. Back up the database and apply `server/migrations/20260830_personalized_reader_feed.sql`.
2. Run the provenance audit below. Do not enable the campaign while required-language inventory is insufficient.
3. Deploy the server with behavior rollout at zero.
4. Deploy the current Android candidate after release-signing, Google sign-in, and production-equivalent smoke checks.
5. Keep the Android Remote Config key `personalized_home_feed_enabled=false` as well as `FEED_PERSONALIZATION_ENABLED=false`, `FEED_BEHAVIOR_ROLLOUT_PERCENT=0`, `FEED_SHADOW_RANKING_ENABLED=true`, and `FEED_GUEST_LEARNING_ENABLED=false` for Days 1–14.
6. On Days 15–21, set personalization on and behavior rollout to `10` only after the gates pass.
7. On Days 22–30, increase behavior rollout to `50` and enable guest learning only after signed-in stability is established.
8. Keep `FEED_HOLDOUT_PERCENT=10` for the whole experiment. Assignment is deterministic.

Server rollout changes require a server restart. The Android Home-feed switch is independently reversible through Firebase Remote Config and defaults to off inside the app. Never jump to 100% during the campaign.

## Provenance and language audit

The migration classifies registered bot authors as `editorial_bot` and their stories as `synthetic`. Auth-linked, non-bot accounts can be classified as human. Ambiguous records remain `unknown`. It does not infer Hindi versus Marathi from Devanagari text; those records remain `und` until a moderator confirms them.

Before launch, export all `unknown` accounts, all `unknown`/`brand` stories, and all `und` stories. For each record, verify author identity, bot-registry membership, autonomous editorial sources, source text, language, and rights. Record the moderator and time. Never infer human provenance from a human-looking pen name.

Useful inventory gate:

```sql
select post.language_code, count(*)
from public.posts post
join public.profiles author on author.id = post.author_id
where post.status = 'published'
  and post.is_public = true
  and post.provenance = 'human_verified'
  and author.account_type = 'human'
group by post.language_code
order by post.language_code;
```

## Rollout gates

For each treatment and the invisible chronological/diversified control, record p50/p95 feed latency, feed sessions, engaged seconds, completion, bookmarks per 100 opens, unique authors, language distribution, API errors, crashes, and duplicates. Compare over equivalent seven-day windows.

Advance only when:

- Feed p95 is under 400 ms and API/crash rates do not rise.
- No ineligible or duplicate item is observed.
- Engaged reading time does not decline during the 10% stage.
- Unique-author exposure stays within 5% of control.
- Bengali and Marathi exposure does not materially decline.

Full rollout additionally requires at least +15% engaged reading time, +10% completion, and +10% bookmarks per 100 opens, plus a completed provenance and deletion audit. Small samples are directional, not proof; report denominators and confidence intervals where possible.

## Rollback

Set Android Remote Config `personalized_home_feed_enabled=false` for immediate client-side rollback. Also set `FEED_BEHAVIOR_ROLLOUT_PERCENT=0` or `FEED_PERSONALIZATION_ENABLED=false` and restart the server when server-side ranking must be disabled. Home automatically retains or reloads the standard feed when personalised delivery fails or returns a sparse first page. If feed latency itself regresses, keep Home on cached language-and-interest results while preserving reading and account functions.

For a provenance dispute, immediately change the story away from `human_verified`, pause related campaign deliveries, preserve the audit trail, and restore only after review. For language errors, set the story to `und` until reviewed. Do not delete evidence needed to diagnose ranking or abuse.

## Known limitations

- Version 1 is deterministic heuristics, not machine learning.
- Topic identity is derived from the existing category taxonomy.
- Devanagari cannot be safely separated into Hindi and Marathi without author/moderator confirmation.
- Production p95 and outcome targets require live traffic; passing unit tests does not satisfy rollout gates.
- Campaign story continuation is acquisition metadata only. It does not create affinity unless the reader genuinely engages.
