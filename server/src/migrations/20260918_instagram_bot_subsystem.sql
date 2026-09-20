-- ==============================================================================
-- WritOn Instagram Subsystem Migration (15 Relational Tables + Triggers)
-- Meta Graph API v26.0 Hardened Architecture
-- ==============================================================================

-- 1. Connected Account Credentials & Dynamic Capabilities
CREATE TABLE IF NOT EXISTS public.instagram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ig_user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('BUSINESS', 'CREATOR')),
  auth_provider TEXT NOT NULL CHECK (auth_provider IN ('FACEBOOK_LOGIN', 'INSTAGRAM_LOGIN')),
  token_expires_at TIMESTAMPTZ NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Mutable Candidate Lifecycle Pointer
CREATE TABLE IF NOT EXISTS public.instagram_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_revision INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VALIDATING', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'QUARANTINED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Candidate Version Snapshots (Immutable after approved_at IS NOT NULL)
CREATE TABLE IF NOT EXISTS public.instagram_candidate_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.instagram_candidates(id) ON DELETE CASCADE,
  revision INT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('FEED_SINGLE', 'FEED_CAROUSEL', 'REEL', 'STORY_UNINTERACTIVE', 'STORY_HYBRID_MANUAL')),
  caption TEXT NOT NULL,
  visual_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  caption_hash TEXT NOT NULL,
  visual_spec_hash TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  asset_manifest_hash TEXT,
  brain_hash TEXT NOT NULL,
  genesis_protocol_hash TEXT NOT NULL,
  instagram_editorial_rules_hash TEXT NOT NULL,
  platform_contract_version TEXT NOT NULL DEFAULT 'v26.0',
  governance_bundle_hash TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_candidate_revision UNIQUE(candidate_id, revision)
);

-- 4. Versioned Media Assets (Identity immutable post-approval; URLs rotatable)
CREATE TABLE IF NOT EXISTS public.instagram_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_version_id UUID NOT NULL REFERENCES public.instagram_candidate_versions(id) ON DELETE CASCADE,
  sequence_order INT NOT NULL DEFAULT 1,
  editorial_role TEXT NOT NULL DEFAULT 'hook',
  kind TEXT NOT NULL CHECK (kind IN ('IMAGE', 'VIDEO')),
  mime_type TEXT NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  duration_seconds DOUBLE PRECISION,
  file_size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  storage_uri TEXT NOT NULL,
  public_fetch_url TEXT NOT NULL,
  url_expires_at TIMESTAMPTZ NOT NULL,
  alt_text TEXT,
  accessibility_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (validation_status IN ('PENDING', 'VERIFIED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_asset_version_sequence UNIQUE(candidate_version_id, sequence_order)
);

-- 5. Validation Execution Runs
CREATE TABLE IF NOT EXISTS public.instagram_validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_version_id UUID NOT NULL REFERENCES public.instagram_candidate_versions(id) ON DELETE CASCADE,
  governance_bundle_hash TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('GENERATION', 'OPERATOR_VALIDATE', 'APPROVAL', 'SCHEDULE', 'DRY_RUN', 'PRE_PUBLISH')),
  passed BOOLEAN NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Discrete Validation Gate Results
CREATE TABLE IF NOT EXISTS public.instagram_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_run_id UUID NOT NULL REFERENCES public.instagram_validation_runs(id) ON DELETE CASCADE,
  gate_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WARN')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 7. Publication Queue & Schedules
CREATE TABLE IF NOT EXISTS public.instagram_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_version_id UUID NOT NULL REFERENCES public.instagram_candidate_versions(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  publish_window_start TIMESTAMPTZ NOT NULL,
  publish_window_end TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (state IN ('SCHEDULED', 'CLAIMED', 'CONTAINERS_PREPARED', 'PUBLISHING', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Meta Graph API v26.0 Asynchronous Containers
CREATE TABLE IF NOT EXISTS public.instagram_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_version_id UUID NOT NULL REFERENCES public.instagram_candidate_versions(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.instagram_assets(id) ON DELETE SET NULL,
  container_role TEXT NOT NULL DEFAULT 'SINGLE' CHECK (container_role IN ('CHILD', 'PARENT', 'SINGLE')),
  sequence_order INT,
  container_id TEXT UNIQUE NOT NULL,
  parent_container_id TEXT,
  media_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'FINISHED', 'ERROR', 'EXPIRED', 'PUBLISHED')),
  error_details JSONB,
  last_polled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Publication Intents (Sole Idempotency Anchor)
CREATE TABLE IF NOT EXISTS public.instagram_publish_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_key TEXT UNIQUE NOT NULL,
  candidate_version_id UUID NOT NULL REFERENCES public.instagram_candidate_versions(id) ON DELETE CASCADE,
  publication_role TEXT NOT NULL CHECK (publication_role IN ('PRIMARY', 'COMPANION_STORY')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_FLIGHT', 'CONFIRMED', 'RECONCILING', 'QUARANTINED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT uq_intent_candidate_role UNIQUE(candidate_version_id, publication_role)
);

-- 10. Individual Publication Attempts
CREATE TABLE IF NOT EXISTS public.instagram_publish_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_intent_id UUID NOT NULL REFERENCES public.instagram_publish_intents(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  container_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'EXPLICIT_FAIL', 'TIMEOUT_UNKNOWN')),
  error_payload JSONB,
  CONSTRAINT uq_intent_attempt UNIQUE(publish_intent_id, attempt_number)
);

-- 11. Auditable Reconciliation Checks (Post-Timeout Ambiguity)
CREATE TABLE IF NOT EXISTS public.instagram_reconciliation_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_intent_id UUID NOT NULL REFERENCES public.instagram_publish_intents(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  strategy TEXT NOT NULL CHECK (strategy IN ('DIRECT_MEDIA_LOOKUP', 'USER_FEED_QUERY', 'INSIGHTS_PROBE')),
  result TEXT NOT NULL CHECK (result IN ('CONFIRMED_LIVE', 'EXPLICIT_META_FAILURE', 'AMBIGUOUS_INCONCLUSIVE')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_check_at TIMESTAMPTZ
);

-- 12. Confirmed Live Publications
CREATE TABLE IF NOT EXISTS public.instagram_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_intent_id UUID UNIQUE NOT NULL REFERENCES public.instagram_publish_intents(id) ON DELETE CASCADE,
  candidate_version_id UUID NOT NULL REFERENCES public.instagram_candidate_versions(id) ON DELETE CASCADE,
  ig_media_id TEXT UNIQUE NOT NULL,
  shortcode TEXT,
  permalink TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  asset_manifest_hash TEXT,
  governance_bundle_hash TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lifecycle_status TEXT NOT NULL DEFAULT 'LIVE' CHECK (lifecycle_status IN ('LIVE', 'ARCHIVED', 'DELETED'))
);

-- 13. Views-Centric Metric Snapshots
CREATE TABLE IF NOT EXISTS public.instagram_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.instagram_publications(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  views BIGINT,
  reach BIGINT,
  likes BIGINT,
  comments BIGINT,
  saved BIGINT,
  shares BIGINT,
  total_interactions BIGINT,
  watch_time_seconds BIGINT,
  replies BIGINT,
  link_clicks BIGINT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 14. Raw Neutral Performance Observations (With Metric Lineage)
CREATE TABLE IF NOT EXISTS public.instagram_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.instagram_publications(id) ON DELETE CASCADE,
  metric_snapshot_id UUID REFERENCES public.instagram_metrics(id) ON DELETE SET NULL,
  brain_insight_id TEXT NOT NULL,
  archetype TEXT NOT NULL,
  format TEXT NOT NULL,
  opening_structure TEXT NOT NULL,
  slide_count INT NOT NULL DEFAULT 1,
  views BIGINT,
  reach BIGINT,
  save_rate DOUBLE PRECISION,
  share_rate DOUBLE PRECISION,
  reply_rate DOUBLE PRECISION,
  observation_window TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Empirical Cohort Learning Patterns
CREATE TABLE IF NOT EXISTS public.instagram_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN ('ARCHETYPE', 'HOOK_MECHANISM', 'SLIDE_COUNT', 'PACING')),
  sample_size INT NOT NULL DEFAULT 1,
  baseline_delta DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  confidence TEXT NOT NULL DEFAULT 'LOW' CHECK (confidence IN ('LOW', 'MEDIUM', 'HIGH')),
  admitted_to_brain BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- IMMUTABILITY ENFORCEMENT TRIGGERS
-- ==============================================================================

-- Trigger 1: Candidate Version Immutability post-approval
CREATE OR REPLACE FUNCTION enforce_candidate_version_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.approved_at IS NOT NULL THEN
    IF NEW.caption <> OLD.caption OR
       NEW.visual_spec <> OLD.visual_spec OR
       NEW.caption_hash <> OLD.caption_hash OR
       NEW.visual_spec_hash <> OLD.visual_spec_hash OR
       NEW.content_hash <> OLD.content_hash OR
       NEW.asset_manifest_hash IS DISTINCT FROM OLD.asset_manifest_hash OR
       NEW.brain_hash <> OLD.brain_hash OR
       NEW.governance_bundle_hash <> OLD.governance_bundle_hash THEN
      RAISE EXCEPTION 'Cannot modify approved candidate version (id: %). Create a new revision.', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_candidate_version_immutability ON public.instagram_candidate_versions;
CREATE TRIGGER trg_candidate_version_immutability
BEFORE UPDATE ON public.instagram_candidate_versions
FOR EACH ROW EXECUTE FUNCTION enforce_candidate_version_immutability();

-- Trigger 2: Asset Identity Immutability post-approval (URLs rotatable)
CREATE OR REPLACE FUNCTION enforce_asset_identity_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_approved_at TIMESTAMPTZ;
BEGIN
  SELECT approved_at INTO v_approved_at
  FROM public.instagram_candidate_versions
  WHERE id = OLD.candidate_version_id;

  IF v_approved_at IS NOT NULL THEN
    IF NEW.sha256 <> OLD.sha256 OR
       NEW.storage_uri <> OLD.storage_uri OR
       NEW.sequence_order <> OLD.sequence_order OR
       NEW.editorial_role <> OLD.editorial_role OR
       NEW.kind <> OLD.kind OR
       NEW.mime_type <> OLD.mime_type OR
       NEW.width <> OLD.width OR
       NEW.height <> OLD.height OR
       NEW.duration_seconds IS DISTINCT FROM OLD.duration_seconds THEN
      RAISE EXCEPTION 'Cannot modify media identity of asset (id: %) for approved candidate version (%). Create a new revision.', OLD.id, OLD.candidate_version_id;
    END IF;
    -- public_fetch_url and url_expires_at ARE explicitly allowed to rotate.
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asset_identity_immutability ON public.instagram_assets;
CREATE TRIGGER trg_asset_identity_immutability
BEFORE UPDATE ON public.instagram_assets
FOR EACH ROW EXECUTE FUNCTION enforce_asset_identity_immutability();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ig_candidate_versions_cid ON public.instagram_candidate_versions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ig_assets_version_id ON public.instagram_assets(candidate_version_id);
CREATE INDEX IF NOT EXISTS idx_ig_containers_version_id ON public.instagram_containers(candidate_version_id);
CREATE INDEX IF NOT EXISTS idx_ig_schedules_state ON public.instagram_schedules(state, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ig_intents_key ON public.instagram_publish_intents(publish_key);
CREATE INDEX IF NOT EXISTS idx_ig_metrics_pub_id ON public.instagram_metrics(publication_id, snapshot_at);
CREATE INDEX IF NOT EXISTS idx_ig_obs_insight ON public.instagram_observations(brain_insight_id);
