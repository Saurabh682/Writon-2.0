export const BUILTIN_VANITY_LINKS = {
  instagram: 'https://www.instagram.com/writon_socialapp/',
  ig: 'https://www.instagram.com/writon_socialapp/',
  x: 'https://x.com/WritOn_Social',
  twitter: 'https://x.com/WritOn_Social',
  threads: 'https://www.threads.net/@writon_socialapp',
  youtube: 'https://www.youtube.com/@writon_app',
  yt: 'https://www.youtube.com/@writon_app',
  linkedin: 'https://www.linkedin.com/in/writon-story-writing-and-reads',
  reddit: 'https://www.reddit.com/r/writon/',
  medium: 'https://medium.com/@saurabh.682',
  play: 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
  app: 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
  android: 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
  whatsapp: 'https://chat.whatsapp.com/G94rXIgROzA0mxSK8O1XBQ',
  wa: 'https://chat.whatsapp.com/G94rXIgROzA0mxSK8O1XBQ',
};

export const RESERVED_SLUGS = new Set([
  'api',
  'stories',
  'posts',
  'author',
  'authors',
  'go',
  'feed',
  'feed.xml',
  'rss.xml',
  'sitemap.xml',
  'news-sitemap.xml',
  'robots.txt',
  'canvas',
  'canvas.html',
  'editorial-canvas',
  'terms',
  'terms.html',
  'privacy',
  'privacy.html',
  'favicon.ico',
  'favicon.svg',
  'manifest.webmanifest',
  'assets',
  'cards',
  'health',
  'openapi.json',
  'hi',
  'mr',
  'bn',
  'es',
  'fr',
]);

export async function vanityRedirectRoutes(fastify, { database }) {
  fastify.get('/:slug', async (request, reply) => {
    const rawSlug = String(request.params?.slug || '').trim().toLowerCase();

    // Reserved paths should be handled by their respective route handlers or 404
    if (RESERVED_SLUGS.has(rawSlug)) {
      return reply.callNotFound();
    }

    // 1. Check built-in vanity links first
    if (Object.prototype.hasOwnProperty.call(BUILTIN_VANITY_LINKS, rawSlug)) {
      const destination = BUILTIN_VANITY_LINKS[rawSlug];

      // Privacy-safe click counter in campaign_delivery_clicks or vanity_link_clicks
      if (database && typeof database.query === 'function') {
        try {
          await database.query(
            `insert into public.campaign_delivery_clicks
               (delivery_id, platform, click_count, first_clicked_at, last_clicked_at)
             values ($1, $2, 1, now(), now())
             on conflict (delivery_id) do update
               set click_count = public.campaign_delivery_clicks.click_count + 1,
                   last_clicked_at = now()`,
            [`vanity_${rawSlug}`, rawSlug]
          );
        } catch (error) {
          request.log?.warn?.({ err: error, slug: rawSlug }, 'Vanity click counter update failed');
        }
      }

      reply.header('Cache-Control', 'no-cache, no-store');
      return reply.code(302).redirect(destination);
    }

    // 2. Query dynamic vanity / custom links table if available
    if (database && typeof database.query === 'function') {
      try {
        const result = await database.query(
          `update public.custom_links
             set clicks = coalesce(clicks, 0) + 1,
                 last_clicked_at = now()
           where lower(slug) = $1
           returning destination_url`,
          [rawSlug]
        );

        if (result.rows && result.rows.length > 0 && result.rows[0]?.destination_url) {
          reply.header('Cache-Control', 'no-cache, no-store');
          return reply.code(302).redirect(result.rows[0].destination_url);
        }
      } catch (error) {
        request.log?.warn?.({ err: error, slug: rawSlug }, 'Custom links database lookup bypassed');
      }
    }

    return reply.callNotFound();
  });
}
