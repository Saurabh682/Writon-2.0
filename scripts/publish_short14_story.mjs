import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { InstagramClient } from '../server/src/services/instagram-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
dotenv.config();

const historyFilePath = path.resolve(__dirname, '../campaign/published-history.json');

async function recordHistory(storyData) {
  try {
    let history = { publishedDays: {} };
    try {
      const raw = await fs.readFile(historyFilePath, 'utf8');
      history = JSON.parse(raw);
    } catch (_e) {}

    if (!history.stories) history.stories = {};
    history.stories[storyData.id] = storyData;

    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    console.log(`[Story Publisher] Recorded ${storyData.id} to published-history.json`);
  } catch (err) {
    console.warn(`[Story Publisher] Could not update history: ${err.message}`);
  }
}

async function uploadStoryVideo({ videoPath }) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const apiVersion = process.env.META_GRAPH_API_VERSION || 'v26.0';

  console.log('[Instagram Story] Step 1: Initializing resumable Story upload session...');
  const initRes = await fetch(`https://graph.facebook.com/${apiVersion}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upload_type: 'resumable',
      media_type: 'STORIES',
      access_token: token,
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok || !initData.id || !initData.uri) {
    throw new Error(`Failed to initialize Story upload session: ${JSON.stringify(initData)}`);
  }

  const { id: containerId, uri: uploadUri } = initData;
  console.log(`[Instagram Story] Container initialized: ${containerId}`);
  console.log(`[Instagram Story] Upload URI: ${uploadUri}`);

  console.log('[Instagram Story] Step 2: Uploading video binary...');
  const videoBuffer = await fs.readFile(videoPath);
  const fileSizeBytes = videoBuffer.length;

  const uploadRes = await fetch(uploadUri, {
    method: 'POST',
    headers: {
      'Authorization': `OAuth ${token}`,
      'offset': '0',
      'file_size': String(fileSizeBytes),
      'Content-Type': 'application/octet-stream',
    },
    body: videoBuffer,
  });

  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new Error(`Failed to upload Story binary: ${JSON.stringify(uploadData)}`);
  }
  console.log('[Instagram Story] Video binary successfully streamed to Meta!');

  console.log('[Instagram Story] Step 3: Polling Story container processing status...');
  const client = new InstagramClient();
  const pollResult = await client.pollContainerStatus(containerId, { maxAttempts: 30, intervalMs: 5000 });
  console.log(`[Instagram Story] Polling result: ${pollResult.status}`);

  if (pollResult.status !== 'FINISHED') {
    throw new Error(`Story container failed to reach FINISHED state: ${JSON.stringify(pollResult)}`);
  }

  console.log('[Instagram Story] Step 4: Publishing container to Instagram Stories...');
  const publishResult = await client.publishContainer(containerId);
  console.log('[Instagram Story] Successfully published!', publishResult);

  return {
    ...publishResult,
    containerId,
  };
}

async function main() {
  const videoPath = path.resolve('campaign/shorts-rendered/short14_write_jealousy/short14_write_jealousy.mp4');

  console.log('🚀 WRITON INSTAGRAM STORY PUBLISHER (META GRAPH API v26.0)');
  console.log(`Video: ${videoPath}`);

  const result = await uploadStoryVideo({ videoPath });

  console.log('\n================================================================');
  console.log('🎉 STORY PUBLICATION COMPLETE');
  console.log(`• Media ID: ${result.igMediaId}`);
  console.log('================================================================\n');

  await recordHistory({
    id: 'short14_write_jealousy_story',
    igMediaId: result.igMediaId,
    containerId: result.containerId,
    publishedAt: new Date().toISOString(),
    title: 'Writing Hack #14: Make Jealousy Visible',
  });
}

main().catch(err => {
  console.error('\n❌ Story Publisher failed:', err);
  process.exit(1);
});
