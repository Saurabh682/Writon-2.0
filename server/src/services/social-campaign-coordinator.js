import {
  postToX,
  postToInstagramCarousel,
  postToThreads,
  postToTelegram,
  postToReddit,
  postToPinterest,
  postToYouTube
} from './social-poster.js';
import { dispatchToWebhook } from './campaign-dispatcher.js';

/**
 * Multi-Platform Social Media Campaign Coordinator
 *
 * Implements ADK 2 Pillar 2: Collaborative Specialists in single_turn Mode.
 * - Each platform specialist runs as an independent, single-turn expert.
 * - Coordinates dispatches concurrently via Promise.allSettled.
 * - Wraps all remote calls in EditorialDispatchCoordinator for per-destination locking.
 */

export class XSpecialist {
  static async publish({ payload, localSlidePaths = [], config = {}, log = console, coordinator }) {
    if (!coordinator) return { platform: 'x', status: 'skipped', success: false, reason: 'No coordinator' };
    try {
      const result = await coordinator.coordinateDispatch({
        campaign: 'fomo_ground_floor',
        slotId: `day_${payload.day}`,
        platform: 'x',
        surface: 'tweet',
        archetype: 'daily_campaign',
        insightId: `day_${payload.day}`,
        content: payload.hook,
        isDryRun: config.isDryRun || false,
        dispatchFn: async () => {
          const defaultHashtags = '#writon #writingcommunity #writersoftwitter #poetry #storytelling #books #creators #amwriting';
          const text = `${payload.hook}\n\nTake that note out of the dark. Publish on WritOn today:\n📲 ${payload.shortlink}\n\n${defaultHashtags}`;
          const res = await postToX({ text, localImagePaths: localSlidePaths, config, log });
          if (res && res.success === false) throw new Error(res.error || res.reason || 'X dispatch failed');
          return { remotePostId: res.postId, metadata: res };
        }
      });
      return { platform: 'x', success: result.status === 'published' || result.status === 'dry_run_passed', ...result };
    } catch (err) {
      log.error?.({ err: err.message }, '[XSpecialist] Dispatch failed');
      return { platform: 'x', status: 'failed', success: false, error: err.message };
    }
  }
}

export class InstagramSpecialist {
  static async publish({ payload, localSlidePaths = [], config = {}, log = console, coordinator }) {
    if (!coordinator) return { platform: 'instagram', status: 'skipped', success: false, reason: 'No coordinator' };
    try {
      const result = await coordinator.coordinateDispatch({
        campaign: 'fomo_ground_floor',
        slotId: `day_${payload.day}`,
        platform: 'instagram',
        surface: 'carousel',
        archetype: 'daily_campaign',
        insightId: `day_${payload.day}`,
        content: payload.captions?.en || payload.hook,
        isDryRun: config.isDryRun || false,
        dispatchFn: async () => {
          const res = await postToInstagramCarousel({
            localImagePaths: localSlidePaths,
            caption: payload.captions?.en || payload.hook,
            config,
            log
          });
          if (res && res.success === false) throw new Error(res.error || res.reason || 'Instagram dispatch failed');
          return { remotePostId: res.publishedPostId, metadata: res };
        }
      });
      return { platform: 'instagram', success: result.status === 'published' || result.status === 'dry_run_passed', ...result };
    } catch (err) {
      log.error?.({ err: err.message }, '[InstagramSpecialist] Dispatch failed');
      return { platform: 'instagram', status: 'failed', success: false, error: err.message };
    }
  }
}

export class ThreadsSpecialist {
  static async publish({ payload, localSlidePaths = [], config = {}, log = console, coordinator }) {
    if (!coordinator) return { platform: 'threads', status: 'skipped', success: false, reason: 'No coordinator' };
    try {
      const result = await coordinator.coordinateDispatch({
        campaign: 'fomo_ground_floor',
        slotId: `day_${payload.day}`,
        platform: 'threads',
        surface: 'post',
        archetype: 'daily_campaign',
        insightId: `day_${payload.day}`,
        content: payload.captions?.en || payload.hook,
        isDryRun: config.isDryRun || false,
        dispatchFn: async () => {
          const res = await postToThreads({
            text: payload.captions?.en || payload.hook,
            localImagePaths: localSlidePaths,
            config,
            log
          });
          if (res && res.success === false) throw new Error(res.error || res.reason || 'Threads dispatch failed');
          return { remotePostId: res.postId, metadata: res };
        }
      });
      return { platform: 'threads', success: result.status === 'published' || result.status === 'dry_run_passed', ...result };
    } catch (err) {
      log.error?.({ err: err.message }, '[ThreadsSpecialist] Dispatch failed');
      return { platform: 'threads', status: 'failed', success: false, error: err.message };
    }
  }
}

export class RedditSpecialist {
  static async publish({ payload, config = {}, log = console, coordinator }) {
    if (!coordinator) return { platform: 'reddit', status: 'skipped', success: false, reason: 'No coordinator' };
    try {
      const result = await coordinator.coordinateDispatch({
        campaign: 'fomo_ground_floor',
        slotId: `day_${payload.day}`,
        platform: 'reddit',
        surface: 'post',
        archetype: 'daily_campaign',
        insightId: `day_${payload.day}`,
        content: payload.captions?.en || payload.hook,
        isDryRun: config.isDryRun || false,
        dispatchFn: async () => {
          const title = `${payload.theme} — ${payload.hook}`.slice(0, 300);
          const text = `${payload.captions?.en || payload.hook}\n\n---\n*Read and publish on WritOn:* [${payload.shortlink}](${payload.shortlink})`;
          const res = await postToReddit({ title, text, config, log });
          if (res && res.success === false) throw new Error(res.error || res.reason || 'Reddit dispatch failed');
          return { remotePostId: res.postId, metadata: res };
        }
      });
      return { platform: 'reddit', success: result.status === 'published' || result.status === 'dry_run_passed', ...result };
    } catch (err) {
      log.error?.({ err: err.message }, '[RedditSpecialist] Dispatch failed');
      return { platform: 'reddit', status: 'failed', success: false, error: err.message };
    }
  }
}

export class PinterestSpecialist {
  static async publish({ payload, localSlidePaths = [], config = {}, log = console, coordinator }) {
    if (!coordinator) return { platform: 'pinterest', status: 'skipped', success: false, reason: 'No coordinator' };
    try {
      const result = await coordinator.coordinateDispatch({
        campaign: 'fomo_ground_floor',
        slotId: `day_${payload.day}`,
        platform: 'pinterest',
        surface: 'pin',
        archetype: 'daily_campaign',
        insightId: `day_${payload.day}`,
        content: payload.captions?.en || payload.hook,
        isDryRun: config.isDryRun || false,
        dispatchFn: async () => {
          const primarySlide = localSlidePaths[0];
          const title = `${payload.theme}: ${payload.hook}`.slice(0, 100);
          const description = `${payload.captions?.en || payload.hook}\n\nRead more and join the writing community on WritOn: ${payload.shortlink}\n\n#writon #writingcommunity #amwriting #storytelling #quotes`.slice(0, 800);
          const altText = `WritOn literary craft card: ${payload.theme}`.slice(0, 500);

          const res = await postToPinterest({
            title,
            description,
            link: payload.shortlink,
            altText,
            imagePath: primarySlide,
            config,
            log
          });
          if (res && res.success === false) throw new Error(res.error || res.reason || 'Pinterest dispatch failed');
          return { remotePostId: res.postId, metadata: res };
        }
      });
      return { platform: 'pinterest', success: result.status === 'published' || result.status === 'dry_run_passed', ...result };
    } catch (err) {
      log.error?.({ err: err.message }, '[PinterestSpecialist] Dispatch failed');
      return { platform: 'pinterest', status: 'failed', success: false, error: err.message };
    }
  }
}

export class TelegramSpecialist {
  static async publish({ payload, config = {}, log = console, coordinator }) {
    if (!coordinator) return { platform: 'telegram', status: 'skipped', success: false, reason: 'No coordinator' };
    try {
      const result = await coordinator.coordinateDispatch({
        campaign: 'fomo_ground_floor',
        slotId: `day_${payload.day}`,
        platform: 'telegram',
        surface: 'message',
        archetype: 'daily_campaign',
        insightId: `day_${payload.day}`,
        content: payload.captions?.en || payload.hook,
        isDryRun: config.isDryRun || false,
        dispatchFn: async () => {
          if (!config.telegramBotToken && !process.env.TELEGRAM_BOT_TOKEN) {
             throw new Error('No Telegram token configured');
          }
          const caption = `<b>🚀 WritOn Day ${payload.day}: ${payload.theme}</b>\n\n${payload.captions?.en || payload.hook}\n\n📲 <a href="${payload.shortlink}">Claim Your Pen Name</a>`;
          const res = await postToTelegram({ caption, config });
          if (res && res.success === false) throw new Error(res.error || res.reason || 'Telegram dispatch failed');
          return { remotePostId: res.postId, metadata: res };
        }
      });
      return { platform: 'telegram', success: result.status === 'published' || result.status === 'dry_run_passed', ...result };
    } catch (err) {
      log.error?.({ err: err.message }, '[TelegramSpecialist] Dispatch failed');
      return { platform: 'telegram', status: 'failed', success: false, error: err.message };
    }
  }
}

export class YouTubeSpecialist {
  static async publish({ payload, config = {}, log = console, coordinator }) {
    if (!coordinator) return { platform: 'youtube', status: 'skipped', success: false, reason: 'No coordinator' };
    try {
      const result = await coordinator.coordinateDispatch({
        campaign: 'fomo_ground_floor',
        slotId: `day_${payload.day}`,
        platform: 'youtube',
        surface: 'shorts',
        archetype: 'daily_campaign',
        insightId: `day_${payload.day}`,
        content: payload.captions?.en || payload.hook,
        isDryRun: config.isDryRun || false,
        dispatchFn: async () => {
          const videoPath = payload.videoPath || config.videoPath;
          if (!videoPath) {
             throw new Error('No video asset (.mp4) provided for YouTube Shorts dispatch');
          }
          const title = `${payload.theme}: ${payload.hook}`.slice(0, 90);
          const captionText = payload.captions?.en || payload.hook;
          const description = `${captionText}\n\nRead more and join the quiet community on WritOn: ${payload.shortlink}\n\n#shorts #writingcommunity #writon #craft #storytelling`;

          const res = await postToYouTube({
            videoPath,
            title,
            description,
            tags: ['writing', 'craft', 'poetry', 'books', 'writon', 'storytelling'],
            isShort: true,
            config,
            log,
          });
          if (res && res.success === false) throw new Error(res.error || res.reason || 'YouTube dispatch failed');
          return { remotePostId: res.postId, metadata: res };
        }
      });
      return { platform: 'youtube', success: result.status === 'published' || result.status === 'dry_run_passed', ...result };
    } catch (err) {
      log.error?.({ err: err.message }, '[YouTubeSpecialist] Dispatch failed');
      return { platform: 'youtube', status: 'failed', success: false, error: err.message };
    }
  }
}

export class WebhookSpecialist {
  static async publish({ payload, config = {}, log = console, coordinator }) {
    if (!coordinator) return { platform: 'webhook', status: 'skipped', success: false, reason: 'No coordinator' };
    try {
      const result = await coordinator.coordinateDispatch({
        campaign: 'fomo_ground_floor',
        slotId: `day_${payload.day}`,
        platform: 'webhook',
        surface: 'message',
        archetype: 'daily_campaign',
        insightId: `day_${payload.day}`,
        content: payload.hook,
        isDryRun: config.isDryRun || false,
        dispatchFn: async () => {
          const webhookUrl = config.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;
          if (!webhookUrl) throw new Error('No webhook URL configured');
          const res = await dispatchToWebhook(payload, webhookUrl);
          if (res && res.success === false) throw new Error(res.error || res.reason || 'Webhook dispatch failed');
          return { remotePostId: null, metadata: res };
        }
      });
      return { platform: 'webhook', success: result.status === 'published' || result.status === 'dry_run_passed', ...result };
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
    coordinator,
    specialists = {
      x: XSpecialist,
      instagram: InstagramSpecialist,
      threads: ThreadsSpecialist,
      reddit: RedditSpecialist,
      pinterest: PinterestSpecialist,
      youtube: YouTubeSpecialist,
      telegram: TelegramSpecialist,
      webhook: WebhookSpecialist
    }
  }) {
    const activeTasks = Object.entries(specialists).map(async ([platformName, SpecialistClass]) => {
      const outcome = await SpecialistClass.publish({ payload, localSlidePaths, config, log, coordinator });
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
        if (outcome.success) {
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
