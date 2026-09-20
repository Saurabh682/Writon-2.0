import { generateAllCampaignAssets } from '../services/social-card-generator.js';
import { getDailyCampaignPayload } from '../services/campaign-dispatcher.js';
import { SocialCampaignCoordinator } from '../services/social-campaign-coordinator.js';
import { EditorialDispatchCoordinator } from '../services/editorial-dispatch-coordinator.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const renderedAssetsDir = path.resolve(__dirname, '../../../campaign/fomo-ground-floor/rendered-assets');

/**
 * Runs the autonomous daily social campaign publisher with idempotency checks via EditorialDispatchCoordinator.
 */
export async function runDailyCampaignPublish({ day = 1, force = false, config = {}, log = console, coordinator = null } = {}) {
  const baseUrl = config.publicApiBaseUrl || 'https://writon.cc';
  
  const activeCoordinator = coordinator || new EditorialDispatchCoordinator({ db: config.db, log, redditPaused: config.REDDIT_PAUSED });

  if (!activeCoordinator.db) {
    throw new Error('DURABLE_STORAGE_REQUIRED: config.db or coordinator.db is required for live campaign publishing.');
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

  // Steps 3-9: Coordinate concurrent publishing across platform specialists using db-backed locking
  const coordination = await SocialCampaignCoordinator.coordinatePublish({
    payload,
    localSlidePaths,
    config,
    log,
    coordinator: activeCoordinator
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
    youtube: coordination.platforms.youtube || { status: 'skipped' },
    webhook: coordination.platforms.webhook || { status: 'skipped' },
    telegram: coordination.platforms.telegram || { status: 'skipped' }
  };

  if (results.reddit?.success && results.reddit?.externalPostId) {
    results.redditFullname = results.reddit.externalPostId;
  }
  if (results.pinterest?.success && results.pinterest?.externalPostId) {
    results.pinterestPinId = results.pinterest.externalPostId;
  }
  if (results.youtube?.success && results.youtube?.externalPostId) {
    results.youtubeVideoId = results.youtube.externalPostId;
  }

  log.info?.(results, '✅ Daily social campaign publishing cycle finished');
  return results;
}
