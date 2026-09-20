-- Migration: 20260919_editorial_brain_runtime_memory.sql
-- Description: Additive runtime memory, reservations, dispatches, windowed observations, and concurrency-safe advisory lease helpers.
-- Safety: Additive only. No modifications or drops to any existing tables. Restricted to service_role.

BEGIN;

-- 1. Editorial Insight Reservations
CREATE TABLE IF NOT EXISTS public.editorial_insight_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id text NOT NULL UNIQUE,
    archetype text NOT NULL,
    insight_id text NOT NULL,
    channel text NOT NULL,
    worker_id text NOT NULL,
    lease_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    lease_expires_at timestamptz NOT NULL,
    status text NOT NULL CHECK (status IN ('active', 'committed', 'released', 'quarantined')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Partial index: at most one active lease per channel & insight
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_channel_insight 
ON public.editorial_insight_reservations (channel, insight_id) 
WHERE (status = 'active');

-- Index for cross-channel active/quarantined archetype lookups
CREATE INDEX IF NOT EXISTS idx_reservations_archetype_status 
ON public.editorial_insight_reservations (archetype, status, lease_expires_at);

-- 2. Editorial Insight Dispatches
CREATE TABLE IF NOT EXISTS public.editorial_insight_dispatches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id text NOT NULL UNIQUE,
    reservation_id uuid REFERENCES public.editorial_insight_reservations(id),
    channel text NOT NULL,
    insight_id text NOT NULL,
    archetype text NOT NULL,
    status text NOT NULL CHECK (status IN ('in_flight', 'published', 'failed', 'reconciliation_required')),
    external_post_id text,
    content_hash text NOT NULL,
    policy_hash text NOT NULL,
    dispatched_at timestamptz NOT NULL DEFAULT now(),
    reconciled_at timestamptz,
    failure_reason text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for cross-channel 48h archetype cooldown on confirmed published posts
CREATE INDEX IF NOT EXISTS idx_dispatches_archetype_published 
ON public.editorial_insight_dispatches (archetype, dispatched_at DESC) 
WHERE (status = 'published');

-- Index for 48h channel insight cooldown on confirmed published posts
CREATE INDEX IF NOT EXISTS idx_dispatches_channel_insight_published 
ON public.editorial_insight_dispatches (channel, insight_id, dispatched_at DESC) 
WHERE (status = 'published');

-- Index for blocking unresolved dispatches
CREATE INDEX IF NOT EXISTS idx_dispatches_unresolved 
ON public.editorial_insight_dispatches (archetype, status) 
WHERE (status IN ('in_flight', 'reconciliation_required'));

-- 3. Editorial Insight Observations (Windowed Telemetry)
CREATE TABLE IF NOT EXISTS public.editorial_insight_observations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id uuid NOT NULL REFERENCES public.editorial_insight_dispatches(id) ON DELETE CASCADE,
    "window" text NOT NULL CHECK ("window" IN ('1h', '6h', '24h', '72h', '7d')),
    impressions bigint CHECK (impressions IS NULL OR impressions >= 0),
    engagement_score numeric(7,4),
    retention_pct numeric(5,2) CHECK (retention_pct IS NULL OR (retention_pct >= 0 AND retention_pct <= 100.00)),
    shares integer CHECK (shares IS NULL OR shares >= 0),
    saves integer CHECK (saves IS NULL OR saves >= 0),
    comments integer CHECK (comments IS NULL OR comments >= 0),
    observed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_dispatch_observation_window UNIQUE (dispatch_id, "window")
);

-- RLS & Privileges: Restrict write/function execution to backend service role
ALTER TABLE public.editorial_insight_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_insight_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_insight_observations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.editorial_insight_reservations FROM anon, authenticated;
REVOKE ALL ON public.editorial_insight_dispatches FROM anon, authenticated;
REVOKE ALL ON public.editorial_insight_observations FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_insight_reservations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_insight_dispatches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_insight_observations TO service_role;

-- 4. Atomic Cross-Channel Reservation Stored Function
CREATE OR REPLACE FUNCTION public.acquire_editorial_insight_lease(
    p_delivery_id text,
    p_archetype text,
    p_insight_id text,
    p_channel text,
    p_worker_id text,
    p_duration_seconds integer DEFAULT 900
) RETURNS jsonb AS $$
DECLARE
    v_lock_key bigint;
    v_reservation_id uuid;
    v_lease_token uuid;
    v_expires_at timestamptz;
BEGIN
    -- Transaction-scoped advisory lock on 64-bit integer hash of archetype
    -- Ensures strict serialization of candidate selection within the same archetype
    v_lock_key := ('x' || substr(md5('editorial_archetype:' || p_archetype), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Check 1: Unresolved dispatches in this archetype across ALL channels (Permanent hard block)
    IF EXISTS (
        SELECT 1 FROM public.editorial_insight_dispatches
        WHERE archetype = p_archetype
          AND status IN ('in_flight', 'reconciliation_required')
    ) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'ARCHETYPE_UNRESOLVED_DISPATCH_BLOCK');
    END IF;

    -- Check 2: Active or quarantined reservations in this archetype across ALL channels
    IF EXISTS (
        SELECT 1 FROM public.editorial_insight_reservations
        WHERE archetype = p_archetype
          AND (
              (status = 'active' AND lease_expires_at > now())
              OR status = 'quarantined'
          )
    ) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'ARCHETYPE_RESERVATION_ACTIVE');
    END IF;

    -- Check 3: 48-hour cross-channel spacing for confirmed published dispatches of this archetype
    IF EXISTS (
        SELECT 1 FROM public.editorial_insight_dispatches
        WHERE archetype = p_archetype
          AND status = 'published'
          AND dispatched_at > now() - INTERVAL '48 hours'
    ) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'ARCHETYPE_COOLDOWN_ACTIVE');
    END IF;

    -- Check 4: 48-hour channel-specific cooldown for confirmed published dispatches of this specific insight
    IF EXISTS (
        SELECT 1 FROM public.editorial_insight_dispatches
        WHERE channel = p_channel
          AND insight_id = p_insight_id
          AND status = 'published'
          AND dispatched_at > now() - INTERVAL '48 hours'
    ) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'INSIGHT_CHANNEL_COOLDOWN_ACTIVE');
    END IF;

    -- All checks passed: insert atomic reservation
    v_expires_at := now() + (p_duration_seconds || ' seconds')::interval;
    v_lease_token := gen_random_uuid();

    INSERT INTO public.editorial_insight_reservations (
        delivery_id,
        archetype,
        insight_id,
        channel,
        worker_id,
        lease_token,
        lease_expires_at,
        status
    ) VALUES (
        p_delivery_id,
        p_archetype,
        p_insight_id,
        p_channel,
        p_worker_id,
        v_lease_token,
        v_expires_at,
        'active'
    ) RETURNING id INTO v_reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_reservation_id,
        'lease_token', v_lease_token,
        'lease_expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
