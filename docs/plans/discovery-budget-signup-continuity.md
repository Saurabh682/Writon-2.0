# Discovery budget continuity at signup

Status: owner approved the narrow registration bookkeeping exception. Implemented and verified against isolated staging; hosted deployment tracking is recorded in the engagement roadmap.

Implementation: a server-only installation/account association retains the original claim rows and their dates. The enabled guest-merge registration statement links the supplied installation in the same database statement; clients without installationId keep the previous branch. Claim checks traverse connected identities and serialize against linking with a shared advisory lock. This conservatively shares discovery limits on shared devices; it grants no access to account data. Profile deletion cascades its associations. Apply the budget migration before deploying this route with guest registration enabled.

Verification: 204 backend tests passed. The real staging registration handler returned the unchanged success response, removed the guest token, preserved guest daily/weekly caps after signup and token rotation, and allowed only one concurrent claim across linked identities. Account deletion removed the association. RLS and function grants were verified; no notification was sent. Phone validation and coordination with the older digest remain pending.

## Verified gap

`server/src/routes/notifications.js` accepts an optional installationId at the existing authenticated `PUT /api/v1/me/devices/push-token`. When guest registration is enabled, its `removed_guest` statement deletes matching guest rows and returns only `1`; the signed-in insert stores the profile and token, not the installation ID.

The new discovery worker budgets guests under `installation:<uuid>` and accounts under `profile:<id>`. Once signup removes the guest record, there is no durable association between those budget keys. A recent guest claim can therefore be missed by the account budget. Token rotation prevents a token-only comparison from being a reliable repair.

## Proposed scoped change

Keep the existing endpoint, request fields, response, authentication, aliases, and legacy fallback unchanged. Extend only the enabled guest-merge transaction to preserve recent discovery-budget continuity before deleting the matched guest registration. Reuse the supplied installationId and the matched registration; introduce no additional client input or new persistent guest reading history.

Implementation must preserve all recent claims from both identities (including two claims on the same day), without silently discarding a conflicting row or overwriting another account's history. The current unique recipient/day constraint means a simple key UPDATE is insufficient. Use a narrowly scoped, server-only budget association or equivalent explicit migration after approval; account deletion must clean associated data.

## Acceptance checks

- Guest claim then signup cannot create a second notification on the same day.
- Two guest/account claims within seven days block a third claim after signup.
- Concurrent registration and claim operations cannot bypass either cap.
- Account switching and logout do not transfer access to another account's history.
- Token rotation does not reset the installation budget.
- Existing registration clients without installationId retain their current behavior.
- Existing response remains exactly `{ registered: true }`.
- Validate only in isolated staging first; keep discovery delivery disabled.

## Current release decision

Do not enable the new combined guest/account discovery rollout in production until this gap is resolved. The legacy notification system is unchanged. Other roadmap work may continue independently.
