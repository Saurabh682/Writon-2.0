import { parseDeliveryId, buildPlayStoreRedirectUrl } from '../services/campaign-registry.js';

export async function campaignRedirectRoutes(fastify, { config, database }) {
  const handler = async (request, reply) => {
    const deliveryId = request.params.deliveryId || '';
    const parsed = parseDeliveryId(deliveryId);
    let redirectUrl = config?.playStoreAppUrl ?? 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon';
    
    if (parsed.valid) {
      redirectUrl = buildPlayStoreRedirectUrl(deliveryId, parsed.platform);
      try {
        await database.query(
          `insert into public.campaign_delivery_clicks
             (delivery_id, platform, click_count, first_clicked_at, last_clicked_at)
           values ($1, $2, 1, now(), now())
           on conflict (delivery_id) do update
             set click_count = public.campaign_delivery_clicks.click_count + 1,
                 last_clicked_at = now()`,
          [deliveryId, parsed.platform],
        );
      } catch (error) {
        request.log?.warn?.(
          { err: error, deliveryId },
          'Campaign click aggregate could not be recorded',
        );
      }
    }
    
    reply.header('Cache-Control', 'no-cache, no-store');
    
    if (request.log && request.log.info) {
      request.log.info({ deliveryId, valid: parsed.valid, redirectUrl }, 'Campaign redirect');
    }
    
    return reply.code(302).redirect(redirectUrl);
  };

  fastify.get('/go', handler);
  fastify.get('/go/', handler);
  fastify.get('/go/:deliveryId', handler);
}
