# Campaign launch readiness

The calendar and delivery registry are planning records, not proof that a post is approved or scheduled. A row can advance only through:

`idea -> sourced -> rights_verified -> copy_ready -> localized -> designed -> qa_passed -> scheduled -> published -> measured`

Only `qa_passed` work may be entered into a native platform scheduler. The scripts in `campaign/scripts/` export previews and assets only; API publishing is intentionally disabled.

## Required before Day 1

- Record the verified Day-0 product and audience values in `day-0-baseline.csv`.
- Complete production sign-up, login, account recovery, autosave/restore, publish, engagement, deep-link, theme, and four-language smoke tests.
- Confirm at least 14 complete posts, 12 language-specific emergency posts, five founder drafts, 20 Pinterest source assets, and 10 additional Story frames.
- Enter every featured story in `human-content-allowlist.csv`, including the planned day, exact approved excerpt, rights basis, consent, credit, reviewer, and review time.
- Replace or pause every featured-story concept that lacks an approved allowlist row.
- Review all translations with a fluent human reviewer.
- Confirm each `/go/:deliveryId` link redirects to Google Play with the exact UTM contract.
- Schedule only through native platform tools. Founder absence does not stop already-approved brand work.

The current allowlist intentionally starts empty. This is a fail-closed state: no excerpt, quotation, poem, or author spotlight is cleared for publication until its evidence is entered.

## Daily operating check

Verify the published asset and link, record metrics, spend 30 minutes on manual community engagement, capture support feedback, and review acquisition/feed health. Pause install CTAs for critical login, sync, publish, crash, provenance, or feed-integrity failures.

## Weekly decision check

Every Friday by 6:00 PM IST, review provenance, localization, accessibility, platform fit, and links. Corrections are due by 8:00 PM. Native scheduling finishes by Saturday noon. Record the rollout decision and evidence in `weekly-decision-log.md`.

Do not interpret social reach, redirect clicks, Play listing intent, GA4 `first_open`, and `writon_activation` as the same event. Report them as separate funnel stages.

