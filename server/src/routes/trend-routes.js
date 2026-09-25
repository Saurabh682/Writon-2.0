/**
 * Fastify Routes Plugin: Trend Intelligence Ingestion & Editorial Gate
 * 
 * Endpoints:
 * - POST /api/v1/trends/ingest (and alias POST /api/trends/ingest)
 * - GET  /api/v1/trends/signals
 * - GET  /api/v1/trends/opportunities
 * - GET  /api/v1/trends/reports
 */

import { ingestTrendReport } from '../services/trend-intelligence-service.js';
import { generateExperimentReport, updateEventAdjudication, ADJUDICATED_RESULTS } from '../services/jev/jev-service.js';

export async function trendRoutes(fastify, { config, database }) {
  const secret = config.trendIngestSecret || config.adminSecretKey;

  // Dedicated authentication hook for Trend Ingestion
  const requireTrendSecret = async (request, reply) => {
    if (!secret) {
      request.log.error('Trend ingestion secret is not configured on the server.');
      return reply.code(500).send({ error: 'Server authentication configuration error.' });
    }

    const authHeader = request.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    const headerSecret = request.headers['x-trend-secret'] || token;

    // Fallback allowed in non-production only
    const isProd = config.environment === 'production';
    const fallbackKey = !isProd ? request.headers['x-admin-key'] : null;

    if (headerSecret !== secret && (!fallbackKey || fallbackKey !== config.adminSecretKey)) {
      request.log.warn({ ip: request.ip }, 'Unauthorized attempt to ingest trend report');
      return reply.code(401).send({ error: 'Unauthorized: Invalid or missing trend ingestion credentials.' });
    }
  };

  const handleIngest = async (request, reply) => {
    try {
      const result = await ingestTrendReport(database, request.body, { config });
      const code = result.status || 200;
      delete result.status;
      if (code === 202) {
        reply.header('Retry-After', '10');
      }
      return reply.code(code).send(result);
    } catch (err) {
      request.log.error({ err }, 'Failed to ingest trend report');
      const statusCode = err.statusCode || (err.name === 'ZodError' ? 400 : 500);
      return reply.code(statusCode).send({
        error: err.message,
        details: err.issues || undefined
      });
    }
  };

  // 1. Primary ingestion route and alias
  fastify.post('/api/v1/trends/ingest', { preHandler: requireTrendSecret }, handleIngest);
  fastify.post('/api/trends/ingest', { preHandler: requireTrendSecret }, handleIngest);

  // 2. Query Active Opportunities from the Airlock Table
  fastify.get('/api/v1/trends/opportunities', { preHandler: requireTrendSecret }, async (request, reply) => {
    const status = request.query.status || 'qualified';
    const limit = Math.min(50, Math.max(1, parseInt(request.query.limit || '20', 10)));

    let query = `
      select o.*, s.canonical_topic, s.slug, s.latest_score, s.velocity_per_day
      from public.trend_opportunities o
      join public.trend_signals s on s.id = o.signal_id
    `;
    const params = [];

    if (status !== 'all') {
      params.push(status);
      query += ` where o.qualification_status = $1`;
    }

    query += ` order by o.opportunity_score desc, o.evaluated_at desc limit $${params.length + 1}`;
    params.push(limit);

    const res = await database.query(query, params);
    return { count: res.rows.length, opportunities: res.rows };
  });

  // 3. Query Active Signals with Velocity & Snapshots
  fastify.get('/api/v1/trends/signals', { preHandler: requireTrendSecret }, async (request, reply) => {
    const limit = Math.min(50, Math.max(1, parseInt(request.query.limit || '20', 10)));
    const res = await database.query(`
      select * from public.trend_signals
      order by latest_score desc, velocity_per_day desc
      limit $1
    `, [limit]);

    return { count: res.rows.length, signals: res.rows };
  });

  // 4. Query Historical Reports
  fastify.get('/api/v1/trends/reports', { preHandler: requireTrendSecret }, async (request, reply) => {
    const limit = Math.min(30, Math.max(1, parseInt(request.query.limit || '10', 10)));
    const res = await database.query(`
      select id, run_id, external_run_id, report_date, region, source, run_type,
             total_trends, processing_status, processing_summary, observed_at, received_at, processed_at
      from public.trend_reports
      order by observed_at desc
      limit $1
    `, [limit]);

    return { count: res.rows.length, reports: res.rows };
  });

  // 5. Query Jev Decision-Layer Experiment Report (Phase 1B: Filter & Disagreement Views)
  fastify.get('/api/v1/trends/jev/report', { preHandler: requireTrendSecret }, async (request, reply) => {
    const filter = request.query?.filter || null; // e.g. 'disagreement'
    const report = await generateExperimentReport(database, { filter });
    return {
      status: 'ok',
      experiment: 'jev-system-one-v1',
      filter: filter || 'all',
      report
    };
  });

  // 6. Manual Editorial Adjudication Endpoint
  fastify.patch('/api/v1/trends/jev/adjudicate', { preHandler: requireTrendSecret }, async (request, reply) => {
    const { eventId, adjudicatedResult, adjudicationNotes } = request.body || {};
    if (!eventId || !adjudicatedResult) {
      return reply.code(400).send({ error: 'eventId and adjudicatedResult are required.' });
    }

    if (!Object.values(ADJUDICATED_RESULTS).includes(adjudicatedResult)) {
      return reply.code(400).send({
        error: `Invalid adjudicatedResult. Must be one of: ${Object.values(ADJUDICATED_RESULTS).join(', ')}`
      });
    }

    const reviewerId = request.headers['x-reviewer-id'] || request.user?.id || 'editorial_reviewer';

    try {
      const updated = await updateEventAdjudication(database, eventId, {
        adjudicatedResult,
        adjudicationNotes,
        reviewerId
      });

      return {
        status: 'ok',
        message: 'Adjudication updated successfully',
        event: updated
      };
    } catch (err) {
      const code = err.statusCode || 500;
      return reply.code(code).send({ error: err.message });
    }
  });
}
