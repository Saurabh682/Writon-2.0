# Retention, Attribution, and Digest Corrections

Status: in progress

Constraints:

- Preserve all existing public Android and server API paths and payload contracts.
- Keep `/go/:deliveryId` as the public campaign URL; only its hosting execution path may change.
- Do not modify bot implementation, bot routes, bot data, or deferred bot-security work.
- Keep unrelated changes in the dirty `Till_29Aug` workspace intact.

## Phase A — Android attribution integrity

- [x] Start Play Install Referrer processing during activity startup before activation can emit.
- [x] Validate campaign name and delivery ID, deriving language from the delivery ID when needed.
- [x] Defer a pending activation until the one-time referrer check reaches a terminal result.
- [x] Add JVM tests for attributed and unattributed activation behavior.

## Phase B — Notification audience integrity

- [x] Make `daily_digest` topic membership guest-only.
- [x] Resynchronize topic membership on startup, login, account creation, Google login, and logout.
- [x] Revoke the authenticated device registration before ordinary logout to prevent stale direct delivery.
- [x] Emit privacy-safe topic subscription success/failure telemetry.
- [x] Add deterministic policy tests without changing notification APIs.

## Phase C — Human-only, reading-quality digest

- [x] Restrict digest inventory to `human_verified` stories from `human` accounts.
- [x] Rank primarily by bounded completion, deep-read, reread, and bookmark evidence.
- [x] Keep applause only as a late tie-breaker.
- [x] Add server regression tests for eligibility and query semantics.

## Phase D — Campaign redirect measurement

- [x] Persist privacy-safe aggregate click counts with no IP, fingerprint, account, or user-agent data.
- [x] Keep redirects available even when measurement storage fails.
- [x] Route Firebase Hosting `/go/**` requests to the existing server route without changing public URLs (configuration complete; deployment remains gated with the server release).
- [x] Add route tests for measurement success and graceful degradation.

## Phase E — Live operations and release evidence

- [x] Deploy the corrected server revision, verify health/protected-digest behavior, and shift Cloud Run traffic after no-traffic validation.
- [x] Provision the protected 20:00 Asia/Kolkata Cloud Scheduler job against the existing internal endpoint; keep it paused until corrected Android clients are distributed and adopted.
- [x] Run focused and full Android/server suites plus release signing/build checks.
- [x] Refresh Graphify after the final code and documentation updates.
- [ ] Test push delivery in foreground, background, and terminated states on an attached physical device when available.
- [x] Inspect Google Play Console: production is 128 (2.0.26), open testing is 132 (2.0.30), and Internal Testing is not configured; therefore neither 138 nor superseding local 139 is Play-distributed.
- [ ] Upload superseding release 139 (2.0.37) to Internal Testing and complete tester-device validation.
- [ ] Deploy the Firebase Hosting `/go/**` rewrite only after the unrelated dirty website bundle is reviewed or isolated.
- [x] Record external blockers rather than claiming unverified deployment.
