import { generateAllCampaignAssets } from '../services/social-card-generator.js';
import { getDailyCampaignPayload, dispatchToWebhook } from '../services/campaign-dispatcher.js';
import { postToX, postToInstagramCarousel, postToThreads, postToTelegram, postToReddit, postToPinterest } from '../services/social-poster.js';
import { SocialCampaignCoordinator } from '../services/social-campaign-coordinator.js';
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

  // Steps 3-9: Coordinate concurrent publishing across platform specialists (ADK 2 Pillar 2)
  const coordination = await SocialCampaignCoordinator.coordinatePublish({
    payload,
    localSlidePaths,
    config,
    log
  });

  const results = {
    day: coordination.day,
    theme: coordination.theme,
    shortlink: coordination.shortlink,
    timestamp: coordination.timestamp,
    summary: coordination.summary,
    x: coordination.platforms.x || { status: 'skipped' },
    instagram: coordination.platforms.instagram || { status: 'skipped' },
    threads: coordination.platforms.threads || { status: 'skipped' },
    reddit: coordination.platforms.reddit || { status: 'skipped' },
    pinterest: coordination.platforms.pinterest || { status: 'skipped' },
    webhook: coordination.platforms.webhook || { status: 'skipped' },
    telegram: coordination.platforms.telegram || { status: 'skipped' }
  };

  if (results.reddit?.success && results.reddit?.postId) {
    results.redditFullname = results.reddit.postId;
  }
  if (results.pinterest?.success && results.pinterest?.postId) {
    results.pinterestPinId = results.pinterest.postId;
  }

  // Step 10: Record history to guarantee idempotency
  if (results.instagram.success || results.x.success || results.threads.success || results.reddit.success || results.pinterest.success) {
    history.publishedDays[day] = results;
    await savePublishHistory(history);
  }

  log.info?.(results, '✅ Daily social campaign publishing cycle finished');
  return results;
}
