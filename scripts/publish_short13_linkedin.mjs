import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { LinkedInClient } from '../server/src/services/linkedin-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
dotenv.config();

const historyFilePath = path.resolve(__dirname, '../campaign/published-history.json');

async function recordHistory(postData) {
  try {
    let history = { publishedDays: {} };
    try {
      const raw = await fs.readFile(historyFilePath, 'utf8');
      history = JSON.parse(raw);
    } catch (_e) {}

    if (!history.linkedin) history.linkedin = {};
    history.linkedin[postData.id] = postData;

    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    console.log(`[LinkedIn Publisher] Recorded ${postData.id} to published-history.json`);
  } catch (err) {
    console.warn(`[LinkedIn Publisher] Could not update history: ${err.message}`);
  }
}

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

  console.log(`[LinkedIn Video] Initialized Video URN: ${videoUrn}`);
  console.log(`[LinkedIn Video] Instructions count: ${uploadInstructions.length}`);

  console.log('[LinkedIn Video] Step 2: Uploading video parts...');
  const uploadedPartIds = [];

  for (let i = 0; i < uploadInstructions.length; i++) {
    const part = uploadInstructions[i];
    const chunk = fileBuffer.subarray(part.firstByte, part.lastByte + 1);
    console.log(`   Uploading part ${i + 1}/${uploadInstructions.length} (bytes ${part.firstByte}-${part.lastByte})...`);

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
    console.log(`   Part ${i + 1} uploaded successfully (ETag: ${etag})`);
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
  console.log('[LinkedIn Video] Video upload finalized successfully!');

  console.log('[LinkedIn Video] Step 4: Polling video processing status...');
  const encodedVideoUrn = encodeURIComponent(videoUrn);
  let status = 'WAITING_UPLOAD';
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise((r) => setTimeout(r, 4000));

    const pollRes = await client.request(`https://api.linkedin.com/rest/videos/${encodedVideoUrn}`);
    if (!pollRes.ok) {
      console.warn(`   Poll attempt ${attempts} warning (${pollRes.status})`);
      continue;
    }

    const pollData = await pollRes.json();
    status = pollData.status;
    console.log(`   Poll attempt ${attempts}/${maxAttempts}: status = ${status}`);

    if (status === 'AVAILABLE') {
      console.log('✅ [LinkedIn Video] Video is AVAILABLE for publishing!');
      break;
    }

    if (status === 'PROCESSING_FAILED') {
      throw new Error(`Video processing failed on LinkedIn: ${JSON.stringify(pollData)}`);
    }
  }

  if (status !== 'AVAILABLE') {
    throw new Error(`Video did not reach AVAILABLE status within ${maxAttempts * 4}s (current status: ${status})`);
  }

  return videoUrn;
}

async function main() {
  const client = new LinkedInClient({ log: console });
  if (!client.isConfigured()) {
    console.error('❌ Missing LinkedIn credentials in server/.env');
    process.exit(1);
  }

  const videoPath = path.resolve('campaign/shorts-rendered/short13_she_realized/short13_she_realized.mp4');
  const articleTitle = "Writing Craft: Stop Writing 'She Realized'";

  const commentary = `Stop writing: “She realized.”

“She realized he had never really loved her.”

Don't announce the realization. Hand over the evidence.

When you tell the reader a character "realized" something, you are describing a thought from the outside. The reader remains a passive observer.

Instead, show the concrete, physical detail that forced the realization into the room:

“She scrolled his contacts. Three years, and he still had her saved as 'Priya (work)'.”

Now the reader makes the connection for themselves. The realization happens in the reader's mind, not in the narrator's commentary.

We built WritOn for writers who care about the architecture of every sentence.

Read and publish slow, craft-first literature:
📲 https://writon.cc

#writing #storytelling #fictionwriting #creativewriting #writingtips #amwriting #craft #authors`;

  console.log('===============================================================');
  console.log('🚀 WRITON LINKEDIN VIDEO PUBLISHER');
  console.log(`   Author: ${client.personUrn}`);
  console.log(`   Video: ${videoPath}`);
  console.log('===============================================================\n');

  // Step 1-4: Upload and process video
  const videoUrn = await uploadVideoToLinkedIn({ client, videoPath });

  // Step 5: Create Post with Video
  console.log('\n[LinkedIn Post] Step 5: Publishing video post to LinkedIn feed...');
  const postResult = await client.createPost({
    commentary,
    format: 'VIDEO',
    mediaAssetUrns: [videoUrn],
    articleTitle,
  });

  if (!postResult.success) {
    throw new Error(`Failed to create LinkedIn post: ${postResult.error}`);
  }

  console.log('\n===============================================================');
  console.log('🎉 LINKEDIN POST PUBLISHED SUCCESSFULLY!');
  console.log(`• Post URN: ${postResult.postUrn}`);
  console.log(`• Live URL: ${postResult.liveUrl}`);
  console.log('===============================================================\n');

  await recordHistory({
    id: 'short13_she_realized',
    platform: 'linkedin',
    postUrn: postResult.postUrn,
    liveUrl: postResult.liveUrl,
    videoUrn,
    publishedAt: new Date().toISOString(),
    title: articleTitle,
  });
}

main().catch((err) => {
  console.error('\n❌ LinkedIn Publisher failed:', err.message);
  process.exit(1);
});
