import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

async function runCampaignClock() {
  const campaignPath = path.resolve(__dirname, '../../../campaign/x-campaign-sep20.json');
  const campaignData = JSON.parse(fs.readFileSync(campaignPath, 'utf-8'));

  // Use UTC to calculate IST (UTC+5:30)
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60000;
  const istTime = new Date(utcMs + istOffset);
  
  const todayStr = istTime.toISOString().split('T')[0];
  const currentHour = istTime.getHours();

  console.log(`Current IST Time: ${istTime.toLocaleString()}`);
  console.log(`Target Date: ${todayStr}, Hour: ${currentHour}`);

  const todayContent = campaignData.find(d => d.date === todayStr);

  if (!todayContent) {
    console.log(`No campaign content found for today (${todayStr}).`);
    return;
  }

  let textToPost = null;
  let replyToPost = null;

  // Between 9 AM and 10 AM IST
  if (currentHour >= 9 && currentHour < 12) {
    console.log("Matched AM slot.");
    textToPost = todayContent.am_post;
  } 
  // Between 8 PM and 9 PM IST
  else if (currentHour >= 20 && currentHour < 22) {
    console.log("Matched PM slot.");
    textToPost = todayContent.pm_post;
    replyToPost = todayContent.pm_reply;
  } else {
    console.log("Outside regular time slots. No action taken.");
  }

  if (!textToPost) {
    console.log("No text to post.");
    return;
  }

  try {
    const rwClient = client.readWrite;
    console.log("Posting to X:");
    console.log("---");
    console.log(textToPost);
    console.log("---");
    
    // Check if we should dry-run (always safe)
    if (process.argv.includes('--dry-run')) {
      console.log("[DRY RUN] Would have posted tweet.");
      if (replyToPost) {
        console.log("[DRY RUN] Would have replied with:");
        console.log(replyToPost);
      }
      return;
    }

    const tweetResult = await rwClient.v2.tweet({ text: textToPost });
    console.log("Tweet published!", tweetResult.data.id);

    if (replyToPost) {
      console.log("Posting reply...");
      const replyResult = await rwClient.v2.tweet({
        text: replyToPost,
        reply: { in_reply_to_tweet_id: tweetResult.data.id }
      });
      console.log("Reply published!", replyResult.data.id);
    }
    
    // Log to published history
    const historyPath = path.resolve(__dirname, '../../../campaign/x-campaign-history.json');
    let history = [];
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      if (!Array.isArray(history)) history = [];
    }
    history.push({
      date: istTime.toISOString(),
      campaign: 'x-campaign-sep20',
      tweet_id: tweetResult.data.id,
      text: textToPost,
      reply_text: replyToPost
    });
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  } catch (error) {
    console.error("Error posting to X:", error);
  }
}

runCampaignClock();
