# First-time user usability audit — WritOn 2.0.52 (154)

Signup recovery and Settings follow-up (2.0.65 / 164, 2026-09-12): U06 is closed in source. After Firebase creates an email identity, a session/profile failure leaves the entered form intact and changes the primary action to “Finish account setup”; retry resumes token/profile synchronization without recreating the identity. Settings no longer displays disabled Applause, static account-avatar, or unavailable privacy rows. Focused recovery coverage, the complete debug/release JVM suites, Android-test compilation, and release lint pass. Interrupted-network device execution remains a release-validation gate; no authentication/profile API changed.

Audit date: 2026-09-06. Scope: first entry, guest reading, authentication, discovery, reader, writing/publishing, settings, accessibility, trust and returning-user continuity.

Remediation update (2.0.53 / 155): U01 and U02 are resolved in source by removing the unsupported private and scheduled publishing controls. U12 is resolved in source by removing decorative tags/covers and showing the real uploaded cover or category fallback. U03 is resolved in source for validation, visible failure, and queued-publication clarity: the screen now distinguishes ready, saving, offline, failed, and queued states, supports immediate retry, and lets the writer cancel a queued publication while preserving the draft. Focused unit tests pass; physical-device publication testing remains part of release validation.

Reader/search remediation update (2.0.53 / 155): U05 and U07 are resolved in source. An uncached story failure now ends in a localized Retry/Back state; a downloaded story remains readable and is labelled as a saved copy; a confirmed 404/410 remains a distinct unavailable state. Search now treats a successful empty response as authoritative, falls back to local results only after remote failure, labels saved results, exposes retry when no cache exists, and prevents cancelled older searches from replacing a newer query. Focused repository and ViewModel tests pass; device/offline-network validation remains part of release validation.

Authentication and settings remediation update (2.0.53 / 155): U04, U06, U08, and U11 are resolved in source. Protected destinations survive login/signup without silently replaying a social action; writer intent reaches the editor after onboarding; interrupted Firebase account creation exposes a profile-completion retry rather than creating the identity again. Notification preference loading now has Retry, preference writes are serialized, cancellation is preserved, and each labelled setting row is a single accessible switch target. Android test sources compile and the full debug unit suite passes; real Firebase interruption, process-recreation, rapid-toggle, and destination-return device scenarios remain release-validation gates.

First-minute remediation update (2.0.53 / 155): U10 is resolved in source for the compact default-scale layout by reducing nonessential vertical space while retaining a scrollable surface, and a 360×720 Compose regression case now requires all three entry choices to be visible. The sign-in and password-reset surface has been moved to localized resources in all six supported app languages, including password visibility descriptions and recovery/error states. This advances U13 and U14 but does not close either finding: Signup, editor, author/profile surfaces, locale rendering, 200% font scale, and a real TalkBack pass remain outstanding. The connected Redmi currently has 2.0.52 (154), so it is not evidence for the 2.0.53 changes until the candidate is installed.

Signup localization update (2.0.53 / 155): the full account-creation and partial-profile-recovery surface is resource-backed in all six app languages. Field labels, guidance, progress states, Google/session recovery, and password visibility actions are localized; Terms and Privacy are separate accessible controls; keyboard and navigation-bar insets are applied. A focused Compose test requires the account fields, legal actions, and both labelled password controls to exist. U13 and U14 remain open for the editor, author/profile surfaces, native-language rendering, 200% font scale, and TalkBack device validation.

Writer-profile and notification-inbox update (2.0.53 / 155): the public writer profile and notification inbox are now resource-backed in all six app languages, covering headings, errors, empty states, follow counts/actions, story metrics, filters, sections, and spoken icon labels. Notification filters use stable internal enum values rather than English labels, so localization cannot change query or filtering behavior. Android compilation, instrumentation-source compilation, and the unit suite pass. U13 is now closed in source for the audited welcome, authentication, editor/publication, writer-profile, and notification-inbox journeys; native-language device review remains a release-validation gate. U14 remains open pending TalkBack, 200% text, landscape, and physical-device validation.

Signed-in Profile completion update (2.0.53 / 155): the owner-facing Profile surface is resource-backed in all six app languages, including navigation, statistics, tabs, biography, story/series summaries, editing, accessibility labels, and validation failures. A failed initial request no longer renders a plausible but empty profile: it now shows an explicit localized recovery state with Retry, while a real request in progress has a distinct loading state. Profile and optional-milestone requests preserve coroutine cancellation. A focused regression test proves initial failure is exposed and a successful retry clears it. Source-level Phase 4 remediation is complete; native-language rendering, TalkBack, large-text, landscape, theme, and physical-device profile editing remain release-validation evidence rather than source blockers.

Edge-to-edge device correction (2.0.53 / 155): physical inspection on the Redmi A5-class 720×1640 viewport showed the shared bottom navigation extending into the 96-pixel Android navigation region; lower taps were intercepted and labels were visibly obscured. The shared bottom-bar root now applies native navigation-bar insets, and the central write action uses the existing localized navigation label. A release-signed APK was rebuilt and installed as a data-preserving update. Before correction, navigation icons occupied y1515–1567 while the system navigation region began at y1544; after correction, all five actions occupy y1419–1476, labels are fully visible, taps succeed, and the post-launch AndroidRuntime check contains no fatal exception.

Editor localization update (2.0.53 / 155): the writing pad and publication surface are resource-backed in all six app languages. This includes title/body prompts, draft lifecycle labels, formatting actions, word/read-time summaries, category and cover descriptions, validation, public-publication readiness, offline status, queued-publication recovery, and draft-preserving cancellation. Locale-key parity confirms all 47 `editor_*` strings exist in English, Hindi, Bengali, Marathi, Spanish, and French. Application and Android-test sources compile and the debug unit suite passes. U13 is now limited to remaining author/profile and notification-inbox surfaces plus visual native-language QA; U14 still requires large-text and TalkBack device certification.

Method: current source inspection, scoped Graphify query, comparison with the September 6 new-user review, and a limited physical Redmi A5/Android 15 walkthrough of installed version 154. This is a broad usability audit, not exhaustive device certification. No test account was created; no story was published; no account settings or production services were changed. Device navigation generated ordinary reading/analytics activity. The device was left on the reader after dismissing the guest sign-in dialog.

Evidence labels: **Device** means observed in the installed app's UI hierarchy; **Source** means traced implementation; **Risk** means consequence inferred from that implementation; **Unverified** means further execution is needed. Severity P0 means privacy/release blocker, P1 means major task failure or trust problem, P2 means friction/polish.

## Assessment

The first reading journey now delivers value: a visible Start reading button opened a populated feed without authentication; opening a card loaded story text; Save offered Sign in or Keep reading. However, the writer journey contains controls that promise behavior the application does not perform. Do not promote this candidate broadly until the publishing issues below are corrected. Two testers reduce exposure but do not make private-publication testing safe with real private material.

The earlier claim that this bundle was ready for Open Testing was based on build checks, not this deeper functional audit. Passing compilation, signing and unit tests did not detect the disconnected publishing controls.

## Observed first-session journey

| Step | Evidence | Outcome |
|---|---|---|
| Welcome | Device, 720×1640 viewport | Short single welcome, localized resource-based copy; Start reading visible near the bottom. Writer CTA partly at viewport edge; sign-in/legal links require scrolling. |
| Start reading | Device | One tap reached Home with a real story card, author name/avatar, summary and category image. No up-front sign-in or permission modal appeared in this walkthrough. |
| Open story | Device | Header and story body loaded. No obsolete “no text yet” placeholder in this case. |
| Save as visitor | Device | Clear Sign in / Keep reading choice; no social action was executed. Dismissal preserved the reader. |
| Content consistency | Device | Card/header title was “The Measure of the Seam”; first body heading was “The Iron Needle at Dusk”. Needs editorial source comparison; no provenance inference can be made from the name or writing style. |
| Remaining journeys | Unverified on device | Authentication submission, publishing, upload, offline/relaunch, TalkBack, alternate languages, notification receipt and Play review/update UI were not executed in this audit. |

## Findings and acceptance criteria

### U01 — P0: Private publishing choice is ignored

**Source:** `StoryEditorScreen.kt:485` PublishStoryScreen stores `isPublic` with rememberSaveable. The Private option says “Only you can see”. The publish button only calls `viewModel.publishStory(onPublished)`; it never passes visibility. `EditorViewModel.kt:140` saves without a visibility argument. `DraftRepository.kt:131` publishes with `isPublished=true`. `server/src/server.js:2370` inserts `is_public=true`.

**Risk:** a writer selecting Private can publish publicly. This was not reproduced with private material.

**Recommendation:** immediately remove/disable the unsupported private publication control and clearly identify publication as public; retain private drafts. A complete private-story contract is separate work and requires the existing API discussion checkpoint.

**Acceptance:** no enabled control promises private publication unless storage, API reads, sharing, discovery and notifications all enforce that choice. Test using disposable non-sensitive content.

### U02 — P1: “Schedule for later” does not schedule

**Source:** `StoryEditorScreen.kt:501,619` toggles `isScheduled` and changes text; no date/time is collected or passed to publish. The same immediate publish request executes.

**Recommendation:** hide the control until scheduling exists; do not imply a successful schedule.

**Acceptance:** the release either has no scheduling choice or persists a selected time and proves the story remains unpublished until then.

### U03 — P1: Publishing errors are not displayed where the user submits

**Source:** PublishStoryScreen observes `isPublishing` but not `draftStatus`; EditorViewModel writes validation/network failures to `draftStatus`. Only StoryEditorScreen renders `EditorDraftStatus.Failed`.

**Risk:** Publish changes to Publishing and back with no explanation, encouraging repeated submissions. Repository publish also enqueues unsuccessful publication attempts; a later retry may publish after the user believes it failed.

**Recommendation:** display validation and server failures on the publishing screen; explicitly distinguish “saved locally”, “queued to publish” and “published”. Offer a clear retry/cancel policy for queued publication.

**Acceptance:** offline/server rejection/short title cases have visible actionable feedback; a queued publication is never presented merely as failed; repeated taps cannot create duplicate stories. Validate title minimum consistently with server `min(3)` rather than nonblank-only client validation.

### U04 — P1: Successful login loses the reader's intended destination

**Source:** `WritOnNavigation.kt:202,223` guest sign-in opens Login; success routes to Home or onboarding, without retaining the original story/action. No pending action record was found in this flow.

**Risk:** someone signing in specifically to save a story must find it again.

**Recommendation:** persist the originating readable route through login/signup and restore it. Offer the original save/follow action again; avoid silently replaying sensitive actions.

**Acceptance:** sign-in, signup, cancellation and process recreation return to the same story at an appropriate position.

### U05 — P1: Uncached reader can spin forever after failure

**Source:** `ReaderScreen.kt:299` renders a spinner whenever `post == null`, independent of completed loading. `ReaderViewModel.kt:65` handles RETAINED_OFFLINE without exposing an error, then sets loading false. With no cached post the screen stays on the spinner.

**Recommendation:** separate loading, unavailable, cached/offline and failed-with-no-cache states. Provide Retry and Back.

**Acceptance:** an uncached deep link opened offline or under API failure ends in a useful recovery state, while a cached story remains readable.

### U06 — P1: Partial account creation has no direct completion retry

**Source:** `SignupScreen.kt:255` creates Firebase identity, then syncs token/profile. Profile failure leaves the same Create Account button; pressing again invokes account creation again. Error copy acknowledges creation but the action does not resume it.

**Recommendation:** retain a “Finish setting up your account” state and retry only token/profile completion; keep Back/reading available and entered data intact.

**Acceptance:** interrupt profile creation after Firebase success, retry, and reach the app without email-already-in-use loops or duplicate profiles.

### U07 — P1: Search mistakes failures for no results and can revive stale content

**Source:** `SearchViewModel.kt:49` converts non-success responses/exceptions to empty collections. Stories use local results whenever remote results are empty, including a successful empty result. SearchScreen has loading/results but no failure state.

**Risk:** empty server results can be replaced by obsolete cached stories; network failures look like nobody has written anything relevant.

**Recommendation:** preserve response outcome separately from results, label cached results, respect authoritative empty responses, and offer retry. Retain query identity/cancellation so old searches cannot replace newer results.

**Acceptance:** successful empty, offline with cache, offline without cache, deleted story and quickly changed query each produce the correct state.

### U08 — P1: Notification settings can race and lack load retry

**Source:** `NotificationSettingsScreen.kt:79,89` launches independent save coroutines; each replaces the entire displayed preference object or restores its own prior snapshot. No request ordering/pending guard exists. Load failure displays text without Retry.

**Risk:** two quick toggles can display a stale server snapshot or undo an unrelated successful selection. This concurrency case is source-inferred, not device-reproduced.

**Recommendation:** serialize saves or reconcile responses per field; provide saving/failure status and a retryable load.

**Acceptance:** reverse response ordering and fail one of two rapid toggles; UI and server still agree for each field after settling/reopening.

### U09 — P1: Reporting promise has no discoverable implementation

**Source:** search of Android main sources and inspected server routes found no story/comment/profile reporting or user-block action. `server/src/server.js:3652` explicitly promises a Report item in the three-dot menu.

**Recommendation:** verify moderation operations and make an accessible report/contact path available; align public copy with the mechanism that actually exists. A new report/block API needs discussion before implementation.

**Acceptance:** a reader can report a specific story/comment/account, get confirmation, and the moderator can find that report. Do not certify absence across every external surface from this scoped search.

### U10 — P2: Welcome still pushes sign-in below the fold

**Device:** on the Redmi viewport, Start reading is visible at y1225–1337; writer CTA reaches the scroll boundary and sign-in is initially absent. **Source:** WelcomeScreen uses large spacers/illustration; both parent Scaffold and child apply system padding.

**Recommendation:** reduce decorative height and review duplicate inset application. Keep reading, writing and existing-user sign-in discoverable at default scale; allow scrolling at large text.

**Acceptance:** all entry choices are obvious on the small target screen without guessing that more content exists. Preserve accessible legal links.

### U11 — P2: Writer intent leads to account setup rather than writing

**Source:** `WritOnNavigation.kt:324` “I want to write” routes to Signup, with no writer destination carried through completion; later flow reaches Home. This is a design gap, not authorization to loosen publishing identity requirements.

**Recommendation:** preserve writer intent and land in the editor after setup. Consider local guest drafting separately while keeping publish/social actions gated.

**Acceptance:** the selected writing goal survives signup/interests and results in a safe draft without another search for the editor.

### U12 — P2: Tags and cover preview do not reflect publication metadata

**Source:** PublishStoryScreen starts with hardcoded `writing/reflection/story`; Add tag appends literal `new tag`. Tags are not passed to the ViewModel. PublishPreview receives an integer decorative `selectedCover`, while publication uses the ViewModel's uploaded `coverImage`.

**Recommendation:** remove unsupported tag editing; display the actual uploaded cover or category fallback. Only expose metadata that survives save/publish.

**Acceptance:** preview and published story agree; users can enter a real tag only when the backend can store it.

### U13 — P2: Localization remains incomplete along core tasks

**Remediation update — 2026-09-11:** Login, password recovery, and signup now consume the existing six-locale Android resources instead of embedded English labels and status copy. Password visibility and Back controls also have localized accessibility descriptions. This closes the account-entry portion only; alternate-language device checks and the remaining core-task surfaces are still required.

**Source:** hardcoded English remains in Login/Signup, editor Save/status/publish controls, author profile, reading-time labels, and accessibility descriptions. Login promises “email or username” while FirebaseAuthManager directly calls signInWithEmailAndPassword.

**Recommendation:** use truthful “Email address” wording unless username resolution is implemented; resource and review the whole critical journey in the four priority languages, then all six supported app languages.

**Acceptance:** switching language covers errors, placeholders, buttons, plurals and spoken labels, not just headings. Native-language QA remains required.

### U14 — P2: Accessibility semantics need focused repair and device testing

**Source:** NotificationSettingsScreen back button contains a bare ‹, with no meaningful back description. Setting labels and switches are separate accessibility nodes; the switch has no explicit label association. Several fixed-height buttons and English descriptions need scaled-text/regional-language testing.

**Recommendation:** accessible localized Back label, merged/labeled switch rows, suitable touch targets and one clear action per focus stop.

**Acceptance:** TalkBack announces setting name/state/action; 200% text, large display, landscape and keyboard do not hide the primary action. No comprehensive TalkBack or contrast pass was executed here.

### U15 — P2: Returning writers lack a Home resume affordance

**Source:** account-scoped DraftEntity/repository ownership and explicit legacy claim now exist. FeedScreen accepts reading continuation only; no draft continuation input was found.

**Recommendation:** surface the latest current-account draft with an accurate local/synced status, preserving explicit legacy ownership confirmation.

**Acceptance:** switching users never exposes another user's draft; resume works offline and after process recreation. This is a remaining UI task, not a missing ownership implementation.

### U16 — P2: Content presentation deserves editorial QA

**Device:** the first opened story's body heading differs from the card/header title. **Unverified:** whether this is intentional creative structure, a metadata error, or imported content mismatch; verified-human inventory was not independently audited.

**Recommendation:** audit the first handful of stories shown in each promoted language for matching title/body, correct author image/credit, readable formatting and trustworthy provenance. Curate a small Start here collection if eligible inventory supports it.

**Acceptance:** first-session stories pass editorial checks; no invented engagement or implied provenance based on appearance.

## Corrections to earlier status summaries

- Welcome is already one screen, uses string resources, and has active Terms/Privacy links; do not reopen those old findings unchanged.
- Home already distinguishes failure/empty/loading and exposes retry. Search and uncached reader retain separate gaps.
- Draft ownership is implemented. Home draft resume remains missing; device isolation tests remain a separate gate.
- EngagementPreferencesSync.hydrate pushes pending choices, and navigation invokes hydration on account entry. “Manual retry only” was too broad; reconnect-without-relaunch behavior still needs verification.
- Granular notification controls exist locally, but exposed reading/draft/weekly toggles should not imply unfinished schedulers are active. Verify deployed capability before enabling their UI.
- A new AAB does not deploy server fixes, migrations or notification policies. The known canary avatar redirect error still requires its own deployment verification.
- Filtering CancellationException from Crashlytics reduces reporting noise; it does not repair broad catch/runCatching sites that swallow cancellation. Treat that previous change as telemetry hygiene, not complete lifecycle recovery.

## Recommended work order

1. **Publishing trust:** remove unsupported Private/Schedule/Tags controls, show actual cover, show errors/queued status at submission. No new API is needed to remove misleading UI. Prove with non-sensitive test drafts before wider distribution.
2. **Finish interrupted tasks:** return to originating story after auth, recover partial signup, distinguish reader/search failure from empty results, repair notification save ordering/retry.
3. **First minute and accessibility:** compress welcome, preserve writer destination, complete language copy and meaningful spoken labels; run small-screen/large-text testing.
4. **Retention:** current-account draft resume, useful related reading/editorial first collections, then discovery scheduler and weekly prompts after delivery/consent gates pass.
5. **Release evidence:** execute the actual Play-distributed build on fresh/upgrade installs; verify server compatibility and controlled rollout separately.

## Test matrix to close the audit

| Journey | Minimum acceptance | Execution in this audit |
|---|---|---|
| Guest welcome → feed → reader → gated Save → dismiss | No forced identity; preserves story | Passed on Redmi |
| Welcome at default/large text, six locales | Entry choices readable, legal actions accessible | Default hierarchy inspected; rest pending |
| Signup with profile failure; existing login from story | Retry completes setup; restores intended route | Source findings; device pending |
| Offline fresh deep link/search; deleted story | Honest recovery and no stale resurrection | Source findings; device pending |
| Draft autosave/process death/two-account switch | No data loss or cross-account disclosure | Source reviewed; device pending |
| Publish private/schedule/invalid/offline | Truthful controls and explicit outcome | Source blockers; do not use sensitive content |
| Rapid notification toggle/failed load | Final server/UI agreement, retry available | Source risk; controlled test pending |
| Guest/auth push foreground/background/terminated | Consent, one notification, right destination | Not sent in this audit |
| TalkBack/font scaling/dark theme/keyboard | Labeled actions and unclipped task completion | Not certified |
| Play install/update/review and shared links | Exact candidate behavior with Play signing | Prior sideload is not Play evidence |

## Measurement and limits

Track first-open → visitor/intent selection → feed loaded → story open → engaged reading → second meaningful action → D1/D7 return, and a separate draft-start/save/publish funnel. Record error/empty outcomes and time to first value. The navigation uses screen names such as HomeFeed and StoryReader; do not compare historical lowercase home counts as if instrumentation stayed constant. Separate testers, versions and acquisition cohorts. No conversion or retention uplift is claimed by this audit.

The original audit was documentation-only. Later remediation updates below record separately verified source changes; they do not certify release readiness or exhaustively review security, production inventory, every locale/device, or moderation staffing.

## Phase 5 source remediation update — 2026-09-07

- Queued social push delivery now rechecks the target story at the final delivery boundary. A story must still be published, public, verified-human, and owned by a human account; otherwise the delivery is skipped before any device token is contacted.
- The Android activity inbox now shows distinct loading, failed-with-Retry, and genuinely-empty states instead of presenting every failed request as “No notifications yet.”
- Inbox filters now operate over one complete response so legacy/canonical families remain together: comment + reply, applaud + first applause, follow + new follower, and publication/editorial activity. The previously empty Mentions filter is now a Stories filter because no mention event exists in the current product contract.
- Existing source support covers: first genuine-human applause, comments on a story, replies to a comment, new followers, and new verified-human publications from followed writers. Same-author publications are batched per recipient and local day, preventing one notification per upload.
- Inbox destinations now match their value: story-related activity opens the story and new-follower activity opens the follower profile, with focused unit coverage for both paths.
- Canonical activity wording is now rendered from localized Android resources rather than exposing English server fragments in every locale. Single and batched followed-writer publications use distinct copy, while unknown legacy records retain their stored text.
- The isolated local PostgreSQL staging gate passed on 2026-09-07: notification migrations, RLS, atomic publication capture, repeated-state deduplication, verified-human fan-out, same-author/local-day batching, and an unsent outbox row were all verified. Push remained disabled and no FCM message was sent.
- The regression was established test-first: the focused contract test failed on the missing delivery-time predicates, then passed after the minimum query guard was added.
- No endpoint, request field, response field, FCM payload, database record, deployment, or production service was changed by this local source update.
- Phase 5 is not yet operationally closed: canary evidence is still required for event-to-delivery latency, duplicate-visible rate, foreground/background/terminated delivery, destination routing, and proof that test/bot activity never reaches a production user.
