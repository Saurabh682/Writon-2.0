# WritOn Bot Remediation Handoff for Antigravity

Last validated: 2026-08-29

This document is an implementation brief. The audit that produced it was read-only: no bot source, production bot data, routes, schedules, or settings were changed.

## Verdict

Do not enable public or autonomous bot mutations until work packages 1-5 and their release gates pass. The current design can publish and manipulate engagement without caller authentication, does not distinguish bot activity in user-facing data, and does not make publication retries idempotent.

The current queue claim and Gemini timeout implementations are useful foundations, but they are not yet proven by the required integration tests.

## Work package 1 — Close every mutation surface

### Required implementation

1. Add a single `requireBotOperator` policy layer and use it on every mutating `/api/v1/spark/*` route and every MCP `tools/call` request.
2. Keep public access only for explicitly approved read operations such as the public feed. Memories, ledger internals, settings, personas with private prompts, and queue state are operator-only.
3. For Firebase callers, require a server-controlled administrator claim or an allowlisted operator record. A valid Firebase account alone is not authorization. Never authorize using user-editable metadata.
4. For automation callers, require a dedicated secret or signed service token. In production, startup must fail if bot mutations are enabled without an operator credential.
5. Fix `/api/v1/spark/ingest`: when `BOT_INGEST_SECRET` is configured, a missing, empty, or wrong `x-bot-secret` must all return `401` without touching the database.
6. Remove the unauthenticated development-admin bypass, or gate it behind an explicit local-only flag plus loopback-host check. `NODE_ENV` currently defaults to development, so production safety must not depend on one environment variable being set correctly.
7. Add scopes: `bots:read`, `bots:operate`, and `bots:admin`. Settings, seeding, ledger mutation, memory mutation, pulse execution, and queue processing require `bots:admin`; content/social operations require `bots:operate`.
8. Protect MCP HTTP and SSE endpoints with the same policy. Publish correct OAuth protected-resource metadata, define a real authorization server, restrict CORS to configured origins, and reject unauthenticated SSE connections before opening a stream.

### Route inventory that must be protected

- Spark writes: `/api/v1/spark/publish`, `/comment`, `/applaud`, `/ingest`, `/pulse`, `/swarm/applaud`, `/swarm/comment`, `/bots/:id/memories` POST, `/reflect`, `/ledger/entries`, `/ledger/ideas`, and `/ledger/avoid`.
- Spark sensitive reads: bot memories, editorial briefing, editorial ledger, prompt template, automation script, and full persona internals.
- Admin routes: every `/api/v1/admin/bots/*` route.
- MCP transports: `/mcp`, `/api/v1/mcp`, `/mcp/messages`, `/mcp/sse`, and `/api/v1/mcp/sse` for any tool discovery or invocation beyond deliberately public metadata.

### Acceptance tests

- Missing, expired, malformed, ordinary-user, operator, and administrator credentials for every route class.
- Missing/wrong/correct bot secret, including an empty header.
- MCP initialize may be public only if intentionally approved; `tools/list` must expose only tools allowed by the caller's scopes, and every `tools/call` must re-check authorization server-side.
- Production configuration with bot mutations enabled but no credential must fail at startup.

## Work package 2 — Add abuse controls and strict contracts

### Required implementation

1. Validate the JSON-RPC envelope and validate tool arguments against the same schemas used for tool discovery. Tool schemas are currently descriptive only.
2. Add payload limits: title, summary, content, comment, array counts, JSON depth, and total request bytes.
3. Clamp swarm/comment counts and schedule delays server-side. Do not trust MCP schema enums or client UI limits.
4. Add per-principal and global rate limits for publishing, comments, interactions, swarms, reflection, ledger writes, and LLM-backed actions.
5. Add daily durable quotas for posts, comments, applauds, scheduled actions, LLM calls, and estimated tokens/cost. Quotas must be checked transactionally and survive server restart.
6. Add a concurrency semaphore for provider calls and fan-out operations. A single request must not schedule unbounded work.
7. Return `413` for oversized payloads, `422` for semantic validation failures, `429` with `Retry-After` for rate/quota rejection, and stable `4xx/5xx` error codes without internal messages.

### Acceptance tests

- Boundary values and one-over-limit tests for every field and array.
- Parallel requests proving quotas cannot be exceeded by a race.
- Rate-limit isolation between principals and a global emergency ceiling.
- Malformed JSON-RPC, unknown tool, disallowed tool, excessive depth, and invalid arguments.

## Work package 3 — Idempotency and durable background work

### Required migration

Use the project's imperative migration workflow. Do not add runtime DDL.

- Add a mutation ledger with `principal_id`, `operation`, `idempotency_key uuid`, request hash, status, response reference, timestamps, and a unique constraint on `(principal_id, operation, idempotency_key)`.
- Add `dedupe_key` to delayed actions. Create a partial unique index for live states (`pending`, `processing`) so the same logical reaction cannot be scheduled twice while active.
- Add an outbox for post-publication memory, reaction, and ledger work. The post transaction inserts the post and outbox rows together; workers claim with `FOR UPDATE SKIP LOCKED`, use a visibility/lease timeout, bounded exponential backoff, and a terminal failed/dead-letter state.
- Keep bot tables RLS-enabled, revoke `PUBLIC`, `anon`, and `authenticated` access unless an explicit Data API use case exists, and keep the worker on the server-only database role.

### Required behavior

1. Require an idempotency UUID on Spark and MCP mutation calls. Replaying the same request returns the original result; reusing a key with a different request hash returns `409`.
2. Posts, comments, ledger entries, memories, and delayed actions must have database-enforced uniqueness—not only in-memory deduplication.
3. Fix batch memory attribution: carry `botId` and summary explicitly or return `author_id` and summary from the story INSERT. A multi-author batch must store each memory under the matching writer.
4. Do not fire-and-forget `recordStoryMemory` or reactions after commit. Persist outbox work and make failure visible/retryable.
5. Keep the existing atomic queue claim, stale-row recovery, and three-attempt ceiling, but add backoff and operational dead-letter inspection.

### Acceptance tests

- Same-key replay, same-key/different-body conflict, concurrent same-key calls, response-loss retry, and process restart.
- Two real Postgres workers claim distinct rows; a crashed claim is reclaimed after lease expiry.
- Duplicate pulse/reaction/webhook calls create one live scheduled action.
- Multi-author batch memories retain the correct `bot_id`, title, summary, category, and post ID.

## Work package 4 — Make editorial governance real

### Required implementation

1. Load `getEditorialBriefing` inside one read-only repeatable-read transaction or replace the six serial reads with one composed query that uses one snapshot.
2. Before generating a story, reserve a planned ledger entry with an idempotency key and select the writer/category/backlog idea under concurrency control.
3. Feed the briefing into the generation policy: author cooldown, recent titles, anti-repetition patterns, seven-day genre balance, and selected backlog premise.
4. Apply a deterministic post-generation validator. It must reject banned phrases/title formulas and exact or normalized title duplicates even if the provider ignores the prompt.
5. Only after publication succeeds, mark the ledger entry executed and the selected backlog idea consumed in the same transaction. On permanent failure mark it deferred with a stable public reason and private diagnostics.
6. Fix daily quota semantics: count only bot-authored published posts, preserve a configured target of zero, and test day/time-zone boundaries.

### Acceptance tests

- The runner—not only admin/MCP—calls the briefing service.
- Concurrent pulses cannot reserve the same writer, idea, or publication slot.
- A provider response containing an active banned pattern is rejected before persistence.
- Genre/cooldown/backlog decisions and ledger transitions are deterministic in tests.

## Work package 5 — Moderation, provenance, and user disclosure

### Required migration and API contract

1. Add a durable actor classification such as `profiles.actor_type` with `human`, `bot`, and `service` values; default existing profiles to `human` and backfill bot profiles from `bot_configs`.
2. Add post provenance fields such as `content_origin`, generator/provider/model, generation timestamp, and operator/request ID. Do not store provider secrets or raw private prompts.
3. Treat comments, applauds, follows, notifications, and counters as bot-originated when their actor profile is a bot. Avoid duplicating a flag on every social table unless query performance proves it necessary.
4. Include `author.isBot` and safe content-origin data in feed, reader, profile, response, and notification contracts.
5. Add a visible “AI persona” or “Automated account” label in Android and web surfaces. It must not rely on a `bot_` ID prefix.
6. Route generated and externally supplied content through one enforced policy service. `validateContentSafety` currently has tests but no production caller; wire the policy at every persistence boundary.
7. Support `review_required`, `approved`, `rejected`, and `published` states for bot content. Keep autonomous direct publication behind a feature flag until moderation acceptance tests pass.

### Acceptance tests

- Every human-facing surface labels bot actors consistently and accessibly.
- Raw Spark/MCP content cannot bypass moderation by selecting a different route.
- Rejected content creates no post, comments, notifications, counters, memory, ledger execution, or reaction work.
- Provenance survives feed, story-detail, export, and audit-log reads without exposing secrets.

## Work package 6 — Secrets, scheduling, and architecture

1. Stop storing Gemini keys in `bot_global_settings`. Read secrets from deployment configuration or a secret manager and expose only `providerConfigured: true/false` plus last rotation metadata.
2. Retain the 15-second provider timeout, then add bounded retry with jitter only for retryable failures. Never retry policy rejection or invalid content. Add a circuit breaker and per-run cost telemetry.
3. Replace the process-local scheduler with a durable invoker. Supabase Cron can schedule an authenticated HTTP worker call and records job history; Supabase Queues/PGMQ can provide durable message delivery. Confirm the extensions available on the target project before choosing either.
4. Do not hold a database transaction while calling the LLM or waiting for work on another pool connection. Use a short reservation transaction, perform external work, then use a short finalization transaction.
5. Remove `ensureBotTables` DDL after equivalent reviewed migrations exist. Startup should check a schema version and fail with a clear operator error instead of mutating production schema.
6. Split the current modules into route/transport, authorization/policy, orchestration, repositories, provider, queue/outbox, editorial governance, and audit/telemetry boundaries. Preserve external contracts until compatibility tests pass.

## Required test process

1. Unit tests: validators, policy decisions, idempotency hashing, error mapping, quota calculations, cooldown and genre selection, provider retry classification.
2. Fastify contract tests: every route and MCP tool with the complete auth/role/scope matrix and stable error shapes.
3. Real migrated-Postgres integration tests: transactions, uniqueness, counters, RLS/grants, outbox, two-worker claims, lease recovery, dead letters, and ledger snapshots. Permissive SQL-string mocks are insufficient for these guarantees.
4. Provider tests: timeout, cancellation, 429, 5xx, malformed JSON, empty candidates, safety rejection, fallback rules, circuit breaker, and cost ceiling.
5. Android/web UI tests: bot badges in feed/reader/profile/responses/notifications and no disclosure regression in light, sepia, and dark themes.
6. Abuse tests: oversized payloads, burst traffic, concurrent quota races, repeated idempotency keys, tool allowlist bypass, SSE connection exhaustion, and unbounded fan-out attempts.
7. Production smoke tests must be read-only. Run mutations only in a disposable test project populated through the same migrations.

## Safe rollout order

1. Disable public bot mutations and set the engine kill switch off.
2. Land authentication, authorization, CORS, strict validation, rate limits, and tests.
3. Land idempotency/outbox/queue migrations and backfill bot actor classification.
4. Land editorial governance, moderation, and provenance behind flags.
5. Move scheduling to a durable invoker and run shadow/read-only cycles.
6. Enable one operator and one writer persona with tiny quotas; observe errors, costs, duplicates, labels, queue depth, and moderation decisions.
7. Expand only after seven consecutive days without unauthorized calls, duplicate mutations, unlabeled bot content, stranded work, or quota overruns.

## Release gate

Antigravity should not mark this complete until all critical register items are resolved with automated evidence, the full server/application suite remains green, database advisors have no new security errors, and a reviewer confirms that no public mutation or alternate MCP transport bypasses the policy layer.

Current platform references: [Supabase Cron](https://supabase.com/docs/guides/cron) and [Supabase Queues](https://supabase.com/docs/guides/queues). Check the project's installed extensions and current Supabase changelog before implementing the scheduler/queue choice.
