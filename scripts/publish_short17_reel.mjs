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

async function recordHistory(reelData) {
  try {
    let history = { publishedDays: {} };
    try {
      const raw = await fs.readFile(historyFilePath, 'utf8');
      history = JSON.parse(raw);
    } catch (_e) {}

    if (!history.reels) history.reels = {};
    history.reels[reelData.id] = reelData;

    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    console.log(`[Reel Publisher] Recorded ${reelData.id} to published-history.json`);
  } catch (err) {
    console.warn(`[Reel Publisher] Could not update history: ${err.message}`);
  }
}

async function uploadReelBinary({ videoPath, caption }) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const apiVersion = process.env.META_GRAPH_API_VERSION || 'v26.0';

  console.log('[Instagram Reel] Step 1: Initializing resumable upload session...');
  const initRes = await fetch(`https://graph.facebook.com/${apiVersion}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upload_type: 'resumable',
      media_type: 'REELS',
      caption,
      access_token: token,
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok || !initData.id || !initData.uri) {
    throw new Error(`Failed to initialize Reel upload session: ${JSON.stringify(initData)}`);
  }

  const { id: containerId, uri: uploadUri } = initData;
  console.log(`[Instagram Reel] Container initialized: ${containerId}`);
  console.log(`[Instagram Reel] Upload URI: ${uploadUri}`);

  console.log('[Instagram Reel] Step 2: Uploading video binary...');
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
    throw new Error(`Failed to upload Reel binary: ${JSON.stringify(uploadData)}`);
  }
  console.log('[Instagram Reel] Video binary successfully streamed to Meta!');

  console.log('[Instagram Reel] Step 3: Polling container processing status...');
  const client = new InstagramClient();
  const pollResult = await client.pollContainerStatus(containerId, { maxAttempts: 30, intervalMs: 5000 });
  console.log(`[Instagram Reel] Polling result: ${pollResult.status}`);

  if (pollResult.status !== 'FINISHED') {
    throw new Error(`Reel container failed to reach FINISHED state: ${JSON.stringify(pollResult)}`);
  }

  console.log('[Instagram Reel] Step 4: Publishing container to Instagram Feed & Reels...');
  const publishResult = await client.publishContainer(containerId);
  console.log('[Instagram Reel] Successfully published!', publishResult);

  return {
    ...publishResult,
    containerId,
  };
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

  console.log('[Instagram Story] Step 3: Polling container processing status...');
  const client = new InstagramClient();
  const pollResult = await client.pollContainerStatus(containerId, { maxAttempts: 30, intervalMs: 5000 });

  if (pollResult.status !== 'FINISHED') {
    throw new Error(`Story container failed to reach FINISHED state: ${JSON.stringify(pollResult)}`);
  }

  console.log('[Instagram Story] Step 4: Publishing container to Instagram Story...');
  const publishResult = await client.publishContainer(containerId);
  return { ...publishResult, containerId };
}

export async function publishShort17ReelAndStory() {
  const videoPath = path.resolve('campaign/shorts-rendered/short17_make_guilt_visible/short17_make_guilt_visible.mp4');
  const caption = `MAKE GUILT VISIBLE.

“He felt guilty about forgetting her birthday.”

Delete the confession. Hand over the physical avoidance:

“He typed: ‘Happy belated—’
then turned the phone face-down.”

Guilt doesn't explain itself.
Show what the character refuses to look at.

Read and publish slow, craft-first literature on WritOn:
📲 https://writon.cc

#shorts #writingcommunity #writon`;

  console.log('🚀 [DISPATCH] Publishing Short 17 to Instagram Reel...');
  const reelResult = await uploadReelBinary({ videoPath, caption });
  await recordHistory({
    id: 'short17_make_guilt_visible',
    igMediaId: reelResult.igMediaId,
    permalink: reelResult.permalink,
    shortcode: reelResult.shortcode,
    containerId: reelResult.containerId,
    publishedAt: new Date().toISOString(),
    title: 'Writing Hack #17: Make Guilt Visible',
  });

  console.log('🚀 [DISPATCH] Publishing Short 17 to Instagram Story...');
  const storyResult = await uploadStoryVideo({ videoPath });
  await recordHistory({
    id: 'short17_make_guilt_visible_story',
    igMediaId: storyResult.igMediaId,
    containerId: storyResult.containerId,
    publishedAt: new Date().toISOString(),
    title: 'Writing Hack #17 (Story)',
  });

  console.log('🎉 Short 17 Reel and Story publication complete!');
}

if (process.argv[1] && process.argv[1].endsWith('publish_short17_reel.mjs')) {
  publishShort17ReelAndStory().catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
}
