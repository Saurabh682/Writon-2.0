import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const assignmentSchema = z.object({
  profileId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/),
  foundingWriterNumber: z.coerce.number().int().min(1).max(250),
  reason: z.string().trim().min(3).max(500),
});

function sameSecret(actual, expected) {
  const left = Buffer.from(String(actual ?? ''));
  const right = Buffer.from(String(expected ?? ''));
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

export async function adminFoundingWriterRoutes(fastify, { database, config }) {
  const requireAdmin = async (request, reply) => {
    if (!sameSecret(request.headers['x-admin-key'], config.adminSecretKey)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };

  fastify.get('/api/v1/admin/founding-writers', { preHandler: requireAdmin }, async () => {
    const result = await database.query(`
      select profile.id, profile.pen_name as username, profile.full_name as display_name,
             assignment.founding_writer_number, assignment.assigned_at,
             assignment.assigned_by, assignment.assignment_reason,
             count(*) over()::int as total_count
        from public.founding_writer_assignments assignment
        join public.profiles profile on profile.id = assignment.profile_id::text
       order by assignment.founding_writer_number asc
       limit 250
    `);
    return {
      founders: result.rows.map((row) => ({
        profileId: row.id,
        penName: row.username,
        displayName: row.display_name,
        foundingWriterNumber: row.founding_writer_number,
        assignedAt: row.assigned_at,
        assignedBy: row.assigned_by,
        assignmentReason: row.assignment_reason,
      })),
      total: result.rows[0]?.total_count ?? 0,
    };
  });

  fastify.post('/api/v1/admin/founding-writers/assign', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = assignmentSchema.safeParse(request.body);
    const actor = String(request.headers['x-admin-actor'] ?? '').trim();
    if (!parsed.success || actor.length < 2 || actor.length > 120) {
      return reply.code(400).send({
        error: 'A valid profile, founder number, reason, and x-admin-actor header are required.',
      });
    }

    const { profileId, foundingWriterNumber, reason } = parsed.data;
    const client = await database.connect();
    try {
      await client.query('begin');
      const profileResult = await client.query(
        `select id, pen_name as username, full_name as display_name, account_type, founding_writer_number
           from public.profiles where id = $1 for update`,
        [profileId],
      );
      const profile = profileResult.rows[0];
      if (!profile) {
        await client.query('rollback');
        return reply.code(404).send({ error: 'Profile not found.' });
      }
      if (profile.account_type !== 'human') {
        await client.query('rollback');
        return reply.code(409).send({ error: 'Only human profiles can become Founding Writers.' });
      }
      if (profile.founding_writer_number != null) {
        await client.query('rollback');
        return reply.code(409).send({ error: 'This profile already has a permanent Founding Writer number.' });
      }

      const assignment = await client.query(
        `insert into public.founding_writer_assignments (
           profile_id, founding_writer_number, profile_pen_name, profile_display_name,
           assigned_by, assignment_reason
         ) values ($1, $2, $3, $4, $5, $6)
         returning assigned_at`,
        [profile.id, foundingWriterNumber, profile.username, profile.display_name, actor, reason],
      );
      await client.query(
        `update public.profiles set founding_writer_number = $2 where id = $1`,
        [profile.id, foundingWriterNumber],
      );
      await client.query('commit');
      return reply.code(201).send({
        profileId: profile.id,
        foundingWriterNumber,
        assignedBy: actor,
        assignedAt: assignment.rows[0].assigned_at,
      });
    } catch (error) {
      await client.query('rollback').catch(() => {});
      if (error?.code === '23505') {
        return reply.code(409).send({ error: 'That profile or Founding Writer number has already been assigned.' });
      }
      throw error;
    } finally {
      client.release();
    }
  });
}
