import path from 'node:path';
import os from 'node:os';
import { renderStorySocialCard } from './social-card-generator.js';
import { postToTelegram, dispatchToWebhook, postToX, postToThreads, postToPinterest } from './social-poster.js';

// Mandatory base hashtags per AGENTS.md rule
const MANDATORY_HASHTAGS = '#writon #writingcommunity #writersoftwitter #poetry #storytelling #books #creators #amwriting';

const CATEGORY_HASHTAGS = {
  'Tech': '#tech #softwareengineering #coding #technology #programming',
  'Poetry': '#poetry #poetsofinstagram #micropoetry #poem #words',
  'Shayari': '#shayari #urdupoetry #rekhta #hindiquotes #ghazal',
  'Essays': '#essays #writing #deepthoughts #ideas #literature',
  'Philosophy': '#philosophy #criticalthinking #stoicism #wisdom #ideas',
  'Short Stories': '#shortstories #fiction #flashfiction #storyteller',
  'Humour': '#humour #satire #comedy #wit #laughter',
  'Culture': '#culture #art #heritage #community',
  'Reviews': '#reviews #analysis #insights #recommendations',
  'Trending': '#trending #currentaffairs #analysis #spotlight',
};

/**
 * Builds formatted social copy with hook, link, and hashtags.
 * Supports trending keywords and tags from Editorial Brain intelligence.
 */
export function buildStorySocialCopy({ title, summary, slug, authorPenName, category, keywords = [], baseUrl = 'https://writon.cc' }) {
  const cleanPenName = authorPenName.startsWith('@') ? authorPenName : `@${authorPenName}`;
  const storyUrl = `${baseUrl.replace(/\/$/, '')}/stories/${slug}`;
  const catTags = CATEGORY_HASHTAGS[category] || '#literature #writing';

  // Format incoming trending keywords into lowercase hashtags
  const keywordTags = Array.isArray(keywords)
    ? keywords
        .map(k => String(k || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter(k => k.length >= 3)
        .slice(0, 5)
        .map(k => `#${k}`)
        .join(' ')
    : '';

  const allHashtags = [keywordTags, catTags, MANDATORY_HASHTAGS].filter(Boolean).join(' ');

  const cleanSummary = (summary || '').trim();
  const hook = cleanSummary ? `"${cleanSummary}"` : `New piece published on WritOn.`;

  // HTML format for Telegram
  const htmlCaption = `<b>${title}</b>\n\n${hook}\n\n✍️ Written by <b>${cleanPenName}</b> in <i>${category}</i>\n\n📖 Read full story:\n<a href="${storyUrl}">${storyUrl}</a>\n\n${allHashtags}`;

  // Plain text for X / Threads
  const plainText = `${title}\n\n${hook}\n\n✍️ By ${cleanPenName}\n📲 Read: ${storyUrl}\n\n${allHashtags}`;

  return {
    title,
    hook,
    storyUrl,
    cleanPenName,
    allHashtags,
    htmlCaption,
    plainText,
  };
}

/**
 * Orchestrates rendering visual cards and syndicating a published story.
 *
 * @param {object} pool PostgreSQL database pool
 * @param {object} params Story information or identifier
 * @param {string} [params.postId] Post UUID
 * @param {string} [params.slug] Post slug
 * @param {object} [options]
 * @param {string} [options.outputDir] Directory to write rendered PNGs
 * @param {string} [options.baseUrl] Base URL for public story links
 * @param {object} [options.config] Additional platform credentials/config
 * @param {object} [options.log] Logger
 */
export async function syndicatePublishedStory(pool, params, options = {}) {
  const log = options.log || console;
  const baseUrl = options.baseUrl || process.env.PUBLIC_WEB_BASE_URL || 'https://writon.cc';
  const tempDir = options.outputDir || path.join(os.tmpdir(), 'writon-social-cards');

  // 1. Fetch story details from DB if only postId or slug was supplied
  let story = params;
  if (!story.title || !story.content) {
    const target = params.postId || params.slug || params.id;
    const isLatest = target === 'latest';
    const queryRes = await pool.query(
      isLatest
        ? `select p.id, p.title, p.slug, p.summary, p.content, p.category, p.reading_time_min,
                  author.full_name as author_full_name, author.pen_name as author_pen_name
           from public.posts p
           inner join public.profiles author on author.id = p.author_id
           where p.status = 'published'
           order by coalesce(p.published_at, p.created_at) desc
           limit 1`
        : `select p.id, p.title, p.slug, p.summary, p.content, p.category, p.reading_time_min,
                  author.full_name as author_full_name, author.pen_name as author_pen_name
           from public.posts p
           inner join public.profiles author on author.id = p.author_id
           where p.id::text = $1 or p.slug = $1
           limit 1`,
      isLatest ? [] : [target]
    );

    if (queryRes.rowCount === 0) {
      throw new Error(`Story not found for syndication: ${target}`);
    }

    const row = queryRes.rows[0];
    story = {
      id: row.id,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      content: row.content,
      category: row.category,
      readingTimeMin: row.reading_time_min,
      authorFullName: row.author_full_name,
      authorPenName: row.author_pen_name,
    };
  }

  const postId = story.id || story.postId;
  const authorPenName = story.authorPenName || story.author?.penName || 'author';
  const authorFullName = story.authorFullName || story.author?.fullName || 'WritOn Author';
  const category = story.category || 'Editorial';

  log.info?.(`📢 Starting social syndication for "${story.title}" (@${authorPenName})`);

  // 2. Render visual cards (1080x1350 portrait & 1080x1080 square) with Warm Parchment aesthetic
  const portraitCard = await renderStorySocialCard({
    story: { ...story, authorFullName, authorPenName },
    outputDir: tempDir,
    format: 'portrait',
    theme: 'light',
  });

  const squareCard = await renderStorySocialCard({
    story: { ...story, authorFullName, authorPenName },
    outputDir: tempDir,
    format: 'square',
    theme: 'light',
  });

  // 3. Prepare copy & hashtags (including trending keywords)
  const keywords = Array.isArray(story.keywords) ? story.keywords : [];
  const copy = buildStorySocialCopy({
    title: story.title,
    summary: story.summary,
    slug: story.slug,
    authorPenName,
    category,
    keywords,
    baseUrl,
  });

  const outcomes = {};

  // 4. Dispatch to Telegram
  try {
    const tgRes = await postToTelegram({
      caption: copy.htmlCaption,
      imageBuffer: squareCard.buffer,
      imagePath: squareCard.filePath,
    });
    outcomes.telegram = tgRes;
    await recordSyndicationLog(pool, {
      postId,
      platform: 'telegram',
      status: tgRes.status,
      externalPostId: tgRes.postId,
      cardPath: squareCard.filePath,
      payload: { captionLength: copy.htmlCaption.length, format: 'square' },
      response: tgRes.data || {},
      error: tgRes.error || tgRes.reason,
    });
  } catch (tgErr) {
    outcomes.telegram = { success: false, status: 'failed', error: tgErr.message };
  }

  // 5. Dispatch to Webhook (Discord / Slack)
  try {
    const hookRes = await dispatchToWebhook({
      title: copy.title,
      summary: story.summary,
      url: copy.storyUrl,
      authorName: `${authorFullName} (@${authorPenName})`,
      hashtags: copy.allHashtags,
      category,
    });
    outcomes.webhook = hookRes;
    await recordSyndicationLog(pool, {
      postId,
      platform: 'webhook',
      status: hookRes.status,
      cardPath: portraitCard.filePath,
      payload: { url: copy.storyUrl },
      response: { statusCode: hookRes.statusCode },
      error: hookRes.error || hookRes.reason,
    });
  } catch (whErr) {
    outcomes.webhook = { success: false, status: 'failed', error: whErr.message };
  }

  // 6. Dispatch to X (Twitter)
  try {
    const xRes = await postToX({
      text: copy.plainText,
      localImagePaths: [portraitCard.filePath],
      config: options.config || {},
      log,
    });
    outcomes.x = xRes;
    await recordSyndicationLog(pool, {
      postId,
      platform: 'x',
      status: xRes.status,
      externalPostId: xRes.postId,
      cardPath: portraitCard.filePath,
      payload: { textLength: copy.plainText.length },
      response: xRes.data || {},
      error: xRes.error || xRes.reason,
    });
  } catch (xErr) {
    outcomes.x = { success: false, status: 'failed', error: xErr.message };
  }

  // 7. Dispatch to Threads
  try {
    const threadsRes = await postToThreads({
      text: copy.plainText,
      localImagePaths: [portraitCard.filePath],
      config: options.config || {},
      log,
    });
    outcomes.threads = threadsRes;
    await recordSyndicationLog(pool, {
      postId,
      platform: 'threads',
      status: threadsRes.status,
      externalPostId: threadsRes.postId,
      cardPath: portraitCard.filePath,
      payload: { textLength: copy.plainText.length },
      response: threadsRes.data || {},
      error: threadsRes.error || threadsRes.reason,
    });
  } catch (thErr) {
    outcomes.threads = { success: false, status: 'failed', error: thErr.message };
  }

  // 8. Dispatch to Pinterest (Skipped by default for stories: Pinterest RSS feed handles stories automatically.
  // Manual / forced pinning is preserved when options.forcePinterest is true)
  try {
    const pinToken = options.config?.PINTEREST_ACCESS_TOKEN || process.env.PINTEREST_ACCESS_TOKEN;
    const boardId = options.config?.PINTEREST_DEFAULT_BOARD_ID || process.env.PINTEREST_DEFAULT_BOARD_ID;

    if (!options.forcePinterest) {
      outcomes.pinterest = {
        success: false,
        status: 'skipped',
        reason: 'Automated Pin skipped: stories are synced to Pinterest via the public RSS feed (pinterest-feed.xml). Use forcePinterest for manual dispatch.',
      };
    } else if (!pinToken || !boardId) {
      outcomes.pinterest = { success: false, status: 'skipped', reason: 'Missing Pinterest credentials or board ID' };
    } else {
      // Pacing Guard: Ensure minimum 15 minutes between automated pins to prevent velocity spam blocks
      let isThrottled = false;
      try {
        if (pool && typeof pool.query === 'function') {
          const lastPinRes = await pool.query(
            `select updated_at from public.social_syndication_logs
             where platform = 'pinterest' and status = 'published'
             order by updated_at desc
             limit 1`
          );
          if (lastPinRes.rowCount > 0 && lastPinRes.rows[0]?.updated_at) {
            const diffMs = Date.now() - new Date(lastPinRes.rows[0].updated_at).getTime();
            const MIN_PIN_INTERVAL_MS = 15 * 60 * 1000;
            if (diffMs < MIN_PIN_INTERVAL_MS && !options.forcePinterest) {
              isThrottled = true;
            }
          }
        }
      } catch (throttleErr) {
        // Table or query check non-fatal
      }

      if (isThrottled) {
        outcomes.pinterest = {
          success: false,
          status: 'throttled',
          reason: 'Pacing guard: minimum 15 minutes between automated pins to protect account & domain trust',
        };
      } else {
        let displaySummary = (story.summary || story.title || '').trim();
        if (displaySummary.length > 195) {
          displaySummary = displaySummary.slice(0, 192).trim() + '...';
        }
        const cleanCategoryTag = category.toLowerCase().replace(/[^a-z0-9]/g, '');
        const keywordHashtags = keywords
          .map(k => String(k || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
          .filter(k => k.length >= 3)
          .slice(0, 3)
          .map(k => `#${k}`)
          .join(' ');
        const pinTags = [keywordHashtags, `#writon #${cleanCategoryTag} #storytelling #reading #amwriting`].filter(Boolean).join(' ');
        const pinDescription = `“${displaySummary}”\n\u200B\n✍️ By ${authorFullName} • ${category} (${story.readingTimeMin || 3} min read)\n\u200B\n📖 Read the full story on WritOn:\n👉 ${copy.storyUrl}\n\u200B\n──────────\n${pinTags}`;
        const pinTitle = `${story.title} — ${authorFullName}`.slice(0, 100);

        const pinRes = await postToPinterest({
          boardId,
          title: pinTitle,
          description: pinDescription,
          link: copy.storyUrl,
          altText: `Story quote card for ${story.title} by ${authorFullName} on WritOn`,
          imagePath: portraitCard.filePath,
          config: options.config || {},
          log,
        });

        outcomes.pinterest = pinRes;

        await recordSyndicationLog(pool, {
          postId,
          platform: 'pinterest',
          status: pinRes.status,
          externalPostId: pinRes.postId,
          cardPath: portraitCard.filePath,
          payload: { title: pinTitle, boardId, link: copy.storyUrl },
          response: pinRes.data || {},
          error: pinRes.error || pinRes.reason,
        });
      }
    }
  } catch (pinErr) {
    outcomes.pinterest = { success: false, status: 'failed', error: pinErr.message };
  }

  log.info?.(`✅ Social syndication finished for "${story.title}":`, Object.keys(outcomes).map(k => `${k}=${outcomes[k].status}`).join(', '));

  return {
    success: true,
    postId,
    slug: story.slug,
    title: story.title,
    copy,
    cards: {
      portrait: { filePath: portraitCard.filePath, width: portraitCard.width, height: portraitCard.height },
      square: { filePath: squareCard.filePath, width: squareCard.width, height: squareCard.height },
    },
    outcomes,
  };
}

/**
 * Safely inserts a log record into public.social_syndication_logs.
 */
async function recordSyndicationLog(pool, { postId, platform, status, externalPostId = null, cardPath = null, payload = {}, response = {}, error = null }) {
  try {
    await pool.query(
      `insert into public.social_syndication_logs
       (post_id, platform, status, external_post_id, card_path, payload, response, error_message, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [postId, platform, status, externalPostId, cardPath, JSON.stringify(payload), JSON.stringify(response), error]
    );
  } catch (err) {
    // Non-fatal logging failure (e.g. table not ready)
    console.warn(`[Social Syndicator] Warning logging ${platform} outcome:`, err.message);
  }
}
