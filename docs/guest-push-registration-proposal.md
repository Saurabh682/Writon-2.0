# Guest push registration proposal

Status: implemented and verified on isolated staging; production remains disabled and unchanged.
Date: 2026-09-08

## Why this is needed

The current `PUT /api/v1/me/devices/push-token` contract is intentionally authenticated and writes a required `profile_id`. Device logs show that an FCM token exists before sign-in, but registration is deferred until Firebase authentication is available. This prevents reliable guest-device reachability even though guest topic subscription is already independent of authentication.

## Compatibility contract

Keep the existing signed-in endpoint, request fields, response, revocation behavior, and aliases unchanged:

`PUT /api/v1/me/devices/push-token`

Add a separate guest-only endpoint; do not broaden the existing `/me` route:

`PUT /api/v1/devices/push-token`

The additive request accepts the existing token fields plus a client-generated installation ID:

```json
{
  "installationId": "opaque-local-uuid",
  "token": "fcm-token",
  "platform": "android",
  "appVersionCode": 157,
  "notificationPermission": "granted"
}
```

The endpoint returns only `{ "registered": true }`. It must not accept profile IDs, Firebase UIDs, email addresses, device fingerprints, or raw reading history.

## Storage shape

The implemented migration uses a separate `guest_device_push_tokens` table so the existing signed-in table and its required `profile_id` remain unchanged:

- preserve all existing rows and the unique FCM token constraint;
- add a UUID `installation_id` with a unique constraint;
- keep guest rows structurally separate from profile-owned rows;
- index active guest rows for topic/broadcast selection;
- retain revocation, permission, platform, app-version, and last-seen fields;
- keep all table privileges behind the server service role and RLS.

On sign-in, the existing authenticated endpoint deletes any matching guest installation/token and upserts the signed-in token inside one SQL statement. Logout and full signed-in-to-guest lifecycle verification remain part of the physical-device exit gate.

## Delivery rules

- Guest rows may receive only approved broadcast topics such as `daily_digest`.
- Social events (applause, comments, replies, follows, and publication fan-out) require a profile and never target guest rows.
- Guest delivery must respect permission, local controls, revocation, quiet hours, and the shared discovery cap.
- Deduplicate by token and installation ID; invalid FCM tokens are revoked as they are today.

## Rollout and verification

1. **Complete:** applied the migration only to Supabase staging (`xrfnebvkazewqramkpri`).
2. **Complete:** added server contract and migration tests for flag isolation, unauthenticated registration, validation, idempotency, merge-on-login, revocation, RLS, privileges, and indexing.
3. **Partially complete:** Android no longer waits for Firebase authentication, re-registers after logout and Remote Config audience refreshes, and safely defers if an older server hides the endpoint; JVM tests and debug assembly pass. On the Redmi, the attempt currently stops at Firebase token acquisition with `SERVICE_NOT_AVAILABLE`, before any WritOn API request can be made.
4. **Pending:** verify one guest physical device receives one staging topic message, signs in, and receives no duplicate delivery.
5. **Staging only:** Cloud Run revision `writon-app-api-staging-00004-wxb` runs the immutable verified image with the flag enabled. Production keeps the flag disabled/default-off and was not changed.

The user approved this additive contract on 2026-09-08. Hosted staging smoke tests passed for registration, repeat registration, token replacement, invalid UUID rejection, and revocation. Notification-delivery jobs remain disabled on staging, preventing accidental sends.
