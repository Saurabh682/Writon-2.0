import { getMilestoneJourney } from '../services/milestone-service.js';

export async function milestoneRoutes(fastify, { database, requireUser }) {
  fastify.get('/api/v1/me/milestones', { preHandler: requireUser }, async (request, reply) => {
    const journey = await getMilestoneJourney(database, request.profileId);
    if (!journey) return reply.code(404).send({ error: 'Profile not found' });
    return journey;
  });
}
