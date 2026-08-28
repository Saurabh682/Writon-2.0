-- Covers the self-referencing reply foreign key and keeps reply cleanup fast.
create index if not exists comments_parent_comment_id_idx
  on public.comments (parent_comment_id);

-- The primary key (profile_id, topic_id) already serves the profile lookup.
drop index if exists public.profile_interests_profile_created_idx;
