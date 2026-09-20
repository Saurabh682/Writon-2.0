-- Migration: 20260917_editorial_provenance_and_state_machine.sql
-- Description: Locks down factual source bundles, immutable provenance hashes,
-- multilingual slugs, relational post sources, revision audit history,
-- significance score components, and atomic publication transaction rules.

BEGIN;

-- 1. Immutable Source Bundles Table
CREATE TABLE IF NOT EXISTS public.editorial_source_bundles (
  id TEXT PRIMARY KEY, -- e.g. 'src_release_android_117', 'src_repo_config_20260917'
  source_type TEXT NOT NULL, -- 'release', 'repository', 'production_config', 'founder_record', 'database_evidence'
  source_ref TEXT NOT NULL,  -- 'android:117', 'git:commit_hash', 'config:env_key'
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_hash TEXT NOT NULL, -- sha256 of canonical JSON payload
  verified_by TEXT,          -- identifier of person/subsystem verifying the bundle
  verified_at TIMESTAMPTZ,
  supersedes_source_bundle_id TEXT REFERENCES public.editorial_source_bundles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS editorial_source_bundles_type_ref_idx
  ON public.editorial_source_bundles (source_type, source_ref);

CREATE INDEX IF NOT EXISTS editorial_source_bundles_verified_idx
  ON public.editorial_source_bundles (verified_at DESC)
  WHERE verified_at IS NOT NULL;

-- 2. Upgrade public.editorial_posts Table
-- Drop old constraint if any and adjust columns
ALTER TABLE public.editorial_posts
  ALTER COLUMN content_markdown DROP NOT NULL,
  ALTER COLUMN content_html DROP NOT NULL;

ALTER TABLE public.editorial_posts ADD COLUMN IF NOT EXISTS content_rendered_html TEXT;
ALTER TABLE public.editorial_posts ADD COLUMN IF NOT EXISTS content_render_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.editorial_posts ADD COLUMN IF NOT EXISTS editorial_significance_score INTEGER DEFAULT 0;
ALTER TABLE public.editorial_posts ADD COLUMN IF NOT EXISTS editorial_significance_details JSONB DEFAULT '{}'::jsonb;

-- Populate content_rendered_html from content_html if currently null
UPDATE public.editorial_posts
SET content_rendered_html = content_html
WHERE content_rendered_html IS NULL AND content_html IS NOT NULL;

-- Drop legacy unique constraint on slug if it exists alone
ALTER TABLE public.editorial_posts DROP CONSTRAINT IF EXISTS editorial_posts_slug_key;

-- Multilingual slug unique constraint: UNIQUE(language, slug)
ALTER TABLE public.editorial_posts
  DROP CONSTRAINT IF EXISTS editorial_posts_language_slug_key;
ALTER TABLE public.editorial_posts
  ADD CONSTRAINT editorial_posts_language_slug_key UNIQUE (language, slug);

-- Editorial significance score check: BETWEEN 0 AND 100
ALTER TABLE public.editorial_posts
  DROP CONSTRAINT IF EXISTS editorial_posts_significance_score_check;
ALTER TABLE public.editorial_posts
  ADD CONSTRAINT editorial_posts_significance_score_check
  CHECK (editorial_significance_score IS NULL OR (editorial_significance_score >= 0 AND editorial_significance_score <= 100));

-- Content Markdown State Constraints:
-- 1) CHECK ( status IN ('idea', 'candidate') OR content_markdown IS NOT NULL )
-- 2) CHECK ( status != 'published' OR ( content_markdown IS NOT NULL AND content_rendered_html IS NOT NULL AND published_at IS NOT NULL ) )
ALTER TABLE public.editorial_posts
  DROP CONSTRAINT IF EXISTS editorial_posts_markdown_status_check;
ALTER TABLE public.editorial_posts
  ADD CONSTRAINT editorial_posts_markdown_status_check
  CHECK (status IN ('idea', 'candidate') OR content_markdown IS NOT NULL);

ALTER TABLE public.editorial_posts
  DROP CONSTRAINT IF EXISTS editorial_posts_published_integrity_check;
ALTER TABLE public.editorial_posts
  ADD CONSTRAINT editorial_posts_published_integrity_check
  CHECK (status != 'published' OR (content_markdown IS NOT NULL AND content_rendered_html IS NOT NULL AND published_at IS NOT NULL));

-- 3. Relational Post Sources Join Table
CREATE TABLE IF NOT EXISTS public.editorial_post_sources (
  post_id UUID NOT NULL REFERENCES public.editorial_posts(id) ON DELETE CASCADE,
  source_bundle_id TEXT NOT NULL REFERENCES public.editorial_source_bundles(id) ON DELETE RESTRICT,
  claim_scope TEXT NOT NULL DEFAULT 'all', -- 'all', 'release_summary', 'paragraph_1', etc.
  assertion_type TEXT NOT NULL DEFAULT 'fact' CHECK (assertion_type IN ('fact', 'interpretation', 'opinion_philosophy', 'future_intent')),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, source_bundle_id, claim_scope)
);

CREATE INDEX IF NOT EXISTS editorial_post_sources_bundle_idx
  ON public.editorial_post_sources (source_bundle_id);

-- 4. Relational Post Inter-Relations Table
CREATE TABLE IF NOT EXISTS public.editorial_post_relations (
  source_post_id UUID NOT NULL REFERENCES public.editorial_posts(id) ON DELETE CASCADE,
  related_post_id UUID NOT NULL REFERENCES public.editorial_posts(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'reference' CHECK (relation_type IN ('reference', 'series', 'sequel', 'deep_dive')),
  rank INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_post_id, related_post_id),
  CHECK (source_post_id != related_post_id)
);

CREATE INDEX IF NOT EXISTS editorial_post_relations_related_idx
  ON public.editorial_post_relations (related_post_id);

-- 5. Editorial Post Revisions Table (Institutional Audit Trail)
CREATE TABLE IF NOT EXISTS public.editorial_post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.editorial_posts(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  content_rendered_html TEXT,
  source_hash TEXT NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'system',
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, revision_number)
);

CREATE INDEX IF NOT EXISTS editorial_post_revisions_post_idx
  ON public.editorial_post_revisions (post_id, revision_number DESC);

-- 6. Editorial Ledger Table (Immutable Publication History)
CREATE TABLE IF NOT EXISTS public.editorial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.editorial_posts(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'status_changed', 'revision_created', 'published', 'archived', 'rejected')),
  from_status TEXT,
  to_status TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS editorial_ledger_post_idx
  ON public.editorial_ledger (post_id, created_at DESC);

COMMIT;
