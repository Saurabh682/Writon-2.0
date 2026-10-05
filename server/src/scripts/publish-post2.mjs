import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function publishPost2() {
  const pendingFile = path.resolve(__dirname, '../../../scratch/pending_post2.json');
  if (!fs.existsSync(pendingFile)) {
    console.log('No pending Post 2 found.');
    return;
  }
  const { text } = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));

  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET
  });

  const res = await client.readWrite.v2.tweet({ text });
  console.log('Post 2 published! ID:', res.data.id);

  const historyPath = path.resolve(__dirname, '../../../campaign/x-campaign-history.json');
  let history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  history.push({
    date: new Date().toISOString(),
    campaign: 'custom-insight',
    tweet_id: res.data.id,
    text,
    reply_text: null
  });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  fs.unlinkSync(pendingFile);
  console.log('Pending file cleaned up.');
}

publishPost2().catch(console.error);
