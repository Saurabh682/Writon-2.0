# Notification Contract v2 Proposal

Status: **implemented and verified locally; not deployed**  
Production impact: **none**  
Approval received: additive contract work is complete locally. Hosted staging and production remain unchanged.

## Goal

Complete Engagement Roadmap Phases 5 and 6 without breaking the notification inbox or preference controls used by released Android clients.

## Compatibility decision

Keep the existing endpoints and response envelope:

- `GET /api/v1/me/notifications`
- `PATCH /api/v1/me/notifications/:id/read`
- `GET /api/v1/me/notification-preferences`
- `PUT /api/v1/me/notification-preferences`

Keep the four released preference fields:

- `interactionsEnabled`
- `followsEnabled`
- `editorialEnabled`
- `publishingEnabled`

Add optional granular fields to the existing preference endpoint:

| Field | Legacy fallback |
|---|---|
| `firstApplauseEnabled` | `interactionsEnabled` |
| `commentsRepliesEnabled` | `interactionsEnabled` |
| `newFollowersEnabled` | `followsEnabled` |
| `followedWriterPublishedEnabled` | `publishingEnabled` |
| `readingNudgesEnabled` | `editorialEnabled` |
| `draftNudgesEnabled` | `editorialEnabled` |
| `weeklyPromptEnabled` | `editorialEnabled` |
| `dailyDigestEnabled` | `editorialEnabled` |

The granular database values remain nullable. A null means “inherit the legacy parent,” so an older client updating a broad flag continues to control every child that the reader has not explicitly overridden. A new client may update one granular field without rewriting unrelated preferences.

## Notification kinds

New events use these canonical values:

- `first_applause`
- `comment`
- `reply`
- `new_follower`
- `followed_writer_published`
- `reading_nudge`
- `draft_nudge`
- `weekly_prompt_live`
- `daily_digest`

Compatibility rules:

- Existing `applaud`, `follow`, and `bookmark` rows remain readable and are not rewritten.
- The inbox filter accepts both legacy and canonical values.
- No new bookmark-received notification is created; bookmarks remain private.
- Released Android clients already render unknown kinds as a generic reminder, so canonical kinds do not crash or block the old inbox.
- The updated Android client maps both old aliases and canonical kinds to the same branded presentation.

## Durable deduplication

Add nullable `notifications.deduplication_key` and a partial unique index for non-null values. The key is derived from the logical event, not a delivery attempt:

| Event | Deduplication key |
|---|---|
| First genuine applause | `first_applause:{postId}` |
| Comment | `comment:{commentId}` |
| Reply | `reply:{commentId}` |
| New follower | `new_follower:{recipientId}:{actorId}` |
| Followed writer published | `followed_writer_published:{recipientId}:{authorId}:{localDate}` |
| Reading nudge | `reading_nudge:{recipientId}:{eligibilityWindow}` |
| Draft nudge | `draft_nudge:{recipientId}:{draftId}:{eligibilityWindow}` |
| Weekly prompt | `weekly_prompt_live:{recipientId}:{promptId}` |
| Daily digest | `daily_digest:{recipientId}:{localDate}` |

Notification creation uses `INSERT ... ON CONFLICT DO NOTHING`. The existing delivery outbox keeps its unique `notification_id`, so retries cannot create a second visible notification or a second delivery job.

## Followed-writer publication flow

1. The publication transaction records one durable `publication_notification_event` only when a verified-human story transitions from unpublished to public/published.
2. The transaction commits without calling FCM.
3. A bounded worker claims the event and selects active human followers whose effective `followedWriterPublishedEnabled` value is true.
4. For each recipient, the worker creates or updates one notification for that author and recipient's local date. Multiple publications become one batched notification.
5. Notification rows enqueue the existing delivery outbox.
6. The existing delivery worker sends after commit, retains retry/backoff behavior, and revokes invalid tokens.

The event table is append-only and uniquely keyed by post ID. Worker retries are safe. Unknown, bot, system, test, and administrative actors or stories never enter the fan-out.

Timezone is stored as an optional IANA name on notification preferences, defaulting to `Asia/Kolkata` until the Android client supplies the device timezone. Invalid timezone values are rejected. This makes the same-author/day boundary deterministic without introducing a new endpoint.

## Staged rollout

1. Apply additive migration to the isolated Supabase staging project only.
2. Deploy the server with legacy behavior active and new event production disabled by flags.
3. Run contract tests proving old request/response bodies still work.
4. Deploy the Android mapping and granular settings to Firebase App Distribution/Internal Testing.
5. Enable first-applause canonical storage and publication fan-out for test identities only.
6. Verify deduplication, preference isolation, timezones, retries, invalid-token cleanup, and direct-versus-topic exclusivity.
7. Canary signed-in users at 10%, then 25%, 50%, and 100% only while delivery and crash metrics remain healthy.

## Rollback

- Disable canonical event production and publication fan-out using server flags.
- Continue serving the four legacy fields and legacy inbox rows.
- Leave additive nullable columns and event rows in place; no destructive down-migration is needed.
- Stop workers before any rollback deployment. Existing reading, publishing, inbox, and guest topic behavior remain available.

## Required verification

- Released-client request bodies pass unchanged.
- Released-client response parsing passes with additive fields and unknown canonical kinds.
- Concurrent first applauses produce one notification and one outbox row.
- Re-applause does not create another first-applause event.
- Duplicate publication-worker runs produce one recipient/author/day notification.
- Same-author batching passes across timezone boundaries.
- Every granular toggle affects only its type; null values inherit their broad parent.
- Bot, system, unknown, test, and administrative activity creates no user-facing event.
- Signed-in devices receive direct notifications only; guests receive topic broadcasts only.
- No FCM call occurs inside a database transaction.

## Approval boundary

Approval authorizes only an additive extension of the existing notification contracts and staging migrations. It does not authorize changing or removing existing endpoints, applying migrations to production, deploying a Play release, enabling production fan-out, or sending notifications to production users.
