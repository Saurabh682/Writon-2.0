import { YouTubeClient } from '../server/src/services/youtube-client.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });
dotenv.config();

async function main() {
  const videoPath = path.resolve('./campaign/shorts-rendered/short14_write_jealousy/short14_write_jealousy.mp4');
  const title = 'Make Jealousy Visible (Without Saying "Jealous") #shorts';
  const description = 
`"She felt jealous when she saw Mira's promotion post."

Don't announce the feeling. Show the compulsive behavior it creates.

WRITING HACK #14: The Anatomy of Inferred Emotion.

Read and publish craft-first literature on WritOn:
📲 https://writon.cc

#shorts #writingcommunity #writingtips #writon #creativewriting #fictionwriting #storytelling`;

  const tags = ['writingtips', 'amwriting', 'fictionwriting', 'creativewriting', 'writon', 'charactercraft', 'storytelling', 'writinghacks', 'shorts'];

  console.log('[YouTube Publisher] Uploading Short #14 to YouTube (public)...');
  const client = new YouTubeClient();
  const res = await client.uploadVideo({
    videoPath,
    title,
    description,
    tags,
    privacyStatus: 'public',
    isShort: true
  });

  console.log('Upload Result:', JSON.stringify(res, null, 2));

  const resultData = {
    id: "short_02",
    slug: "short14_write_jealousy",
    videoId: res.videoId,
    title: title,
    privacyStatus: "public",
    uploadedAt: new Date().toISOString(),
    shortsUrl: `https://www.youtube.com/shorts/${res.videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${res.videoId}`,
    duration: 15.5,
    resolution: "1080x1920 (Standard Shorts Delivery)",
    voice: "Nicole (af_nicole @ 1.25x-1.30x) + tactile click sfx + ambient piano",
    audioVerified: true,
    rule: "WRITING HACK #14: Make Jealousy Visible (Compulsive Behavior vs Named Emotion)"
  };

  await fs.writeFile(
    './campaign/shorts-rendered/short14_write_jealousy/upload_result.json',
    JSON.stringify(resultData, null, 2),
    'utf-8'
  );
  console.log('Saved upload_result.json successfully!');
}

main().catch(err => {
  console.error('Fatal upload error:', err);
  process.exit(1);
});
