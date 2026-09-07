const MAX_ATTEMPTS = 5;

export async function runFollowedWriterNotifications(database, { limit = 20 } = {}) {
  const claimed = await database.query(
    `with candidates as (
       select id
         from public.publication_notification_events
        where status = 'pending' and next_attempt_at <= now()
        order by created_at
        limit $1
        for update skip locked
     )
     update public.publication_notification_events event
        set status = 'processing', attempts = attempts + 1, updated_at = now()
       from candidates
      where event.id = candidates.id
     returning event.id::text as id, event.post_id::text as "postId",
               event.author_id as "authorId", event.attempts`,
    [limit],
  );

  for (const event of claimed.rows) {
    const client = await database.connect();
    try {
      await client.query('begin');
      await client.query(
        `with eligible as (
           select follower.follower_id as recipient_id,
                  event.author_id,
                  event.post_id,
                  post.title,
                  to_char(
                    (coalesce(post.published_at, post.created_at) at time zone
                      coalesce(nullif(preference.timezone, ''), 'Asia/Kolkata'))::date,
                    'YYYY-MM-DD'
                  ) as local_date
             from public.publication_notification_events event
             join public.posts post on post.id = event.post_id
             join public.profiles author on author.id = event.author_id
             join public.follows follower on follower.following_id = event.author_id
             join public.profiles reader on reader.id = follower.follower_id
             left join public.notification_preferences preference
               on preference.profile_id = follower.follower_id
            where event.id = $1
              and post.status = 'published' and post.is_public = true
              and post.provenance = 'human_verified'
              and author.account_type = 'human'
              and reader.account_type = 'human'
              and coalesce(preference.followed_writer_published_enabled,
                           preference.publishing_enabled, true) = true
         ), upserted as (
           insert into public.notifications (
             recipient_id, actor_id, post_id, kind, message, deduplication_key
           )
           select recipient_id, author_id, post_id, 'followed_writer_published',
                  'published a new story',
                  'followed_writer_published:' || recipient_id || ':' || author_id || ':' || local_date
             from eligible
           on conflict (deduplication_key) where deduplication_key is not null
           do update set post_id = excluded.post_id,
                         message = 'published new stories'
           returning id, recipient_id
         )
         insert into public.notification_delivery_outbox (notification_id, recipient_id)
         select id, recipient_id from upserted
         on conflict (notification_id) do nothing`,
        [event.id],
      );
      await client.query(
        `update public.publication_notification_events
            set status = 'done', processed_at = now(), updated_at = now(), last_error = null
          where id = $1`,
        [event.id],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      const failed = event.attempts >= MAX_ATTEMPTS;
      await database.query(
        `update public.publication_notification_events
            set status = $2,
                next_attempt_at = now() + (least(900000, 30000 * power(2, greatest(0, attempts - 1))) * interval '1 millisecond'),
                last_error = left($3, 500), updated_at = now()
          where id = $1`,
        [event.id, failed ? 'failed' : 'pending', error instanceof Error ? error.message : 'Unknown publication fan-out error'],
      );
    } finally {
      client.release();
    }
  }

  return { processed: claimed.rowCount };
}
