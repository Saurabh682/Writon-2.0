# WritOn onboarding and first-week plan

Date: 2026-09-15. Status: O0 complete; O1 implemented in source and awaiting physical-device validation; grouped optional interests from O2 implemented in source.

## Outcome and evidence

Help a reader find and finish something worthwhile, and help a writer safely save a first draft. Account creation and interest selection are supporting steps, not the definition of success.

This plan extends `docs/writon-engagement-roadmap.md` phases 3–4 and the first-time-user usability audit. Those documents record implemented guest entry, intent/interests, destination recovery and local preference persistence, alongside device-validation gaps. Recheck current source and the installed candidate before treating historical findings as current defects.

User-reported failures that must remain regression cases: interests navigation loops; repeated preference-sync notices; story text failing to load; lost follow state; missing signup entry; incorrect shared-story destinations. No new tutorial should hide these failures.

The growth playbook's Explore percentages and screenshot claims describe external case studies, not a verified WritOn baseline. Do not use them to promise acquisition gains.

## Product decision: one welcome, several contextual journeys

Avoid separate multi-page tutorials. Route according to what the person is trying to do. Reading remains available without registration. Read/Write/Both is optional and changeable; never infer permanent identity from one tap.

| Arrival | First destination | Guidance |
|---|---|---|
| Fresh ordinary launch | Compact welcome | Start reading, Start writing, Sign in |
| Shared story | Exact story | No welcome or interests detour |
| Returning reader | Home or unfinished story | Resume without replaying onboarding |
| Returning writer | Saved draft when explicitly resumed | Preserve draft and cursor |
| Notification | Intended story, reply or profile | Authentication only if destination requires it |
| Existing user after upgrade | Normal destination | Optional feature guidance at first relevant use |

Priority: explicit incoming destination, then explicitly requested draft/resume, then normal Home. Never let a late preference fetch override an already chosen destination.

## Journey A: first-time reader

1. Welcome copy: “Stories, poems, and room to write.” Primary: “Start reading”. Secondary: “Start writing”. Text action: “Sign in”. Show all choices on a small screen with accessible scrolling at large text sizes. No carousel.
2. Start reading opens a populated feed immediately. Offer at most three starter stories within the existing feed layout, using available content language, category and reading-time metadata. Do not add a large panel above the feed. Provide ordinary browsing below; an empty starter selection must not block the feed.
3. Show real title, author, category, reading time and a short description. Explain a recommendation only when supported: “A short read” or “Poetry you selected”; never claim personal relevance without evidence.
4. Open the full story with distinct loading, failure, unavailable and cached states. Preserve scroll position across authentication and ordinary navigation.
5. At the end, offer one concrete next story and the author connection already planned. Avoid stacking signup, permission, rating and preference requests.

Starter selection acceptance: story IDs resolve, bodies exist, language metadata matches, read-time estimates are plausible, no duplicated starter IDs, and expired/deleted stories have recovery. Editorial selection must not invent author provenance or promise a daily human editorial routine without an owner.

## Journey B: optional personalisation

Entry points: Settings → Reading preferences, or a single dismissible invitation after the reader has used the app. Never require personalisation before a shared story.

Use the user's reference design: “A little more you.” Group chips under “Stories & expression” and “Ideas & the world”; selected chips have checkmarks, not colour alone. Reuse the canonical catalog and existing selection limit. Long labels wrap without splitting words unnaturally.

- Zero selections: “Explore all stories”. One or more: “Find my reads”. No mandatory three-topic minimum.
- Keep Skip visible; it durably completes/skips this invitation before navigating.
- Content-language preference and interface language are different concepts. Do not create a new language API for this batch. Use the existing supported language choice and explain it accurately.
- Apply changes to the next feed session; do not reshuffle a story currently being read.
- Save locally first. Background sync failure never restarts onboarding or displays a toast on every story. An actionable sync status belongs in Preferences.
- After dismissal, do not automatically repeat the invitation. Settings remains available.

Only retain the invitation if tests show choices actually affect eligible recommendations. Otherwise keep preference editing in Settings and remove the promotional step.

## Journey C: first-time writer

1. Start writing opens the existing editor if local guest drafting is supported and verified. If it is not, retain an explicit sign-in/return-to-reading choice until safe draft ownership is implemented; never promise guest autosave without testing it.
2. Use minimal empty-editor copy: “Give your piece a title” and “Start with a sentence.” Formatting help appears on demand. Avoid a compulsory sample or AI-generated draft.
3. Make save status truthful: saving, saved on this device, synced, or failed. Draft creation is private; publication is a separate explicit action.
4. Request an account at the first identity-dependent action, including publishing. Preserve the draft across cancellation, signup, sign-in and process recreation. Never transfer another account's draft during account switching.
5. Before publication show title/category preview and “This will be public”. Validate errors beside the submission action. Do not offer unsupported private publishing or scheduling.
6. After confirmed publication show “Your story is published”, View story and Share. Failed or queued publishing must not trigger this state. Do not promise an audience, applause or feedback.

Writer activation is a durably saved non-empty draft; first successful publication is a separate milestone. Store no draft text in analytics.

## Journey D: registration when useful

For applause, comment, follow, bookmark or publish, explain the immediate benefit: “Sign in to save this story to your Library.” Offer Sign in, Create account and Keep reading/Back to draft. Preserve the originating story, author or draft.

After authentication restore the destination and let the user confirm the action. Do not silently publish or post a comment. A partial signup resumes account setup instead of creating another identity. Avoid presenting returning accounts as new users.

Anonymous Firebase authentication is an optional technical implementation, not a new onboarding screen or a substitute for permission. Audit existing auth guards first: an anonymous Firebase user must still be treated as a guest for social writes. Account linking, collisions, sign-out, deletion and local-data ownership require explicit design before enabling it. Guest reading and broadcasts do not require introducing it in this batch.

## Journey E: returning users and the first week

| Moment | In-app experience | Optional outreach |
|---|---|---|
| First session | First useful read or saved draft | None before value |
| Next visit | Resume story/draft; clearly new eligible content | Only existing opted-in notifications |
| After a meaningful read | Next story and author Follow | Offer notification controls if relevant |
| After following | Explain where new work will appear | Ask whether to receive writer updates |
| Later in first week | Useful Library/history and preference editing | No automatic campaign added by this plan |

This is behaviour-triggered, not a mandatory day-by-day popup sequence. Skip messages that have no useful new content. At most one optional onboarding prompt per session; defer all other requests. Ratings use the existing eligibility-controlled flow after a later satisfaction milestone, never the first-launch sequence.

Notification permission: explain the specific benefit, offer “Not now”, honour denial and settings, and do not tie guest permission to signup. Private social notifications must remain recipient-specific; general guest broadcasts must never contain another user's private social payload.

## Engineering and recovery requirements

- Reuse existing routes, preference storage, auth recovery and catalog helpers before adding code.
- Separate locally completed/skipped onboarding from pending server synchronization. Persist before navigation; disable duplicate submissions while saving.
- Restore selection on rotation/process death; completing or skipping cannot reopen the same screen via Back.
- Offline with cache: readable saved content. Offline without cache: concise explanation and Retry, not fictitious starter stories or endless loading.
- Account switch: isolate server preferences and local private data. A server response cannot reverse a newer local dismissal.
- All supported app locales, TalkBack labels/state, 48dp targets, 200% font size, keyboard/navigation insets and small-screen layouts are release gates.
- No changes to existing API contracts, bot functions, cloud deployment or notification campaigns are implied by this plan. Identify any required additive contract separately before implementation.

## Measurement

Audit existing telemetry first and reuse its events. Add events only for a missing decision or outcome. Suggested conceptual milestones: entry shown, entry chosen, content rendered, qualified read, second distinct story read, draft saved, publish confirmed, auth outcome and preference completion/skipping.

Define a qualified read using the existing foreground reading-time and progress rules; document that definition before comparing results. Scrolling alone or opening a story is not completion. Deduplicate milestones, exclude debug/test traffic where identifiable, and report unknown attribution honestly.

| Measure | Denominator |
|---|---|
| First story rendered | Eligible new-reader installations that started a session |
| Qualified first read | Same new-reader cohort |
| Second distinct qualified read | Readers with a qualified first read |
| First durable draft | Users choosing writing |
| Successful first publish | Writers attempting publication |
| D7 return | Cohort with a complete seven-day observation window; return on day 7 |
| Return within first week | Separate measure: return on days 1–7 |

Show numerator/denominator with rates, release version, entry type and content language. Installation-based measures are not person counts; do not fingerprint users to stitch reinstalls. Do not mix screen counts from different tables into a sequential funnel. Never log story text, draft text, email or push tokens.

## Delivery sequence and acceptance

| Batch | Work | Exit condition |
|---|---|---|
| O0 — Baseline | Trace current routes and events; record existing implementation versus gaps | One agreed event dictionary and a prioritised defect list |
| O1 — Reliable entry | Guest/shared-link routing, skip durability, no repeated sync messages | Fresh launch, skip, relaunch, offline, login return and process-death cases pass |
| O2 — Reader value | Starter selection, optional grouped interests, next story | Real stories load; preferences have observable effect; no redundant Home banners |
| O3 — Writer value | Draft recovery, account transition, explicit public publish | No draft loss, duplicate publish or false success under interrupted connectivity |
| O4 — Return and controls | Resume, following/Library guidance, permission pacing | Dismissal persists; notifications respect consent; no modal pile-up |
| O5 — Test and release | Localised device QA, analytics verification, testing AAB | All critical journeys pass; version bumped once for new artifact; honest store notes |

Use the existing 23-journey Firebase YAML, extending relevant cases rather than duplicating the whole suite. Automated tests should cover persistence/navigation failures; physical tests must establish actual readability, taps and recovery. Test both fresh installation and update from the current Play build.

Start with the small testing group. Keep fixes that restore correctness; evaluate optional presentation changes against the baseline. With low traffic, use observed failures and qualitative feedback first. Do not declare a statistically meaningful A/B winner from two testers or a few installs.

Progress record: O0 is documented in `docs/audits/onboarding-baseline-2026-09-15.md`. O1 source now gives incoming story routes first-launch priority, records the Welcome choice, corrects inaccurate Welcome copy across all six app locales, and adds the 24th Firebase journey for fresh-install shared-story entry. O2 now includes the optional, grouped chip layout with visible Skip and distinct zero-selection/selected actions across all supported locales. O1 and O2 remain open until the physical-device journeys pass; starter-story and next-story evidence still need separate verification.

## Budget and ownership

No new paid SDK, AI inference, ads, rewards or analytics service is required. Use existing code, local tests, device screenshots, exported analytics and manually selected existing content. Existing cloud services may still incur their normal usage costs; this is a no-additional-purchase plan, not a guarantee of zero hosting charges.

Codex: audit, implementation, tests, documentation and evidence. Owner: editorial selection approval, tester coordination and release decision. Testers: execute journeys without coaching and report where expectations differ. No outreach or publication is automatically authorised by this document.
