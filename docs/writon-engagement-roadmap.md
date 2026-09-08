# WritOn Engagement Roadmap

**Status:** Owner approved staged implementation on 2026-09-05; Phases 1 and 2 and the Phase 3 intent flow are implemented locally; hosted preference API gate passed, Android device gates remain
**Source:** `writon-engagement-plan.md`, reconciled with the WritOn codebase on 2026-09-05  
**Scope:** Personalized onboarding, notification lifecycle improvements, and weekly writing prompts  
**Product principle:** Increase meaningful reading and writing without loud gamification, dark patterns, or notification spam

## 1. Product outcome

### Current delivery evidence — 2026-09-05

The owner adopted the review recommendations and separately approved increasing the existing interests API request limit from 12 to 32. That is the only public API change authorized in this delivery. New notification-preference and weekly-prompt contracts still require discussion before implementation.

| Area | Current state | Evidence / remaining gate |
|---|---|---|
| Active interest catalog | Implemented and unit-tested | Existing tags response; 17 translated supported categories; Trending excluded; successful empty catalog distinguished from failure |
| Preference preservation | Implemented and unit-tested | Legacy unmapped values retained locally; only editable categories replaced; no inferred category mappings |
| Account isolation and edit protection | Implemented and unit-tested | UID-scoped interest caches; pending offline choices survive hydration; stale account callbacks rejected; screen state keyed by account |
| Optional selection and Skip | Implemented and unit-tested | Zero choices allowed; Skip no longer sends an empty replacement request |
| Approved API limit | Implemented and contract-tested | Existing PUT `/api/v1/me/interests`: `{topicIds: string[]}`, maximum 32; unchanged identifier rule `[a-z0-9_]{1,64}`, auth, transaction, response and error shape; no schema migration |
| Device test instructions | Updated, not executed | Both Firebase YAML files identical; added saved-interest and Skip journey; Compose test compiles |
| Engagement preference domain | Implemented and unit-tested locally | Additive authenticated snapshot contract; server-only Postgres table; account/guest isolation; pending-write-first hydration; no deployment |
| Resume reading/drafts, shared prompt coordination, notification budget, weekly prompts | Not implemented by this delivery | Continue the remaining A–D work below; no completion or outcome claim |

Continuation follow-up: local Continue reading is now implemented on Home with proportional reader-position restoration, guest/account separation, completion removal, and a matching Firebase YAML journey. This is not exact paragraph anchoring or cross-device resume; layout/content changes can shift the restored paragraph. Draft continuation remains pending: the existing local draft entity has no owner identifier, so exposing it on Home would risk showing another account's private draft. No public API changes were made in this follow-up. Device execution is still required.

Verification: the current full Android unit suite passes 137 tests with zero failures, errors, or skips, and the 2.0.45 (147) debug APK builds. The current full backend suite passes 137 tests, including six dedicated engagement-preference cases and authenticated-access coverage in the main contract suite. A read-only production schema check confirmed `profiles.id` is `text`, matching the migration foreign key, and confirmed the new table has not been deployed.

Release gates: apply and verify the engagement-preferences migration in a non-production/staged environment before installing the API-dependent 2.0.45 (147) build; then run physical-device offline/process-recreation and two-account checks. Verify content-provenance filtering and eligible inventory before campaign expansion. No production deployment, AAB generation, branch synchronization, or retention measurement was performed in this slice.

Staging verification update — 2026-09-06: a dedicated local PostgreSQL Compose definition, migration verifier, and guards against production URL reuse are present. After Docker Desktop recovered, the unchanged migration passed against PostgreSQL 17 with Supabase-equivalent non-login roles. A real Fastify/PostgreSQL smoke test passed default reads, validated upsert, persisted readback, invalid-payload rejection, and profile-deletion cascade. Remote staging deployment and physical-device validation remain open; no fallback to or mutation of the configured Supabase database occurred.

Known limitations: offline signed-in choices are retained but still need an explicit save retry to reach the server; unsupported legacy display names stay local if they do not satisfy the existing identifier format; unscoped legacy local choices are not automatically assigned to an account because their owner cannot be proven. Cross-device concurrent edits retain the endpoint's existing last-write-wins behavior. Global onboarding-completion state is not yet migrated to the Phase 2 model. These remain tracked work, not silently solved assumptions.

Graphify's code update succeeded; its current parser omitted SQL files because `tree_sitter_sql` is unavailable. SQL and production provenance claims therefore need direct verification.

The three workstreams should operate as one reader-and-writer retention loop:

1. A new person states what they want to do and what they enjoy.
2. Their first feed is useful immediately and becomes more relevant through genuine reading behavior.
3. Social notifications close real human interaction loops.
4. Carefully limited discovery notifications create a reason to return without becoming noise.
5. A weekly prompt gives writers a calm recurring reason to create and readers a replenishing collection to explore.

The target is not maximum taps. The target is more completed reading, more saved or published writing, and more voluntary return visits.

## 2. Implementation baseline at initial review

This table records the original planning assessment, not a fresh production certification. Subsequent implementation must record separate code, test, device-validation, and deployment evidence. In particular, catalog-driven Android changes have since been started; that does not establish completion of Phase 1 or deployment to users.

| Capability | Current state | Roadmap treatment |
|---|---|---|
| Personalized `/api/v1/feed` | Implemented, including app-language preference, 70/20/10 composition, diversity, signed-in affinity, and bounded guest vectors | Preserve and extend; do not build another feed system |
| Interest persistence | Implemented locally and through `/api/v1/me/interests` for signed-in users | Reuse after fixing taxonomy and onboarding rules |
| Interest onboarding UI | Partial: one screen, twelve hardcoded topics, zero-selection allowed, and Skip is available | Replace with catalog-driven interests and explicit completion rules |
| Primary intent | Not implemented | Add as a new onboarding/account preference |
| Separate content-language preference | Not implemented | Do not add; the app language remains the primary feed language |
| Existing-user preference prompt | Not implemented | Add as a remotely controlled, one-time feed card |
| Push token registration | Implemented for authenticated devices | Preserve and test across login/logout/token refresh |
| Guest daily-digest topic | Implemented, with signed-in users excluded from the guest topic | Preserve while adding guest consent and local controls |
| Durable social-push delivery | Implemented with an outbox and retries | Extend deduplication and event coverage |
| Social triggers | Applause, bookmark, comment, and follow exist | Correct first-applause semantics; add followed-writer publication; decide bookmark-push policy |
| Notification preferences | Four broad server flags exist | Expand carefully to per-type controls without breaking current clients |
| Contextual permission request | Launcher exists, but the navigation callback is not wired to value moments | Build a permission coordinator, pre-prompt, cooldown, and trigger integration |
| Daily editorial digest | Implemented | Classify it as discovery, apply consent/frequency policy, and avoid overlap with new nudges |
| Reading and draft nudges | Not implemented | Add only after consent, caps, and activity data are reliable |
| Weekly prompt system | No implementation found | Build as a new backend, admin, Android, scheduling, and editorial capability |

## 3. Decisions locked into this roadmap

### 3.1 Language

- The app/interface language remains the reader's primary content language.
- No separate content-language onboarding screen is added.
- The existing feed continues to target approximately 70% app-language content, 20% demonstrated affinity, and 10% exploration when eligible inventory permits.
- Cross-language preferences are learned from deep reading, bookmarks, rereads, follows, and other genuine behavior.
- Changing the app language starts a new feed session and updates the primary-language input without deleting learned cross-language affinity.

### 3.2 Interests and categories

- The live story-category catalog is authoritative; the old eight-category assumption is retired.
- `Trending` is a feed view, not a publishable interest.
- The onboarding UI must not keep its own permanent hardcoded taxonomy.
- Every selected topic ID must map deterministically to the category or topic dimension consumed by feed ranking.
- Legacy categories remain readable and valid while the product team decides whether all should be selectable during onboarding.

### 3.3 Intent

- `primary_intent` supports `read`, `write`, and `both`.
- If the user skips intent, store `null` or `both_defaulted`; do not pretend the user explicitly chose Both.
- A Read choice opens Home.
- A Write choice opens a calm writer-start surface, not an immediately focused keyboard that can feel abrupt.
- Both opens Home with the existing compose entry point clearly visible.
- Intent influences landing and onboarding analytics, not story quality ranking.

### 3.4 Notifications

- Social notifications and discovery notifications remain separate policy tiers.
- Human social events are high-value and immediate; discovery events are capped and suppressible.
- Bot, system, administrative-test, or synthetic activity must never create a user-facing social push.
- Use retryable delivery and durable logical-event deduplication. Aim to prevent duplicate visible alerts, but do not promise exactly-once device delivery: transport retries, process failure, and OS presentation can leave uncertain outcomes. Record those outcomes separately.
- Notification permission is requested only after a real value moment.
- A denied permission is not requested again for at least 14 days, and never on app launch.
- Existing public API behavior must remain compatible. Any request/response or route change must be reviewed with the owner before implementation.

### 3.5 Weekly prompts

- Prompts are editorial invitations, not competitions.
- No leaderboard, XP, flame, rank, or applause-driven ordering is introduced.
- Editor's picks are manual, auditable, and limited.
- A prompt cannot go live until all supported translations pass validation.
- Published responses remain ordinary human-authored stories and must pass the same provenance and eligibility rules as every discovery story.

## 4. Delivery strategy

The roadmap uses expand-and-contract delivery:

1. Add compatible data structures and feature flags.
2. Deploy server support while old Android clients continue to work.
3. Backfill or reconcile data in bounded batches.
4. Release Android UI behind remote flags.
5. Observe a canary cohort.
6. Increase rollout only after explicit quality gates pass.
7. Remove obsolete structures only in a later release, never in the same deployment that introduces their replacements.

The work is split into thirteen phases, numbered 0–12. A phase is complete only when its exit gate passes; code completion alone is not sufficient. Recommendations in Section 9 are proposals, not additional locked decisions.

---

## Phase 0 — Baseline, decision register, and safety rails

### Objective

Freeze definitions and collect a trustworthy before-state so later changes can be evaluated.

### Work

- Record D1, D7, and D30 retention for readers and writers.
- Record first-session feed opens, story opens, 30-second reads, 70% reads, completions, bookmarks, and draft starts.
- Record notification permission state, opt-in rate, delivery success, notification-open rate, and app return within 24 hours of a push.
- Record onboarding start, per-step completion, skip, abandonment, selected-interest count, and time to first value moment.
- Record end-of-feed occurrence and zero/short-feed occurrence.
- Define test accounts for each supported app language, guest/authenticated state, new/existing user, and notification permission state.
- Create a decision register for unresolved product questions:
  - Which legacy categories appear in onboarding?
  - Is bookmark-received an in-app event only or also a push?
  - Does Write intent land on a writer hub or directly create a draft?
  - Is the current daily digest retained, replaced by inactivity nudges, or treated as one discovery subtype?
- Define remote flags and kill switches before UI work begins.

### Required flags

- `engagement_onboarding_v2_enabled`
- `existing_user_preferences_card_enabled`
- `notification_permission_value_moment_enabled`
- `notification_preferences_v2_enabled`
- `reading_nudge_enabled`
- `draft_nudge_enabled`
- `weekly_prompt_enabled`
- `weekly_prompt_notification_enabled`

### Exit gate

- Metric definitions are documented and reproducible.
- Baseline dashboards contain real data rather than placeholders.
- Every feature has an owner, rollback flag, and success/stop condition.
- The four unresolved product questions above have recorded answers before their dependent phases begin.

---

## Phase 1 — Taxonomy and preference contract reconciliation

### Objective

Make onboarding, stored interests, category APIs, and feed affinity speak the same vocabulary.

### Work

- Define one canonical selectable-topic contract sourced from the server catalog.
- Exclude feed-only entries such as Trending.
- Decide which of the current publishable and legacy categories are onboarding-selectable.
- Add localized display names, stable IDs/slugs, display order, and active/selectable state to the catalog contract.
- Reconcile historical topic IDs such as `short_stories` with current category slugs such as `short-stories`.
- Create an explicit alias map and a one-time idempotent backfill for old `profile_interests` rows.
- Validate `/api/v1/me/interests` against allowed active topic IDs.
- Make the Android interests grid consume the catalog instead of maintaining a hardcoded list.
- Define offline fallback catalog data in the Android app so onboarding works without a network connection.
- Version the fallback catalog and reconcile it after the first successful server response.

### Compatibility rule

The existing interests endpoints and response shape should remain intact unless an additive catalog field is required. Any API change is proposed and reviewed before code changes.

### Tests

- Every selectable ID maps to exactly one feed topic dimension.
- Trending cannot be saved as an interest.
- Deprecated aliases normalize predictably.
- Unknown IDs are rejected at the API boundary.
- Existing interest rows survive migration without silent loss.
- Offline and server catalogs produce the same stable IDs.

### Exit gate

- No hardcoded stale interest list remains in the onboarding flow.
- New selections measurably influence the next feed session.
- Existing users retain their valid interests after reconciliation.

---

## Phase 2 — Preference storage and onboarding domain model

**Local implementation status (2026-09-05):** The additive table, authenticated GET/PUT snapshot contract, Android DTOs, account/guest local storage, pending-write-first synchronization, process-death-safe commits, and account-clear behavior are implemented. Current interest completion records onboarding v1 locally and queues account synchronization. The migration and server route are not deployed, so cross-device behavior is verified by contract tests rather than production. Primary-intent UI remains Phase 3 work.

### Objective

Add the minimum durable state required for intent, onboarding lifecycle, and the existing-user invitation.

### Proposed data boundaries

Signed-in account state:

- `primary_intent`: nullable `read | write | both`
- `onboarding_version`: integer
- `onboarding_completed_at`: nullable timestamp
- `preference_card_state`: `unseen | dismissed | completed`
- `preference_card_updated_at`: nullable timestamp

Local guest state:

- The same onboarding version and completion state.
- Local intent and selected interests.
- No persistent server-side guest identity.

### Work

- Prefer additive profile/preference fields rather than replacing existing `profile_interests`.
- Keep authorization server-side and fail closed for direct Data API roles.
- Add foreign-key and query-pattern indexes only where a real access path requires them.
- Define account deletion behavior for every new field/table.
- Define merge behavior when a guest later signs in:
  - Ask or safely merge explicit interests.
  - Never overwrite a non-empty signed-in profile silently.
  - Preserve guest behavioral learning locally unless a separately approved consented merge is designed.
- Add telemetry-safe onboarding events without category names or free text where not necessary.

### Exit gate

- Persistence works across process death and across devices for signed-in users.
- Guest state stays local.
- Account deletion removes new account-level engagement data.
- Old clients continue to authenticate, read feeds, and edit interests.

---

## Phase 3 — Personalized onboarding v2

**Local implementation status (2026-09-06):** The Read/Write/Both intent step, optional skip, account-scoped local-first persistence, pending synchronization, version-2 completion, six-language resources, scrollable large-text layout, focused JVM coverage, Compose test definitions, and Firebase App Testing journey are implemented in 2.0.46 (148). Newly created accounts enter intent then interests; returning sign-ins and first-page visitor reading are not forced through the new step. The staging-configured build installed over 2.0.44 on the Redmi 25028RN03I without clearing data; all four focused onboarding UI tests, cold launch, and background resume passed with an empty crash buffer. A disposable-account authenticated end-to-end journey and release rollout remain open gates.

### Objective

Create a short, calm onboarding path that improves the first feed without delaying account creation.

### Recommended flow

#### Step 1: Intent

- Ask: “What brings you here today?”
- Choices: Read, Write, Both.
- Permit Skip; skipped intent remains unknown/defaulted.
- Show `1 of 2`, because a separate content-language step is intentionally not added.

#### Step 2: Interests

- Ask: “A few things you love”.
- Load selectable topics from the canonical catalog.
- Recommend at least three choices.
- Before making three choices a hard gate, run an onboarding-completion experiment; forced selection can increase abandonment and contaminate preferences with random taps.
- If the owner keeps the hard gate, clearly explain “Choose at least 3” and make disabled-button state accessible.
- Save locally first, then sync; expose a retry path if server sync fails.

#### Completion

- Mark onboarding complete only after durable local save.
- Trigger a fresh feed session after successful preference save.
- Route according to intent.
- Do not request notification permission here.

### Localization and accessibility

- Ship English, Hindi, Spanish, French, Bengali, and Marathi together.
- Use string resources with placeholders; no concatenated translated copy.
- Support TalkBack selection state, large fonts, keyboard navigation where applicable, contrast, and 48dp targets.
- Test long Hindi, Bengali, Marathi, Spanish, and French labels at large font sizes.

### Tests

- New signup enters onboarding before Home.
- Existing completed users are not re-routed.
- Back navigation cannot leave contradictory completion state.
- Process death on either step restores selections.
- Offline completion produces a usable feed from cached/fallback catalog data.
- Distinct interest selections yield observably distinct first sessions.
- App language controls primary feed language.
- No notification permission dialog appears during onboarding.

### Exit gate

- Onboarding completion does not materially reduce successful account creation.
- First-session story-open and deep-read rates improve or remain neutral.
- No locale has clipping, hardcoded English, or inaccessible selection state.

---

## Phase 4 — Existing-user preference backfill

### Objective

Offer personalization to existing users without forcing them through new-user onboarding.

### Work

- Add a one-time, dismissible Home card controlled by a remote flag.
- Show only to users with insufficient explicit interests and no completed v2 preference flow.
- Open Interests directly; do not ask primary intent unless the user enters full Preferences from Settings.
- Persist `dismissed` and `completed` across devices for signed-in users.
- For guests, persist locally.
- Add Settings → Reading preferences for editing interests and intent.
- App language remains in the existing language setting rather than being duplicated here.

### Frequency rules

- Never show more than once after dismissal.
- Never show during an error, empty-feed recovery, update-required state, or immediately after another modal.
- Never block reading.

### Exit gate

- Card state is stable across devices and reinstalls for signed-in users.
- Dismissal is honored.
- Completing the card refreshes only the next feed session and does not reshuffle an open session.

---

## Phase 5 — Notification policy and delivery integrity

### Objective

Correct notification semantics before adding more notification volume.

### Work

- Define canonical notification types:
  - `first_applause`
  - `comment`
  - `reply`
  - `new_follower`
  - `followed_writer_published`
  - `reading_nudge`
  - `draft_nudge`
  - `weekly_prompt_live`
  - optional retained `daily_digest`
- Separate in-app notification creation from push eligibility.
- Introduce a stable deduplication key per logical event.
- For first applause, trigger only when a human story's genuine-human applause count transitions from zero to one. Unapplaud/re-applaud must not create another first-applause push.
- Keep every genuine comment/reply and follow eligible, but suppress self-actions.
- Add followed-writer publication fan-out through the outbox after the publication transaction commits.
- Batch multiple same-author publications for the same recipient and local day.
- Exclude bot, system, unknown, test, and administrative accounts from user-facing social push production.
- Retain retry/backoff, token invalidation, and delivery observability.
- Decide whether bookmark-received remains a push; it is not part of the supplied notification catalog.

### Data and migration principles

- Use append-only notification event identity or an equivalent durable ledger for deduplication.
- Add unique constraints that enforce deduplication in the database, not only application memory.
- Use expand/contract migrations, bounded transactions, and a roll-forward plan.
- Keep external FCM calls outside open database transactions.
- Preserve current notification endpoints and old preference fields during transition.

### Tests

- Concurrent first applauses generate one first-applause push.
- Re-applause after removal does not push again.
- Bot and test interactions generate no push.
- Duplicate job delivery produces one visible notification.
- Deleted/unpublished/private stories are not valid push targets.
- Invalid tokens are revoked without failing other recipients.
- Publication fan-out respects follows and per-type preferences.
- Multi-publication batching is stable across retries and timezone boundaries.

### Exit gate

- Social event-to-delivery p95 is measured in seconds.
- Duplicate-visible-notification rate is effectively zero in the canary.
- No bot/test push reaches production users.
- Existing notification inbox behavior remains functional.

---

## Phase 6 — Contextual permission and notification controls

### Implementation progress — 2026-09-07

- The localized contextual pre-prompt, Android runtime permission handoff, session consumption guard, 14-day cooldown, reading-completion value moment, OS-level status, system-settings action, guest discovery control, and additive signed-in per-type controls are implemented.
- Server-confirmed publication now invokes the same contextual pre-prompt only after the publish operation succeeds; failed and offline-queued attempts do not prompt.
- A server-confirmed bookmark save now invokes the contextual pre-prompt; removing a bookmark and offline-queued or failed saves remain silent.
- The physical-device permission and audience-convergence matrix remains before this phase can pass its exit gate.

### Implementation progress — 2026-09-08

- On the connected Redmi test device, build `2.0.54` (`versionCode 156`) exposes all three WritOn channels: Daily reads, Story activity, and Writing updates.
- The device initially had the app-level notification permission set to `ignore`; after granting `POST_NOTIFICATIONS` on the test device, Android reports app notification importance `DEFAULT` and preserves the expected per-channel importance levels.
- This is device readiness evidence only. The full connected Android test matrix and end-to-end audience-convergence checks remain pending; production behavior is unchanged.
- Android’s app-specific notification settings route opened successfully on the test phone (`Settings$AppNotificationSettingsActivity`), confirming the recovery path exposed by the app can reach the OS controls.
- The approved guest-registration design is now implemented in Android `2.0.55` (`versionCode 157`) and the server. It adds a persistent anonymous installation UUID, a separately flagged guest endpoint, and atomic conversion to the unchanged authenticated token endpoint after sign-in.
- Supabase staging alone received the new RLS-protected guest token table. Cloud Run staging revision `writon-app-api-staging-00004-wxb` is live with guest registration enabled while all notification delivery, digest, social publishing, Spark automation, behavior ranking, review prompt, and in-process timer switches remain disabled.
- Hosted staging passed registration, idempotency, replacement, validation, and revocation smoke tests. Server verification passes 195 tests across 18 files; Android JVM tests and debug assembly pass.
- The full connected suite is not yet green: the Redmi instrumentation process stopped after 6 of 21 tests at the existing avatar-fallback UI test. Physical guest receive → sign-in → no-duplicate delivery remains the Phase 6 exit gate. Production APIs, database, Cloud Run service, schedulers, and Play release were not changed.
- A clean first-launch run of the staging-connected `2.0.55` debug build reached the correct Google Cloud staging API and remained stable, but Firebase Messaging returned `SERVICE_NOT_AVAILABLE` during topic/token acquisition. Consequently no guest device row was created; this is now the concrete external/device blocker for the physical delivery gate rather than an unverified app assumption.
- The same device run exposed a missing `story_categories` relation only in the staging database. The existing 18-entry catalog was applied through an environment-locked staging runner, and `/api/v1/tags` now returns HTTP 200. No endpoint shape or production database was changed.
- Physical profile-photo testing exposed that staging generated media URLs from its Cloud Run request host while `PUBLIC_API_BASE_URL` was unset, causing its own hardened profile validator to reject a freshly uploaded image. Staging revision `writon-app-api-staging-00005-zvb` now declares the canonical staging URL; the production host and validation policy were not changed. Android also omits the avatar field on text-only edits so unchanged legacy URLs cannot block unrelated profile updates.

### Objective

Ask for permission at a moment when the value is understandable, then give users precise control.

### Android permission coordinator

- Centralize eligibility in one testable coordinator.
- Eligible value moments:
  - a completed or at least 70%-read story with meaningful engaged time;
  - a successful bookmark;
  - a server-confirmed publication.
- Consume only the first eligible moment in a session.
- Show a calm localized pre-prompt tied to the action.
- Launch the OS dialog only after affirmative continuation from the pre-prompt.
- Track `never_asked`, `granted`, `denied`, and `permanently_denied/system_settings_required` where the platform allows inference.
- Store last-request time and enforce the 14-day cooldown.
- On older Android versions, register and synchronize state without showing an unnecessary runtime permission dialog.

### Per-type settings

- Replace the current Settings link-to-inbox behavior with a dedicated notification settings surface; retain a separate path to the notification inbox.
- Social group:
  - First applause
  - Comments and replies
  - New followers
  - Followed writers publish
- Discovery group:
  - Reading reminders
  - Draft reminders
  - Weekly prompt
  - Daily editorial read, if retained
- Show OS-level notification status and a “Open system settings” action when blocked.
- Guests receive local controls for topic-based discovery notifications.
- Signed-in controls sync server-side.

### API compatibility checkpoint

Before implementation, review whether per-type settings are introduced as additive optional fields on the existing endpoint or through a versioned endpoint. Do not remove the four existing broad flags while released clients depend on them.

### Tests

- Cold launch and onboarding never request permission.
- Each value moment can qualify, but only the first is acted upon.
- Decline suppresses all prompts for 14 days.
- A system-level denial is represented accurately.
- Every toggle affects only its type.
- Topic subscription follows guest preference, login, logout, and permission state.
- Signed-in devices do not also receive the guest topic copy.

### Exit gate

- Permission opt-in is attributable to the preceding value moment.
- No duplicate direct/topic delivery occurs.
- Every notification type can be muted independently.

---

## Phase 7 — Discovery notification scheduler

### Objective

Add reading and draft nudges only after consent and delivery correctness are proven.

### Eligibility

Reading nudge:

- No app open for at least three complete days.
- At least one unread saved or eligible recommended human-authored story.
- Discovery notifications enabled.
- User has not already hit the shared discovery cap.

Draft nudge:

- At least one unpublished draft untouched for at least five complete days.
- Draft notification enabled.
- The draft still exists and belongs to the recipient.
- User has not already hit the shared discovery cap.

### Frequency and suppression

- Maximum two capped discovery notifications per rolling seven-day window across reading nudge, draft nudge, and daily digest if the digest remains capped.
- Weekly prompt is independently mutable and exempt from the two-per-week cap, but still limited to one per prompt rotation.
- Never send two discovery pushes to one user on the same local day; select one by a documented priority rule.
- Suppress during recent crash/login/sync/publish failure quiet periods where relevant.
- Respect locale, timezone, notification preference, permission, and invalid token state.
- Use a configurable quiet-hours window and avoid sending at night.

### Operations

- Run scheduled candidate selection as a bounded batch job.
- Use idempotent job-run IDs and per-recipient dedup keys.
- Record eligible, suppressed, queued, delivered, failed, opened, and returned-within-24h counts.
- Provide a dry-run mode that reports counts without sending.

### Exit gate

- Cap and same-day batching tests pass under concurrent scheduler runs.
- No private/deleted/synthetic/unknown story is selected.
- Nudge-related opt-outs and uninstalls do not worsen materially during canary.

---

## Phase 8 — Weekly prompt backend and editorial administration

### Objective

Create a durable, auditable prompt lifecycle before exposing prompts in Android.

### Recommended normalized model

`writing_prompts`

- ID
- status: draft, scheduled, live, archived, cancelled
- publish time and archive time
- optional default constraint metadata
- created/updated timestamps
- created/updated editor identity

`writing_prompt_translations`

- prompt ID
- language code
- text
- optional constraint text
- created/updated timestamps
- unique prompt/language constraint

`writing_prompt_editor_picks`

- prompt ID
- story ID
- display order
- editor identity and selected timestamp
- unique prompt/story constraint

Stories/drafts receive a nullable prompt reference through an expand/contract migration. Do not store an ever-growing response-ID array on the prompt row; query responses through the indexed story relationship.

### Required indexes and invariants

- Efficient lookup for the current live prompt.
- Efficient scheduled rotation lookup by status/publish time.
- Efficient response shelf lookup by prompt, published state, and publication time.
- Foreign-key indexes for prompt references.
- At most one live prompt, enforced transactionally.
- Editor's picks must reference a published response to the same prompt.
- Prompt translations must use supported language codes.

### Rotation job

- Run at Monday 00:00 IST using an explicit timezone-aware schedule.
- Acquire a lock so overlapping job invocations cannot rotate twice.
- Validate all six translations before changing status.
- Archive the prior live prompt and promote the next prompt in one short transaction.
- Write the weekly-prompt notification event/outbox record transactionally; send after commit.
- On validation failure, leave the current prompt unchanged and alert the content team.
- Make reruns idempotent.

### Admin tool

- Admin-only create, edit, translate, preview, schedule, cancel, archive, and editor-pick actions.
- Prevent editing identity/status fields through general user APIs.
- Show translation completeness and scheduled-time validation.
- Preview all six locales and long-text layout.
- Maintain an audit trail for status and editor-pick changes.

### Exit gate

- Rotation is deterministic, timezone-correct, idempotent, and alerting works.
- Direct Data API roles cannot manage prompts or editor picks.
- Old app clients continue to publish ordinary stories without prompt fields.

---

## Phase 9 — Weekly prompt writer experience

### Objective

Turn the current prompt into a low-friction writing start without cluttering the editor.

### Work

- Add one calm current-prompt card near the writer entry point.
- Display the translation matching app language, with English fallback only as a defensive measure.
- Show an optional constraint without competitive framing.
- Tapping starts a new draft with an invisible `prompt_id` association.
- Persist the association in local offline draft storage and server synchronization.
- Preserve the association through autosave, process death, login refresh, and publish retry.
- Validate on publication that the prompt exists and can still accept responses; define behavior when a prompt archives while a draft is open.
- Recommended rule: allow publication against an archived prompt so writers do not lose work, but place it in the archived prompt collection.
- Add a subtle “Writing from this week’s prompt” indicator outside the main writing canvas, with an option to detach before publication if product approves.

### Tests

- Prompt draft creation works online and offline.
- Autosave and restoration retain prompt identity.
- Ordinary drafts remain unaffected.
- Archived-during-writing behavior is deterministic.
- Deleted/cancelled prompt behavior preserves the draft and removes invalid association safely.

### Exit gate

- Prompt-card-to-draft conversion is measurable.
- The editor remains distraction-light and no prompt metadata appears as raw text in the manuscript.

---

## Phase 10 — Weekly prompt reader experience and archive

### Objective

Create a replenishing discovery collection without forming a popularity contest.

### Work

- Add “This week’s prompt” to discovery behind a remote flag.
- Query only public, published, verified-human responses.
- Order manual editor picks first by curated display order, then all other responses by recency.
- Do not show leaderboard rank or applause-based ordering.
- Preserve the main feed’s author/category diversity and duplicate-session exclusions when prompt responses are surfaced outside the shelf.
- Add a stable Past prompts route with cursor pagination.
- Keep archived prompt response collections readable indefinitely unless content itself is deleted/unpublished.
- If a story is deleted, remove it from prompt shelves immediately and from Android cache through the existing stale-content protections.
- Deep-link weekly-prompt notifications to the current prompt, with a safe fallback if it has been archived or removed.

### Tests

- Current shelf contains only current-prompt responses.
- Picks belong to the prompt and float in manual order.
- Non-picks remain recency ordered.
- Deleted/private/ineligible responses disappear.
- Archive pagination has no duplicates.
- Locale fallback and deep links work from foreground, background, and terminated app states.

### Exit gate

- The shelf reduces end-of-feed occurrences or increases qualified discovery without reducing diversity.
- No synthetic or unknown-provenance content appears.

---

## Phase 11 — Full quality, privacy, and release validation

### Objective

Prove the combined system is safe to expose beyond an internal cohort.

### Android validation

- Unit tests for coordinators, reducers, normalization, cooldowns, and navigation decisions.
- Compose UI tests for all onboarding and settings states.
- Process-death, offline, login/logout, reinstall, and multi-device tests.
- Firebase App Distribution test journeys updated for onboarding, notification settings, prompts, and deep links.
- Physical-device notification tests on Android 13 through the latest supported Android version.
- Accessibility pass with TalkBack and large fonts.
- All six locale resources checked for missing strings and truncation.

### Backend and database validation

- Contract tests for old and new clients.
- Integration tests against a real Postgres instance.
- Concurrency tests for first applause, prompt rotation, batching, and scheduler overlap.
- Query-plan checks for prompt shelves, scheduler candidates, and notification cap lookups.
- RLS/privilege audit for every new public-schema table.
- Account-deletion cascade test.
- Restore and roll-forward rehearsal for migrations.
- Load test notification fan-out without holding application transactions open.

### Observability

- Correlation IDs from trigger through outbox to FCM result.
- Dashboards for queue depth, delivery latency, invalid tokens, scheduler duration, prompt rotation state, API error rate, and p95 latency.
- Alerts for stuck outbox, missing prompt translations, failed Monday rotation, abnormal opt-out rate, and notification duplicate rate.
- Never log notification tokens, manuscript text, draft titles, emails, or other unnecessary personal data.

### Release requirements

- Increment Android `versionCode` and `versionName` exactly once for each app delivery.
- Update `CHANGELOG.md`.
- Verify release signing and production-equivalent build.
- Prepare release name and localized Play notes for every configured store locale.
- Keep public APIs backward compatible unless a separately reviewed migration is approved.

### Exit gate

- All critical-path tests pass.
- Rollback flags have been exercised in staging/internal testing.
- No open P0/P1 defect or privacy issue remains.

---

## Phase 12 — Controlled rollout and learning cycle

### Rollout order

1. Internal testers and staff accounts.
2. 5% canary for onboarding v2 and permission coordinator.
3. 10% notification policy v2.
4. 25%, then 50%, then 100% only when gates remain green.
5. Weekly prompts begin internally with at least four fully translated prompts scheduled in advance.
6. Prompt surfaces expand independently from the notification rollout.

### Holdouts

- Preserve a stable onboarding holdout long enough to compare first-session and D7 outcomes.
- Preserve a notification-policy holdout to distinguish organic returns from push-driven returns.
- Do not change cohort assignment mid-experiment.
- Do not optimize on open rate alone; require downstream engaged reading or writing.

### Promotion gates

- No meaningful increase in crash, ANR, login, sync, or publish failure.
- No notification duplicate spike.
- Unsubscribe/permission-denial rate remains within the agreed threshold.
- D1/D7 retention and qualified reading/writing outcomes are neutral or positive.
- Feed diversity and minority-language discovery remain inside existing guardrails.
- Prompt participation is genuine and not dominated by a small number of accounts.

### Stop and rollback conditions

- Disable the affected remote flag if delivery duplicates, wrong-recipient notification, permission-loop, prompt-rotation, data-loss, or provenance defects occur.
- Pause discovery pushes independently while preserving social notifications.
- Hide prompt surfaces without deleting prompts or response associations.
- Fall back to the existing interest/feed behavior if onboarding v2 fails.
- Preserve diagnostic data according to retention policy; do not delete evidence during incident response.

---

## 5. Metrics and decision rules

### Onboarding

- Signup-to-onboarding-start rate.
- Step completion and abandonment by step and locale.
- Median number of interests selected.
- Preference-sync success and retry rate.
- Time to first story open, deep read, bookmark, draft save, and publication.
- D1/D7/D30 retention by completed, skipped, and holdout cohorts.

### Notifications

- Permission pre-prompt accept rate.
- OS permission grant rate by preceding value moment.
- Trigger-to-outbox and outbox-to-FCM latency.
- FCM success, invalid-token, retry, and terminal-failure rates.
- Notification open and return-within-24h rates by type.
- Downstream qualified read/write rate by type.
- Per-type opt-out, global OS disable, and uninstall proxy trends.
- Duplicate-visible-notification rate.

### Weekly prompts

- Prompt card impressions and opens.
- Drafts started from prompt / prompt-card impressions.
- Prompt-linked draft save and publication rates.
- Unique participating writers and concentration by author.
- Response shelf opens, qualified reads, bookmarks, and unique authors encountered.
- Past-prompt archive usage.
- Monday rotation success and translation completeness.

### Decision principle

A feature advances only if it improves meaningful reading or writing without harming reliability, diversity, language inclusion, privacy, or user control. Raw notification opens, applause, or prompt volume are supporting signals, not success by themselves.

## 6. Recommended implementation order

1. Phase 0: baseline and decisions.
2. Phase 1: taxonomy reconciliation.
3. Phase 2: preference/onboarding data contract.
4. Phase 5: notification integrity, because adding nudges before deduplication would increase risk.
5. Phase 6: contextual permission and per-type controls.
6. Phase 3: onboarding v2.
7. Phase 4: existing-user preference card.
8. Phase 7: discovery schedulers.
9. Phase 8: weekly prompt backend/admin.
10. Phase 9: writer experience.
11. Phase 10: reader/archive experience.
12. Phase 11: combined verification.
13. Phase 12: controlled rollout and measurement.

Notification integrity is intentionally moved ahead of onboarding UI because the current app already has an active push system. Weekly prompts remain last because they depend on notification controls, localization, scheduling, admin authorization, and prompt-aware draft/publish behavior.

## 7. Milestone definition of done

### Milestone A — Preferences foundation

- Canonical taxonomy is shared by backend and Android.
- Existing interests are reconciled.
- Intent and onboarding lifecycle persist safely.
- Current clients remain compatible.

### Milestone B — Trustworthy notifications

- Human-only social triggers are correct and deduplicated.
- Permission is contextual and cooldown-protected.
- Every type is independently controllable.
- Discovery caps and suppression rules are enforced centrally.

### Milestone C — Personalized first experience

- New users reach a useful feed through the v2 flow.
- Existing users can opt into preferences once without interruption.
- App language remains primary and behavior learns cross-language affinity.

### Milestone D — Weekly creative loop

- Editors can safely schedule fully localized prompts.
- Writers can start and publish prompt-linked drafts offline-first.
- Readers can browse current and archived human-authored responses.
- Weekly notification and prompt surfaces can be disabled independently.

### Milestone E — Proven retention improvement

- Controlled data shows improvement in qualified return behavior.
- Reliability, diversity, provenance, and opt-out guardrails pass.
- Rollback has been tested and documented.

## 8. Items that require owner approval before implementation

1. Whether selecting three interests is mandatory or only strongly encouraged.
2. The final onboarding-selectable category list from the current catalog.
3. The exact landing experience for Write intent.
4. Whether bookmark-received remains a push notification.
5. Whether the daily editorial digest remains alongside reading/draft nudges.
6. Whether per-type preferences extend the current API or use a new versioned contract.
7. Whether archived prompts continue accepting late responses.
8. Which internal/admin surface will manage prompts.

Until these are approved, implementation can safely proceed only through baseline measurement, test design, and non-breaking internal foundations.

## 9. Additional recommendations from roadmap review

These recommendations prioritize useful return visits and address gaps in the original document. They are hypotheses to test, not claims of proven retention uplift. Product-policy changes below remain proposals; existing API changes still require discussion with the owner.

### 9.1 Make the next visit useful before increasing reminders — highest priority

Add a small **Continue reading** entry for an unfinished story and **Continue writing** for an existing draft. Preserve reading position, formatting, and save state. Show the appropriate entry based on available work, not only the original Read/Write choice. A writer may also want to read.

At a story's end, offer one relevant next story and a quiet route back to discovery. Avoid several competing calls to action or another modal. Reuse existing history and draft storage where possible; guest continuation stays local.

Acceptance: a returning reader resumes at their saved position; a writer resumes the correct draft; deleted stories disappear after server confirmation; network failure does not discard work. Measure return-to-resume success and subsequent engaged reading or editing. Assign this work to Phases 3–4 and validate it in Phase 11.

### 9.2 Reduce the cost of getting to the first story

Recommend making all onboarding steps skippable, suggesting one to three interests without requiring three. Preserve immediate guest reading. Do not interpret skipped questions as negative preferences. Avoid automatically creating an empty draft solely because someone chose Write; offer Resume draft, Start writing, and the current prompt when available.

If signup was initiated while opening a story or starting a prompt, return to that destination after authentication. Intent-based routing should not replace a specific action the reader already chose.

Test this against the current flow using time to first meaningful read/write and abandonment. Completion versus skip comparisons alone are descriptive: people who choose to finish onboarding may already be more motivated. This recommendation resolves the mandatory-three-interest decision in favor of optional selection, subject to owner adoption.

### 9.3 Preserve preferences during taxonomy changes

An unsupported legacy interest is not permission to delete it. Preserve the original stored value until an explicit, reviewed mapping exists; keep it out of ranking when it cannot be interpreted safely. Do not silently map Travel to Essays or Life & Wellness to Science & Health: these concepts overlap but are not equivalent.

Distinguish a failed catalog fetch from a successful empty catalog. Use the last valid cached catalog during a network failure; do not repopulate categories deliberately removed by the server. A future category lacking translated labels should remain pending localization rather than appear in untranslated form.

Account hydration must not overwrite selections made while the request was in flight. Scope local account preferences to the signed-in profile; test switching between two accounts on one device. Check the currently started Android changes against these requirements before release. This is Phase 1 release work, not a later enhancement.

### 9.4 Treat content supply as a release dependency

Before promoting a language/category combination, measure eligible story and author inventory. Category existence and total post counts do not establish a useful human-only feed. Check provenance at candidate selection, response hydration, prompt shelves, and notification dispatch.

Sparse inventory should produce a truthful, useful short collection with an invitation to explore adjacent categories. Never fill it with duplicate, deleted, unknown-provenance, or synthetic stories. Track preferred-language fill rate and distinct eligible authors separately from total feed length.

Hold launch promotion for a segment that cannot provide a credible reading experience. Assign an editorial owner to fill gaps; this is not exclusively an engineering problem. Add this gate to Phases 0, 3, 8, and 12.

### 9.5 Coordinate permission, review, update, and onboarding prompts

Use a shared interruption policy so a reading completion cannot trigger a review request, notification permission prompt, and update dialog in sequence. Permit at most one nonessential prompt per session as an initial product rule. Prioritize recovery and explicit user actions over engagement prompts; defer prompts while typing, commenting, or restoring a draft.

Reaching 70% reading progress creates an opportunity, not an instruction to interrupt the reader. Present permission education at the next safe transition. Respect both a dismissed pre-prompt and an OS refusal. The 14-day interval is WritOn policy; it does not guarantee Android will display another permission dialog. Follow actual OS permission state and provide system-settings navigation when appropriate. See [Android notification permission guidance](https://developer.android.com/develop/ui/compose/notifications/notification-permission).

Add collision tests for review eligibility, update availability, and permission opportunity in the same session. Assign to Phase 6.

### 9.6 Apply one discovery budget, including weekly prompts

Recommend removing the weekly-prompt exemption: begin with at most two discovery alerts in a rolling seven-day period across digest, reading reminder, draft reminder, and weekly prompt, plus at most one on any local day. Publishing a prompt at Monday midnight must not send a midnight alert; release the content then and send only during an eligible daytime window.

Use one shared scheduler policy to choose the most useful candidate. If a reader returns, finishes the story, edits the draft, or disables a preference before dispatch, cancel the stale reminder. Recheck eligibility immediately before sending. After repeated ignored discovery reminders, pause or reduce frequency under an explicitly defined rule; missing telemetry alone is not evidence that someone ignored an alert.

Unlimited social alerts also need abuse protection: group bursts of comments/follows, suppress blocklisted or moderated actors, and prevent repeated follow/unfollow cycles from creating new alerts. Preserve individual events in the inbox where appropriate. Assign to Phases 5–7.

### 9.7 Keep private writing and bookmarks private

Recommend generic draft notification text by default: “Your writing is here whenever you’re ready.” Draft titles can reveal private thoughts on a lock screen. Never send draft bodies or titles to analytics.

Recommend removing author-facing bookmark notifications that identify the reader. Saving a story should be treated as a private action unless WritOn explicitly promises otherwise. Aggregate bookmark counts can remain separate from identities.

Keep guest draft reminders local. A server cannot know that an offline-only guest draft was edited or deleted without collecting additional data. Likewise, a shared guest FCM topic cannot enforce individual inactivity or a combined per-person notification budget. Use local scheduling for personal guest reminders, or defer that feature; do not introduce a persistent guest identity to solve this limitation. Assign to Phases 6–7.

### 9.8 Measure delivery honestly and make retries recoverable

Separate queued, attempted, accepted by FCM, received where observable, displayed where observable, opened, and followed by meaningful activity. FCM acceptance is not proof of device display. Some Firebase metrics are delayed and have collection limits; report missing evidence as unknown. See [Firebase message delivery documentation](https://firebase.google.com/docs/cloud-messaging/understand-delivery).

Handle partial multi-device success without resending to successful targets. Recover abandoned worker leases, bound retries, and retain a terminal-failure state for inspection. Give reminders an expiry so an obsolete invitation is not delivered much later. Measure server trigger-to-FCM-acceptance latency separately from device latency.

A return within 24 hours is an associated return, not automatically a caused return. Compare randomized eligible recipients with a no-discovery-push group before claiming incremental retention. Assign to Phases 5, 7, and 12.

### 9.9 Give each weekly prompt an editorial operating plan

Prepare four prompts with all six translations, rights checks, and human approval before launch. Name the editor responsible for weekly rotation and a backup reviewer. If the next prompt is unavailable, retain the previous collection and display its actual date; do not label stale content as new.

Recommend allowing late responses to archived prompts. Keep a draft's original prompt association stable across retries, but allow the writer to detach it at publication. Tapping the same prompt twice should offer to resume its existing draft rather than create duplicates.

Start with a modest prompt card. When responses are absent, show the invitation and relevant archived collections; do not invent participation. Review editor picks across authors and languages over time, and remove a pick automatically from public surfaces when its story becomes ineligible. Keep moderation and reporting available on every response.

Measure repeat participation across consecutive weeks, not just prompt draft starts. Give optional word limits clear, locale-tested semantics, and avoid blocking publication on an unreliable cross-language word counter. Assign to Phases 8–10.

### 9.10 Use experiments appropriate to a small audience

The earlier audience figures are historical, not a verified current baseline. Establish the eligible audience before choosing experiment sizes. Tiny 5% cohorts may help discover crashes but cannot establish a retention improvement by themselves.

Separate technical rollout gates from statistical product conclusions. Test one major behavior change at a time, define an outcome and observation window in advance, and wait for D7/D30 cohorts to mature. Report counts and denominators alongside percentages and uncertainty. A handful of returns must not become a claim of meaningful uplift.

Use account-stable assignment for signed-in users and local assignment for guests without a server guest identity. Record how login affects assignment and analyze contamination. Exclude staff and test activity. At low volume, supplement measurement with a small set of moderated first-session usability tests in the priority languages.

Suggested primary product outcome: proportion of eligible newcomers who return for a meaningful reading or writing session within seven days. Retain the existing activation definition and version any new qualified-session definition before collecting it. Assign to Phases 0 and 12.

### 9.11 Deliver in reviewable releases

| Delivery | Scope | Evidence required before expansion |
|---|---|---|
| A: Foundations and continuity | Preserve interests, category alignment, resume reading/drafts, baseline events | Offline/process-death checks; no preference loss; verified inventory |
| B: Notification control | Permission coordination, settings, social deduplication, discovery budget | Device tests, mute enforcement, worker retry and account-switch checks |
| C: Onboarding | Optional intent/interests, first-feed handoff, existing-user invitation | First-session usability and mature retention cohorts |
| D: Weekly prompts | Editorial admin, rotation, writer draft association, response archive | Four prepared prompts, rotation recovery, deletion/moderation checks |

Track each item as proposed, implemented, tested, device-verified, deployed, or outcome-validated. Attach evidence to each state. Do not mark the entire roadmap complete because tests pass, and do not let a delayed analytics dashboard block an independently verified reliability fix.

The existing thirteen phases remain the detailed work breakdown. These deliveries group them into manageable releases; they do not authorize API changes or set release dates.


## 10. GA4 Empirical Growth Directives (September 2026)

**Empirical Evidence Source:** [GA4 Analytics Growth Intelligence Audit (2026-08-11 to 2026-09-07)](file:///d:/VibeCode/WritOn-PowerUp/docs/audits/ga4-analytics-growth-intelligence-2026-09-08.md)  
**Baseline Health:** 154 active users, 146 new users, 1,233.5s (~20.5m) average engagement time per user, 4,629 total events. Readers entering `reader/{storyId}` read an average of **7.44 stories per active reader** with a low **10.53% bounce rate**.

To translate these engagement signals into scalable reader acquisition, retention loops, and store ranking, three growth directives are established for engineering, marketing, and autonomous AI execution:

### 10.1 Social Outbox UTM Campaign Tagging
- **Finding:** 96.75% of first-time users arrive categorized as `(direct) / (none)`, obscuring social acquisition performance from active Instagram, Threads, and X publishing drops.
- **Directive:** Enforce full UTM campaign hygiene across all dispatch links, `/go/:deliveryId` shortlinks, and bio URLs.
- **Specification:** Append `?utm_source={platform}&utm_medium=social_card&utm_campaign={campaign_name}&utm_content={delivery_id}`.
- **Implementation Targets:** `campaign/scripts/dispatch-publisher.mjs`, `public/canvas.html`, `server/src/routes/redirects.js`.

### 10.2 FCM Evening Push Habit-Loop ("Tonight's 3-Minute Read")
- **Finding:** Only 1 session in 28 days came from push notifications (`Firebase / notification`), despite high 20+ minute reading sessions.
- **Directive:** Automate a daily 20:00 IST habit-loop push notification via FCM topic `writon_daily_digest` and eligible registered tokens targeting the peak evening leisure reading window.
- **Content:** Highlight one curated 3-minute story with an immediate deep link into `reader/{storyId}`.
- **Implementation Targets:** `server/src/jobs/daily-digest.js`, `server/src/server.js`, `app/src/main/java/com/ibitvalley/writon/modern/core/notification/DailyDigestTopicSubscription.kt`.

### 10.3 In-App Review Eligibility Timing at 3rd Story Read
- **Finding:** Readers who open stories exhibit high loyalty (7.44 stories/reader, 10.5% bounce).
- **Directive:** Trigger the native Google Play `ReviewManager.requestReviewFlow()` immediately upon completion of a reader's 3rd story.
- **Constraints:** Respect a 90-day cooldown, trigger only on story completion (never during writing or error states), and capitalize on proven organic reader affinity to lift Play Store conversion.
- **Implementation Targets:** `app/src/main/java/com/ibitvalley/writon/modern/core/review/`, `app/src/main/java/com/ibitvalley/writon/modern/core/telemetry/ReviewPrompter.kt`.
