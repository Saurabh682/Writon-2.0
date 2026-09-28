import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { InstagramClient } from '../server/src/services/instagram-client.js';
import { uploadLocalVideoForMeta } from '../server/src/services/social-poster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
dotenv.config();

const VIDEO_PATH = path.resolve(__dirname, '../campaign/shorts-rendered/short19_synonyms_for_said/short19_synonyms_for_said.mp4');
const historyFilePath = path.resolve(__dirname, '../campaign/published-history.json');

const REEL_CAPTION = `Stop hunting synonyms for "said."

When you write "she exclaimed defensively" or "he whispered nervously," you draw attention to the author rather than the scene.

"Said" is invisible. A physical action beat is unforgettable.

Replace the tag with an action:
→ “I’m fine.” She wiped the counter again.
→ “Wait.” His hand gripped the keys in his pocket.

Save this for your next dialogue revision.

#writon #writingcraft #writerslife #writingtips #creativewriting #dialoguetips #authortube`;

async function recordHistory(key, data) {
  try {
    let history = {};
    try {
      const raw = await fs.readFile(historyFilePath, 'utf8');
      history = JSON.parse(raw);
    } catch (_e) {}

    if (!history.instagram) history.instagram = {};
    history.instagram[key] = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    console.log(`[Instagram Publisher] Recorded ${key} to published-history.json`);
  } catch (err) {
    console.warn(`[Instagram Publisher] Warning: Failed to record history: ${err.message}`);
  }
}

async function publish() {
  console.log('🎬 [WritOn Instagram Publisher] Initializing Short #19 Dispatch...');
  const client = new InstagramClient();

  if (!client.isConfigured()) {
    console.error('❌ Missing Instagram credentials (INSTAGRAM_ACCESS_TOKEN & INSTAGRAM_BUSINESS_ACCOUNT_ID)');
    process.exit(1);
  }

  // 1. Upload video to direct HTTPS host
  console.log(`📤 Uploading local video: ${VIDEO_PATH}`);
  const videoUrl = await uploadLocalVideoForMeta(VIDEO_PATH);
  console.log(`🌐 Public video URL hosted: ${videoUrl}`);

  // 2. Publish as Instagram Reel
  console.log('\n--- 1. Publishing Instagram Reel ---');
  console.log('📦 Creating REELS container...');
  const reelContainerId = await client.createContainer({
    mediaType: 'REELS',
    videoUrl,
    caption: REEL_CAPTION,
  });
  console.log(`⏳ Reel Container ID: ${reelContainerId}. Polling for processing status...`);

  const reelStatus = await client.pollContainerStatus(reelContainerId, { maxAttempts: 25, intervalMs: 4000 });
  if (reelStatus.status !== 'FINISHED') {
    throw new Error(`Reel container processing failed with status: ${reelStatus.status} (${JSON.stringify(reelStatus.error || {})})`);
  }
  console.log('✅ Reel container status: FINISHED');

  console.log('🚀 Publishing Reel to @writon_socialapp feed...');
  const publishedReel = await client.publishContainer(reelContainerId);
  console.log(`🎉 Reel Published Successfully!`);
  console.log(`🆔 Media ID: ${publishedReel.igMediaId}`);
  console.log(`🔗 Permalink: ${publishedReel.permalink}`);

  await recordHistory('reel_short19_synonyms_for_said', {
    type: 'REELS',
    mediaId: publishedReel.igMediaId,
    permalink: publishedReel.permalink,
    videoUrl,
  });

  // 3. Publish as Instagram Story
  console.log('\n--- 2. Publishing Instagram Story ---');
  console.log('📦 Creating STORIES video container...');
  const storyContainerId = await client.createContainer({
    mediaType: 'STORIES',
    videoUrl,
  });
  console.log(`⏳ Story Container ID: ${storyContainerId}. Polling for processing status...`);

  const storyStatus = await client.pollContainerStatus(storyContainerId, { maxAttempts: 25, intervalMs: 4000 });
  if (storyStatus.status !== 'FINISHED') {
    throw new Error(`Story container processing failed with status: ${storyStatus.status} (${JSON.stringify(storyStatus.error || {})})`);
  }
  console.log('✅ Story container status: FINISHED');

  console.log('🚀 Publishing Story to @writon_socialapp...');
  const publishedStory = await client.publishContainer(storyContainerId);
  console.log(`🎉 Story Published Successfully!`);
  console.log(`🆔 Media ID: ${publishedStory.igMediaId}`);
  console.log(`🔗 Permalink: ${publishedStory.permalink}`);

  await recordHistory('story_short19_synonyms_for_said', {
    type: 'STORIES',
    mediaId: publishedStory.igMediaId,
    permalink: publishedStory.permalink,
    videoUrl,
  });

  console.log('\n✨ Both Reel and Story dispatches completed successfully!');
}

publish().catch(err => {
  console.error('❌ Instagram publish failed:', err);
  process.exit(1);
});
