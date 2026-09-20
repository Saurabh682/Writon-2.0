# Engagement Roadmap Phases 4–5 Completion Audit

Date: 2026-09-13

Scope: existing-user preference backfill, notification controls, and notification delivery integrity. This audit records the explicitly authorized isolated staging database and Cloud Run deployment; it does not authorize production deployment, Remote Config publication, scheduler activation, notification delivery, or a Play release.

## Result

The local implementation is code-complete and its scoped automated verification is green. Existing public endpoints, request/response fields, and legacy notification preference aliases remain available. The current Play Store production version is unaffected.

The roadmap phases are not operationally complete until the signed-in reinstall, two-account device-delivery, and canary-observation gates below are recorded. These are evidence gates, not remaining local implementation gaps.

On 2026-09-13, the additive engagement-preferences and notification migrations were applied only to the guarded staging database (`xrfnebvkazewqramkpri`). Read-only schema verification and disposable-data checks then passed for monotonic preference persistence, validation, deletion cascade, atomic notification capture, human-only batching, stale-claim recovery, terminal attempts, and unsent outbox state. Cloud Build `7bba6d20-dea3-4580-99e8-5b1058ad6cd6` produced image `phase45-staging-20260913-0920`; Cloud Run revision `writon-app-api-staging-00013-gig` passed zero-traffic health, auth-guard, protected-endpoint, authenticated preference, stale-write, notification-control, cleanup, and error-log checks before receiving 100% of staging traffic. All staging delivery and automation switches remain disabled. No FCM message was sent, and production was not changed.

## Phase 4 — existing-user preference backfill

| Requirement | Status | Evidence |
| --- | --- | --- |
| One-time, dismissible Home card behind a disabled-by-default remote flag | Implemented | `FeedScreen.kt`, `WritOnNavigation.kt`, `ExistingUserPreferencesCardTest.kt` |
| Eligibility limited to insufficient interests, incomplete v2 preferences, and unseen card state | Implemented | `shouldShowExistingUserPreferencesCard` in `WritOnNavigation.kt` and `OnboardingRouteTest.kt` |
| Home opens Interests directly; Settings retains the full intent + interests flow | Implemented | `WritOnNavigation.kt`, `OnboardingRouteTest.kt` |
| Home preference completion returns to Home rather than Settings | Implemented and regression-tested | `WritOnNavigation.kt`, `OnboardingRouteTest.kt` |
| Guest decisions persist locally | Implemented | `UserPreferences.kt`, `EngagementPreferencesTest.kt` |
| Signed-in decisions persist and recover across devices | Implemented locally | `EngagementPreferencesSync.kt`, `engagement-preferences.js`, server contract tests |
| Stale offline writes cannot regress a newer dismissal/completion | Implemented and tested | monotonic conflict handling in `engagement-preferences.js`; `engagement-preferences.test.js` |
| Hydration/retry refreshes Home immediately | Implemented | preference revision invalidation in `WritOnNavigation.kt` |
| Card stays out of loading/error/empty/update-required flows and never blocks reading | Implemented | Home visibility inputs and Compose coverage |

## Phase 5 — notification policy, controls, and delivery integrity

| Requirement | Status | Evidence |
| --- | --- | --- |
| Canonical kinds with retained legacy aliases | Implemented | `20260907_notification_kind_contract.sql`, `notifications.js`, contract tests |
| Granular signed-in controls with legacy-field fallback | Implemented and contract-tested | `NotificationSettingsScreen.kt`, `NetworkModels.kt`, `notifications.js`, `MutationContractTest.kt` |
| In-app notification creation separated from push eligibility | Implemented | `server.js`, `spark-runner.js` |
| Durable logical-event deduplication | Implemented | notification migration/index and server contract tests |
| Genuine first-human-applause transition; no re-applause repeat | Implemented and tested | transactional applause path and contract tests |
| Comment, reply, follow, and followed-writer publication semantics | Implemented and tested | `server.js`, `followed-writer-notifications.js`, contract tests |
| Same-author publication batching and retry-safe fan-out | Implemented and tested | `followed-writer-notifications.js` and staging verifier |
| Bot/system/test/admin/unknown actors excluded from social push | Implemented at enqueue and delivery | `server.js`, `spark-runner.js`, server tests |
| Deleted, private, unpublished, synthetic, or non-human-author stories rejected at delivery | Implemented | delivery revalidation in `server.js` and contract tests |
| Retry, stale-claim recovery, terminal failure, and invalid-token isolation | Implemented and tested | delivery/fan-out workers and tests |
| One visible Android notification for a retried logical event | Implemented and tested | stable FCM tag + tray ID in server and Android notification service |
| Bookmark activity remains private | Deliberate policy | no bookmark kind in the push catalog |

## Automated verification

- Android debug JVM suite: 212 tests passed.
- Android release JVM suite: 212 tests passed.
- Android instrumentation-test sources: compiled successfully.
- Connected Redmi 25028RN03I (Android 15): 2/2 focused instrumentation tests passed for the dismissible/non-blocking preference card and branded notification rendering on its production channel; the crash buffer was empty after the run.
- Phase 4–5 server suite: 145 tests passed across 5 files.
- Complete server-suite gate: 327/327 tests passed across 31 files after the independently handled craft-prompt compatibility reconciliation.
- Staging verification scripts: syntax-checked; their production-target refusal and no-FCM safeguards remain intact.
- Engagement and notification staging schema installers support `--verify-only`, which performs catalog checks without applying migrations. Remote TLS uses the repository-pinned trusted CA with certificate validation enabled.
- Guarded staging database verification passed for both phases. The notification verifier scopes worker execution to its disposable event UUIDs so it cannot claim unrelated staging work.
- Hosted runtime verification passed on revision `writon-app-api-staging-00013-gig`: default engagement preferences returned `unseen`; completion persisted; a stale write could not regress `completed` or onboarding version 2; granular comment/reply and followed-writer switches persisted as disabled; the internal drain rejected an untrusted request with `403`; the disposable Firebase identity and staging profile were deleted; and Cloud Logging contained no error or 5xx entry for the candidate revision.

## Remaining operational gates

1. Run the signed-in preference sequence on a clean installation: unseen → dismissed, reinstall/hydrate, then completed; confirm no regression from a stale client write.
2. Use two human test accounts and physical devices to verify first applause, comment, reply, follow, and batched followed-writer publication in foreground, background, and terminated states.
3. Verify each notification opens its exact surviving target and that invalid/private/deleted targets do not deliver.
4. Confirm disabled granular controls suppress their corresponding push while legacy controls continue to work.
5. Record social event-to-delivery p95 and visible-duplicate rate during a small canary; require no bot/test push to users and effectively zero visible duplicates.
6. Keep the existing-user preference-card rollout flag off until the staging and reinstall evidence is accepted.

## Release decision

No release artifact is produced by this audit. Once the operational gates pass, the next Android release must receive a new, unused version code and version name before an AAB is generated.
