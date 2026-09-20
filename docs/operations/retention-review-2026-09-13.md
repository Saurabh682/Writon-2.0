# WritOn retention review and Antigravity handoff

Reviewed 13 September 2026. Planning window: 13–26 September 2026. Times: IST.

## Decision

Keep crash recovery first. Verify the released guest journey next. Move measurement into the first two days alongside those checks. Replace “turn push on” with “verify delivery, eliminate overlap, and measure useful returns”: the production morning and evening digests are already enabled and dispatching.

The product objective is a useful first session followed by an easy second session: read one relevant short story, or save a few original lines; then return to that story, draft, or writer. Prioritize reliable existing flows before adding another engagement feature.

The initial delivery was an investigation and implementation plan. The follow-up below records subsequent local build repairs. No production setting, notification schedule, or campaign was changed. Local code observations do not prove that the same behavior is installed on users' devices.

## Follow-up: production verification and build recovery

On September 13, Google Play Console's production track explicitly lists **164 (2.0.65)** as the latest release. The local **2.0.66 (165)** editor fix is therefore not the current production release. The update-published notification alone did not establish which version was published.

Running the broader retention regression suite exposed missing default resources in the current checkout. Repaired Firebase's default channel metadata to use the existing `writon_editorial_channel` literal. Recovered 305 missing default strings and the interest-selection plural from the existing September 13 09:36 debug APK, and supplied the two newer default update-notification labels. Recovery lives in `app/src/main/res/values/retention_recovered_strings.xml`; existing generated translations are preserved. The source of the resource loss was not established; do not attribute it to a specific agent or script without evidence.

The connected Android device was detected, but its default package listing did not show `com.ibitvalley.writon`. No app data was cleared and no APK was installed. Released guest behavior and on-device formatting remain unverified. No new release artifact was generated or uploaded.

Validation after recovery: compilation succeeded and all **26 tests across seven suites passed**, with zero failures, errors or skips: editor formatting (5), editor draft restoration (6), draft repository reliability (4), reading continuation (2), guest notification policy (2), growth-tracker failure handling (3), and growth-tracker opportunities (4). These are local unit/regression results, not production or on-device acceptance. Remaining resource warnings concern other locale-only entries without defaults; no complete localization audit was performed.

## What the evidence establishes

### Crashes: a specific September 12 defect is confirmed

Live Android Crashlytics shows `StoryEditorScreenKt.prefixCurrentLine`, `StringIndexOutOfBoundsException`, at `StoryEditorScreen.kt:356`, in **2.0.65 (164)**. The issue has **two events affecting one user** in the inspected September 7–13 window. Device distribution is OnePlus / Android 11; the selected event identifies OnePlus 8 Pro and occurred **September 12 at 22:28:31**, as displayed by the console. Events are foreground crashes.

Breadcrumbs immediately before the selected crash show HomeFeed → Profile → Settings → StoryEditor. The stack passes through the formatting toolbar. This is evidence of an editor formatting failure; it does not establish a first-open crash.

The existing workspace change removes the incorrect minimum-zero clamp from the newline search immediately before the cursor. A leading newline with the cursor at zero could previously produce a start after the line end. Current version metadata is **2.0.66 (165)**. All **five** existing `EditorMarkdownFormattingTest` tests passed on this review, including leading-newline boundary coverage. This was an existing fix, not a new change made in this review.

Next: verify the exact distributed artifact contains this fix, test the formatting action on-device, and inspect version adoption and recurrence. Do not mark the incident resolved solely because local tests pass. A separate welcome-resource crash on 2.0.41 also appears in the seven-day open-issue list.

**Unresolved:** the CSV's September 12 crash-free figure of 78.6% has not been fully reconciled to the live issue population. Align app identity, date/timezone, issue states, reporting lag, and distinct-user denominators before attributing that entire drop to this one issue. The live seven-day Android crash-free rate is a different window and cannot replace the CSV's daily value.

### Guest reading exists; writing still asks for an account

Current navigation starts a fresh installation at Welcome. The primary action is **Start reading**, which enables visitor mode and goes directly to Home. Returning visitors go to Home. Reading therefore already has a one-tap guest entry in local code.

The Welcome writing action goes to signup. The bottom-navigation Write action also requires authentication for guests. Investigate the writer entry-to-signup-to-editor funnel separately from the reading journey.

The 108 welcome, 73 SignInHubActivity, 72 login and 41 signup values are screen views, not distinct users moving through a compulsory sequence. They cannot establish a sign-in abandonment rate. The export mixes Activity and Compose screen classes.

### Push is active; the export does not establish 530 reachable subscribers

Live Cloud Scheduler configuration:

| Job | State | Schedule |
|---|---|---|
| writon-daily-digest-morning | ENABLED | Every day, 09:00 Asia/Kolkata |
| writon-daily-digest-evening | ENABLED | Every day, 18:00 Asia/Kolkata |

Structured production dispatch logs confirm:

| Dispatch | Direct requests accepted by FCM | Topic requests accepted by FCM |
|---|---:|---:|
| September 11 morning | 3 | 1 |
| September 11 evening | 6 | 1 |
| September 12 morning | 7 | 1 |
| September 12 evening, logged 18:58 IST | 7 | 1 |
| September 13 morning | 9 | 1 |

One accepted topic request represents a broadcast request, not one recipient. FCM acceptance does not establish display, opening, or a meaningful return. Other notification jobs are enabled; inventory their targets and eligibility before assuming overlap. In particular, a job with “staging” in its name is not evidence that it sends to production users.

The CSV labels 530 `push_topic_subscription` and 434 `push_registration` as **event counts**. Topic telemetry includes subscribe/unsubscribe actions and success/failure results. The inspected crash breadcrumbs contain repeated successful unsubscribe events. These totals cannot be used as unique opted-in audience sizes.

The digest uses notification plus data payloads. Android can display these in the background through the system tray without invoking the app's `onMessageReceived` callback. Consequently, custom `push_received` / `push_displayed` events can miss background delivery. Reconcile server acceptance, FCM reporting, app opens, and destination engagement rather than treating seven or eight custom events as total deliveries. See [Android message handling](https://firebase.google.com/docs/cloud-messaging/android/receive-messages) and [FCM delivery measurement](https://firebase.google.com/docs/cloud-messaging/understand-delivery).

### Activation currently combines different behaviors

Current `GrowthTracking` activates a reader through either two stories reaching at least 70% plus 180 cumulative engaged seconds, or a strong reader action such as like, bookmark, or comment. Writer activation can follow a saved draft of at least 100 characters or publishing. The event is emitted once per installation, after the install-referrer check completes; the first qualifying path wins.

Thus 11 activation events versus 183 first opens is a **6.0% aggregate event ratio**, not a verified conversion rate for the same acquisition cohort. It also mixes quick reactions, deeper reading, and writing. Preserve the historical event; add separately defined milestones instead of silently changing its meaning.

The CSV lists `notification_dismiss` as a key event alongside session starts and first opens. Keep dismissal as a diagnostic event, but remove it from the product-success/key-event definition after checking any downstream reporting dependencies.

### Return paths already exist in local code

Home has Continue writing, Resume reading, and a followed-writer story card. Verify their visibility, saved state and destinations in the released app before building replacements. The eight Write views indicate little recorded exposure but do not identify whether discoverability, authentication, crashes, or audience intent caused it.

### Weekly retention is the useful baseline

| Export cohort | Week 0 | Week 1 | Week 1 / Week 0 |
|---|---:|---:|---:|
| August 23–29 | 44 | 6 | 13.6% |
| August 30–September 5 | 83 | 10 | 12.0% |
| September 6–12 | 53 | Not available | Not mature |

These are the export's cohort counts; do not relabel them as signup cohorts without verifying the report definition. For future product reporting, use first-open cohorts including guests, with signup as a secondary funnel. Keep the existing report definition for historical comparison.

Do not infer uninstall conversion from 60 `app_remove` events divided by 183 first opens. They need not describe the same people or observation window. Also investigate unusually high engagement time on very low-active-user days for test traffic or foreground-time contamination; neither is proven by this export.

## The intended first-week experience

| User state | Useful next action | Implementation approach |
|---|---|---|
| Fresh reader | Open one short, relevant story immediately | Verify Start reading; trial feed-first entry if an extra Welcome step measurably delays value. Keep account creation available without blocking public reading. |
| Finished first story | Read one related story or follow its writer | One clear next action. Avoid simultaneously requesting registration, ratings and push permission. |
| Fresh writer | Write a few lines and successfully save them | First verify existing Write and draft flows. Add a small Home prompt that opens the existing editor, not a second editor. |
| Returning reader | Resume the exact unfinished story | Reuse Resume reading and persisted progress. Fall back gracefully if the story is unavailable. |
| Returning writer | Continue the correct saved draft | Reuse Continue writing; prove recovery after closing and reopening the app. |
| Reader who has followed a writer | Read that writer's new work | Reuse the existing return card and verify story relevance and availability. |

A suggested first writing exercise is “Write two lines about an object on your desk.” A small exercise should not require publishing, adding a cover, or polishing a title to count as first writing value.

Allowing guest-local writing may be worth testing, but it is a separate scoped change: establish local ownership, persistence, account migration and logout isolation before removing its authentication gate. Keep authentication for publishing and account-bound operations. Do not assume this is a one-line navigation change.

## Notification decision for this sprint

1. **Do not add D1/D3 notifications on top of both existing daily digests.** First establish delivery and the complete message inventory.
2. Proposed initial experiment: consolidate editorial broadcasting to **one send at 18:00 IST, three days per week** for two weeks. This is a conservative test setting, not a proven best time or universal frequency. Check whether other editorial jobs must be suppressed to achieve that aggregate volume; log the effective change date.
3. Every retained broadcast must include the mandatory `daily_digest` guest topic alongside eligible direct recipients. Preserve guest-topic/signed-in-direct deduplication, consent, and the required visible payload and `targetRoute`.
4. Choose a specific available story, preferably one clearly relevant to the intended audience, and open that story directly. Do not send “a new prompt is up” unless the prompt exists and the link opens it. Do not repeatedly broadcast the same fallback story without measuring repetition.
5. Measure accepted sends → available delivery/impression evidence → opens → meaningful reads or draft activity. Judge quality by the final step, and watch opt-outs. Never equate opens with retention lift.
6. **D1/D3 lifecycle messaging remains conditional future work.** A shared `daily_digest` topic cannot individually target installation age, unfinished drafts, or a holdout group. Under the current all-dispatches topic rule, these personalized prompts should first appear inside the app. Do not label a global broadcast as personalized or claim an unexposed control group. A later notification design needs explicit resolution of targeting, privacy, deduplication and aggregate frequency.

For an in-app D1 return, show “Continue reading” only with a real resumable story, or “Continue your draft” only with a recoverable draft. On D3, offer one related story or the next small exercise based on the prior activity. People who have already returned should see their next action rather than a redundant reminder.

## Measurement contract

Reuse equivalent existing events when available; add only missing events after checking their actual firing conditions.

- **First reading value:** first story reaching at least 70% and 30 seconds of active foreground reading on that story. This is a proposed threshold to validate against short-story length, not a discovered universal definition. Exclude idle/background time.
- **First writing value:** a successful durable local draft save containing at least 20 non-whitespace characters of user-entered text; exclude prefilled prompt text. Track publishing separately. This deliberately measures a first contribution, while the existing 100-character activation remains comparable historically.
- **Meaningful return:** a later session on a different local date, following first value, with a qualifying read or a successfully saved draft edit. Opening a notification alone does not qualify.
- **Acquisition-based W1:** define an additional rolling view as any return during elapsed days 7–13 since first open; also retain the export's original weekly view. Label both clearly. Do not mix calendar weeks and elapsed days.
- **Segment only where counts permit:** app version, guest/signed-in status, acquisition source, reader/writer behavior and internal/test status. Never transmit story/draft contents as analytics parameters. Keep denominators and unknown identities visible.
- **Dashboard:** crash events/affected users by version; first opens; unique first-value users; median time to first value; writer-entry/auth/editor/save funnel; meaningful return counts and rates; opted-in eligible devices; notification acceptance/open/qualified-return counts; opt-outs. Dedupe automatic and custom notification opens for the same message.

With 50 new users, a move from roughly 12% to 20% W1 is only about four additional returning people. Use 20% as a directional aspiration, not a statistically established success threshold. Report counts and rates together, observe multiple mature cohorts, and annotate releases and campaign changes.

## Fourteen-day execution sequence

| Date | Antigravity task | Completion evidence |
|---|---|---|
| Sep 13 | Confirm the known editor fix and reconcile the crash report's app/date scope; inspect the distributed version. | Exact artifact/version, crash reproduction and local test result; unresolved discrepancy logged. |
| Sep 14 | Test a clean install and returning guest on the current release; validate first-value telemetry and key-event configuration. | Guest reaches readable content without signup; events observed once with correct parameters. |
| Sep 15 | Trace writer entry → auth → editor → save; test draft recovery and existing resume actions. | Screen recording or QA record, saved draft recovered after relaunch; blockers identified by stage. |
| Sep 16 | Verify push on a consenting guest and signed-in test device, foreground and background, on supported Android versions. | OS display, correct tap destination, consent behavior, no duplicate message; distinguish acceptance from display. |
| Sep 17 | Inventory all notification jobs and establish the actual eligible audience; set up the agreed frequency experiment only after delivery is proven. | Job/recipient inventory and one aggregate editorial schedule; no layered D1/D3 broadcast. |
| Sep 18 | Improve the largest confirmed first-session friction using existing flows; add at most one Home writing prompt if discoverability is the blocker. | Correct release path, a clear before/after user flow, recovery and guest-access checks. |
| Sep 19 | Review first-week execution and early activation results. | Counts by version and first-open date; no claim of mature retention for new changes. |
| Sep 20 | Check crash recurrence, version adoption, first-value completion and return destinations. | Fixes demonstrably present on observed installed versions. |
| Sep 21 | Inspect where the first post-change cohort leaves the journey. | Select one highest-loss stage; avoid adding multiple simultaneous features. |
| Sep 22 | Improve story-to-next-story or draft-to-resume continuity according to that evidence. | Existing continuation flow verified and one clearly scoped adjustment. |
| Sep 23 | Review notification-assisted meaningful activity and opt-outs. | Keep, reduce or stop ineffective editorial variants; raw counts retained. |
| Sep 24 | Validate writer prompt saves and reader continuation across app restarts. | No lost drafts, wrong-user state or broken story routes. |
| Sep 25 | Prepare cohort results, separating acquisition, app-version and channel changes. | Mature and immature cohorts explicitly marked; test traffic handled. |
| Sep 26 | Choose the next iteration using crash, first-value and early return evidence. | A short decision record; full rolling W1 follow-up date recorded. |

The September 13–19 acquisition cohort's rolling days-7–13 window is not fully observable for every member until **October 2 ends**. The September 26 review is an early read, not a complete W1 verdict. This plan does not create a scheduled automation.

## Source pointers and verification

- User export: `C:/Users/Kumar/Downloads/Firebase_overview (2).csv`, mostly August 16–September 12.
- [Confirmed Android editor crash](https://console.firebase.google.com/project/writon-app-2020/crashlytics/app/android:com.ibitvalley.writon/issues/6388ce889426b4a15c199546b767a63a?time=7d), inspected September 13.
- Live Scheduler and Cloud Logging in `writon-app-2020`; structured event `daily_digest_dispatch_summary`, September 11–13. No credentials or recipient identifiers exported into this report.
- `app/src/main/java/com/ibitvalley/writon/modern/feature/editor/StoryEditorScreen.kt:352`: existing boundary fix.
- `app/src/main/java/com/ibitvalley/writon/modern/ui/navigation/WritOnNavigation.kt:309`, `:407`, `:1013`: initial route, guest entry, Write authentication boundary.
- `app/src/main/java/com/ibitvalley/writon/modern/feature/feed/FeedScreen.kt:189`, `:347`: draft and reader continuation.
- `app/src/main/java/com/ibitvalley/writon/modern/core/telemetry/GrowthTracking.kt:220`, `:415`: activation conditions and once-per-install emission.
- `app/src/main/java/com/ibitvalley/writon/modern/core/notification/DailyDigestTopicSubscription.kt:7`: current guest-only topic policy.
- `server/src/jobs/daily-digest.js:299`, `:346`, `:389`: direct dispatch, topic dispatch, summary logging.
- Verification: `:app:testDebugUnitTest --tests com.ibitvalley.writon.modern.feature.editor.EditorMarkdownFormattingTest` succeeded; five tests, zero failures/errors/skips. No release artifact was generated in this review.
