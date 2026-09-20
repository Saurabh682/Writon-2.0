-- ==============================================================================
-- WritOn LinkedIn Subsystem Migration (15 Relational Tables + Triggers)
-- LinkedIn Posts API & Media API Hardened Architecture (Linkedin-Version: 202609)
-- ==============================================================================

-- 1. Connected Account Credentials, Separate 24h Quotas & Capabilities
CREATE TABLE IF NOT EXISTS public.linkedin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_urn TEXT UNIQUE NOT NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('MEMBER', 'ORGANIZATION')),
  access_tier TEXT NOT NULL DEFAULT 'DEVELOPMENT' CHECK (access_tier IN ('DEVELOPMENT', 'STANDARD')),
  api_version TEXT NOT NULL DEFAULT '202609',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  capabilities JSONB NOT NULL DEFAULT '{
    "can_publish_member": false,
    "can_read_member_posts": false,
    "can_read_member_analytics": false,
    "can_publish_org": false,
    "can_read_org_posts": false,
    "can_read_org_analytics": false,
    "image_upload": false,
    "video_upload": false,
    "document_upload": false
  }'::jsonb,
  local_app_call_count_24h INT NOT NULL DEFAULT 0,
  local_member_call_count_24h INT NOT NULL DEFAULT 0,
  configured_app_limit INT NOT NULL DEFAULT 500,
  configured_member_limit INT NOT NULL DEFAULT 100,
  quota_source TEXT NOT NULL DEFAULT 'DEVELOPMENT_DEFAULT' CHECK (quota_source IN ('DEVELOPMENT_DEFAULT', 'DEVELOPER_PORTAL_CONFIG', 'LOCAL_ESTIMATE', 'UNKNOWN')),
  quota_window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quota_window_resets_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  last_429_at TIMESTAMPTZ,
  token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,
  has_refresh_grant BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Mutable Candidate Lifecycle Pointer
CREATE TABLE IF NOT EXISTS public.linkedin_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_revision INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VALIDATING', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'QUARANTINED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Candidate Version Snapshots (Immutable after approved_at IS NOT NULL)
CREATE TABLE IF NOT EXISTS public.linkedin_candidate_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.linkedin_candidates(id) ON DELETE CASCADE,
  revision INT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('TEXT_ONLY', 'SINGLE_IMAGE', 'MULTI_IMAGE', 'DOCUMENT', 'VIDEO')),
  commentary TEXT NOT NULL,
  visual_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_hash TEXT NOT NULL,
  asset_manifest_hash TEXT,
  brain_hash TEXT NOT NULL,
  linkedin_editorial_rules_hash TEXT NOT NULL,
  governance_bundle_hash TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_linkedin_candidate_revision UNIQUE(candidate_id, revision)
);

-- Trigger: Enforce strict immutability once approved_at IS NOT NULL
CREATE OR REPLACE FUNCTION public.fn_freeze_approved_candidate_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.approved_at IS NOT NULL THEN
    IF NEW.commentary <> OLD.commentary OR
       NEW.visual_spec <> OLD.visual_spec OR
       NEW.content_hash <> OLD.content_hash OR
       NEW.asset_manifest_hash IS DISTINCT FROM OLD.asset_manifest_hash OR
       NEW.brain_hash <> OLD.brain_hash OR
       NEW.linkedin_editorial_rules_hash <> OLD.linkedin_editorial_rules_hash OR
       NEW.governance_bundle_hash <> OLD.governance_bundle_hash OR
       NEW.format <> OLD.format THEN
      RAISE EXCEPTION 'Cannot modify approved candidate version (id: %). State is frozen.', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_freeze_approved_candidate_version ON public.linkedin_candidate_versions;
CREATE TRIGGER trg_freeze_approved_candidate_version
BEFORE UPDATE ON public.linkedin_candidate_versions
FOR EACH ROW EXECUTE FUNCTION public.fn_freeze_approved_candidate_version();

-- 4. Versioned Media Assets (Durable storage_uri + sequence uniqueness)
CREATE TABLE IF NOT EXISTS public.linkedin_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_version_id UUID NOT NULL REFERENCES public.linkedin_candidate_versions(id) ON DELETE CASCADE,
  sequence_order INT NOT NULL DEFAULT 1,
  kind TEXT NOT NULL CHECK (kind IN ('IMAGE', 'DOCUMENT', 'VIDEO')),
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  storage_uri TEXT NOT NULL,
  local_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_linkedin_asset_sequence UNIQUE(candidate_version_id, sequence_order)
);

-- Trigger: Prohibit mutating assets of approved candidate versions
CREATE OR REPLACE FUNCTION public.fn_freeze_approved_asset()
RETURNS TRIGGER AS $$
DECLARE
  v_approved_at TIMESTAMPTZ;
BEGIN
  SELECT approved_at INTO v_approved_at 
  FROM public.linkedin_candidate_versions 
  WHERE id = OLD.candidate_version_id;

  IF v_approved_at IS NOT NULL THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete asset from approved candidate version. State is frozen.';
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.sequence_order <> OLD.sequence_order OR
         NEW.kind <> OLD.kind OR
         NEW.mime_type <> OLD.mime_type OR
         NEW.sha256 <> OLD.sha256 OR
         NEW.storage_uri <> OLD.storage_uri THEN
        RAISE EXCEPTION 'Cannot modify identity of asset belonging to approved candidate version.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_freeze_approved_asset ON public.linkedin_assets;
CREATE TRIGGER trg_freeze_approved_asset
BEFORE UPDATE OR DELETE ON public.linkedin_assets
FOR EACH ROW EXECUTE FUNCTION public.fn_freeze_approved_asset();

-- 5. Validation Execution Runs
CREATE TABLE IF NOT EXISTS public.linkedin_validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_version_id UUID NOT NULL REFERENCES public.linkedin_candidate_versions(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL,
  all_passed BOOLEAN NOT NULL DEFAULT false,
  total_gates INT NOT NULL DEFAULT 34,
  passed_gates INT NOT NULL DEFAULT 0,
  failed_gates INT NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Gate Results with Versioned Repetition Telemetry
CREATE TABLE IF NOT EXISTS public.linkedin_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.linkedin_validation_runs(id) ON DELETE CASCADE,
  gate_code TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Scheduling & Eligibility Windows
CREATE TABLE IF NOT EXISTS public.linkedin_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_version_id UUID UNIQUE NOT NULL REFERENCES public.linkedin_candidate_versions(id) ON DELETE CASCADE,
  window_name TEXT NOT NULL CHECK (window_name IN ('MORNING', 'EVENING')),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'HELD', 'SKIPPED', 'EXECUTED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Resumable Media & Multipart Video Upload State Machine
CREATE TABLE IF NOT EXISTS public.linkedin_media_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_version_id UUID NOT NULL REFERENCES public.linkedin_candidate_versions(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.linkedin_assets(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('IMAGE', 'DOCUMENT', 'VIDEO')),
  linkedin_asset_urn TEXT,
  upload_token TEXT,
  upload_url TEXT,
  upload_urls_expire_at TIMESTAMPTZ,
  upload_parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'WAITING_UPLOAD' CHECK (status IN (
    'WAITING_UPLOAD', 'UPLOADING_PARTS', 'FINALIZING', 'PROCESSING', 'AVAILABLE', 'UPLOAD_FAILED', 'PROCESSING_FAILED', 'EXPIRED'
  )),
  error_payload JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_at TIMESTAMPTZ
);

-- 9. Publish Intents (Idempotency Barrier: 1 Candidate Version = 1 Intent)
CREATE TABLE IF NOT EXISTS public.linkedin_publish_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_version_id UUID UNIQUE NOT NULL REFERENCES public.linkedin_candidate_versions(id) ON DELETE CASCADE,
  publish_key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'EXECUTING', 'CONFIRMED', 'QUARANTINED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Publish Attempts
CREATE TABLE IF NOT EXISTS public.linkedin_publish_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_intent_id UUID NOT NULL REFERENCES public.linkedin_publish_intents(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'EXPLICIT_FAIL', 'UNKNOWN')),
  http_status INT,
  raw_x_restli_id TEXT,
  response_payload JSONB,
  error_message TEXT,
  CONSTRAINT uq_linkedin_intent_attempt UNIQUE(publish_intent_id, attempt_number)
);

-- 11. Permission-Aware Reconciliation Checks (No blind retries on not-found)
CREATE TABLE IF NOT EXISTS public.linkedin_reconciliation_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_intent_id UUID NOT NULL REFERENCES public.linkedin_publish_intents(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL CHECK (strategy IN ('MEMBER_FEED_LOOKUP', 'ORG_FEED_LOOKUP', 'CAPABILITY_RESTRICTED_QUARANTINE', 'OPERATOR_MANUAL')),
  result TEXT NOT NULL CHECK (result IN ('MATCHED_CONFIRMED', 'AMBIGUOUS_NOT_FOUND', 'EXPLICITLY_NOT_PUBLISHED', 'QUARANTINED')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Confirmed Publications
CREATE TABLE IF NOT EXISTS public.linkedin_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_intent_id UUID UNIQUE NOT NULL REFERENCES public.linkedin_publish_intents(id) ON DELETE CASCADE,
  candidate_version_id UUID UNIQUE NOT NULL REFERENCES public.linkedin_candidate_versions(id) ON DELETE CASCADE,
  post_urn TEXT UNIQUE NOT NULL,
  raw_x_restli_id TEXT NOT NULL,
  live_url TEXT NOT NULL,
  author_urn TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Metric Snapshots (Post, Video, and Organization Surfaces)
CREATE TABLE IF NOT EXISTS public.linkedin_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.linkedin_publications(id) ON DELETE CASCADE,
  surface TEXT NOT NULL CHECK (surface IN ('MEMBER_CREATOR_POST', 'MEMBER_CREATOR_VIDEO', 'ORGANIZATIONAL_SHARE')),
  impressions INT,
  unique_members_reached INT,
  reactions INT,
  comments INT,
  reshares INT,
  saves INT,
  sends INT,
  clicks INT,
  video_plays INT,
  video_watch_time_ms BIGINT,
  engagement_rate NUMERIC(6,4),
  raw_response JSONB,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Neutral Telemetry Observations
CREATE TABLE IF NOT EXISTS public.linkedin_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.linkedin_publications(id) ON DELETE CASCADE,
  metric_snapshot_id UUID REFERENCES public.linkedin_metric_snapshots(id) ON DELETE SET NULL,
  hook_archetype TEXT,
  post_format TEXT,
  has_media BOOLEAN NOT NULL DEFAULT false,
  impressions INT,
  reactions INT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Aggregated Learning Patterns
CREATE TABLE IF NOT EXISTS public.linkedin_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype TEXT NOT NULL,
  post_format TEXT NOT NULL,
  sample_size INT NOT NULL DEFAULT 0,
  avg_impressions NUMERIC(10,2),
  avg_reactions NUMERIC(10,2),
  baseline_delta_pct NUMERIC(6,2),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('HYPOTHESIS', 'MODERATE', 'PROVEN_WINNER')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance & rapid lookups
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_urn ON public.linkedin_connections(author_urn);
CREATE INDEX IF NOT EXISTS idx_linkedin_candidates_status ON public.linkedin_candidates(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_candidate_versions_hash ON public.linkedin_candidate_versions(content_hash);
CREATE INDEX IF NOT EXISTS idx_linkedin_intents_key ON public.linkedin_publish_intents(publish_key);
CREATE INDEX IF NOT EXISTS idx_linkedin_publications_urn ON public.linkedin_publications(post_urn);
CREATE INDEX IF NOT EXISTS idx_linkedin_metric_snapshots_pub ON public.linkedin_metric_snapshots(publication_id);
