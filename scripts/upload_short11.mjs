import { YouTubeClient } from '../server/src/services/youtube-client.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });
dotenv.config();

async function main() {
  const videoPath = path.resolve('./campaign/shorts-rendered/short11_dialogue_tags/short11_dialogue_tags.mp4');
  const title = 'Stop Using Adverbs in Dialogue Tags';
  const description = 
`"Don't touch that," he whispered menacingly.
Your dialogue tag is apologizing for your sentence. If the line is dangerous, cut the modifier and let the character's hands prove it.

WRITING HACK #11: Dialogue Tags vs Physical Action Beats.

Read and publish craft-focused literature on WritOn:
📲 https://writon.cc

#writingtips #amwriting #fictionwriting #creativewriting #writon #dialoguetags`;

  const tags = ['writingtips', 'amwriting', 'fictionwriting', 'creativewriting', 'writon', 'dialogue', 'craft'];

  console.log('[YouTube Publisher] Uploading Short #11 to YouTube (unlisted)...');
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
    id: "short_011",
    slug: "short11_dialogue_tags",
    videoId: res.videoId,
    title: title,
    privacyStatus: "unlisted",
    uploadedAt: new Date().toISOString(),
    shortsUrl: `https://www.youtube.com/shorts/${res.videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${res.videoId}`,
    duration: 26.5,
    resolution: "1080x1920 (Standard Shorts Delivery)",
    voice: "Nicole (af_nicole @ 1.18x) + ambient piano",
    rule: "WRITING HACK #11: Dialogue Tags vs Physical Action Beats"
  };

  await fs.writeFile(
    './campaign/shorts-rendered/short11_dialogue_tags/upload_result.json',
    JSON.stringify(resultData, null, 2),
    'utf-8'
  );
  console.log('Saved upload_result.json successfully!');
}

main().catch(err => {
  console.error('Fatal upload error:', err);
  process.exit(1);
});
