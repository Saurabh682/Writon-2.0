# Roadmap Closeout Evidence — 2026-09-20

This record separates completed engineering from evidence that requires real people, traffic, or editorial staffing. A missing evidence gate must never be represented as a shipped outcome.

## Reader parity release candidate

- Complete locally: Android, React web, and public-share readers now follow `docs/design/reading-style-contract.md`; Android additionally preserves Markdown headings and ordered/unordered lists.
- Complete on physical device: Android 15 Redmi installation and reader inspection passed without a crash; the avatar overlay fix kept the email-confirmed mark within the visible avatar boundary.
- Release candidate: signed Android App Bundle `2.0.73 (172)` built successfully; debug and release JVM suites, release lint-vital tasks, web production build, and 103 server/share-page contract tests pass.
- Hosted boundary: web/share assets and the additive server typography change remain local. They must be deployed from an isolated release context because the main working tree also contains unrelated bot, campaign, feed, and publishing changes that must not be released as a side effect.

## Founding Writer administration

- Complete: protected list/assign API, manual-only human-account validation, 1–250 constraint, permanent profile assignment, append-only audit ledger, non-recyclable profile/number uniqueness, operator/reason capture, and local operator screen.
- Deployed: staging `writon-app-api-staging-00032-zup`; production `writon-app-api-00030-bem`. Production passed zero-traffic verification and a 5% canary before promotion to 100%. The previous revision remains tagged for rollback.
- Current cohort: zero assignments. This is intentional. Selecting the first 250 is an editorial decision, not an automation task.

## Recommendation R4 gate

- Complete: the production shadow report now makes starvation, language-share loss, top-20 stability, author concentration, category concentration, sample size, and reader count explicit. Passing can only produce `ready_for_human_review`; it cannot change production ranking.
- Current result: **HOLD**. The seven-day report found 0 non-test shadow sessions and 0 readers. Minimum review thresholds are 100 sessions and 25 readers, with zero empty shadow feeds, no language losing more than 10 percentage points, average maximum author share at most 25%, average maximum category share at most 40%, and top-20 overlap of at least 12.
- Existing visible v1 ranking, endpoints, fields, cursors, aliases, and fallbacks remain unchanged.

## Notification evidence

- Automated integrity remains covered for preference aliases/suppression, durable deduplication, stale-claim recovery, terminal attempts, invalid-token revocation, human-only delivery, and stable Android notification IDs.
- Seven-day production report: 1,354 outbox rows, 0 duplicate notification IDs, 0 failures, 0 outstanding, and 0 FCM-accepted deliveries. Of the skipped rows, 1,332 targeted non-human recipients, 20 had non-human actors, one recipient had no active permitted token, and one had only invalid tokens.
- Interpretation: bot/test isolation is working, but there is no current evidence of reachable human account delivery. Foreground/background/normal-process-terminated display, tap routing, preference suppression, logout revocation, and visible duplicate rate remain a two-account physical-device gate in `firebase-app-testing.yaml`.

## Owned content continuity

- Story correction and owned comment edit/delete are implemented and contract-tested. Isolated staging already passed the story update/Updated label and comment create/edit/delete/Edited label journey with disposable cleanup.
- Remaining evidence is only the Play-delivered candidate journey on two authorized test accounts. Never publish test content to the public production feed.

## Newcomer showcase operating contract

Do not expose “Feedback welcome”, guarantee feedback, or launch a newcomer showcase until all fields below are filled:

- Primary moderator: **unassigned**
- Backup reviewer: **unassigned**
- Response SLA: proposed seven calendar days
- Capacity: proposed maximum five opted-in pieces per week
- Pause gate: pause intake when more than ten items are open or more than 20% breach the SLA

When staffed, participation must be opt-in; selection must not promise publication, reach, payment, or praise; feedback must be private by default; abuse/conflict reports go to the backup reviewer; and every public showcase placement needs author approval. Start manually—no new recommendation or ranking privilege.

## Weekly prompts

Weekly prompts remain deliberately unbuilt. They may start only after a primary editor and backup reviewer accept the operating calendar, translations, moderation coverage, and the shared discovery-notification budget. The app's existing preference field is compatibility plumbing, not evidence that a prompt product is live.
