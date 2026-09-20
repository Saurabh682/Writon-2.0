# GA4 retention and push triage — 2026-09-04 export

Source: `data-exports/json/ga4_analytics_28d_summary.json`, 2026-08-08–2026-09-04. This is a supplied summary, not a verified live GA4 query or a user-level funnel.

## Priorities

1. Notification permission wiring, registration outcomes, eligible recipients, scheduler execution, FCM acceptance, device display, tap routing.
2. Version-specific first-open → first Home content → story open → qualified reading funnel; measure errors and latency without story bodies or personal identifiers.
3. Preserve preferences and reading/draft work; finish staged onboarding only after the first-feed path is measured.

## Corrections to interpretation

- 155 registration events / 63 users is 2.46 events per user, not evidence of token churn. Current code reports both success and failure under `push_registration`; registration reuses `FirebaseMessaging.token` unless FCM rotates it. Split by outcome, version, date and permission before estimating reachable users.
- 15 `notification_receive` and 2 `notification_open` events demonstrate low recorded activity, not a delivery failure rate. The export has no send/accepted denominator. Custom `push_received`/`push_displayed` and automatic notification events have different coverage; do not add them as unique notifications. Firebase reports also have payload, label and collection limitations: https://firebase.google.com/docs/cloud-messaging/understand-delivery
- 108 users on `WritOnModernActivity` versus 11 on `home` may reflect instrumented-version differences. They are not sequential funnel steps. The 7 reader users and 4 activated users warrant investigation but do not establish a 91% pre-Home abandonment rate.
- 40/124 = 32.3% is a same-window event/user ratio, not an uninstall cohort rate. Removals may concern earlier installs. 19/129 = 14.7% is a returning-user share, not D7 retention.
- Acquisition channel rows sum to 130 users while overview says 129; session rows sum to 281 while session_start is 278. City NCR rows sum to 60, exceeding the India country row's 47. Distinct users across dimensions can overlap; source definitions, reporting settings and export accuracy must be checked before treating rows as disjoint counts.
- Version 2.0.17 has only 11 users and 5 listed sessions. Its 45.45% engagement rate cannot be reconciled with an integer engaged-session count over those five sessions. Investigate source extraction before declaring a release regression.
- Organic Search's longer per-user engagement does not mean longer sessions: reported per-session engagement is 2m52s versus Direct's 2m50s. Only five first-channel users are listed.
- Unknown geography (70 users), test traffic, generic custom events and key-event configuration need review. 100% user key-event rate despite four activations suggests key events are not equivalent to meaningful activation.
- Zero tracked revenue does not prove monetization is absent or broken.

## Code-confirmed finding

The notification inbox invokes `onRequestNotificationPermission`, but its navigation caller omitted the callback and therefore invoked the default no-op. Connected locally in this delivery. Android permission denial/cooldown and physical-device verification remain necessary; this is not proof that all live push faults are resolved.

## Required live evidence before declaring push repaired

Live read-only check on 2026-09-05 confirmed `projects/writon-app-2020/locations/asia-south1/jobs/writon-daily-digest` is PAUSED, scheduled for 20:00 Asia/Kolkata, targeting the expected internal endpoint. No lastAttemptTime was returned. This confirms the scheduled nightly path is inactive, not that all interaction push is broken. It remains paused pending duplicate-membership/device gates; no run or resume command was issued.

Local follow-up adds separate direct attempted/accepted and topic attempted/accepted log counters without changing the response contract. Topic acceptance is one FCM request, not a recipient count. Also handles content disappearing between count and selection without a null dereference or empty send. These changes are not deployed.

Scheduler run/result → eligible recipient count → attempted/FCM-accepted count → permission/channel state → device receipt/display → tap destination. Test one authorized device foreground/background/terminated, then muted and signed-out cases; exclude test events from growth conclusions. No broadcast authorized by this triage.
