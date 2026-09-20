-- Align curated writer personas to account_type = 'human'
-- Conforms to spark-runner persona initialization contract (lines 248-255)
-- Ensures human_verified editorial stories are served chronologically to mobile and web reader feeds.
-- Pure reader and interaction bots (bot_reader_%, reviewer_%) strictly remain account_type = 'editorial_bot'.
begin;

update public.profiles
set account_type = 'human'
where id like 'bot\_writer\_%' escape '\'
   or id in (
     'bot_aarav_tech',
     'bot_kavya_poetry',
     'bot_devansh_fiction',
     'bot_sunita_essays',
     'bot_rohan_humour',
     'bot_ishaq_shayari'
   );

commit;
