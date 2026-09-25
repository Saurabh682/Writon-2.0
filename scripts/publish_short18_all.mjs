import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { YouTubeClient } from '../server/src/services/youtube-client.js';
import { InstagramClient } from '../server/src/services/instagram-client.js';
import { LinkedInClient } from '../server/src/services/linkedin-client.js';
import { postToX } from '../server/src/services/social-poster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
dotenv.config();

const historyFilePath = path.resolve(__dirname, '../campaign/published-history.json');

async function updateHistory(updater) {
  try {
    let history = { publishedDays: {} };
    try {
      const raw = await fs.readFile(historyFilePath, 'utf8');
      history = JSON.parse(raw);
    } catch (_e) {}

    updater(history);

    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    console.log('[Published History] Updated published-history.json');
  } catch (err) {
    console.warn(`[Published History] Warning: Failed to update history: ${err.message}`);
  }
}

// -------------------------------------------------------------
// YouTube Shorts Publisher
// -------------------------------------------------------------
async function publishYouTube({ videoPath }) {
  console.log('\n===============================================================');
  console.log('▶️ [YouTube Shorts] Publishing Short #18...');
  console.log('===============================================================');

  const client = new YouTubeClient();
  if (!client.canUpload()) {
    throw new Error('Missing YouTube OAuth credentials');
  }

  const title = 'Kill Filter Words (Cut the Glass Wall) #shorts';
  const description = `Kill filter words.

“She heard the floorboards creak beneath his boots.”

Cut the filter. Keep the event. Let the reader hear it directly:

“The floorboards creaked beneath his boots.”

Read and publish slow, craft-first literature on WritOn:
📲 https://writon.cc

#shorts #writingcommunity #writon`;

  const tags = ['writingtips', 'amwriting', 'fictionwriting', 'creativewriting', 'writon', 'filterwords', 'storytelling', 'writinghacks', 'shorts'];

  const res = await client.uploadVideo({
    videoPath,
    title,
    description,
    tags,
    privacyStatus: 'public',
    isShort: true,
  });

  console.log(`✅ [YouTube Shorts] Published! Video ID: ${res.videoId} (${res.url})`);

  await updateHistory((history) => {
    if (!history.shorts) history.shorts = {};
    history.shorts.short18_kill_filter_words = {
      title,
      duration: 20,
      videoId: res.videoId,
      url: `https://www.youtube.com/shorts/${res.videoId}`,
      privacyStatus: 'public',
      publishedAt: new Date().toISOString(),
    };
  });

  return res;
}

// -------------------------------------------------------------
// Instagram Reel & Story Publisher
// -------------------------------------------------------------
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

  console.log('[Instagram Reel] Step 2: Streaming video binary...');
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
  console.log('[Instagram Reel] Binary stream complete.');

  console.log('[Instagram Reel] Step 3: Polling container processing status...');
  const client = new InstagramClient();
  const pollResult = await client.pollContainerStatus(containerId, { maxAttempts: 30, intervalMs: 5000 });

  if (pollResult.status !== 'FINISHED') {
    throw new Error(`Reel container failed to reach FINISHED state: ${JSON.stringify(pollResult)}`);
  }

  console.log('[Instagram Reel] Step 4: Publishing container to Reels feed...');
  const publishResult = await client.publishContainer(containerId);
  return { ...publishResult, containerId };
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

  console.log('[Instagram Story] Step 2: Streaming Story video binary...');
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

  console.log('[Instagram Story] Step 4: Publishing container to Story...');
  const publishResult = await client.publishContainer(containerId);
  return { ...publishResult, containerId };
}

async function publishInstagram({ videoPath }) {
  console.log('\n===============================================================');
  console.log('📸 [Instagram] Publishing Short #18 (Reel & Story)...');
  console.log('===============================================================');

  const caption = `KILL FILTER WORDS.

“She heard the floorboards creak beneath his boots.”

Cut the filter. Keep the event:

“The floorboards creaked beneath his boots.”

Every time you write "she heard" or "he saw," you put a glass wall between your reader and the scene.

Let the reader hear it directly.

Read and publish slow, craft-first literature on WritOn:
📲 https://writon.cc

#shorts #writingcommunity #writon`;

  console.log('🚀 [Instagram Reel] Publishing Reel...');
  const reelResult = await uploadReelBinary({ videoPath, caption });
  console.log(`✅ [Instagram Reel] Published! Media ID: ${reelResult.igMediaId}, Link: ${reelResult.permalink}`);

  await updateHistory((history) => {
    if (!history.reels) history.reels = {};
    history.reels.short18_kill_filter_words = {
      id: 'short18_kill_filter_words',
      igMediaId: reelResult.igMediaId,
      permalink: reelResult.permalink,
      shortcode: reelResult.shortcode,
      containerId: reelResult.containerId,
      publishedAt: new Date().toISOString(),
      title: 'Writing Hack #18: Kill Filter Words',
    };
  });

  console.log('🚀 [Instagram Story] Publishing Story...');
  const storyResult = await uploadStoryVideo({ videoPath });
  console.log(`✅ [Instagram Story] Published! Media ID: ${storyResult.igMediaId}`);

  await updateHistory((history) => {
    if (!history.stories) history.stories = {};
    history.stories.short18_kill_filter_words_story = {
      id: 'short18_kill_filter_words_story',
      igMediaId: storyResult.igMediaId,
      containerId: storyResult.containerId,
      publishedAt: new Date().toISOString(),
      title: 'Writing Hack #18 (Story)',
    };
  });

  return { reel: reelResult, story: storyResult };
}

// -------------------------------------------------------------
// LinkedIn Video Publisher
// -------------------------------------------------------------
async function uploadVideoToLinkedIn({ client, videoPath }) {
  const fileBuffer = await fs.readFile(videoPath);
  const fileSizeBytes = fileBuffer.length;

  console.log(`[LinkedIn Video] Step 1: Initializing video upload (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)...`);
  const initPayload = {
    initializeUploadRequest: {
      owner: client.personUrn,
      fileSizeBytes,
      uploadCaptions: false,
      uploadThumbnail: false,
    },
  };

  const initRes = await client.request('https://api.linkedin.com/rest/videos?action=initializeUpload', {
    method: 'POST',
    body: JSON.stringify(initPayload),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Failed to initialize LinkedIn video upload (${initRes.status}): ${errText}`);
  }

  const initData = await initRes.json();
  const videoUrn = initData.value?.video;
  const uploadInstructions = initData.value?.uploadInstructions || [];
  const uploadToken = initData.value?.uploadToken || '';

  if (!videoUrn || uploadInstructions.length === 0) {
    throw new Error(`Invalid video upload initialization response: ${JSON.stringify(initData)}`);
  }

  console.log(`[LinkedIn Video] Video URN: ${videoUrn}`);

  console.log('[LinkedIn Video] Step 2: Uploading video parts...');
  const uploadedPartIds = [];

  for (let i = 0; i < uploadInstructions.length; i++) {
    const part = uploadInstructions[i];
    const chunk = fileBuffer.subarray(part.firstByte, part.lastByte + 1);

    const partRes = await fetch(part.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: chunk,
    });

    if (!partRes.ok) {
      const errText = await partRes.text();
      throw new Error(`Failed to upload part ${i + 1} (${partRes.status}): ${errText}`);
    }

    const etag = partRes.headers.get('etag') || partRes.headers.get('ETag') || '';
    uploadedPartIds.push(etag);
    console.log(`   Part ${i + 1}/${uploadInstructions.length} uploaded (ETag: ${etag})`);
  }

  console.log('[LinkedIn Video] Step 3: Finalizing video upload...');
  const finalizePayload = {
    finalizeUploadRequest: {
      video: videoUrn,
      uploadToken,
      uploadedPartIds,
    },
  };

  const finalizeRes = await client.request('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
    method: 'POST',
    body: JSON.stringify(finalizePayload),
  });

  if (!finalizeRes.ok) {
    const errText = await finalizeRes.text();
    throw new Error(`Failed to finalize LinkedIn video upload (${finalizeRes.status}): ${errText}`);
  }

  console.log('[LinkedIn Video] Step 4: Waiting for LinkedIn video processing...');
  let status = 'WAITING_UPLOAD';
  let attempts = 0;
  while (attempts < 20) {
    attempts++;
    await new Promise(r => setTimeout(r, 4000));

    const checkRes = await client.request(`https://api.linkedin.com/rest/videos/${encodeURIComponent(videoUrn)}`, {
      method: 'GET',
    });

    if (checkRes.ok) {
      const checkData = await checkRes.json();
      status = checkData.status;
      console.log(`   Status check #${attempts}: ${status}`);
      if (status === 'AVAILABLE') break;
      if (status === 'PROCESSING_FAILED') throw new Error('LinkedIn video processing failed');
    }
  }

  return videoUrn;
}

async function publishLinkedIn({ videoPath }) {
  console.log('\n===============================================================');
  console.log('💼 [LinkedIn] Publishing Short #18 Video Post...');
  console.log('===============================================================');

  const client = new LinkedInClient({ log: console });
  if (!client.isConfigured()) {
    throw new Error('Missing LinkedIn credentials in server/.env');
  }

  const articleTitle = "Writing Craft: Kill Filter Words";
  const commentary = `Kill filter words.

“She heard the floorboards creak beneath his boots.”

Every time you write “she heard,” “he noticed,” or “she felt,” you drop a sheet of glass between your reader and the scene.

You are reminding the reader that someone else is observing the world, instead of allowing them to inhabit it directly.

Cut the filter. Keep the event:

“The floorboards creaked beneath his boots.”

Notice what changes:
The sentence loses syllables, but gains immediacy. The sound belongs directly to the room now.

In prose, the strongest camera is the one the reader forgets is there.

Read and publish slow, craft-first literature on WritOn:
📲 https://writon.cc

#writing #storytelling #fictionwriting #creativewriting #writingtips #amwriting #craft #authors`;

  const videoUrn = await uploadVideoToLinkedIn({ client, videoPath });

  console.log('[LinkedIn Post] Publishing video post to LinkedIn feed...');
  const postResult = await client.createPost({
    commentary,
    format: 'VIDEO',
    mediaAssetUrns: [videoUrn],
    articleTitle,
  });

  if (!postResult.success) {
    throw new Error(`Failed to create LinkedIn post: ${postResult.error}`);
  }

  console.log(`✅ [LinkedIn] Published! URN: ${postResult.postUrn} (${postResult.liveUrl})`);

  await updateHistory((history) => {
    if (!history.linkedin) history.linkedin = {};
    history.linkedin.short18_kill_filter_words = {
      id: 'short18_kill_filter_words',
      platform: 'linkedin',
      postUrn: postResult.postUrn,
      liveUrl: postResult.liveUrl,
      videoUrn,
      publishedAt: new Date().toISOString(),
      title: articleTitle,
    };
  });

  return postResult;
}

// -------------------------------------------------------------
// X (Twitter) Publisher
// -------------------------------------------------------------
async function publishX() {
  console.log('\n===============================================================');
  console.log('🐦 [X / Twitter] Publishing Short #18 Craft Commentary...');
  console.log('===============================================================');

  const text = `Kill filter words.

“She heard the floorboards creak beneath his boots.”

Every time you write "she heard" or "he saw," you put a sheet of glass between the reader and the room.

Cut the filter. Keep the event:

“The floorboards creaked beneath his boots.”

#writingtips #amwriting #writon`;

  const xRes = await postToX({ text });
  if (xRes.success) {
    console.log(`✅ [X] Published! Post ID: ${xRes.postId} (https://x.com/WritOn_Social/status/${xRes.postId})`);
    await updateHistory((history) => {
      if (!history.x) history.x = {};
      history.x.short18_kill_filter_words = {
        id: 'short18_kill_filter_words',
        postId: xRes.postId,
        url: `https://x.com/WritOn_Social/status/${xRes.postId}`,
        publishedAt: new Date().toISOString(),
      };
    });
  } else {
    console.warn(`⚠️ [X] Publishing skipped/failed: ${xRes.reason || xRes.error}`);
  }
  return xRes;
}

// -------------------------------------------------------------
// Main Coordinator
// -------------------------------------------------------------
async function main() {
  const videoPath = path.resolve('campaign/shorts-rendered/short18_kill_filter_words/short18_kill_filter_words.mp4');

  console.log('===============================================================');
  console.log('🚀 WRITON MULTI-PLATFORM DISPATCHER: SHORT #18');
  console.log(`🎬 Target Video: ${videoPath}`);
  console.log('===============================================================');

  const results = {};

  // 1. YouTube Shorts
  try {
    results.youtube = await publishYouTube({ videoPath });
  } catch (err) {
    console.error('❌ YouTube dispatch failed:', err.message);
    results.youtube = { success: false, error: err.message };
  }

  // 2. Instagram Reel & Story
  try {
    results.instagram = await publishInstagram({ videoPath });
  } catch (err) {
    console.error('❌ Instagram dispatch failed:', err.message);
    results.instagram = { success: false, error: err.message };
  }

  // 3. LinkedIn Video Post
  try {
    results.linkedin = await publishLinkedIn({ videoPath });
  } catch (err) {
    console.error('❌ LinkedIn dispatch failed:', err.message);
    results.linkedin = { success: false, error: err.message };
  }

  // 4. X (Twitter)
  try {
    results.x = await publishX();
  } catch (err) {
    console.error('❌ X dispatch failed:', err.message);
    results.x = { success: false, error: err.message };
  }

  console.log('\n===============================================================');
  console.log('📊 MULTI-PLATFORM DISPATCH SUMMARY FOR SHORT #18');
  console.log('===============================================================');
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
