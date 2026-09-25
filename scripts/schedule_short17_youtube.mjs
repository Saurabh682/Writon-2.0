import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { YouTubeClient } from '../server/src/services/youtube-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
dotenv.config();

const client = new YouTubeClient();

async function run() {
  console.log('🚀 Uploading Short 17 scheduled for 8:00 AM IST (2026-09-24T02:30:00.000Z)...');
  const result = await client.uploadVideo({
    videoPath: 'campaign/shorts-rendered/short17_make_guilt_visible/short17_make_guilt_visible.mp4',
    title: 'Make Guilt Visible (Without Saying "Guilty")',
    description: `Guilt doesn't explain itself. Show what the character refuses to look at.

Rewrite:
“He typed: ‘Happy belated—’
then turned the phone face-down.”

Read and publish slow, craft-first literature on WritOn:
https://writon.cc

#shorts #writingcommunity #writon`,
    privacyStatus: 'private',
    publishAt: '2026-09-24T02:30:00.000Z',
    isShort: true,
  });

  console.log('✅ Success! Video scheduled on YouTube:');
  console.log('ID:', result.videoId);
  console.log('URL:', result.url);
}

run().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
