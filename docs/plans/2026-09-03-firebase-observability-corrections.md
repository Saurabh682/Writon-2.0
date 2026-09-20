# Firebase Observability Corrections

Status: implementation complete; release/device gates remain

Constraints:

- Preserve existing public API paths, request bodies, and response bodies.
- Preserve unrelated work in the dirty `Till_29Aug` workspace.
- Do not claim Firebase/Play deployment without console or device evidence.

## Phase A — Telemetry correctness

- [x] Add regression tests proving sync and suspend work executes exactly once.
- [x] Isolate Firebase Performance creation/start/stop failures from business failures.
- [x] Move password-recovery, story-open, and notification-open endpoints to real completion boundaries.
- [x] Separate profile-photo and story-cover upload traces.

## Phase B — In-app update accuracy

- [x] Report each newly available Play version once per controller session.
- [x] Separate update-completion request from Play-confirmed installation.
- [x] Deduplicate downloaded and installed lifecycle telemetry.
- [x] Keep the existing non-blocking update UI and public version API intact.

## Phase C — Remote Config activation

- [x] Sequence settings, defaults, fetch, and activation.
- [x] Distinguish updated, cached, and failed fetch telemetry.
- [x] Publish a safe in-process feature snapshot with built-in defaults.
- [x] Wire the update indicator, guest digest subscription, Explore banner, and bounded Explore limit.
- [x] Keep editor-AI and quote-card keys reserved because the current UI exposes neither feature.

## Phase D — FCM campaign measurement

- [x] Sanitize and cap analytics labels to FCM-compatible values.
- [x] Apply labels to direct and topic daily digests.
- [x] Apply labels to interaction pushes.
- [x] Protect label behavior with server tests.

## Phase E — Distribution testing

- [x] Rewrite App Testing Agent journeys to match actual guest navigation and auth gates.
- [x] Run the Android JVM and backend contract suites.
- [x] Pass Android lint, release signing/Google Sign-In verification, R8, and signed AAB generation for build 140.
- [x] Install Firebase CLI 15.29.0, build and verify the signed release APK, upload Firebase App Distribution release `5n1nrujphe430`, and distribute it to the authorized tester.
- [ ] Publish/verify Remote Config values in Firebase Console (current credentials cannot read the live template).
- [ ] Upload build 140 to Google Play Internal Testing.
- [ ] Validate flexible update and push flows on an authorized physical tester device in foreground, background, and terminated states.
- [ ] Synchronize `Till_29Aug`, `production`, and `main` only after this dirty release workspace is reviewed and committed.
