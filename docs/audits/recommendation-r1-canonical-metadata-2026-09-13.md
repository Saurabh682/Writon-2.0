# Recommendation R1 Canonical Metadata Delivery

**Date:** 2026-09-13  
**Status:** Complete on guarded staging  
**Production impact:** None

## Delivered contract

R1 adds nullable internal columns to `public.posts` for:

- canonical content form: `poetry`, `flash`, `short_story`, `essay`, `journalism`, `review`, or `other`;
- content-form source and confidence;
- measured word count and measurement source;
- dominant ISO 15924-style script code: `Latn`, `Deva`, `Beng`, or `Arab`;
- script source and confidence;
- recommendation metadata update time.

The existing `language_code`, `language_source`, `language_confidence`, and story provenance fields remain the canonical language and authorship controls. No duplicate language contract was introduced.

## Conservative derivation rules

- New author submissions use `Intl.Segmenter` word-like boundaries, avoiding punctuation counts and supporting WritOn's current writing systems without a new dependency.
- Only categories that identify form reliably are mapped automatically: Poetry and Shayari → poetry; Short Stories → short story; Essays → essay; Journalism → journalism; Reviews → review.
- Topic-like categories such as Tech, Culture, Science & Health, and Business & Finance remain unknown until editorial or author review.
- New text records a dominant script ratio and confidence. The backfill classifies script only when a record contains one tracked script; mixed-script content remains null for review.
- Schema expansion and existing-row backfill are separate migrations. Both are forward-only and idempotent at the schema level.

## Compatibility and rollout

- No existing endpoint, request field, response field, alias, or cursor changed.
- Feed candidate preparation can read the internal metadata, but v1 scoring does not use it yet.
- Behavior rollout, holdout, shadow-ranking, and Android Remote Config values are unchanged.
- Apply `20260913_recommendation_content_metadata.sql` first, deploy the compatible writer, then apply `20260913_recommendation_content_metadata_backfill.sql` on staging. Production must wait for staging verification.
- `apply-recommendation-metadata-staging.mjs` enforces the known staging project reference, has no production fallback, and supports `--schema-only` and `--verify-only`.

## Verification

- Canonical derivation and migration-boundary tests: 5/5 pass.
- Fastify contract and feed route checks: 72/72 pass alongside the new metadata tests.
- Complete backend suite: 348/348 tests across 34 files.
- Schema then backfill were applied only to guarded staging ref `xrfnebvkazewqramkpri`.
- An independent verify-only run confirmed 9 expected nullable columns and 5 validated constraints.
- Coverage: 10/10 staging posts have measured word count, language `en`, and script `Latn`; 3/10 are deterministically classified as poetry; 7/10 remain explicitly queued for content-form review; no language or script records require review.
- The read-only verifier now reports grouped content-form, language, and script counts without printing story text.
- No service was deployed and production was not accessed.

## Remaining R1 gate

The complete 10-record staging catalog was reviewed because every populated group contains fewer than 10 records:

- three Poetry records contain verse and correctly map to `poetry`;
- seven Fiction records contain only the fixture text “Rough notes for staging testing.”, which is insufficient to distinguish flash fiction from short story, so their null form is the accurate safe default;
- all ten records are English and Latin-script as stored;
- all stored whitespace-based word counts match the sampled content;
- no correction migration is required.

R1 is closed. R2 may use this metadata on staging, but production remains gated behind its own migration and rollout review.
