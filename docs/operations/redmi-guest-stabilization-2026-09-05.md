# Redmi guest-entry, crash and notification verification

## Build and scope

- Debug 2.0.42 (144), installed in place on Redmi A5 / Android 15. No app data cleared, no AAB or Play release generated, no public API or database changes.
- Existing working-tree changes remain uncommitted; release-branch synchronization is not claimed.

## Crash evidence and fix

- Device crash buffer recorded `LayoutNode should be attached to an owner` at 13:18:30, 13:19:46 and 13:19:58 IST.
- Real-activity instrumentation reproduced a detach lifecycle crash at 13:33:25 even after disabling navigation transitions. Disabling animation alone was insufficient.
- Dependency inspection showed UI/runtime/animation 1.9.2 mixed with Material 1.6.8 and Material3 1.2.1 under BOM 2024.06.00.
- Changed to BOM 2025.11.01; restored normal navigation animations. The previously failing device test now passes. This supports the dependency alignment fix but does not prove all possible crashes are resolved.
- Official dependency reference: https://developer.android.com/develop/ui/compose/bom/bom-mapping

## Visitor behavior

- Continue as a visitor appears on every tutorial page, including the first, and opens Home without mandatory interests or login.
- Existing protected action callbacks now display Sign in / Keep reading. Dismissal preserves the reader; protected deep-link dismissal returns to Home rather than a blank restricted page.
- Browsing, reading, search and public author profiles remain open. Comment submission, applause, bookmarks, following and publishing remain account-gated. Public sharing does not require an account.
- Copy added in English, Hindi, Marathi, Bengali, Spanish and French. No action is automatically submitted after signing in.

## Guest notification findings

- FCM tokens are installation-scoped; the inspected signed-out device had a cached token. An account is not a prerequisite for delivery.
- Existing `daily_digest` topic is guest-only. Signed-in readers use direct registration to avoid receiving both paths.
- Permission had been reachable through the gated Notifications screen. Added a reader-exit value moment (70% progress and 30 seconds foreground engagement); the existing 14-day cooldown still applies.
- Topic membership now checks OS notification permission and the remote digest flag and reconciles after permission results and resume. No guest identity or token table was introduced.
- One targeted data-only test was sent to this device only, accepted by FCM and observed as an active WritOn notification in Android's notification service. Token and access credentials were not logged or saved.
- The test device permission was already granted via ADB earlier in this session. The fresh native permission-dialog journey has NOT been verified end-to-end on the phone.
- Durable per-run duplicate protection is implemented in `server/migrations/20260905_daily_digest_dispatch_ledger.sql`; its additive production migration was applied with RLS and client grants verified. A database concurrency smoke produced exactly one winning claim. After explicit approval, a manual scheduler run returned 200 but correctly sent nothing because the preceding 24 hours contained zero eligible verified-human stories; no daily digest ledger claim was created.
- The post-run audit found that canary revision `writon-app-api-canary-00060-mub` omitted the established `/api/v1/spark/scheduler/tick` route. The digest scheduler was immediately paused and 100% traffic restored to `writon-app-api-canary-00058-dun`. Production health returned 200 and a payload-free bot-route probe returned 415 rather than 404, confirming route restoration. Do not re-enable the digest until its ledger changes are integrated into a source revision that preserves the production bot scheduler contract.
- Corrected the digest's `totalStories` SQL to sum eligible stories rather than count category groups. This is code-only until the server is deployed.

## Verification

- `assembleDebug` and `assembleDebugAndroidTest`: successful.
- Notification unit tests: 11 passed (topic policy, permission policy, guest reading qualification, presentation and registration).
- Device `GuestEntryTest`: 3 passed.
- Device `GuestNavigationSmokeTest`: 1 passed, including repeated Home/Explore navigation, Library gate dismissal and activity recreation.
- Both Firebase YAML copies updated identically with first-page visitor, dismissal and navigation regression journeys.
- No new WritOn fatal exception appeared in the checked crash buffer after the final passing tests and targeted push.
- Full application suite, release-signing build and store deployment are not claimed by these scoped results.
