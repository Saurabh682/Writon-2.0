import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const { postToInstagramCarousel, postToThreads, uploadLocalImageForMeta } = await import('../services/social-poster.js');
const { TwitterApi } = await import('twitter-api-v2');

const cardsDir = 'd:/VibeCode/WritOn-PowerUp/campaign/day5-assets';
const historyFilePath = 'd:/VibeCode/WritOn-PowerUp/campaign/published-history.json';

async function publishAll() {
  console.log('================================================================');
  console.log('🚀 PUBLISHING DAY 5 AUTHOR SPOTLIGHT CAMPAIGN (ALL FORMATS)');
  console.log('   Platforms: Instagram Carousel, Instagram Story, X, Threads');
  console.log('================================================================\n');

  const slideFiles = [
    path.join(cardsDir, 'day5_spotlight_slide_1.png'),
    path.join(cardsDir, 'day5_spotlight_slide_2.png'),
    path.join(cardsDir, 'day5_spotlight_slide_3.png'),
    path.join(cardsDir, 'day5_spotlight_slide_4.png'),
    path.join(cardsDir, 'day5_spotlight_slide_5.png'),
  ];
  const storyFile = path.join(cardsDir, 'day5_spotlight_story.png');

  for (const f of [...slideFiles, storyFile]) {
    await fs.access(f);
    console.log(`✓ Verified asset: ${path.basename(f)}`);
  }

  const igCaption = `“Platform 8 smelled of wet jute, diesel exhaust, and cold mustard oil under the hum of fluorescent lights.” 📖✨

In an era of 15-second video frenzy, what happened to deliberate, captivating storytelling?

Today’s Author Spotlight features Devansh Roy (@devansh_roy) and his noir short story:
✦ “The Last Train from Howrah Station at 2:15 AM”

WritOn is built as a sanctuary for writers and readers:
• Stories delivered in distraction-free 3-minute swipeable card decks
• Clean serif typography with zero advertisements
• Unfiltered, 100% organic reach for early writers
• Offline reading and drafting with instant sync

Over 500+ original stories, poetry decks, and reflective essays are already live across English, Hindi, Bengali, and Marathi.

📲 Read original stories & claim your signature pen name on Google Play:
https://writon.cc/go/2609_d05_ig_carousel_en_author_spotlight

#writon #writingcommunity #writersoftwitter #writersofig #amwriting #authorlife #storytelling #books #indieauthors #readingcommunity #microfiction #creativewriting`;

  const results = {
    day: 5,
    theme: 'Author Spotlight: Devansh Roy',
    timestamp: new Date().toISOString(),
    shortlink: 'https://writon.cc/go/2609_d05_ig_carousel_en_author_spotlight',
    instagram_carousel: null,
    instagram_story: null,
    x: null,
    threads: null,
  };

  // 1. Instagram Carousel
  console.log('\n📸 [1/4] Publishing Instagram Carousel (5 slides)...');
  try {
    const igRes = await postToInstagramCarousel({
      localImagePaths: slideFiles,
      caption: igCaption,
    });
    results.instagram_carousel = igRes;
    if (igRes.success) {
      console.log(`✅ Instagram Carousel Published! Post ID: ${igRes.publishedPostId}`);
    } else {
      console.log('⚠️ Instagram Carousel response:', igRes);
    }
  } catch (err) {
    console.error('❌ Instagram Carousel error:', err.message);
    results.instagram_carousel = { success: false, error: err.message };
  }

  // 2. Instagram Story
  console.log('\n📸 [2/4] Publishing Instagram Story (1080x1920)...');
  try {
    const storyUrl = await uploadLocalImageForMeta(storyFile);
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

    const containerRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: storyUrl,
        media_type: 'STORIES',
        access_token: token,
      }),
    });
    const containerData = await containerRes.json();
    if (containerData.id) {
      await new Promise(r => setTimeout(r, 4000));
      const pubRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: token,
        }),
      });
      const pubData = await pubRes.json();
      results.instagram_story = { success: pubRes.ok, storyId: pubData.id, containerId: containerData.id };
      console.log(`✅ Instagram Story Published! Story ID: ${pubData.id}`);
    } else {
      results.instagram_story = { success: false, error: containerData };
      console.log('⚠️ Story container error:', containerData);
    }
  } catch (err) {
    console.error('❌ Story error:', err.message);
    results.instagram_story = { success: false, error: err.message };
  }

  // 3. X (Twitter) with 4 Media Cards + Threaded Link
  console.log('\n🐦 [3/4] Publishing to X (@WritOn_Social) with 4 Image Cards...');
  try {
    const twitterClient = new TwitterApi({
      appKey: process.env.X_API_KEY,
      appSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      accessSecret: process.env.X_ACCESS_SECRET,
    });
    const rw = twitterClient.readWrite;

    console.log('  • Uploading 4 image cards to X...');
    const mediaIds = [];
    for (const card of slideFiles.slice(0, 4)) {
      const mid = await rw.v1.uploadMedia(card);
      mediaIds.push(mid);
    }

    const xRootText = `“Platform 8 smelled of wet jute, diesel exhaust, and cold mustard oil under the hum of fluorescent lights.” 📖

Today’s Author Spotlight: Devansh Roy and his noir short fiction “The Last Train from Howrah Station at 2:15 AM”.

Swipe through the deck below 🧵👇

#writon #writingcommunity #amwriting #storytelling #books`;

    const rootTweet = await rw.v2.tweet({
      text: xRootText,
      media: { media_ids: mediaIds },
    });
    console.log(`✅ Root Tweet Published! ID: ${rootTweet.data.id}`);

    const replyTweet = await rw.v2.reply(
      `📲 Read Devansh’s complete story and claim your 1-word pen name on Google Play:\nhttps://writon.cc/go/2609_d05_x_post_en_author_spotlight`,
      rootTweet.data.id
    );
    console.log(`✅ Threaded Reply Attached! ID: ${replyTweet.data.id}`);

    results.x = {
      success: true,
      postId: rootTweet.data.id,
      replyId: replyTweet.data.id,
      permalink: `https://x.com/WritOn_Social/status/${rootTweet.data.id}`,
    };
  } catch (err) {
    console.error('❌ X error:', err.message);
    results.x = { success: false, error: err.message };
  }

  // 4. Threads Post
  console.log('\n🧵 [4/4] Publishing to Threads (@writon_socialapp)...');
  try {
    const threadsText = `“Platform 8 smelled of wet jute, diesel exhaust, and cold mustard oil under the hum of fluorescent lights.” 📖

Today’s WritOn Author Spotlight: Devansh Roy (@devansh_roy) and his noir story “The Last Train from Howrah Station at 2:15 AM”.

WritOn gives long-form fiction, poetry, and reflective essays the quiet sanctuary they deserve. No video noise. No ads. Just pure craft.

📲 Read original stories on Google Play:
https://writon.cc/go/2609_d05_threads_post_en_author_spotlight

#writon #writingcommunity #creators #books #storytelling`;

    const threadsRes = await postToThreads({
      text: threadsText,
      localImagePaths: [slideFiles[0]],
    });
    results.threads = threadsRes;
    if (threadsRes.success) {
      console.log(`✅ Threads Published! ID: ${threadsRes.postId}`);
    } else {
      console.log('⚠️ Threads response:', threadsRes);
    }
  } catch (err) {
    console.error('❌ Threads error:', err.message);
    results.threads = { success: false, error: err.message };
  }

  // Update published-history.json
  try {
    let history = { publishedDays: {} };
    try {
      const raw = await fs.readFile(historyFilePath, 'utf-8');
      history = JSON.parse(raw);
    } catch (_) {}

    history.publishedDays['5'] = results;
    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf-8');
    console.log('\n📝 Updated campaign/published-history.json with Day 5 records.');
  } catch (err) {
    console.error('Failed to update published-history.json:', err.message);
  }

  console.log('\n================================================================');
  console.log('🎉 DAY 5 AUTHOR SPOTLIGHT PUBLISHING COMPLETE (ALL FORMATS)');
  console.log('================================================================');
}

publishAll().catch(console.error);
