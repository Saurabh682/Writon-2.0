-- Migration: 20260917_founding_writer_eligibility.sql
-- Description: Immutable snapshot table for Founding Writer eligibility (WritOn 2.0 Re-engagement)

CREATE TABLE IF NOT EXISTS public.founding_writer_eligibility (
  profile_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL DEFAULT 'founding_writers_v2',
  eligible_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  eligibility_reason TEXT NOT NULL,
  badge_activated_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_founding_writer_eligibility_campaign 
  ON public.founding_writer_eligibility(campaign_id);

-- Freeze legacy human accounts into the immutable snapshot table
-- Qualifying criteria:
-- 1. Human accounts (account_type = 'human' and not in bot_configs)
-- 2. Valid email present (not null, not empty)
-- 3. Exclude synthetic legacy placeholders (@legacy.writon.io)
-- 4. Exclude automated disposable test canaries (canary-disposable%)
INSERT INTO public.founding_writer_eligibility (profile_id, campaign_id, eligible_at, eligibility_reason)
SELECT 
  p.id,
  'founding_writers_v2',
  NOW(),
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.posts post WHERE post.author_id = p.id AND post.status = 'published') THEN 'published_author'
    WHEN EXISTS (SELECT 1 FROM public.comments c WHERE c.author_id = p.id) 
      OR EXISTS (SELECT 1 FROM public.post_applauds a WHERE a.user_id = p.id) THEN 'engaged_community'
    ELSE 'legacy_member'
  END AS eligibility_reason
FROM public.profiles p
WHERE p.account_type = 'human'
  AND p.email IS NOT NULL 
  AND TRIM(p.email) != ''
  AND p.email NOT LIKE '%@legacy.writon.io'
  AND p.email NOT LIKE 'canary-disposable%'
  AND NOT EXISTS (SELECT 1 FROM public.bot_configs bot WHERE bot.id = p.id)
ON CONFLICT (profile_id) DO NOTHING;
