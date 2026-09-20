-- Migration: 20260918_app_release_history.sql
-- Description: Canonical historical archive of all Google Play production releases (2016-Present).

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL DEFAULT 'android',
  package_name TEXT NOT NULL DEFAULT 'com.ibitvalley.writon',
  version_code INTEGER NOT NULL,
  version_name TEXT NOT NULL,
  release_title TEXT,
  released_at TIMESTAMPTZ,
  replaced_at TIMESTAMPTZ,
  status TEXT NOT NULL, -- 'available_on_google_play', 'replaced', 'draft_candidate'
  era TEXT NOT NULL, -- 'genesis' (2016-2017), 'classic' (2019-2022), 'modern' (2026)
  is_major BOOLEAN NOT NULL DEFAULT false,
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_releases_platform_code_unique UNIQUE (platform, version_code)
);

CREATE INDEX IF NOT EXISTS app_releases_code_idx ON public.app_releases(platform, version_code DESC);
CREATE INDEX IF NOT EXISTS app_releases_era_idx ON public.app_releases(era, version_code ASC);
CREATE INDEX IF NOT EXISTS app_releases_status_idx ON public.app_releases(status);

COMMIT;
