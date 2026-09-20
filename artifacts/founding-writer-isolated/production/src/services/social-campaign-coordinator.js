import {
  postToX,
  postToInstagramCarousel,
  postToThreads,
  postToTelegram,
  postToReddit,
  postToPinterest
} from './social-poster.js';
import { dispatchToWebhook } from './campaign-dispatcher.js';

/**
 * Multi-Platform Social Media Campaign Coordinator
 *
 * Implements ADK 2 Pillar 2: Collaborative Specialists in single_turn Mode.
 * - Each platform specialist runs as an independent, single-turn expert.
 * - Coordinates dispatches concurrently via Promise.allSettled.
 * - Partial failure resilience: rate limits on one network (e.g. Pinterest/X)
 *   never delay or block publishing on the remaining channels.
 */

export class XSpecialist {
  static async publish({ payload, localSlidePaths = [], config = {}, log = console }) {
    try {
      const defaultHashtags = '#writon #writingcommunity #writersoftwitter #poetry #storytelling #books #creators #amwriting';
      const text = `${payload.hook}\n\nTake that note out of the dark. Publish on WritOn today:\n📲 ${payload.shortlink}\n\n${defaultHashtags}`;
      
      const result = await postToX({ text, localImagePaths: localSlidePaths, config, log });
      return {
        platform: 'x',
        status: result?.success ? 'success' : (result?.skipped ? 'skipped' : 'failed'),
        ...result
      };
    } catch (err) {
      log.error?.({ err: err.message }, '[XSpecialist] Dispatch failed');
      return { platform: 'x', status: 'failed', success: false, error: err.message };
    }
  }
}

export class InstagramSpecialist {
  static async publish({ payload, localSlidePaths = [], config = {}, log = console }) {
    try {
      const result = await postToInstagramCarousel({
        localImagePaths: localSlidePaths,
        caption: payload.captions?.en || payload.hook,
        config,
        log
      });
      return {
        platform: 'instagram',
        status: result?.success ? 'success' : (result?.skipped ? 'skipped' : 'failed'),
        ...result
      };
    } catch (err) {
      log.error?.({ err: err.message }, '[InstagramSpecialist] Dispatch failed');
      return { platform: 'instagram', status: 'failed', success: false, error: err.message };
    }
  }
}

export class ThreadsSpecialist {
  static async publish({ payload, localSlidePaths = [], config = {}, log = console }) {
    try {
      const result = await postToThreads({
        text: payload.captions?.en || payload.hook,
        localImagePaths: localSlidePaths,
        config,
        log
      });
      return {
        platform: 'threads',
        status: result?.success ? 'success' : (result?.skipped ? 'skipped' : 'failed'),
        ...result
      };
    } catch (err) {
      log.error?.({ err: err.message }, '[ThreadsSpecialist] Dispatch failed');
      return { platform: 'threads', status: 'failed', success: false, error: err.message };
    }
  }
}

export class RedditSpecialist {
  static async publish({ payload, config = {}, log = console }) {
    try {
      const title = `${payload.theme} — ${payload.hook}`.slice(0, 300);
      const text = `${payload.captions?.en || payload.hook}\n\n---\n*Read and publish on WritOn:* [${payload.shortlink}](${payload.shortlink})`;
      
      const result = await postToReddit({ title, text, config, log });
      return {
        platform: 'reddit',
        status: result?.success ? 'success' : (result?.skipped ? 'skipped' : 'failed'),
        ...result
      };
    } catch (err) {
      log.error?.({ err: err.message }, '[RedditSpecialist] Dispatch failed');
      return { platform: 'reddit', status: 'failed', success: false, error: err.message };
    }
  }
}

export class PinterestSpecialist {
  static async publish({ payload, localSlidePaths = [], config = {}, log = console }) {
    try {
      const primarySlide = localSlidePaths[0];
      const title = `${payload.theme}: ${payload.hook}`.slice(0, 100);
      const description = `${payload.captions?.en || payload.hook}\n\nRead more and join the writing community on WritOn: ${payload.shortlink}\n\n#writon #writingcommunity #amwriting #storytelling #quotes`.slice(0, 800);
      const altText = `WritOn literary craft card: ${payload.theme}`.slice(0, 500);

      const result = await postToPinterest({
        title,
        description,
        link: payload.shortlink,
        altText,
        imagePath: primarySlide,
        config,
        log
      });
      return {
        platform: 'pinterest',
        status: result?.success ? 'success' : (result?.skipped ? 'skipped' : 'failed'),
        ...result
      };
    } catch (err) {
      log.error?.({ err: err.message }, '[PinterestSpecialist] Dispatch failed');
      return { platform: 'pinterest', status: 'failed', success: false, error: err.message };
    }
  }
}

export class TelegramSpecialist {
  static async publish({ payload, config = {}, log = console }) {
    try {
      if (!config.telegramBotToken && !process.env.TELEGRAM_BOT_TOKEN) {
        return { platform: 'telegram', status: 'skipped', success: false, reason: 'No token configured' };
      }
      const caption = `<b>🚀 WritOn Day ${payload.day}: ${payload.theme}</b>\n\n${payload.captions?.en || payload.hook}\n\n📲 <a href="${payload.shortlink}">Claim Your Pen Name</a>`;
      const result = await postToTelegram({ caption });
      return {
        platform: 'telegram',
        status: result?.success ? 'success' : (result?.skipped ? 'skipped' : 'failed'),
        ...result
      };
    } catch (err) {
      log.error?.({ err: err.message }, '[TelegramSpecialist] Dispatch failed');
      return { platform: 'telegram', status: 'failed', success: false, error: err.message };
    }
  }
}

export class WebhookSpecialist {
  static async publish({ payload, config = {}, log = console }) {
    const webhookUrl = config.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      return { platform: 'webhook', status: 'skipped', success: false, reason: 'No webhook URL configured' };
    }
    try {
      const result = await dispatchToWebhook(payload, webhookUrl);
      return {
        platform: 'webhook',
        status: result?.success ? 'success' : 'failed',
        ...result
      };
    } catch (err) {
      log.error?.({ err: err.message }, '[WebhookSpecialist] Dispatch failed');
      return { platform: 'webhook', status: 'failed', success: false, error: err.message };
    }
  }
}

/**
 * Social Campaign Coordinator
 * Dispatches campaigns concurrently to all platform specialists via Promise.allSettled
 */
export class SocialCampaignCoordinator {
  static async coordinatePublish({
    payload,
    localSlidePaths = [],
    config = {},
    log = console,
    specialists = {
      x: XSpecialist,
      instagram: InstagramSpecialist,
      threads: ThreadsSpecialist,
      reddit: RedditSpecialist,
      pinterest: PinterestSpecialist,
      telegram: TelegramSpecialist,
      webhook: WebhookSpecialist
    }
  }) {
    const activeTasks = Object.entries(specialists).map(async ([platformName, SpecialistClass]) => {
      const outcome = await SpecialistClass.publish({ payload, localSlidePaths, config, log });
      return [platformName, outcome];
    });

    const settled = await Promise.allSettled(activeTasks);

    const platforms = {};
    let total = 0;
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    for (const result of settled) {
      total++;
      if (result.status === 'fulfilled') {
        const [platformName, outcome] = result.value;
        platforms[platformName] = outcome;
        if (outcome.status === 'success' || outcome.success) {
          successful++;
        } else if (outcome.status === 'skipped') {
          skipped++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    }

    return {
      day: payload.day,
      theme: payload.theme,
      shortlink: payload.shortlink,
      timestamp: new Date().toISOString(),
      summary: {
        total,
        successful,
        failed,
        skipped
      },
      platforms
    };
  }
}
