/**
 * Isolated Review Routes & Trigger System for WritOn
 *
 * Dedicated endpoints for the 20 Next-Gen Specialist Reviewers:
 * - POST /api/v1/reviews/trigger-pulse (isolated review pulse)
 * - POST /api/v1/reviews/trigger-single (review specific product)
 * - GET  /api/v1/reviews/personas (list the 20 reviewers)
 * - POST /api/v1/reviews/ingest (atomic review ingestion)
 */

import { REVIEW_PERSONAS } from '../bot-engine/review-personas.js';
import { generateStructuredReview } from '../bot-engine/review-generator.js';
import { conductDeepTrendResearch } from '../bot-engine/trend-scout-service.js';
import { ingestSparkBatch } from '../bot-engine/spark-runner.js';
import { getProductCoverImage } from '../bot-engine/image-service.js';

export async function adminReviewsRoutes(fastify, options) {
  const pool = options.pool;

  // 1. List all 20 Review Personas
  fastify.get('/api/v1/reviews/personas', async (request, reply) => {
    return reply.send({
      count: REVIEW_PERSONAS.length,
      personas: REVIEW_PERSONAS.map(p => ({
        id: p.id,
        penName: p.penName,
        fullName: p.fullName,
        domain: p.domain,
        category: p.category,
        bio: p.bio,
        evaluationCriteria: p.evaluationCriteria,
        antiGoals: p.antiGoals
      }))
    });
  });

  // 2. Trigger an Isolated Single Review
  fastify.post('/api/v1/reviews/trigger-single', async (request, reply) => {
    const { penName, productName, score, whoItsFor, dealbreaker, rivalProduct } = request.body || {};

    const reviewer = REVIEW_PERSONAS.find(p => p.penName.toLowerCase() === (penName || '').toLowerCase()) || REVIEW_PERSONAS[0];
    const targetProduct = productName || `Benchmark ${reviewer.domain} Hardware`;

    try {
      // 1. Deep live research on the product
      const dossier = await conductDeepTrendResearch(targetProduct, reviewer.category).catch(() => null);

      // 2. Generate structured review
      const reviewData = generateStructuredReview({
        productName: targetProduct,
        reviewer,
        researchDossier: dossier,
        score: score || '8.8',
        whoItsFor,
        dealbreaker,
        rivalProduct
      });

      // 3. Assign object-specific cover image
      const coverImage = getProductCoverImage(reviewer.domain, targetProduct);

      // 4. Ingest atomically into posts
      const outcome = await ingestSparkBatch(pool, {
        stories: [
          {
            authorPenName: reviewer.penName,
            title: reviewData.title,
            summary: reviewData.summary,
            content: reviewData.content,
            category: reviewer.category,
            coverImage,
            publishedAt: new Date().toISOString()
          }
        ]
      });

      return reply.code(201).send({
        success: true,
        message: `Review for "${targetProduct}" published by @${reviewer.penName}`,
        review: outcome.stories?.[0]
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate review', message: error.message });
    }
  });

  // 3. Trigger Review Network Pulse (Picks next due review domain)
  fastify.post('/api/v1/reviews/trigger-pulse', async (request, reply) => {
    try {
      // Rotate through the 20 review personas
      const randomReviewer = REVIEW_PERSONAS[Math.floor(Math.random() * REVIEW_PERSONAS.length)];
      const sampleTopic = `Latest ${randomReviewer.domain} Hardware Review`;

      const dossier = await conductDeepTrendResearch(sampleTopic, randomReviewer.category).catch(() => null);

      const reviewData = generateStructuredReview({
        productName: sampleTopic,
        reviewer: randomReviewer,
        researchDossier: dossier
      });

      const coverImage = getProductCoverImage(randomReviewer.domain, sampleTopic);

      const outcome = await ingestSparkBatch(pool, {
        stories: [
          {
            authorPenName: randomReviewer.penName,
            title: reviewData.title,
            summary: reviewData.summary,
            content: reviewData.content,
            category: randomReviewer.category,
            coverImage,
            publishedAt: new Date().toISOString()
          }
        ]
      });

      return reply.send({
        success: true,
        pulseType: 'review_pulse',
        reviewer: randomReviewer.fullName,
        domain: randomReviewer.domain,
        review: outcome.stories?.[0]
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Review pulse failed', message: error.message });
    }
  });
}
