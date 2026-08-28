# Firebase Spark Operations

WritOn uses Firebase only through products that Firebase currently lists as no-cost on the Spark plan.

## Enabled in the Android app

- Authentication: email/password and Google sign-in. Do not enable phone/SMS authentication because messages are billed per SMS.
- Cloud Messaging: notification token registration and delivery.
- Crashlytics: crashes and intentionally recorded non-fatal feature failures.
- Analytics: privacy-safe product events only; never log emails, tokens, story content, or push tokens.
- Performance Monitoring: automatic app-start, screen-rendering, and HTTPS measurements plus the named launch and token-registration traces.

## Console-only workflow

- App Distribution: distribute a signed release candidate to the `internal-testers` group before Play upload.
- Test Lab: keep runs below Spark limits (10 virtual tests/day and 5 physical-device tests/day). Use release candidates only: sign-in, reader, image picker, publish, and notifications.
- Release Monitoring: review Crashlytics and Performance after each Play rollout.
- Analytics DebugView: validate the event names below on one test device before a release.

## Event inventory

| Event | Purpose |
| --- | --- |
| `writon_launch` | App opening health |
| `auth_outcome` | Password/Google sign-in outcome, without identity data |
| `version_check` | Network or cache update-manifest outcome |
| `push_registration` | Device-token registration outcome |
| `push_received` | Notification type and destination |

## Explicitly not used

- Firebase Storage, Cloud Functions, Cloud Run, App Hosting, Cloud SQL, and phone/SMS authentication can require Blaze billing or incur usage charges.
- Firestore and Realtime Database are unnecessary because Supabase/Postgres remains WritOn's application database.
- Remote Config is not used for release safety; the Fastify version endpoint is the source of truth while Firebase changes Remote Config pricing.
- Dynamic Links are deprecated; use Android App Links and ordinary HTTPS post URLs.
- App Check is deferred until Play Integrity is configured and the Fastify API can verify App Check tokens. Do not enforce it before that end-to-end verification.
