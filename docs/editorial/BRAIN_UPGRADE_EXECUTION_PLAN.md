# WritOn Brain: Safe Upgrade Execution Plan

Prepared: 20 September 2026
Status: implementation proposal; not deployment approval or a claim that fixes are complete.
Audience: Antigravity implementing bounded changes; Codex reviewing contracts, evidence, and release readiness.

## 1. Objective and boundaries

Improve the existing story and multi-channel publishing system without replacing working behavior. Reliable research, context-appropriate writing, correct categorization, and dependable scheduled execution are the outcomes—not more agents or more gates.

Normal operation remains automatic:

Research → compose → automated validation → bounded revision/reselection → publish → verify and record.

No routine human pre-publication approval queue. If mandatory checks cannot complete, skip safely and report an actionable operational exception. Never manufacture evidence, bypass a safeguard to fill a slot, or report a post as published without platform-specific confirmation.

This document authorizes no production changes by itself. Initial implementation and verification are local/isolated. No live test posts, production migrations, schedule changes, or cloud deployment until the relevant release action is explicitly authorized.

Preserve:

- Working generators, platform clients, existing idempotency and reconciliation protections until replacements are verified.
- The current 48-hour global proposition-archetype cooldown and 48-hour same-channel insight cooldown. Changes require a separate product decision.
- Exact scheduled platform/account/surface delivery; no unsolicited fan-out. Keep Reddit paused and LinkedIn testing dry-run only.
- Existing human posts, user edits, schedules, credentials, and release artifacts.

Do not implement all findings as one rewrite. Do not introduce a new dependency or shared abstraction when existing code covers the need.

## 2. Evidence and work-item contract

The supplied review is an investigation backlog, not proof that every finding exists in the current checkout. Source files have continued changing.

For each issue, record:

1. Current commit and relevant uncommitted changes; exact file, function, and affected caller.
2. Evidence level: reproduced, source-confirmed, or unverified dependency.
3. A regression test importing the actual implementation; no copied bug logic inside tests.
4. Minimal fix, compatibility impact, and rollback action.
5. Test command and result, with mocked versus real-database versus remote evidence clearly separated.

Read applicable project instructions and relevant platform documentation before editing. Use graphify for code navigation. Review only relevant diffs; do not overwrite unrelated work. Keep a findings matrix with status open/fixed/verified/deferred and explicit reasons.

Start by inventorying story generation, release ingestion, weekly editorial, admin routes, CLIs, campaign jobs, syndication, schedulers, and platform publisher services. Include spark-runner and server startup registration. Verify paths instead of assuming the service/job names in earlier plans are correct.

## 3. Non-negotiable publishing contracts

### Identity and validation

- Persist a stable logical delivery identity using campaign/run or schedule-slot identity, platform, account, and surface. Manual deliveries receive an identity once, reused on retry.
- Keep content out of the delivery ID. Bind canonical text, ordered asset hashes, source/insight version, and destination separately. Reusing an ID with changed payload must be rejected.
- Canonicalize nested data correctly. Keep policy hashes separate from runtime history and content hashes. Missing authoritative hashes must block; no placeholder policy values.
- Require the complete registered gate set applicable to the channel and genre. Reject missing, duplicate, or unknown results. NOT_APPLICABLE requires trusted applicability logic. Mandatory insufficient evidence blocks publication.
- Revalidate the exact frozen payload before dispatch. Edits invalidate prior validation.

### Durable state and external calls

- Live publishing without the database fails closed. Test doubles are explicitly injected in isolated tests only.
- Validate configuration and candidate prerequisites before reserving. A missing credential should not poison an archetype.
- In a short database transaction, lock stable keys, check cooldowns/unresolved attempts, acquire ownership, and persist in-flight intent. Commit and release the connection before external calls.
- Locks must cover the global archetype and channel/insight consistently. Check active reservations across channels, not only prior publications. Use a consistent lock order.
- Track logical deliveries and attempts separately. A retry reuses delivery identity and increments attempt history; it does not evade uniqueness by minting a new delivery.
- Use explicit platform outcomes: confirmed publication, proven non-publication, and unknown outcome. A resolved promise, HTTP status alone, or success:false object is not publication proof.
- Record external IDs and verification evidence. Async acceptance is not confirmed publication. A database failure after remote success must remain unresolved, never become safely retryable.
- Lease expiry is not evidence of non-publication. Release expired reservations only when no unresolved external attempt exists. Define renewal, ownership/fencing checks, and guarded state transitions.
- Reconcile unknown outcomes automatically where supported. If non-publication cannot be established, retain the block and alert privately. Negative timeline search alone is not conclusive when permissions, pagination, or eventual consistency limit visibility.

### Dry-run

- No database writes, reservations, asset uploads, publication calls, notifications, or outbox events.
- Run pure checks and permitted read-only checks. Report unavailable checks as unverified, not passed.
- Never use force/retry options to bypass unresolved deliveries or pause directives.

## 4. Execution stages

### Stage A — Baseline and isolated verification infrastructure

Scope: current-code findings matrix, caller map, disposable PostgreSQL setup, targeted test baseline, and side-effect guards.

- Inspect test setup before execution; never inherit a production DATABASE_URL into integration tests.
- Apply actual migrations to a disposable PostgreSQL database. Test with independent connections and overlapping transactions—not a lock simulation or sequential commits.
- Capture baseline test failures separately from newly introduced failures.
- Audit actual database grants and exposed functions read-only before proposing security changes. Treat suspected credential exposure as urgent, but require appropriate authority for rotation or access changes.

Exit: reproducible baseline, isolated DB identity verified, network mutation mocks in place, and prioritized current findings. No claim that earlier stages passed without inspecting their artifacts.

### Stage B — Dispatch safety, recovery, and security boundaries

Scope: shared coordinator, reservation SQL, idempotency service, platform callers, outbox ownership, and reconcilers. Fix confirmed no-DB bypasses and false published outcomes first.

- Implement the contracts in section 3 and wire actual callers; optional coordinator injection must not permit live bypass.
- Align X dispatch identifiers with the real schema, support reply references, and implement safe retry transitions without primary-key collisions.
- Replace JSON publication history as the live authority with durable per-destination delivery records. Preserve legacy history for backfill/audit.
- Claim syndication deliveries before external calls. A unique published-log index is a secondary consistency check, not duplicate prevention.
- Add outbox renewal or safe claiming, non-overlap protection, bounded retry backoff, explicit enqueue errors, and dead-letter alerts. Prefer transactional story/outbox insertion where possible.
- Add per-platform reconciliation with attempt evidence and private operator alerts. Do not wait until a later sprint to implement recovery.
- Restrict internal table/function access to verified backend roles. Harden SECURITY DEFINER search paths and grants deliberately; test legitimate backend access and rejection of unprivileged access. No blanket changes across all public tables.

Acceptance:

- Missing DB/config results in zero remote publish calls.
- A callback returning success:false cannot yield published.
- Concurrent workers cannot claim conflicting global archetypes or the same delivery.
- Retry after timeout, worker crash, lease expiry, or remote-success/DB-failure does not duplicate publication.
- Confirmed non-publication permits a guarded retry with preserved identity and attempt history.
- Partial multi-destination success resumes only eligible unfinished destinations, never already-published ones.
- Dry-run through each real caller has zero mutations.

### Stage C — Reliable story generation, research, and scheduling

- Connect RSS parsing to dossier validation using fixtures from the real parser contract: canonical source URLs, timestamps, attribution, and explicit unknown fields.
- Verify factual claims against source evidence. Separate event date, source publication date, and retrieval time. Apply topic-specific freshness; no blanket 30-day rule.
- Add bounded fetch timeouts, status checks, response-size limits, and backoff. Treat retrieved text and comments as untrusted input, never as instructions.
- Replace critic substring/score overrides with a validated structured verdict. Explicit rejection cannot be overridden by a high score. An unavailable required critic yields a bounded retry or skip, not silent approval.
- Use a reachable, configured production critic; do not assume a developer's localhost is available in Cloud Run. Preserve cost/time budgets and avoid mandatory new model calls for deterministic checks.
- Repair release ingestion and weekly editorial contracts, legal state transitions, atomic idempotency, source linking, and revision hashes. Never publish placeholder drafts. Review whether these paths are actually active before retiring legacy modules.
- Make backlog claim completion atomic with story persistence where supported. Avoid open transactions during LLM generation.
- Respect posts_per_day_target = 0. Use one explicit schedule timezone and verify only intended schedulers start.
- Define restart/catch-up behavior. Recommend a configurable lateness bound, but do not silently introduce a 90-minute rule or change cadence without approval.

Acceptance:

- Real parser output passes into dossier checks with intact URLs and timestamps.
- Failed mandatory research/repetition/critic checks cannot publish.
- Release ingestion repeated concurrently creates one logical release with valid sources and transitions.
- Zero daily target publishes nothing; timezone boundaries and worker restarts are tested.
- Crashes do not reuse an already-published backlog item.

### Stage D — Editorial accuracy and presentation

- Supply real publication history to Instagram and other repetition checks; missing history is not an empty history. Persist canonical insight/archetype references.
- Share Unicode-aware lexical utilities where appropriate, while retaining calibrated per-format thresholds. Do not call lexical overlap semantic understanding.
- Fix demonstrated regex false positives/negatives, including URLs at sentence ends, percentage claims, and substring sensory matches. Keep subjective rules advisory or structured, not universal keyword mandates.
- Validate exact asset/slide mapping and adaptive progression, including legitimate two-slide demonstrations.
- Detect renderer overflow before publication; do not silently truncate substantive text or hide it with an ellipsis.
- Compute contrast from actual rendering tokens. Distinguish design estimates from inspected/rendered evidence.
- Unify category contracts without removing valid categories. Reject or explicitly resolve unknown categories rather than silently routing to Essays.
- Generate relevant platform-budgeted lowercase hashtags. Never attach unrelated sensitive trends; repair encoding rather than banning emoji without evidence.
- Use honest sourced-review framing; no invented tests, numbers, eyewitness details, credentials, or sensory props.
- Remove exact-duplicate fallback publishing. Preserve genre-appropriate length and allow technical summaries where useful.

Acceptance: real publisher paths reject duplicate captions, wrong assets, missing evidence, overflow, and category mismatches while accepting valid technical reviews, literary posts, and multilingual fixtures.

### Stage E — Durable learning and maintainable knowledge

- Store dispatch/outcome history in PostgreSQL; no mutable operational JSON or recorded:true when nothing persisted.
- Use idempotent observations at 1h, 6h, 24h, 72h, and 7d, preserving absent metrics as null and genuine zeros as zero. Validate finite values and metric-specific ranges.
- Compare same-platform, same-age cohorts. Never sum cumulative snapshots or rank peak/latest observations across unequal ages. Require sufficient distinct deliveries before labeling winners.
- Exclude synthetic interactions from learning inputs using one verified identity predicate; do not change public counts as an incidental analytics fix.
- Keep rules, insight content, and operational history separate. Preserve aliases and historical IDs when consolidating duplicate insights.
- Reconcile gate registries by meaning and applicability; derive counts instead of forcing 17/29/31. Do not undertake a giant rule-engine rewrite before reliability is proven.
- Measure content supply and skip reasons before proposing cadence/cooldown changes. Do not evade the existing rule by assigning each surface a new archetype.

Acceptance: repeated metrics imports are idempotent, telemetry does not change policy hashes, synthetic reactions cannot promote winners, and DB selection uses current history rather than stale JSON.

## 5. Separate founder decisions

Present these as explicit choices with impact; do not bundle them into technical cleanup:

- Synthetic-author disclosure wording and placement, portrait changes, and review-persona positioning.
- Whether simulated engagement remains, whether it notifies humans, and whether public counts change.
- Any cooldown, schedule, catch-up, or authorized multi-channel campaign policy change.
- New private alert destination and credentials.

Recommended direction: clear synthetic provenance, sourced-analysis labels instead of invented hands-on testing, and learning based on genuine audience signals. Implement accurate internal provenance and auditable measurement without inventing consent for public-facing changes.

## 6. Migration and rollout gates

1. Complete local unit and real-PostgreSQL integration tests for the selected bounded change.
2. Review additive migration, permissions, and backfill. Verify actual brain/history paths. Backfill only evidenced timestamps/IDs, mark legacy provenance, and use stable import keys. Never invent historical hashes or success proof.
3. Prepare backups of affected data and policy files; verify restore procedures in isolation. Protect secrets and personal data in backups.
4. With explicit deployment approval, apply the reviewed additive migration and verify compatibility before switching callers. Coordinate cutover so legacy writers cannot create a history gap.
5. Run new logic in non-publishing shadow mode that cannot acquire live reservations or emit side effects. Compare decisions and false-block reasons with current behavior.
6. Activate one bounded production path with agreed stop conditions and a durable rollback plan. Do not use an unapproved live test post; when authorized, verify an intended publication through both remote lookup and persisted evidence.
7. Rollback must retain durable delivery history and unresolved blocks. If old code cannot honor them, pause the affected publishing path instead of returning to stale JSON.

Stop conditions: duplicate delivery, false published status, missing intent, lost evidence, unauthorized destination, unsafe state transition, or regression in normal app access. Keep affected-path pauses distinct from shutting down the entire released app.

## 7. Handoff and definition of done

For every stage, deliver a concise report containing:

- Changed files and verified root causes, with links to regression tests.
- Exact test commands/counts and database identity; distinguish mocks, disposable DB, shadow, and remote verification.
- Open risks and deferred product decisions; no statements such as zero vulnerabilities or everything works.
- Migration/backfill/rollback instructions and explicit production-change status.
- CHANGELOG entry without inventing a release number. No Android version bump or release artifact for a documentation/backend-only change unless Android is actually delivered.
- Graphify update after code modifications, as required by project instructions.

A stage is complete only when its actual callers honor its contracts. Passing coordinator mocks alone is not fleet integration proof. Automatic posting is considered remotely verified only for the specific authorized delivery whose external publication and stored record were checked.
