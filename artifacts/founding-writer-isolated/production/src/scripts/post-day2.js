import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDay2Carousel } from '../services/social-card-generator.js';
import { getDailyCampaignPayload } from '../services/campaign-dispatcher.js';
import { postToInstagramCarousel, postToX, postToThreads } from '../services/social-poster.js';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const renderedAssetsDir = path.resolve(__dirname, '../../../campaign/fomo-ground-floor/rendered-assets');
const historyFilePath = path.resolve(__dirname, '../../../campaign/published-history.json');

async function runDay2Publish() {
  console.log('=====================================================');
  console.log('🚀 PUBLISHING DAY 2 CAROUSEL TO ALL THREE PLATFORMS');
  console.log('   (Instagram, X / Twitter, Threads)');
  console.log('=====================================================\n');

  // Step 1: Render Day 2 SVG -> PNG slides
  console.log('🎨 Step 1: Rendering Day 2 Obsidian Visual Slide Cards...');
  const slideFiles = await renderDay2Carousel(renderedAssetsDir);
  console.log(`✅ Successfully rendered ${slideFiles.length} slide cards:`);
  slideFiles.forEach((f, idx) => console.log(`   • Slide ${idx + 1}: ${path.basename(f)}`));

  // Step 2: Get formatted Day 2 payload
  const payload = await getDailyCampaignPayload(2, 'https://writon.cc');
  console.log('\n📝 Step 2: Formatted Caption & Shortlink:');
  console.log(`   Shortlink: ${payload.shortlink}`);

  const results = {
    day: 2,
    theme: payload.theme,
    shortlink: payload.shortlink,
    timestamp: new Date().toISOString(),
    instagram: { status: 'pending' },
    x: { status: 'pending' },
    threads: { status: 'pending' },
  };

  // Step 3: Publish to Instagram Carousel (5 slides)
  console.log('\n📸 Step 3: Publishing 5-Slide Carousel to Instagram (@writon_socialapp)...');
  try {
    const igResult = await postToInstagramCarousel({
      localImagePaths: slideFiles,
      caption: payload.captions.en,
    });
    results.instagram = igResult;
    if (igResult.success) {
      console.log(`🎉 INSTAGRAM SUCCESS! Post ID: ${igResult.publishedPostId}`);
    } else {
      console.log('⚠️ Instagram result:', igResult);
    }
  } catch (err) {
    console.log('❌ Instagram error:', err.message);
    results.instagram = { success: false, error: err.message };
  }

  // Step 4: Publish to X (Twitter) with 4 attached slide cards
  console.log('\n🐦 Step 4: Publishing to X (@WritOn_Social) with 4 Image Cards...');
  try {
    const xText = `The graveyard of great writing isn't rejection letters. It's the Notes app on your phone.\n\nYou wrote something at 2:00 AM. Where do you post it?\n\nWritOn is built as a sanctuary for prose, poetry, and thoughtful essays.\n\nTake that note out of the dark:\n${payload.shortlink}`;
    const xResult = await postToX({
      text: xText,
      localImagePaths: slideFiles.slice(0, 4),
    });
    results.x = xResult;
    if (xResult.success) {
      console.log(`🎉 X (TWITTER) SUCCESS! Post ID: ${xResult.postId}`);
      console.log(`   Link: https://x.com/WritOn_Social/status/${xResult.postId}`);
    } else {
      console.log('⚠️ X result:', xResult);
    }
  } catch (err) {
    console.log('❌ X error:', err.message);
    results.x = { success: false, error: err.message };
  }

  // Step 5: Publish to Threads with carousel
  console.log('\n🧵 Step 5: Publishing 5-Slide Carousel to Threads (writon_socialapp)...');
  try {
    const threadsResult = await postToThreads({
      text: payload.captions.en,
      localImagePaths: slideFiles,
    });
    results.threads = threadsResult;
    if (threadsResult.success) {
      console.log(`🎉 THREADS SUCCESS! Post ID: ${threadsResult.postId}`);
    } else {
      console.log('⚠️ Threads result:', threadsResult);
    }
  } catch (err) {
    console.log('❌ Threads error:', err.message);
    results.threads = { success: false, error: err.message };
  }

  // Step 6: Update published history
  try {
    const raw = await fs.readFile(historyFilePath, 'utf8');
    const history = JSON.parse(raw);
    history.publishedDays['2'] = results;
    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    console.log('\n🔒 Step 6: Published history updated with Day 2 details.');
  } catch (err) {
    console.log('Could not update published history file:', err.message);
  }

  console.log('\n=====================================================');
  console.log('🏁 DAY 2 PUBLISHING CYCLE COMPLETED');
  console.log('=====================================================');
}

runDay2Publish();
