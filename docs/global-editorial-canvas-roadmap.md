# Global Editorial Canvas Roadmap

Updated: 2026-09-08

The canvas is an operational control surface, not a publishing endpoint. Saving, reviewing, or approving canvas state must never dispatch a social post, send a notification, deploy code, or mutate reader content.

## Phase 1 — Durable shared state: complete in source

- Admin-authenticated GET and PUT endpoints added without changing existing endpoints.
- Browser-local edits remain an offline backup.
- Captions and approval state persist together.
- Optimistic revision checks reject silent concurrent overwrites.
- Every successful save creates an append-only revision attributed to the operator.
- Database tables are protected by RLS and accessible only to the server service role.
- Migration and Google Cloud deployment remain unapplied, so production is unaffected.

## Phase 2 — Visible governance history: complete in source

- A native accessible history dialog shows the latest shared revisions.
- The admin key is held only in tab-scoped session storage.
- Invalid authentication and connection failures preserve the local backup and show an explicit status.
- History text is rendered as text rather than injected HTML.

## Phase 3 — Structured workflow and evidence: complete in source

- Every delivery exposes the complete governed lifecycle instead of relying on a binary approval state.
- Blocked work requires a recorded blocker reason before shared state can be saved.
- Rights, localization, asset, link, and QA evidence are individually recorded as pending, passed, or not applicable.
- Approval, scheduling, publication, and measurement states require all evidence to be resolved; the API independently enforces the rule even if a client is modified.
- Each delivery records an owner and next action, while legacy caption-only browser state remains readable.
- Approval remains a workflow state only. It does not dispatch, publish, notify, or deploy anything.

## Phase 4 — Operational views: complete in source

- Added a read-only operational cockpit for Android release readiness, notification evidence, new-user experience, and current editorial blockers.
- Live API/database health and the publicly installable Play version use the existing `/health` and `/api/v1/app/version` contracts; no duplicate backend or public endpoint was added.
- Canvas-governance readiness and blocker summaries are computed from the current shared/local canvas state.
- Notification delivery is labelled as dated physical-device evidence rather than misleadingly presented as a live queue metric.
- Cloud Run incidents, Crashlytics, Play warnings, and notification queue depth remain explicitly unverified unless their authoritative consoles are connected.
- Replaced the hard-coded successful dry-run message with a real local preflight over caption, tracking link, blocker, and evidence state.
- Deployment, migration, notification-send, and publication controls remain outside the canvas.

## Phase 5 — Staging and rollout

- **Complete in isolated staging (2026-09-08):** Applied `20260908_editorial_canvas_state.sql` only to Supabase staging ref `xrfnebvkazewqramkpri`. The migration verifies RLS, denies anon/authenticated table reads, and permits only the server service role.
- **Complete in isolated staging:** Deployed additive API routes to Cloud Run service `writon-app-api-staging`, revision `writon-app-api-staging-00003-dgl`, with all production-facing automation flags disabled.
- **Complete:** Verified health/database connectivity, authentication rejection, first save, reload, stale revision conflict (`409`), governed save, and revision history through the staging URL.
- **Complete:** Verified browser continuity in a second isolated session; the saved caption loaded as `Shared revision 1 loaded`. Browser-local backup remains available for connection failures.
- **Complete:** Deployed the static canvas to the separate Firebase Hosting site `writon-canvas-staging.web.app`; desktop and 390px mobile checks passed, including the operations view and zero browser console errors/warnings.
- **Not promoted:** Production migration, Cloud Run production deployment, and the existing production Firebase Hosting site were not changed. Promotion still requires explicit approval after any additional operator acceptance.
