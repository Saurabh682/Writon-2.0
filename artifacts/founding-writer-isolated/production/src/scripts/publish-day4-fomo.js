import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { postToInstagramCarousel, postToX, postToThreads, postToTelegram } = await import('../services/social-poster.js');

const cardsDir = 'C:/Users/Kumar/.gemini/antigravity/brain/4688c67b-8b46-4ec9-b19a-e1fea52e9fa9/social-cards';
const historyFilePath = path.resolve(__dirname, '../../../campaign/published-history.json');

async function runPublish() {
  console.log('================================================================');
  console.log('🚀 PUBLISHING DAY 4 FOMO CAMPAIGN: "THE GOLDEN WINDOW"');
  console.log('   Platforms: Instagram, X / Twitter, Threads, Telegram');
  console.log('================================================================\n');

  const slideFiles = [
    path.join(cardsDir, 'day4_fomo_slide_1.png'),
    path.join(cardsDir, 'day4_fomo_slide_2.png'),
    path.join(cardsDir, 'day4_fomo_slide_3.png'),
    path.join(cardsDir, 'day4_fomo_slide_4.png'),
    path.join(cardsDir, 'day4_fomo_slide_5.png'),
  ];

  for (const file of slideFiles) {
    await fs.access(file);
    console.log(`✓ Verified slide exists: ${path.basename(file)}`);
  }

  const igCaption = `In 2 years, you’ll wish you started writing here today. ⏳📖

Every major literary and creative platform had that golden 3-month window before algorithmic noise set in:
• Twitter in 2008
• Medium in 2013
• Substack in 2019

Right now, clean 1-word pen names are being claimed on WritOn on Google Play. If you wait 6 months, you’ll be settling for @writer_8492.

More importantly: your prose shouldn't have to compete with 15-second video loops for attention. WritOn delivers your stories directly to genuine readers in distraction-free 3-minute swipeable card decks.

📲 Claim your signature pen name and publish your first deck on Google Play:
https://writon.cc/go/2609_d04_ig_carousel_en_fomo

#writon #writingcommunity #writersoftwitter #writersofig #amwriting #authorlife #storytelling #poetry #readingcommunity #books #microfiction #creativewriting`;

  const xText = `In 2 years, you’ll wish you claimed your pen name here today. ⏳

Every platform had a golden window before algorithmic noise set in:
• Twitter (2008)
• Substack (2019)

Right now on WritOn, early writers get 100% organic deck distribution. No video noise. Just pure craft. 🧵👇

📲 Claim your 1-word pen name on Google Play:
https://writon.cc/go/2609_d04_x_post_en_fomo

#writon #writingcommunity #amwriting #storytelling #books`;

  const threadsText = `In 2 years, you'll wish you started writing here today. ⏳

Stop feeding 1,000-word essays to video algorithms engineered for meme attention. WritOn is built for readers: distraction-free card decks, serif typography, and 100% organic reach for early writers.

Claim your signature pen name on Google Play:
https://writon.cc/go/2609_d04_threads_post_en_fomo

#writon #writingcommunity #creators #writerslife`;

  const results = {
    day: 4,
    theme: "The Golden Window (FOMO Edition)",
    timestamp: new Date().toISOString(),
    shortlink: "https://writon.cc/go/2609_d04_ig_carousel_en_fomo",
    instagram: null,
    x: null,
    threads: null,
    telegram: null,
  };

  // 1. Instagram Carousel
  console.log('\n📸 [1/4] Publishing to Instagram (@writon_socialapp)...');
  try {
    const igRes = await postToInstagramCarousel({
      localImagePaths: slideFiles,
      caption: igCaption,
    });
    results.instagram = igRes;
    if (igRes.success) {
      console.log(`✅ Instagram Success! ID: ${igRes.publishedPostId}`);
      if (igRes.permalink) console.log(`   Link: ${igRes.permalink}`);
    } else {
      console.log('⚠️ Instagram result:', igRes);
    }
  } catch (err) {
    console.error('❌ Instagram error:', err.message);
    results.instagram = { success: false, error: err.message };
  }

  // 2. X (Twitter) Multi-Card Post
  console.log('\n🐦 [2/4] Publishing to X (@WritOn_Social)...');
  try {
    const xRes = await postToX({
      text: xText,
      localImagePaths: slideFiles.slice(0, 4), // Twitter allows up to 4 images
    });
    results.x = xRes;
    if (xRes.success) {
      console.log(`✅ X Success! ID: ${xRes.postId}`);
      console.log(`   Link: https://x.com/WritOn_Social/status/${xRes.postId}`);
    } else {
      console.log('⚠️ X result:', xRes);
    }
  } catch (err) {
    console.error('❌ X error:', err.message);
    results.x = { success: false, error: err.message };
  }

  // 3. Threads
  console.log('\n🧵 [3/4] Publishing to Threads (@writon_socialapp)...');
  try {
    const threadsRes = await postToThreads({
      text: threadsText,
      localImagePaths: slideFiles,
    });
    results.threads = threadsRes;
    if (threadsRes.success) {
      console.log(`✅ Threads Success! ID: ${threadsRes.postId}`);
    } else {
      console.log('⚠️ Threads result:', threadsRes);
    }
  } catch (err) {
    console.error('❌ Threads error:', err.message);
    results.threads = { success: false, error: err.message };
  }

  // 4. Telegram Channel
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    console.log('\n✈️ [4/4] Broadcasting to Telegram Channel...');
    try {
      const tgRes = await postToTelegram({
        caption: `⏳ <b>In 2 Years, You'll Wish You Started Writing Here</b>\n\n${igCaption}`,
        imageUrl: null,
      });
      results.telegram = tgRes;
      console.log(`✅ Telegram Success: ${tgRes.success}`);
    } catch (err) {
      console.error('⚠️ Telegram error:', err.message);
    }
  }

  // Record to history
  try {
    let history = { publishedDays: {} };
    try {
      const raw = await fs.readFile(historyFilePath, 'utf-8');
      history = JSON.parse(raw);
    } catch (_) {}

    history.publishedDays['4'] = results;
    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf-8');
    console.log('\n📝 Updated campaign/published-history.json with Day 4 records.');
  } catch (err) {
    console.error('Failed to update published-history.json:', err.message);
  }

  console.log('\n================================================================');
  console.log('🎉 DAY 4 FOMO PUBLISHING COMPLETE');
  console.log('================================================================');
}

runPublish().catch(console.error);
