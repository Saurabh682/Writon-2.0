import { z } from 'zod';

const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  kind: z.enum(['applaud', 'comment', 'follow', 'bookmark']).optional(),
});

const pushTokenInputSchema = z.object({
  token: z.string().trim().min(20).max(8192),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
  appVersionCode: z.coerce.number().int().positive().optional(),
  notificationPermission: z.enum(['granted', 'denied', 'unknown']).default('unknown'),
});

const notificationPreferencesSchema = z.object({
  interactionsEnabled: z.boolean().optional(),
  followsEnabled: z.boolean().optional(),
  editorialEnabled: z.boolean().optional(),
  publishingEnabled: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one notification preference is required.');

export async function notificationRoutes(fastify, { database, requireUser, parseCollectionQuery, postIdSchema }) {
  fastify.get('/api/v1/me/notifications', { preHandler: requireUser }, async (request, reply) => {
    const query = parseCollectionQuery(request, reply, notificationQuerySchema);
    if (!query) return;
    const { page, limit, kind } = query;
    const result = await database.query(
      `select notification.id::text as id, notification.kind, notification.message,
              notification.created_at as "createdAt", notification.read_at as "readAt",
              notification.post_id::text as "postId", post.title as "postTitle",
              json_build_object(
                'id', actor.id, 'penName', actor.pen_name, 'fullName', actor.full_name,
                'avatarUrl', actor.avatar_url
              ) as actor
       from public.notifications notification
       left join public.profiles actor on actor.id = notification.actor_id
       left join public.posts post on post.id = notification.post_id
       where notification.recipient_id = $1
         and ($2::text is null or notification.kind = $2)
       order by notification.created_at desc
       limit $3 offset $4`,
      [request.profileId, kind ?? null, limit + 1, (page - 1) * limit]
    );
    return { notifications: result.rows.slice(0, limit), pagination: { page, limit, hasMore: result.rows.length > limit } };
  });

  fastify.put('/api/v1/me/devices/push-token', { preHandler: requireUser }, async (request, reply) => {
    const parsed = pushTokenInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid push token registration', details: parsed.error.flatten().fieldErrors });
    }
    const device = parsed.data;
    await database.query(
      `insert into public.device_push_tokens (
         profile_id, token, platform, app_version_code, notification_permission, revoked_at, last_seen_at, updated_at
       ) values ($1, $2, $3, $4, $5, null, now(), now())
       on conflict (token) do update
         set profile_id = excluded.profile_id,
             platform = excluded.platform,
             app_version_code = excluded.app_version_code,
             notification_permission = excluded.notification_permission,
             revoked_at = null,
             last_seen_at = now(), updated_at = now()`,
      [request.profileId, device.token, device.platform, device.appVersionCode ?? null, device.notificationPermission]
    );
    return { registered: true };
  });

  fastify.delete('/api/v1/me/devices/push-token', { preHandler: requireUser }, async (request, reply) => {
    const parsed = pushTokenInputSchema.pick({ token: true }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid push token registration' });
    await database.query(
      `update public.device_push_tokens
          set revoked_at = now(), updated_at = now()
        where profile_id = $1 and token = $2`,
      [request.profileId, parsed.data.token]
    );
    return { revoked: true };
  });

  fastify.get('/api/v1/me/notification-preferences', { preHandler: requireUser }, async (request) => {
    const result = await database.query(
      `select interactions_enabled as "interactionsEnabled", follows_enabled as "followsEnabled",
              editorial_enabled as "editorialEnabled", publishing_enabled as "publishingEnabled"
         from public.notification_preferences where profile_id = $1`,
      [request.profileId]
    );
    return result.rows[0] ?? {
      interactionsEnabled: true, followsEnabled: true, editorialEnabled: true, publishingEnabled: true,
    };
  });

  fastify.put('/api/v1/me/notification-preferences', { preHandler: requireUser }, async (request, reply) => {
    const parsed = notificationPreferencesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid notification preferences', details: parsed.error.flatten().fieldErrors });
    }
    const value = parsed.data;
    const result = await database.query(
      `insert into public.notification_preferences (
         profile_id, interactions_enabled, follows_enabled, editorial_enabled, publishing_enabled, updated_at
       ) values ($1, coalesce($2, true), coalesce($3, true), coalesce($4, true), coalesce($5, true), now())
       on conflict (profile_id) do update
         set interactions_enabled = coalesce($2, public.notification_preferences.interactions_enabled),
             follows_enabled = coalesce($3, public.notification_preferences.follows_enabled),
             editorial_enabled = coalesce($4, public.notification_preferences.editorial_enabled),
             publishing_enabled = coalesce($5, public.notification_preferences.publishing_enabled),
             updated_at = now()
       returning interactions_enabled as "interactionsEnabled", follows_enabled as "followsEnabled",
                 editorial_enabled as "editorialEnabled", publishing_enabled as "publishingEnabled"`,
      [request.profileId, value.interactionsEnabled ?? null, value.followsEnabled ?? null,
        value.editorialEnabled ?? null, value.publishingEnabled ?? null]
    );
    return result.rows[0];
  });

  fastify.patch('/api/v1/me/notifications/:id/read', { preHandler: requireUser }, async (request, reply) => {
    const notificationId = postIdSchema.safeParse(request.params.id);
    if (!notificationId.success) return reply.code(400).send({ error: 'Invalid notification id' });
    const result = await database.query(
      `update public.notifications set read_at = coalesce(read_at, now())
        where id = $1 and recipient_id = $2
        returning id::text as id, read_at as "readAt"`,
      [notificationId.data, request.profileId]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: 'Notification not found' });
    return result.rows[0];
  });
}
