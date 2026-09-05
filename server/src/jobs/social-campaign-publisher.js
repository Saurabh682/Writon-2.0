import { generateAllCampaignAssets } from '../services/social-card-generator.js';
import { getDailyCampaignPayload, dispatchToWebhook } from '../services/campaign-dispatcher.js';
import { postToX, postToInstagramCarousel, postToThreads, postToTelegram } from '../services/social-poster.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const renderedAssetsDir = path.resolve(__dirname, '../../../campaign/fomo-ground-floor/rendered-assets');
const historyFilePath = path.resolve(__dirname, '../../../campaign/published-history.json');

async function loadPublishHistory() {
  try {
    const raw = await fs.readFile(historyFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (_e) {
    return { publishedDays: {}, publishedDeliveryIds: {} };
  }
}

async function savePublishHistory(history) {
  try {
    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save published history:', err);
  }
}

/**
 * Runs the autonomous daily social campaign publisher with idempotency checks.
 */
export async function runDailyCampaignPublish({ day = 1, force = false, config = {}, log = console } = {}) {
  const baseUrl = config.publicApiBaseUrl || 'https://writon.cc';
  const history = await loadPublishHistory();

  // Idempotency check: prevent duplicate posting of the same day
  if (!force && history.publishedDays[day]) {
    log.info?.({ day, publishedAt: history.publishedDays[day].timestamp }, '⏭️ Day already published. Skipping duplicate execution.');
    return {
      skipped: true,
      reason: `Day ${day} was already published on ${history.publishedDays[day].timestamp}`,
      previousResult: history.publishedDays[day],
    };
  }

  log.info?.({ day }, '🚀 Starting Autonomous Social Campaign Publishing Job...');

  // Step 1: Ensure all PNG creatives exist
  try {
    await generateAllCampaignAssets(renderedAssetsDir);
    log.info?.('🎨 Successfully verified/rendered all social graphic assets');
  } catch (err) {
    log.warn?.({ err }, '⚠️ Could not auto-render assets (using existing files)');
  }

  // Step 2: Get formatted payload for the day
  const payload = await getDailyCampaignPayload(day, baseUrl);

  const localSlidePaths = payload.imageAssets.map((asset) =>
    path.resolve(renderedAssetsDir, asset)
  );

  const results = {
    day: payload.day,
    theme: payload.theme,
    shortlink: payload.shortlink,
    timestamp: new Date().toISOString(),
    x: { status: 'skipped' },
    instagram: { status: 'skipped' },
    threads: { status: 'skipped' },
    webhook: { status: 'skipped' },
    telegram: { status: 'skipped' },
  };

  // Step 3: Publish to X (Twitter) with attached image cards and high-discovery hashtags
  const defaultHashtags = '#writon #writingcommunity #writersoftwitter #poetry #storytelling #books #creators #amwriting';
  const xText = `${payload.hook}\n\nTake that note out of the dark. Publish on WritOn today:\n📲 ${payload.shortlink}\n\n${defaultHashtags}`;
  results.x = await postToX({ text: xText, localImagePaths: localSlidePaths, config, log });

  // Step 4: Publish to Instagram Carousel with local file auto-upload
  results.instagram = await postToInstagramCarousel({
    localImagePaths: localSlidePaths,
    caption: payload.captions.en,
    config,
    log,
  });

  // Step 5: Publish to Threads
  results.threads = await postToThreads({
    text: payload.captions.en,
    localImagePaths: localSlidePaths,
    config,
    log,
  });

  // Step 6: Dispatch to Discord / Custom Webhook if set
  if (config.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL) {
    const webhookUrl = config.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;
    results.webhook = await dispatchToWebhook(payload, webhookUrl);
  }

  // Step 7: Dispatch to Telegram if set
  if (config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN) {
    const tgCaption = `<b>🚀 WritOn Day ${payload.day}: ${payload.theme}</b>\n\n${payload.captions.en}\n\n📲 <a href="${payload.shortlink}">Claim Your Pen Name</a>`;
    results.telegram = await postToTelegram({ caption: tgCaption });
  }

  // Step 8: Record history to guarantee idempotency
  if (results.instagram.success || results.x.success || results.threads.success) {
    history.publishedDays[day] = results;
    await savePublishHistory(history);
  }

  log.info?.(results, '✅ Daily social campaign publishing cycle finished');
  return results;
}
