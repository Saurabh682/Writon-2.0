# Founding Writer Program

## Purpose

Recognize up to 250 real early writers who help establish WritOn's community and improve the product. This is an editorial/community entitlement, not identity verification and not a promise of reach.

## Public recognition

- Permanent numbered label: `Founding Writer #001` through `#250`.
- Terracotta founder frame and `F` mark on profile and comment/reply avatars.
- A separate orange check means **Email confirmed** only. It must never be described as identity, expertise, or editorial verification.
- Optional Founding Writers directory, ordered by founder number rather than popularity.

## Useful privileges

1. Early access to opt-in product previews.
2. A private feedback channel with visible “reviewed / planned / declined” outcomes.
3. Quarterly votes on a small set of genuine product choices.
4. Handle protection while the account remains in good standing.
5. A limited invitation allocation for writers they trust.
6. Optional newcomer welcome participation and editorial roundtables.

Do not promise guaranteed promotion, guaranteed editorial feedback, lifetime premium access, payment, or a minimum audience unless WritOn can reliably staff and fund it.

## Assignment rules

- Operator-assigned only; never infer from row order or registration timestamp.
- Human accounts only; exclude bots, seed personas, staff test accounts, and deleted/banned accounts.
- One immutable number per profile, limited by a database uniqueness/range constraint.
- Record the assignment reason and operator in an audit log before production rollout.
- Revocation should be exceptional (fraud, abuse, or mistaken assignment) and audited; numbers should not be silently recycled.

## Rollout

1. ✅ Applied the additive profile entitlement migration in staging and production on 2026-09-19.
2. ✅ Verified a disposable numbered staging profile, public author responses, profile persistence, canonical media upload, authentication guards, and automatic teardown.
3. ✅ Promoted isolated Google Cloud Run revisions after zero-traffic validation and a 5% production canary. The prior production revision remains available for rollback.
4. ✅ Added and deployed an authenticated admin assignment API with an immutable, non-recyclable audit ledger on 2026-09-20. The local operator screen never stores the admin secret.
5. ⬜ Curate and confirm the real founding cohort manually; no production profile is currently assigned.

## Deployed runtime evidence

- Staging revision: `writon-app-api-staging-foundingwriter` (100% staging traffic).
- Production revision: `writon-app-api-foundingwriter` (100% production traffic).
- Artifact images inherit the prior known-good GCP images and replace only `server.js`; unrelated working-tree bot and editorial changes were not included.
- Schema verification: one nullable `founding_writer_number`, one non-null `email_verified`, validated 1–250 check constraint, partial unique index, zero numbered profiles, zero null verification flags.
- End-to-end verification: disposable Firebase account creation, default field response, temporary number 250 round-trip, 1px profile upload, secured profile update, and cleanup all passed in staging and on the zero-traffic production revision.
- Assignment control: `/api/v1/admin/founding-writers` and `/api/v1/admin/founding-writers/assign` require the Google Cloud `ADMIN_SECRET_KEY`; mutations additionally require an operator label and reason. Cloud Run revision `writon-app-api-00030-bem` passed staging, zero-traffic production, 5% canary, and ERROR/5xx checks before promotion. Both databases contain zero real assignments.
- Operator UI: `public/founding-writer-admin.html` targets `https://api.writon.cc`, keeps the secret in page memory only, requires explicit confirmation, and exposes no automatic cohort assignment.

## Measures

- Founding writers publishing or commenting in the last 30 days.
- Actionable feedback submitted and closed.
- New writers receiving a genuine response from a founding writer.
- Abuse reports or confusion between email confirmation and identity verification.
