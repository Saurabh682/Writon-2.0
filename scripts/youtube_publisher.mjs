#!/usr/bin/env node

/**
 * Standalone CLI Publisher for YouTube Shorts & Videos
 *
 * Usage:
 *   node scripts/youtube_publisher.mjs --dry-run
 *   node scripts/youtube_publisher.mjs --video=./video.mp4 --title="Scene Beginnings"
 *   node scripts/youtube_publisher.mjs --day=1 --dry-run
 */

import { YouTubeClient } from '../server/src/services/youtube-client.js';
import { getDailyCampaignPayload } from '../server/src/services/campaign-dispatcher.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
dotenv.config();
const historyFilePath = path.resolve(__dirname, '../campaign/published-history.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    day: null,
    video: null,
    title: null,
    description: null,
    dryRun: false,
    privacyStatus: 'public',
    publishAt: null,
    comment: null,
  };

  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--day=')) options.day = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--video=')) options.video = arg.split('=')[1];
    else if (arg.startsWith('--title=')) options.title = arg.split('=')[1];
    else if (arg.startsWith('--desc=')) options.description = arg.split('=')[1];
    else if (arg.startsWith('--privacy=')) options.privacyStatus = arg.split('=')[1];
    else if (arg.startsWith('--publish-at=')) options.publishAt = arg.split('=')[1];
    else if (arg.startsWith('--comment=')) options.comment = arg.split('=').slice(1).join('=');
  }
  return options;
}

async function recordHistory(videoId, title, day = null) {
  try {
    let history = { publishedDays: {} };
    try {
      const raw = await fs.readFile(historyFilePath, 'utf8');
      history = JSON.parse(raw);
    } catch (_e) {}

    const record = {
      platform: 'youtube',
      videoId,
      url: `https://www.youtube.com/shorts/${videoId}`,
      title,
      timestamp: new Date().toISOString(),
    };

    if (day) {
      if (!history.publishedDays[day]) history.publishedDays[day] = {};
      history.publishedDays[day].youtube = {
        success: true,
        status: 'published',
        postId: videoId,
        url: record.url,
      };
      history.publishedDays[day].youtubeVideoId = videoId;
    }

    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[YouTubePublisher] Warning: Failed to save to history ledger: ${err.message}`);
  }
}

async function main() {
  const options = parseArgs();
  const client = new YouTubeClient();

  console.log('🎬 [WritOn YouTube Publisher] Initializing...');

  let videoPath = options.video;
  let title = options.title;
  let description = options.description;

  // If --day is passed, populate from campaign calendar
  if (options.day) {
    try {
      const payload = await getDailyCampaignPayload(options.day);
      if (!title) title = `${payload.theme}: ${payload.hook}`;
      if (!description) {
        const enCaption = payload.captions?.en || payload.hook;
        description = `${enCaption}\n\n🔔 Subscribe for daily slow-writing craft truths & storytelling fixes:\n👉 https://writon.cc/youtube?sub_confirmation=1\n\nJoin the quiet writing community on WritOn: ${payload.shortlink}\n\n#shorts #writingcommunity #writon`;
      }
    } catch (err) {
      console.warn(`Could not load campaign payload for Day ${options.day}: ${err.message}`);
    }
  }

  if (!title) {
    title = 'WritOn Writing Prompt #shorts';
  }
  if (!description) {
    description = `Notice the small gesture before the speech begins.\n\n🔔 Subscribe for daily slow-writing craft truths & storytelling fixes:\n👉 https://writon.cc/youtube?sub_confirmation=1\n\nDownload WritOn: https://writon.cc\n\n#shorts #writingcommunity #writon`;
  }

  console.log('📌 Title:', title);
  console.log('📝 Description:', description.slice(0, 80) + '...');
  console.log('🔒 Privacy Status:', options.privacyStatus);

  if (options.dryRun) {
    console.log('🧪 [DRY RUN] Verification successful. Credentials present:', client.canUpload());
    console.log('🧪 [DRY RUN] Would upload video to YouTube Shorts with #Shorts appended.');
    return;
  }

  if (!client.canUpload()) {
    console.error('❌ Missing YouTube OAuth credentials (YOUTUBE_REFRESH_TOKEN, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET)');
    process.exit(1);
  }

  if (!videoPath) {
    console.error('❌ No --video path provided for real upload.');
    process.exit(1);
  }

  const result = await client.uploadVideo({
    videoPath,
    title,
    description,
    privacyStatus: options.privacyStatus,
    publishAt: options.publishAt,
    isShort: true,
  });

  console.log('✅ Video published successfully!');
  console.log('🔗 URL:', result.url);
  console.log('🆔 Video ID:', result.videoId);

  if (options.comment) {
    console.log('💬 Posting discussion comment...');
    const commentRes = await client.addComment({
      videoId: result.videoId,
      text: options.comment,
    });
    if (commentRes.success) {
      console.log('📌 Comment posted successfully:', commentRes.commentId);
    } else {
      console.warn('⚠️ Could not post first comment:', commentRes.error);
    }
  }

  await recordHistory(result.videoId, title, options.day);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
