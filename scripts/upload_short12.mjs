import { YouTubeClient } from '../server/src/services/youtube-client.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });
dotenv.config();

async function main() {
  const videoPath = path.resolve('./campaign/shorts-rendered/short12_cold_anger/short12_cold_anger.mp4');
  const title = 'How to Write Anger Without Screaming';
  const description = 
`"She was furious at him for lying."
Stop making angry characters shout. Real fury lowers its voice and organizes the room.

WRITING HACK #12: Lethal Anger vs Melodrama.

Read and publish craft-focused literature on WritOn:
📲 https://writon.cc

#writingtips #amwriting #fictionwriting #creativewriting #writon #charactercraft #writinghacks`;

  const tags = ['writingtips', 'amwriting', 'fictionwriting', 'creativewriting', 'writon', 'charactercraft', 'anger'];

  console.log('[YouTube Publisher] Uploading Short #12 to YouTube (unlisted)...');
  const client = new YouTubeClient();
  const res = await client.uploadVideo({
    videoPath,
    title,
    description,
    tags,
    privacyStatus: 'unlisted',
    isShort: true
  });

  console.log('Upload Result:', JSON.stringify(res, null, 2));

  const resultData = {
    id: "short_012",
    slug: "short12_cold_anger",
    videoId: res.videoId,
    title: title,
    privacyStatus: "unlisted",
    uploadedAt: new Date().toISOString(),
    shortsUrl: `https://www.youtube.com/shorts/${res.videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${res.videoId}`,
    duration: 30.5,
    resolution: "1080x1920 (Standard Shorts Delivery)",
    voice: "Nicole (af_nicole @ 1.22x) + ambient piano",
    audioVerified: true,
    rule: "WRITING HACK #12: Cold Anger & Domestic Geometry"
  };

  await fs.writeFile(
    './campaign/shorts-rendered/short12_cold_anger/upload_result.json',
    JSON.stringify(resultData, null, 2),
    'utf-8'
  );
  console.log('Saved upload_result.json successfully!');
}

main().catch(err => {
  console.error('Fatal upload error:', err);
  process.exit(1);
});
