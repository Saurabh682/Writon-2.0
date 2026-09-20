# WritOn: new-user usefulness and invitation review

Date: 2026-09-06. Scope: source and roadmap review of Android entry, authentication, feed, reading, writing, preferences, notifications, trust, accessibility, measurement, operations and release readiness. This is not an exhaustive security audit or a new physical-device/production certification. Current local Android configuration is 2.0.45 (147); that is not evidence of the installed Play version. No application code or production settings changed in this review.

## Product recommendation

Make the first session deliver one worthwhile read or one safely saved piece of writing. The app already has enough core features to do this. Prioritize understandable entry, useful human content, recoverable failures and continuity before adding more screens or notifications.

Suggested first session: welcome with primary “Start reading”, secondary “I want to write” and visible sign-in; optional interests; useful first collection; contextual account invitation only for a persistent social action. Preserve the existing visitor path and app-language-first feed policy. A specific incoming story link takes precedence over onboarding or intent routing.

## Confirmed source findings

| Priority | Finding | Evidence | Recommended action and acceptance |
|---|---|---|---|
| P0 | Feed errors can look like indefinite loading | FeedViewModel refresh and pagination catches print exceptions without exposing an error state; FeedScreen EmptyDiscovery says “Stories are loading from writers...” whenever the list is empty | Distinguish initial loading, offline cache, network failure, empty eligible inventory and exhausted results. Each state has an honest message and useful action. Test first install with no network, API 500 and successful empty response. |
| P0 | Draft ownership needs resolution before Home draft resume | core/database/model/Entities.kt DraftEntity has no owner identifier; roadmap explicitly defers draft continuation for this reason | Trace repository and outbox isolation, add explicit ownership/migration where needed. Unknown legacy ownership must not be assigned silently. Two-account/offline/logout tests must prove no draft disclosure or upload to another account. This is a risk finding, not a reproduced leak. |
| P0 | Staging/release evidence remains incomplete | docs/antigravity-staging-recovery-handover.md and conflicting historical progress records | Complete isolated database health and hosted authenticated tests; record code/test/device/staging/Play status separately. Never use a Render Live badge or JSON root response as database proof. |
| P1 | Welcome is lengthy and contains implementation jargon | WelcomeScreen.kt has four slides and phrases including “background outbox synchronization” and “multi-topic classifications” | Replace with one brief welcome and optional contextual tips. Visitor exists on every page but should be more prominent. Measure time to first meaningful read/write. |
| P1 | Welcome promises need verification | WelcomeScreen advertises instant on-device AI takeaways and Google sign-in “with device passkeys”; GoogleCredentialSignIn requests Google ID tokens | Remove or accurately qualify unsupported promises. Credential Manager Google sign-in is not proof of a WritOn passkey login feature. Verify every claim against the actual release artifact; do not add AI merely to justify copy. |
| P1 | Localization is incomplete at first contact | Welcome slides, login placeholders and FeedScreen loading/empty strings are hardcoded English | Move user-facing copy into resources; native-language review for English/Hindi/Bengali/Marathi. Test error states, plural forms, date/time, script shaping and truncation, not just headings. |
| P1 | Welcome legal labels are styled text | WelcomeScreen footer builds a Text with colored Terms/Privacy spans; inspected code has no link action on them | Provide separately accessible working links so a new user can inspect them before proceeding. |
| P1 | Saving a story generates an author-facing event | server/src/server.js bookmark mutation calls createNotification with actorId and “bookmarked your story” | Decide explicitly whether saves are private. Recommendation: no identified bookmark notification; keep aggregate counts separate. Review compatibility and user expectations before changing this behavior. |
| P1 | Reporting promise needs end-to-end verification | Server child-safety page promises Report from story/comment/profile menus; targeted Android/router searches did not locate corresponding reporting actions | Manually trace menus and routes before declaring absent. If missing, implement report/block, moderation queue, status and abuse controls; align public promises with actual operations. New APIs require owner discussion. |
| P1 | Accessibility needs a release gate | Welcome uses a fixed-color, fixed-height composition; Home uses custom card/gesture navigation | Run TalkBack, large text/display scaling, long regional text, dark/system themes, small Redmi screen, keyboard and landscape checks. Every gesture needs an accessible equivalent. No device failure was reproduced in this review. |

## What already exists and should be strengthened

- Visitor action on every welcome page and contextual GuestSignInPrompt wiring.
- Google Credential Manager sign-in, signup screen, auth recovery work and existing device evidence recorded in changelog.
- Personalized feed foundations, interest catalog/preservation, human-provenance filtering and deep-reading digest logic. Live eligible inventory and rollout outcomes remain separate checks.
- Reader formatting/themes, sharing, bookmarks and local Continue reading. Current continuation is proportional position, not paragraph anchoring or cross-device continuation.
- Local-first drafts, formatting preview, autosave/outbox work, profile image fallback/upload fixes and story-deletion work recorded in repository history. Recheck release/device regressions rather than rebuild these systems.
- FCM delivery/outbox, guest topic lifecycle, telemetry, review eligibility and update UI foundations. Working code does not prove background delivery or Play-native UI on an installed release.
- Unit, contract and Android journey tests exist. Historical passing totals vary by delivery; none were rerun for this read-only review.

## Remaining roadmap work

The engagement roadmap records Phases 1–2 as implemented locally, with deployment/device gates open. Read its dated follow-ups rather than interpreting every old baseline row as current.

1. Finish staging, migration verification and real hosted authentication for engagement preferences.
2. Wire primary intent and onboarding completion into actual landing flows; add the respectful existing-user preference card.
3. Complete automatic retry for pending signed-in interests/preferences; retain account isolation and explain unsynced state without exposing technical jargon.
4. Resolve draft ownership, then add safe draft continuation. Retain guest writing locally and define explicit account-claim behavior.
5. Coordinate permission, review, update and onboarding prompts. One nonessential interruption per session is a proposed starting policy, with safe transitions and no interruption while writing.
6. Complete social-notification policy, followed-author publication coverage and a shared discovery budget, consent controls and scheduler cancellation rules.
7. Build weekly prompt backend/admin/Android/editorial workflow only after content supply and notification policy are reliable. These are new contracts requiring discussion.
8. Complete two-account, offline, upgrade, deleted-content, notification and deep-link device tests against the exact candidate artifact.
9. Establish rollout/retention evidence and a repeatable release manifest. Synchronize branches only after an approved release state; preserve current uncommitted work.

## Additions ranked by usefulness

| Timing | Addition | Why it helps | Dependency / proof |
|---|---|---|---|
| Next | A short “Start here” collection in each supported language | A new reader gets a small, credible choice instead of an unexplained feed | Enough verified human stories and distinct authors; all curated items need rights and eligibility checks |
| Next | Clear first-screen reading CTA and optional interests | Makes visitor access obvious and reduces setup effort | Preserve deep-link destination; compare first-story rate and time to engaged reading |
| Next | Recoverable feed and sync status | Shows people that their reading/writing is safe and what to do next | Offline cached reads, explicit retry, distinct local-save versus account-sync status |
| Next | Gentle end-of-story continuation | A finished story leads to one related human story or the author's page | Avoid an overwhelming carousel or immediate review/permission stack; measure second meaningful read |
| Next | Writer start surface: blank page or small starter prompt | Reduces blank-page hesitation without taking over authorship | No forced empty draft; support poems, journals and short stories with optional structure |
| After foundations | Private saved collections and reliable offline reading | Gives readers a reason to return to their own library | Storage controls, deleted/unpublished-content policy, account isolation; distinguish saved from downloaded |
| After foundations | Curated author introductions and follow suggestions | Makes the community feel inhabited by real people | Sufficient active human authors; voluntary follows; avoid preselected bulk follows |
| After foundations | Weekly writing invitation with a response shelf | Gives writers a recurring purpose and readers fresh material | Editorial owner, translations, moderation, rights, expiry/archive and fair author diversity |
| After foundations | Calm personal reading/writing goals | Supports a habit without punishment | Optional and private; no lost-streak pressure; avoid reminders until user opts in |
| Later | Cross-device reading position and draft history/export | Improves long-term utility and trust | Ownership, conflict resolution, deletion/export lifecycle and API discussion |
| Later | Optional read-aloud / accessibility enhancements | Makes reading useful in more situations | Language quality, offline availability, licensing and device performance validation |

These are product proposals, not approved API changes. Avoid launching all of them together; choose the smallest cohort-testable improvement.

## Content, community and trust

Engineering cannot personalize an empty shelf. Audit eligible inventory by language/category and distinct human authors before promoting a segment. Suggested editorial starting target: a small collection of roughly 10–20 worthwhile stories from several authors per promoted language; this is a planning target, not measured current supply or a guarantee. Show truthful sparse-inventory states and preserve minority-language exposure.

Give new writers a simple publication checklist, preview, clear visibility and edit/delete controls. Provide a human editorial welcome and useful feedback where staffing permits, without invented engagement, fake authors or guaranteed applause. Keep private saves and draft contents out of public activity and lock-screen text by default.

An older API findings register lists open bot/admin authorization issues. Treat that register as historical leads and verify current route protection before any public expansion; this review did not retest those endpoints. Human-only feed filtering alone is not proof that every write/admin surface is secure.

## Measurement and notification policy

Rebuild one version-aware first-session funnel: first open → welcome/visitor/intent choice → feed loaded → distinct story opened → engaged read → meaningful second action → next-day/seven-day return. Separate writers with draft-start/save/publish milestones. Screen counts from different GA4 reports do not prove a sequential 129→11→7 funnel. Likewise app_remove/new_users is not a cohort uninstall rate. Separate test traffic and missing telemetry from actual abandonment.

Track time to first value, empty/error feeds, unique eligible authors seen, draft-save/sync failures, seven-day reader/writer returns and support reasons. Avoid a single applause-driven activation definition masking poor reading retention.

Notifications need queue/attempt/FCM acceptance/observable receipt/open/meaningful return stages. Missing receipt events do not alone prove plumbing failure. Test guest and signed-in devices with consent in foreground, background and normal process-terminated states; treat Android force-stop separately. Social alerts and optional discovery should have distinct policy, deduplication and expiry. Proposed starting discovery cap: two per rolling week, respecting quiet hours and stopping obsolete reminders; this requires design/API review, not a silent change.

Keep native reviews at earned moments and treat flow completion as neither proof the card displayed nor proof a review was submitted. Follow [Google's in-app review guidance](https://developer.android.com/guide/playcore/in-app-review). Validate scalable text and accessible actions using [Compose accessibility testing](https://developer.android.com/develop/ui/compose/accessibility/testing) and [scalable content guidance](https://developer.android.com/develop/ui/compose/accessibility/scalable-content).

## Delivery order and acceptance

1. **Trust and release readiness:** staging recovery; exact artifact manifest; draft/account isolation; safe stale-content behavior; report/block audit. Exit: verified critical flows and no unresolved data-loss/security blocker.
2. **First minute:** simpler localized welcome, prominent visitor entry, useful first collection, distinct feed failure/empty/offline states, accessible legal links. Exit: a new visitor can find and read a story without auth, with understandable recovery offline.
3. **First contribution:** writer start/preview, safe save/sync status, signup return-to-action, deletion and profile-photo regression tests. Exit: interrupted writing and upload recover without lost content or duplicate publishing.
4. **Reason to return:** reading continuation, related story/author discovery, shared prompt policy and verified notification lifecycle. Exit: continuity survives process recreation and reminders respect consent/budget.
5. **Community rhythm:** weekly prompts, editorial response shelf and voluntary follows. Exit: editorial and moderation capacity, human provenance and translations verified.
6. **Learning and expansion:** controlled rollout, language inventory growth, cross-device continuity and optional enhancements. Exit: retention improvement with stable reliability/diversity; do not claim uplift from small uncontrolled samples.

Before broader promotion, run the same first-session journeys on the actual candidate build in all four priority languages, large text, slow/offline network, an existing-account upgrade and two-account switching. Test approved production compatibility separately; passing isolated staging does not authorize a production rollout.

## What to defer

Defer direct messaging, public leaderboards, coins/streak penalties, aggressive daily broadcasts, more onboarding screens, paid acquisition, and a larger AI feature set until the basic reading/writing loop and moderation capacity are established. Monetization should not interrupt the first successful read or compromise private writing.

## Suggested immediate batch

Finish staging recovery in its existing task, then implement the feed state model and simplify/localize the welcome screen. In parallel at the operational level, curate the first language collections and verify moderation coverage. Resolve draft ownership before adding any resume-draft surface. This is the clearest path to a more welcoming app with measurable new-user benefit.
