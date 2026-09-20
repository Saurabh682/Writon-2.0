# WritOn App Ratings and In-App Review Research

Research date: 2026-08-31  
Repository context: WritOn Android app 2.0.17 (119)  
Installed review library: `com.google.android.play:review-ktx:2.0.2`

## Frozen research plan

### Question

What evidence-backed, Google Play-compliant practices should WritOn use to improve its rating and review volume, and exactly when should its native in-app review flow be eligible to launch?

### Hypotheses

- **H1 — Moment and eligibility matter more than prompt frequency.** Prediction: authoritative guidance and credible practitioners will recommend prompting after a completed, valuable experience and avoiding interruption, onboarding, errors, and repeated requests. Falsifier: current Google guidance recommends frequent or onboarding-time prompts.
- **H2 — The prompt must remain neutral and native.** Prediction: Google will prohibit pre-screening sentiment, modifying the review card, or asking the user what rating they intend to give before launch. Falsifier: current Google guidance explicitly permits review gating or a satisfaction question before the native flow.
- **H3 — Reliability and review operations are the durable rating levers.** Prediction: sources will connect rating improvement to crash/ANR reduction, support responsiveness, release quality, and responding to actionable reviews, not only to increasing prompt impressions. Falsifier: evidence shows prompt volume alone is a reliable long-term rating strategy.
- **H4 — A deterministic WritOn policy can comply without detecting whether the card appeared or a review was submitted.** Prediction: the Play Review API will not reveal completion or submission and Google will advise continuing the app flow regardless. Falsifier: the current API exposes a trustworthy submitted-rating result.
- **H5 — Paid, incentivized, manipulated, or review-gated tactics are unsuitable.** Prediction: official policy and reputable sources will warn against incentives, purchased reviews, coercion, and filtering dissatisfied users away from Play. Falsifier: official Play policy permits these tactics.

### Methods

- **M1 (confirmatory):** Read both supplied Android Developers in-app review URLs and verify their effective identity, current API contract, quotas, design rules, testing guidance, and library compatibility.
- **M2 (confirmatory):** Read every supplied third-party article and Reddit discussion; extract unique recommendations, evidence quality, commercial incentives, and conflicts with Google guidance.
- **M3 (confirmatory):** Inspect WritOn's installed dependency and current review eligibility/launch code, then compare it with M1 and the supported findings from M2.
- **M4 (confirmatory):** Produce a concrete WritOn trigger, suppression, cooldown, telemetry, testing, and review-operations policy.
- **M5 (exploratory):** Check linked or current primary Google sources when a supplied article makes a policy or API claim that cannot be validated from the supplied pages.

### Stopping rules

Research stops when every supplied URL has one of: a completed evidence entry, a documented duplicate, or a documented access failure with one reasonable retrieval fallback attempted; the installed library and local implementation have been compared with current official documentation; every hypothesis has a supported verdict; and an independent verification pass returns a non-inconclusive verdict.

## Supplied source inventory

1. AppFollow — Google Play Store Rating
2. App Radar — App Reviews and Ratings
3. Android Developers Blog — App quality, memory optimization, secure onboarding (2026-08)
4. ExtensionBooster — Android reviews and ratings 2026 guide
5. AppTweak — How to get more app reviews
6. Medium / ShipKaro — Google in-app review dialog
7. Reddit / r/androiddev — Legitimate ways to improve ratings
8. Android Developers — In-app reviews (`authuser=4`)
9. Medium / Expert App Devs — Android In-App Review API
10. Android Developers — In-app reviews (canonical)
11. AppFollow — Ratings and Reviews
12. ASOeShop — ASO mistakes in 2025
13. ASOeShop — Keyword install strategies
14. ASOeShop — Mobile app marketing trends in 2025
15. ASOeShop — ASO guide 2025

## Evidence log

Entries are appended after retrieval. Each entry records the source, retrieval result, a content fingerprint or decisive excerpt, and the observation it supports.

## Dead ends, pivots, and deviations

Entries are appended as they occur.

## Findings and WritOn recommendation

Pending evidence collection and independent verification.

## Evidence log — 2026-08-31

### E01 — AppFollow: growing a Google Play rating

- Source: https://appfollow.io/blog/google-play-store-rating
- Retrieval: complete HTML article, retrieved 2026-08-31.
- Fingerprint: title “An Ultimate Guide to Growing Google Play Store Rating of Your App in 2025”; published 2025-09-24; relevant material at lines 68–73, 87–105, 127–138, 151–175, 223–255, and 266–309.
- Observation: The article consistently attributes durable improvement to stability, useful updates, accurate listing expectations, localization, support, review analysis, and prompts after completed value moments. It rejects paid or incentivized reviews. Its numerical case studies and ranking claims are marketing assertions without reproducible methodology, so they are directional rather than decision-grade evidence.
- Supports: H1, H3, H5.

### E02 — App Radar: ratings and reviews strategy

- Source: https://appradar.com/academy/app-reviews-and-ratings
- Retrieval: complete HTML article, retrieved 2026-08-31.
- Fingerprint: title “The ultimate guide to Google Play and App Store ratings and reviews in 2023”; published 2023-04-19; relevant material at lines 74–90, 118–150, and 164–215.
- Observation: Recommends a structured strategy, behavior-aware prompt timing, prompt testing, review analysis, prompt replies, prioritizing 1–2-star and technical complaints, and monitoring by version/country. Its suggestion to “incentivize users to share feedback” is ambiguous and must not be interpreted as incentivizing Play ratings or reviews, which Google prohibits.
- Supports: H1 and H3; partially supports H5 only after the official-policy qualification.

### E03 — Android Developers Blog: 2026 app-quality requirements

- Source: https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html
- Retrieval: complete official article, retrieved 2026-08-31.
- Fingerprint: title “Elevating app quality: Reducing memory usage and improving device migration”; dated 2026-08-26; lines 31–66.
- Observation: This is not an in-app review article. It is relevant to rating improvement because it establishes new Play quality requirements for dynamic memory, bitmap memory, DEX optimization, and seamless device migration. Enforcement is announced for February 2027 for memory/optimization and April 2027 for Zero-Tap Sign-In. Poor quality can reduce visibility and publishing capabilities independently of rating prompts.
- Supports: H3. It provides no trigger guidance.

### E04 — ExtensionBooster: 2026 review guide

- Source: https://extensionbooster.net/blog/how-to-get-more-android-app-reviews-ratings-2026-compliant-guide/
- Retrieval: complete HTML article, retrieved 2026-08-31.
- Fingerprint: dated 2026-04-29; API/timing material at lines 58–189; paid-review promotion at lines 193–274 and 286–303.
- Observation: The API version, behavioral-milestone timing, quota handling, no pre-question rule, no onboarding/error prompts, and 48-hour response workflow are directionally sound and largely match Google documentation. However, the publisher sells campaigns that pay for live reviews and claims these have no detection risk. Google’s policy prohibits incentivized feedback and automated services that inflate installs or ratings. This commercial recommendation is rejected as high-risk and is not part of the WritOn plan.
- Supports: H1, H2, H4; the commercial portion strongly supports the need for H5 and is itself rejected.

### E05 — AppTweak: increasing app reviews

- Source: https://www.apptweak.com/en/aso-blog/how-to-get-more-app-reviews
- Retrieval: complete HTML article, retrieved 2026-08-31.
- Fingerprint: dated 2026-01-02; timing table at lines 120–137; incentives and feedback filtering at lines 155–184; quality/response guidance at lines 172–243.
- Observation: Good advice includes prompting after completed milestones, avoiding onboarding/crashes/mid-task interruption, using the native API, fixing friction, replying to complaints, truthful listings, localization, and release-quality monitoring. Two recommendations conflict with Google’s stricter rules: using satisfaction filters to route unhappy users away from Play, and rewarding users for leaving a review even when the reward is not rating-contingent. WritOn must reject both. A general feedback channel may exist, but it must remain independent of review eligibility.
- Supports: H1 and H3; conflicts with and therefore reinforces H2 and H5.

### E06 — Medium / ShipKaro: in-app review dialog

- Source: https://medium.com/shipkaro/improve-app-rating-with-google-in-app-review-dialog-6e89dc108816
- Retrieval: direct open failed; search-index fallback retrieved the title, author, date, summary, device requirement, and article outline. A second text-mirror attempt was rejected by the browsing safety layer. Retrieved 2026-08-31.
- Fingerprint: title “Improve App Rating with Google In-App Review Dialog”; Wajahat Karim; published 2022-06-26; search result `turn27search0`.
- Observation: The accessible portion correctly describes the native API’s low-friction purpose and Android 5.0/Play Store requirement. The article is old, member-only, and not sufficient for current implementation decisions. Current Google documentation and the locally installed 2.0.2 library supersede it.
- Supports: only the general value of the native flow. Technical details are not relied upon.

### E07 — Reddit / r/androiddev practitioner discussion

- Source: https://www.reddit.com/r/androiddev/comments/n8gida/hello_everyone_is_there_any_legit_way_to_boost_up/
- Retrieval: complete visible thread, retrieved 2026-08-31.
- Fingerprint: 2021 discussion; decisive comments at lines 39–77 recommend the official API, completed “happy path” moments, app quality, and support.
- Observation: Multiple practitioners independently report better review volume after placing the native flow after successful core actions. This is anecdotal, old, and unquantified, so it corroborates timing but does not establish uplift size.
- Supports: H1 and H3 as exploratory practitioner evidence.

### E08 — Android Developers in-app reviews with `authuser=4`

- Source: https://developer.android.com/guide/playcore/in-app-review?authuser=4
- Retrieval: complete official page, retrieved 2026-08-31; last updated 2026-01-30.
- Fingerprint: lines 96–132 and 142–154.
- Observation: Google requires enough app experience, non-excessive prompting, no opinion or predictive question before/during the card, an unmodified topmost card, and app-owned timing logic because the quota is private and changeable. Repeated calls inside roughly a month may not show a dialog. A user-facing Rate button should open Play Store rather than invoke this quota-limited API.
- Supports: H1, H2, H4.

### E09 — Medium / Expert App Devs

- Source: https://medium.com/@expertappdevs/rate-your-android-app-using-google-in-app-review-api-782e19cf6b7f
- Retrieval: complete visible article, retrieved 2026-08-31.
- Fingerprint: published 2021-11-02; timing at lines 37–45, implementation at lines 46–84, testing at lines 85–89.
- Observation: Correctly recommends completed core tasks, sufficient experience, low frequency, and no interruption; it also recognizes that the completion listener does not mean a review was submitted. Its `play:core:1.9.1` and `core-ktx:1.8.1` dependencies are obsolete and must not be copied into WritOn.
- Supports: H1 and H4; obsolete for current code.

### E10 — Android Developers canonical in-app reviews URL

- Source: https://developer.android.com/guide/playcore/in-app-review
- Retrieval: complete official page, retrieved 2026-08-31.
- Fingerprint: same title, content, update date, and requirements as E08; the `authuser` parameter changes account context, not the documented contract.
- Observation: This is a duplicate of E08 rather than independent evidence.
- Supports: same conclusions as E08.

### E11 — AppFollow: expert ratings and reviews guide

- Source: https://appfollow.io/blog/ratings-and-reviews
- Retrieval: complete HTML article, retrieved 2026-08-31.
- Fingerprint: dated 2025-10-03; quality and timing at lines 70–95 and 314–363.
- Observation: Emphasizes performance, truthful onboarding/listing expectations, success-moment prompts, staged rollout, review clustering by version/device/country, and rapid corrective action. Product claims such as exact response-driven rating changes and ranking boosts are not backed by reproducible evidence; treat them as hypotheses for WritOn’s own measurement.
- Supports: H1 and H3.

### E12 — ASOeShop: ASO mistakes

- Source: https://asoeshop.com/blog/139/aso-mistakes-in-2025-avoid-them-outrank-your-competitors
- Retrieval: complete HTML article, retrieved 2026-08-31.
- Fingerprint: generic ASO advice at lines 147–231; commercial footer at lines 400–403 advertises buying Android reviews.
- Observation: Localization, truthful metadata, A/B tests, feedback monitoring, and replying to users are generic useful ideas supported elsewhere. The publisher explicitly sells Android reviews, so its review-growth recommendations are conflicted and must not be used to select tactics.
- Supports: H3; commercial conflict supports H5.

### E13 — ASOeShop: keyword install strategies

- Source: https://asoeshop.com/blog/137/how-to-increase-app-installs-proven-keyword-install-strategies-for-app-promotion
- Retrieval: complete HTML article, retrieved 2026-08-31.
- Fingerprint: lines 140–166 recommend purchasing keyword-targeted installs and adding ratings/reviews to the purchase; lines 389–405 advertise buying reviews.
- Observation: This directly promotes manipulating search behavior, installs, ratings, and reviews. It conflicts with Google’s prohibition on illegitimate or incentivized manipulation. Entire paid keyword-install/review tactic rejected.
- Supports: H5 by negative example.

### E14 — ASOeShop: mobile marketing trends

- Source: https://asoeshop.com/blog/133/top-13-mobile-app-marketing-trends-to-watch-in-2025
- Retrieval: first request timed out; one retry retrieved the complete article on 2026-08-31.
- Fingerprint: context-aware targeting, analytics, UX, and personalization at lines 172–220; footer at lines 403–405 advertises buying reviews.
- Observation: The article contains broad ideas about behavior-aware UX, personalization, analytics, and retention, but almost no useful in-app review guidance. Its publisher’s paid-review business creates a material conflict. Only independently verified product-quality concepts are retained.
- Supports: H3 weakly; no direct trigger evidence.

### E15 — ASOeShop: ASO guide 2025

- Source: https://asoeshop.com/blog/132/aso-guide-2025-hack-the-algorithm-with-the-best-aso-strategies
- Retrieval: complete HTML article, retrieved 2026-08-31.
- Fingerprint: review, retention, localization, updates, and testing at lines 149–273; footer at lines 460–462 advertises buying Android reviews.
- Observation: Generic quality, localization, retention, testing, and honest-review principles are reasonable but available from better sources. Paid review and ranking-manipulation services make this a low-trust source for review acquisition.
- Supports: H3 only where independently confirmed; commercial conflict supports H5.

### E16 — Android Developers Kotlin/Java integration guide

- Source: https://developer.android.com/guide/playcore/in-app-review/kotlin-java?authuser=4
- Retrieval: complete official page, retrieved 2026-08-31; last updated 2026-08-14.
- Fingerprint: dependency lines 99–127; request/launch contract at lines 128–187.
- Observation: Current official dependency is `review:2.0.2` plus `review-ktx:2.0.2` for Kotlin. `ReviewInfo` has a limited lifetime and should only be requested once launch is certain. The launch completion task reveals neither whether the dialog appeared nor whether a rating/review was submitted. Errors must not alter or interrupt normal app flow.
- Supports: H4 and confirms WritOn’s installed version.

### E17 — Android Developers testing guide

- Source: https://developer.android.com/guide/playcore/in-app-review/test?authuser=4
- Retrieval: complete official page, retrieved 2026-08-31; last updated 2025-07-21.
- Fingerprint: internal-track requirements at lines 100–117; `FakeReviewManager` and troubleshooting at lines 118–143.
- Observation: Real UI testing requires a Play-distributed internal track or internal app sharing. Internal test tracks bypass quotas; internal app sharing cannot submit reviews. `FakeReviewManager` is for result-path tests only and does not render the native UI.
- Supports: H4 and defines the correct test strategy.

### E18 — Google Play ratings, reviews, and installs policy

- Source: https://support.google.com/googleplay/android-developer/answer/9898684
- Retrieval: complete official policy page, retrieved 2026-08-31.
- Fingerprint: policy lines 21–53.
- Observation: Google prohibits manipulating ratings, reviews, or install counts, including incentivized feedback, forced/deceptive prompts, fake reviews, and automated services that inflate installs or ratings. Developers should earn reviews through a quality experience, invite honest feedback neutrally, reply to the issue raised, provide support resources, and not ask reviewers for a higher rating.
- Supports: H2, H3, H5.

### E19 — WritOn local dependency and implementation

- Sources:
  - `app/build.gradle:228`
  - `app/src/main/java/com/ibitvalley/writon/modern/core/telemetry/ReviewPrompter.kt`
  - `app/src/main/java/com/ibitvalley/writon/modern/core/telemetry/GrowthTracking.kt`
  - `app/src/main/java/com/ibitvalley/writon/modern/WritOnModernActivity.kt:201-205`
  - `app/src/test/java/com/ibitvalley/writon/modern/core/telemetry/ReviewEligibilityTest.kt`
- Retrieval: local source inspection plus Graphify BFS query, 2026-08-31.
- Fingerprint: library `review-ktx:2.0.2`; eligibility is seven days plus three engaged stories or one publication, 24-hour nonfatal-error suppression, and 120-day request cooldown; launcher is called from `Activity.onResume()`.
- Observation: The library is current and the policy is neutral, conservative, and tested at the eligibility level. Four gaps remain: launch is tied to every resume rather than the positive milestone; `review_flow_completed` overstates what Google reports; no explicit in-flight/session guard prevents overlapping request attempts; and every recorded nonfatal error suppresses prompting even when it was not a user-visible login/sync/publish/crash failure.
- Supports: H4 in part; identifies implementation work needed before calling the review system production-optimal.

## Dead ends, pivots, and deviations — appended 2026-08-31

- **D01:** Direct retrieval of the ShipKaro Medium article returned an internal error. Pivoted to search-index extraction. A text-mirror URL was also rejected by the browsing safety layer. The article remains partially observed and is not used for current technical claims. Evidence: E06.
- **D02:** The first ASOeShop trends request timed out. One direct retry succeeded. Evidence: E14.
- **D03:** Several third-party articles cite exact uplift percentages, ranking thresholds, or algorithm signals without accessible methodology. These figures were not promoted into confirmed findings. Evidence: E01, E04, E05, E11.
- **D04:** The research plan anticipated supplied articles as strategy evidence, but multiple sources have direct financial interests in review-management, paid-review, or install-manipulation products. The method was tightened by giving official Google policy precedence and recording commercial conflicts. Evidence: E04, E11–E15, E18.
- **D05:** M5 added one extra official policy lookup beyond the API overview, integration, and testing topics because supplied sources disagreed about incentives and paid reviews. This deviation was necessary to avoid treating vendor claims as policy.

## Confirmed findings

### 1. The review prompt is a consequence of value, not a way to manufacture satisfaction

Google requires enough app experience to provide useful feedback. Across the credible third-party sources and practitioner comments, the recurring pattern is to launch immediately after a completed meaningful action, while the app is stable and the user is no longer mid-task. For WritOn, this means a completed reading or publishing milestone—not first launch, onboarding, arbitrary elapsed time, opening Settings, or a generic activity resume. Evidence: E01, E05, E07–E11, E16.

### 2. Neutrality is a hard boundary

WritOn must not ask “Do you like WritOn?”, predict a five-star response, show separate stars, route unhappy users to support while only happy users reach Play, request “five stars,” or reward any rating/review. A support and feedback feature can exist, but its usage or sentiment cannot decide access to the native review card. The Play card must be unmodified and unobstructed. Evidence: E08, E10, E18.

### 3. The app cannot measure review submission from the native flow

`launchReviewFlow()` completion means only that the API task finished. It does not reveal whether the card appeared, whether the user dismissed it, whether a star was selected, whether a review was written, or the rating value. WritOn can measure eligibility and attempts, then compare aggregate Play Console review volume and rating trends, but it cannot calculate an individual “review conversion” from this callback. Evidence: E04, E09, E16.

### 4. Prompt volume is not the durable rating strategy

The durable levers are crash/ANR/OOM reduction, login/sync/publish reliability, responsive support, release-quality monitoring, staged rollout, truthful store messaging, correct localization, and fixing recurring review themes. Google’s 2026 quality changes make memory, bitmap, DEX, and device-migration quality additional visibility and publishing concerns. Evidence: E01–E03, E05, E11, E18.

### 5. Paid and manipulated review tactics are rejected

WritOn should not use ASOeShop, ExtensionBooster review campaigns, keyword-install campaigns, compensated reviews, exchanges, bots, farms, scripted reviews, or rewards. “Real human” and “honest review” wording does not make a campaign compliant when payment is contingent on a live review or when the service is intended to manipulate install/rating signals. Evidence: E04, E12–E15, E18.

### 6. Review response work must be helpful rather than coercive

Prioritize actionable 1–3-star reviews, crashes, login/sync/publish failures, and recent-version regressions. Reply quickly, specifically, concisely, and in the reviewer’s language where possible. State the fix and version when true; include a support route. Do not argue, promise what is not shipped, offer compensation for review changes, or ask for a higher rating. Evidence: E01, E02, E04, E05, E18.

## Hypothesis verdicts

- **H1 — Confirmed.** Official and credible practitioner guidance supports sufficient experience plus a completed value moment and low frequency.
- **H2 — Confirmed.** Google explicitly disallows opinion/predictive questions before or during the card and requires the native UI as-is.
- **H3 — Confirmed.** Quality, reliability, truthful expectations, and review operations are the long-term levers; prompts merely reduce submission friction.
- **H4 — Confirmed.** The current API exposes no shown/submitted/rating result. Deterministic local eligibility remains valid.
- **H5 — Confirmed.** Google prohibits incentivized/manipulated ratings, reviews, and install counts; several supplied commercial tactics must be rejected.

## WritOn recommended trigger policy

### Eligibility gate

All of the following must be true:

1. At least seven full days have passed since first open.
2. The user has reached one of these evidence thresholds:
   - **Reader:** at least three distinct qualifying stories and at least three total minutes of engaged reading. A qualifying story requires at least 70% progress or a reliable completion event; a bare open, applause, impression, or short dwell does not qualify.
   - **Writer:** the first successful publication has completed and the published story is confirmed by the server.
3. No request attempt has been recorded in the previous 120 days.
4. No request has been attempted in the current session.
5. No request or launch is currently in flight.
6. No unresolved or recent user-visible login, account recovery, synchronization, publication, draft restoration, crash, ANR, or OOM failure exists. Use an initial 72-hour quiet period after a resolved failure, and suppress longer while the issue remains open.
7. Current release health is inside WritOn’s crash, ANR, OOM, login, sync, and publish guardrails.
8. No update dialog, permission dialog, sign-in flow, editor save/publish operation, support flow, deep-link transition, or other modal/task is active.
9. The remote review feature flag is enabled for the user’s rollout cohort.

The first three criteria establish eligibility. Criteria 4–9 protect the moment. Eligibility alone must never launch the card from a generic lifecycle callback.

### Exact positive trigger moments

- **Reader:** after the reader finishes the third qualifying story (or the next qualifying story after becoming seven-days eligible), closes/returns from the reader, and the stable Home/Library screen is visible. Launch only after the navigation transition finishes.
- **Writer:** after the server-confirmed first publication and after the success confirmation is visible/dismissed. Never launch while the upload, sync, or publish progress UI is active.
- **Later retry:** if no request has been attempted for 120 days, wait for a new value event such as another deeply completed story or another successful publication. Never retry merely because the app resumed.

### Moments that must never trigger

- First launch, onboarding, sign-in, account recovery, permission requests, or app-language selection.
- Mid-story, mid-edit, autosave, publish/upload progress, comment composition, checkout, or any time-sensitive task.
- Immediately after a crash, ANR, OOM, authentication failure, sync conflict, lost draft, failed publish, empty/error state, or support complaint.
- From a custom “Rate WritOn” button. A user-selected Settings option should open the Play listing directly because the native API may silently hit quota.
- After asking a satisfaction, NPS, sentiment, or intended-rating question.
- In exchange for badges, coins, reach, features, content, discounts, or any other benefit.

### Cooldown and attempt semantics

- Record the attempt once `requestReviewFlow()` successfully returns `ReviewInfo` and immediately before launch.
- Keep WritOn’s conservative 120-day cooldown. Google’s private quota is not a target to reverse-engineer and may change without notice.
- Treat a launch attempt as spent even if no card appears. The app cannot know whether it appeared.
- Add a process-level in-flight guard and a session-level attempted flag so lifecycle re-entry cannot produce overlapping requests.
- Do not expose the cooldown or claim the user reviewed.

### Telemetry contract

Allowed, privacy-safe events:

- `review_eligible` — emitted once per eligibility cycle; include only reader/writer path, app version, and rollout cohort.
- `review_info_requested`
- `review_info_failed` — include bounded Play review error code, not exception text or user data.
- `review_flow_launch_started`
- `review_flow_task_finished` — explicitly means API callback finished; it does not mean shown or submitted.

Remove or rename `review_flow_completed`; it is semantically false. Never emit `review_submitted`, `review_rating`, or `review_dialog_shown` because the API does not provide those facts. Evaluate impact through aggregate Play Console review count, rating distribution, rating by version/country/device, and review themes. Do not join a Play review to an individual WritOn account.

### Testing and rollout

1. Make `ReviewManager` injectable and unit-test with `FakeReviewManager`; verify continuation on request/launch failure and the in-flight guard. The fake does not test UI.
2. Use a Play internal test track for real UI and repeated quota-free testing. Use an account that is the primary Play account, is an authorized tester, installed through Play, and has no existing review.
3. Internal app sharing may verify the UI path but cannot submit a review.
4. Roll out through a remote flag: 10%, then 50%, then 100%, with stable assignment.
5. Stop or suppress expansion if crashes, ANRs, OOMs, login/sync/publish failures, one-star velocity, or support complaints rise.
6. Do not optimize on callback completion. Compare aggregate review velocity and rating quality while guarding retention, deep reading, publication success, and support burden.

## Review-operations playbook

- Capture a Day-0 baseline: overall and recent-version rating, star distribution, review count/velocity, unanswered count, response time, top themes, country/language/device/version segments, crash/ANR/OOM rates, and login/sync/publish health.
- Triage daily during a release or campaign and at least three times weekly otherwise.
- Respond to actionable 1–3-star reviews within 48 hours; severe login, data-loss, payment, privacy, child-safety, crash, or publishing reports are same-day incidents.
- Use the reviewer’s language when possible. A good response acknowledges the exact issue, gives a truthful current status or workaround, names the fixed version only after release, and provides a support route.
- Never ask for a higher rating. If a defect is fixed, invite the user to try the corrected version; let any review update be their choice.
- Tag themes and bind them to product work. Track whether each top theme is `investigating`, `confirmed`, `fixed`, `released`, or `monitored`.
- Segment rating changes by app version, language, country, and device class before attributing them to prompt changes.
- Keep store screenshots, description, localization, and “What’s new” truthful so acquisition expectations match the product.

## Local implementation assessment

### Already sound

- Uses Google’s current `review-ktx:2.0.2`.
- Requires seven days and meaningful usage or publication.
- Uses no satisfaction gate, custom stars, incentive, or five-star request.
- Uses a conservative 120-day cooldown.
- Suppresses after recent failures.
- Continues normal app flow regardless of the launch callback.
- Has deterministic eligibility unit tests.

### Corrections recommended before production-optimal rollout

1. Move launch orchestration out of `WritOnModernActivity.onResume()` and into a pending-success-event coordinator that waits for a stable screen.
2. Rename `review_flow_completed` to `review_flow_task_finished`.
3. Add session and in-flight guards.
4. Track only user-visible product failures for eligibility; do not let an unrelated telemetry/referrer nonfatal suppress the prompt.
5. Replace the generic 24-hour failure rule with unresolved-incident suppression plus at least a 72-hour quiet period after resolution.
6. Require three minutes total engaged reading in addition to three qualifying stories to match WritOn’s activation-quality intent.
7. Inject the review manager and add FakeReviewManager plus internal-track verification.
8. Add a remote feature flag and stable rollout cohorts.

## Rejected tactics

- Review gating or sentiment filtering.
- Asking for five stars or a higher updated rating.
- Any reward or benefit for leaving a rating/review.
- Paid reviews, “real user” review packages, review exchanges, or pay-per-live-review services.
- Purchased keyword installs or coordinated search/install manipulation.
- Bots, personas, employees posing as ordinary users, scripted text, or autonomous engagement.
- Prompting from onboarding, resume, errors, or mid-task.
- Treating the API callback as proof of a review.
- Chasing vendor-reported uplift percentages without WritOn-specific controlled measurement.

## Unanswered questions

- Play Console baseline data and the exact top current complaint themes were not available in the supplied links or repository.
- Whether WritOn already has a remote configuration system suitable for a review rollout flag requires a separate implementation audit.
- The ShipKaro article remained partially inaccessible; no unique recommendation from it was needed after current official documentation was reviewed.

## Research closeout status

All supplied URLs have been reviewed, documented as duplicates, or given a recorded access-failure fallback. All confirmatory methods M1–M4 are complete; M5 was used for official policy reconciliation. Final closeout awaits the independent verification verdict required by the research protocol.

## Independent verification — appended 2026-08-31

The independent reviewer inspected the complete research record, current official Google overview/integration/testing/policy/quality sources, the local review implementation and call sites, resolved Gradle dependencies, targeted eligibility tests, and representative third-party pages. No files were edited during that pass.

Verdict: **partially-confirmed**.

The core Google contract, commercial-conflict analysis, and local-code findings are confirmed. The following corrections and qualifications take precedence over broader wording earlier in this file:

1. **Expert App Devs contains a neutrality conflict.** E09’s technical observations remain useful, but the article frames five stars as the goal, says anything lower is a miss, and recommends asking when the user will respond as desired. That framing is rejected because WritOn’s trigger must invite honest feedback neutrally rather than select for an intended rating.
2. **WritOn’s numeric policy is a product hypothesis, not a Google rule.** Google establishes sufficient experience, low frequency, neutrality, unchanged UI, private quotas, and uninterrupted flow. It does not establish seven days, three stories, three minutes, 120 days, a 72-hour quiet period, 10/50/100 rollout, or a 48-hour response target. Those values are conservative starting choices inherited from WritOn’s plan or proposed here; they require WritOn-specific measurement.
3. **Quality-to-rating causality is not proven here.** H3 is directionally supported as an operational inference. Google directly establishes experience, visibility, memory/DEX, and publishing consequences; vendor and practitioner sources connect reliability/support with rating recovery, but the supplied evidence does not isolate a causal rating uplift.
4. **Current story qualification is looser than the recommendation.** The app records a story as engaged at 70% progress **or when one reported increment is at least 30 seconds**. `ReviewSignals` does not contain total engaged seconds. Therefore, the proposed three-minute threshold and reliable completion semantics are not enforced today.
5. **`FakeReviewManager` cannot test failures.** It always returns successful fake results and is useful only for the success/result continuation path. Request failure, launch failure, duplicate calls, and in-flight/session concurrency require an injected WritOn-owned abstraction with controllable stubs or mocks.
6. **Release-health guardrails need concrete definitions.** Before a rollout flag depends on health, WritOn must define the actual data source and numerical stop criteria for crash, ANR, OOM, login, sync, and publishing health. Separately, release shrinking is currently disabled; because Google announced a February 2027 DEX-optimization requirement, R8/optimization readiness needs its own implementation and verification task.

### Corrected status of the proposed WritOn policy

The following are **confirmed hard requirements**:

- Use the native, unmodified Google Play card.
- Wait until the user has enough real experience to give useful feedback.
- Trigger after a completed value moment, not during onboarding, errors, or an active task.
- Do not pre-screen sentiment, predict a rating, ask for five stars, reward reviews, or manipulate installs/reviews.
- Do not prompt excessively; keep an app-owned cooldown without trying to reverse-engineer Google’s quota.
- Continue normal app flow on every API result and never claim the callback proves the card appeared or a review was submitted.
- Use a Play internal track for real-flow testing and treat aggregate Play Console data as the outcome source.

The following are **WritOn product hypotheses to validate**, not externally proven constants:

| Hypothesis | Starting value | Success signal | Guardrail / falsifier |
|---|---:|---|---|
| Minimum tenure prevents premature prompts | 7 days | More useful recent reviews without retention decline | New-user complaints or no improvement versus a later-tenure holdout |
| Reader evidence identifies a meaningful value moment | 3 qualifying stories and 3 engaged minutes | Stable/increased review velocity and no deep-reading decline | Qualification is reached through short increments or superficial behavior |
| Writer evidence identifies a meaningful value moment | First server-confirmed publication | Useful writer reviews without publish-flow abandonment | Prompt interrupts confirmation, sync, or post-publish navigation |
| Local cooldown protects user trust | 120 days | No prompt-fatigue complaints and stable eligible reach | Material complaint rate or no practical ability to measure another cohort |
| Failure quiet period avoids frustration | At least 72 hours after resolution | No review prompts near product incidents | Incident remains unresolved or user-visible failures recur |
| Staged rollout limits risk | 10% → 50% → 100% | Review trend improves while product guardrails hold | Any defined reliability, retention, or support guardrail fails |
| Prompt review-response SLA | 48 hours for actionable 1–3-star reviews | Lower unanswered backlog and more resolved themes | Responses become generic, inaccurate, or operationally unsustainable |

Do not attribute rating changes to any one hypothesis without a stable comparison group, version/country/device segmentation, and enough review volume to avoid reading noise as signal.

### Final closeout

- M1: complete — supplied official in-app review URLs, current integration, quotas, design, completion semantics, data safety, and testing were checked.
- M2: complete under the frozen stopping rule — every supplied third-party URL was reviewed, documented as a duplicate, or given an access-failure fallback. ShipKaro remains partially observed and is not used for unique technical claims.
- M3: complete — installed/resolved 2.0.2 dependencies, implementation, lifecycle call site, signals, telemetry, and tests were inspected.
- M4: complete — a concrete trigger, suppression, cooldown, telemetry, testing, rollout, and review-operations policy is recorded, with proposed values now explicitly labeled hypotheses.
- M5: complete — official Google policy resolved conflicts about gating, rewards, paid reviews, and manipulated installs.
- Open experiments: none. Implementation and live Play Console measurement are separate future work, not part of this research authorization.

## Historical review evidence — previous NOW100 app, May–July 2019

### Source and analytical scope

This section analyzes the three Google Play Console CSV exports supplied on 2026-08-31:

- `reviews_reviews_com.egleedge.now100_201905.csv`
- `reviews_reviews_com.egleedge.now100_201906.csv`
- `reviews_reviews_com.egleedge.now100_201907.csv`

The unit of analysis is one public Google Play review, identified by the unique review ID embedded in `Review Link`. The exports contain six rows in total: two from May, three from June, and one from July. All six belong to NOW100 version 3.2, version code 22; all are marked English.

Quality checks found:

- Six unique review IDs and no exact duplicate rows.
- Complete ratings, review text, version, device, timestamps, language, and review links.
- Valid one-to-five-star values and parseable timestamps; no update predates its submission.
- No review titles, which does not affect the text analysis.
- No developer reply date or reply text on any review.
- Two four-star reviews arrived 2 minutes 59 seconds apart on 2019-06-09 from different recorded device models and used similar quality/maintenance themes. This may be a legitimate event or acquisition cluster, but it means independence cannot be assumed. It is not evidence of manipulation.

The dataset covers only six public reviews between 2019-05-06 and 2019-07-21. It does not contain support contacts, uninstall reasons, order outcomes, silent users, lifetime reviews, acquisition source, or review-prompt exposure. It is therefore suitable for identifying qualitative lessons, not estimating causal effects or reconstructing the app's lifetime rating performance.

### Rating profile

| Rating | Reviews | Share |
|---:|---:|---:|
| 1 star | 1 | 16.7% |
| 2 stars | 0 | 0% |
| 3 stars | 0 | 0% |
| 4 stars | 3 | 50.0% |
| 5 stars | 2 | 33.3% |
| **Total** | **6** | **100%** |

The simple mean is 3.83 stars and five of six reviews, or 83.3%, are four or five stars. Monthly means were 3.0 in May, 4.0 in June, and 5.0 in July, but the monthly samples are only two, three, and one review respectively. That sequence must not be presented as a reliable improving trend: one review represents 16.7% of the entire dataset and can materially move the average.

### What customers valued

The positive reviews consistently point to concrete delivered value:

- Delivery, especially early or home delivery, appears in three of six reviews.
- Freshness, product quality, or service quality appears across the three June reviews.
- One reviewer specifically valued the simple interface and ease of buying.
- Books and the broader assortment were noticed positively, even though catalog breadth also produced a request for improvement.

These are useful product-value signals. They are not proof that every user received the same quality, because public reviewers are a selected subset of customers.

### What the previous app was missing

| Missing capability or product risk | Review evidence | Assessment | Lesson for WritOn |
|---|---|---|---|
| Closed-loop review response and recovery | Zero of six reviews received a developer reply, including the one-star and feature-request reviews. | Direct evidence; high confidence. | Assign an owner and respond to actionable one-to-three-star reviews within a working 48-hour target. Respond to useful four-star requests too. Address the issue without asking for a higher rating. |
| Structured feature-request handling | A four-star user explicitly asked for more books in the membership plan. No public acknowledgement or follow-up appears in the export. | Direct request; medium confidence because it is one review. | Tag, acknowledge, aggregate, and route feature requests. For WritOn, track requests by language, content category, reading feature, writing feature, and reliability issue. |
| Clear competitive differentiation | The only one-star review said the app was not bad but preferred Grofers. It named no functional failure. | Direct competitive signal; medium confidence. | Product quality alone may not overcome a stronger incumbent. WritOn must visibly deliver its differentiators—calm reading, verified-human work, language relevance, and deep-reading quality—rather than relying on generic writing-app positioning. |
| Reliability as a maintained promise | Multiple positive reviewers praised delivery/quality while explicitly asking the team to maintain it. | Repeated theme; medium confidence. | Treat reliability as part of the value proposition, not just defect control. WritOn should suppress review prompts during login, sync, publishing, crash, ANR, or content-quality incidents and resume only after defined recovery criteria pass. |
| A way to turn vague dissatisfaction into actionable detail | The one-star comparison supplied no specific problem, and there was no developer reply seeking neutral clarification. The CSV cannot show whether another support channel existed. | Direct absence in the public thread; inference about in-app support remains unverified. | Provide an easy, separate help/feedback route, but never use it to screen users before the native review card. Publicly ask concise, neutral clarification when a review is vague. |
| Review-learning operations | The exports show raw reviews but no visible taxonomy, owner, response status, linked fix, or resolution outcome. Internal processes, if any, are not observable here. | Operational gap suggested, not proven. | Maintain a review ledger with theme, severity, app version, language, owner, response deadline, linked issue, fix version, and resolution status. |

The strongest verified miss is the complete absence of developer replies. The catalog and competitor findings are important but come from one review each and should guide discovery rather than justify large product changes by themselves.

### How this changes the WritOn review plan

1. **Product value comes before prompt optimization.** The old reviews praised fulfilled value—delivery, freshness, quality, and ease—not the prompt itself. WritOn's prompt should follow a confirmed reading or publishing success and never substitute for product quality.
2. **Responding is part of rating improvement.** Every actionable low-rating review needs a specific, respectful response and an internal owner. Four-star feature requests should also be acknowledged because they reveal the gap between satisfaction and stronger advocacy.
3. **Do not ask users to change their rating.** Resolve or explain the issue, publish the fix when applicable, and let the reviewer decide independently whether to update the review.
4. **Turn feedback into a product taxonomy.** Recommended top-level WritOn themes are login/account, synchronization, publishing, editor/autosave, reading experience, feed relevance, language/content availability, moderation/provenance, performance/crash, accessibility, and feature request.
5. **Connect reviews to release health.** Review themes should be segmented by app version, language, country, and device when volume permits. Repeated critical login, sync, publish, crash, or content-integrity complaints must block prompt expansion and install-focused campaigns.
6. **Make differentiation observable.** A user should encounter WritOn's defining value before becoming review-eligible: verified human-authored content, language relevance, a calm reading experience, and dependable writing/publishing.
7. **Measure operations, not inferred individual ratings.** Track eligible users, request attempts, task completion, Play Console review volume, rating distribution, response coverage, response time, recurring themes, and fix closure. Never infer that an API callback means a review was shown or submitted.

### Historical-review acceptance checks for WritOn

These are proposed internal starting checks, not Google requirements; live WritOn data should determine whether the numerical target remains appropriate.

- At least 95% of actionable one-to-three-star reviews receive an accurate, non-coercive response within the working SLA.
- Every critical review theme has an owner, linked issue, and resolution state.
- Review-prompt rollout pauses when defined login, sync, publishing, crash, ANR, OOM, or content-integrity guardrails fail.
- Product and support teams review recurring themes at least weekly during the growth campaign.
- Feature requests are counted separately from defects and are not dismissed because the associated rating is four or five stars.
- No response asks for five stars, a higher rating, or an edited review.
- No support or feedback path is used as a satisfaction gate before the native Google Play review card.

### Confidence assessment

**Share with caveats.** The calculations and direct observations are reproducible from all six supplied records. The response gap is definitive for these exports. The product-theme findings are directionally useful, but the sample is too small and too old to represent the full NOW100 audience or establish rating trends. Current WritOn decisions should combine these lessons with live Play Console reviews, product-health telemetry, support data, and version-level complaint tracking.
