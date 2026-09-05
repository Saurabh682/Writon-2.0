import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';

dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

async function post() {
  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  });
  const rw = client.readWrite;
  const cardPath = 'd:/VibeCode/WritOn-PowerUp/campaign/day5-assets/day5_spotlight_slide_1.png';
  console.log('Uploading card to X...');
  const mid = await rw.v1.uploadMedia(cardPath);
  console.log('Uploaded media ID:', mid);

  const text = `“Platform 8 smelled of wet jute, diesel exhaust, and cold mustard oil under the hum of fluorescent lights.” 📖

Today’s Author Spotlight: Devansh Roy and his noir fiction “The Last Train from Howrah Station at 2:15 AM”.

#writon #writingcommunity #amwriting #storytelling #books`;

  console.log('Posting tweet...');
  const tweet = await rw.v2.tweet({
    text,
    media: { media_ids: [mid] },
  });
  console.log('✅ Tweet posted:', tweet);

  console.log('Posting reply with link...');
  const reply = await rw.v2.reply(
    `📲 Read Devansh’s complete story and claim your 1-word pen name on Google Play:\nhttps://writon.cc/go/2609_d05_x_post_en_author_spotlight`,
    tweet.data.id
  );
  console.log('✅ Reply posted:', reply);

  return { tweetId: tweet.data.id, replyId: reply.data.id };
}

post().then(res => console.log('RESULT:', res)).catch(err => {
  console.error('FAILED:', err);
  if (err.data) console.error('ERR DATA:', err.data);
});
