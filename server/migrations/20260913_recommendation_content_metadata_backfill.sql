-- Run only after 20260913_recommendation_content_metadata.sql.
-- Every populated value names its deterministic method; ambiguous forms/scripts remain null.
begin;

update public.posts
set content_form = case lower(btrim(category))
      when 'poetry' then 'poetry'
      when 'shayari' then 'poetry'
      when 'short stories' then 'short_story'
      when 'essays' then 'essay'
      when 'journalism' then 'journalism'
      when 'reviews' then 'review'
    end,
    content_form_source = 'category_mapping_v1',
    content_form_confidence = 0.950,
    recommendation_metadata_updated_at = now()
where content_form is null
  and lower(btrim(category)) in ('poetry', 'shayari', 'short stories', 'essays', 'journalism', 'reviews');

update public.posts
set word_count = case
      when btrim(content) = '' then 0
      else cardinality(regexp_split_to_array(btrim(content), '\s+'))
    end,
    word_count_source = 'unicode_whitespace_v1',
    recommendation_metadata_updated_at = now()
where word_count is null;

-- Only unambiguous single-script records are backfilled automatically.
update public.posts
set script_code = case
      when corpus ~ '[ঀ-৿]' and corpus !~ '[ऀ-ॿA-Za-z؀-ۿ]' then 'Beng'
      when corpus ~ '[ऀ-ॿ]' and corpus !~ '[ঀ-৿A-Za-z؀-ۿ]' then 'Deva'
      when corpus ~ '[A-Za-z]' and corpus !~ '[ঀ-৿ऀ-ॿ؀-ۿ]' then 'Latn'
      when corpus ~ '[؀-ۿ]' and corpus !~ '[ঀ-৿ऀ-ॿA-Za-z]' then 'Arab'
    end,
    script_source = 'single_script_backfill_v1',
    script_confidence = 1.000,
    recommendation_metadata_updated_at = now()
from (
  select id, coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, '') as corpus
  from public.posts
) source
where public.posts.id = source.id
  and public.posts.script_code is null
  and (
    (corpus ~ '[ঀ-৿]' and corpus !~ '[ऀ-ॿA-Za-z؀-ۿ]')
    or (corpus ~ '[ऀ-ॿ]' and corpus !~ '[ঀ-৿A-Za-z؀-ۿ]')
    or (corpus ~ '[A-Za-z]' and corpus !~ '[ঀ-৿ऀ-ॿ؀-ۿ]')
    or (corpus ~ '[؀-ۿ]' and corpus !~ '[ঀ-৿ऀ-ॿA-Za-z]')
  );

commit;
