/**
 * publish_sept27_instagram_carousel.mjs
 * 
 * Alpha - Instagram Bot Dispatch for 27 Sep 2026:
 * Feed Carousel: "New writers often carry beliefs that slow their momentum..."
 * 7 Dedicated Slides (1080x1350)
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { InstagramClient } from '../server/src/services/instagram-client.js';
import { uploadLocalImageForMeta } from '../server/src/services/social-poster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const historyFilePath = path.resolve(__dirname, '../campaign/published-history.json');

const SLIDE_PATHS = [
  path.resolve(__dirname, '../campaign/instagram-newwriters-20260927/assets/slide_1.png'),
  path.resolve(__dirname, '../campaign/instagram-newwriters-20260927/assets/slide_2.png'),
  path.resolve(__dirname, '../campaign/instagram-newwriters-20260927/assets/slide_3.png'),
  path.resolve(__dirname, '../campaign/instagram-newwriters-20260927/assets/slide_4.png'),
  path.resolve(__dirname, '../campaign/instagram-newwriters-20260927/assets/slide_5.png'),
  path.resolve(__dirname, '../campaign/instagram-newwriters-20260927/assets/slide_6.png'),
  path.resolve(__dirname, '../campaign/instagram-newwriters-20260927/assets/slide_7.png'),
];

const CAPTION = `New writers often carry beliefs that slow their momentum. Here are five you may outgrow — and what to try instead.

1. Draft to discover, revise to clarify.
2. Let precise words do the work.
3. Show the detail; trust the reader.
4. Begin where the change starts.
5. Keep only what serves the piece.

Save this for revision day.

#writon #writingcraft #writerslife #writingtips #creativewriting`;

async function recordHistory(postData) {
  try {
    let history = {};
    try {
      const raw = await fs.readFile(historyFilePath, 'utf8');
      history = JSON.parse(raw);
    } catch (_e) {}

    if (!history.carousels) history.carousels = {};
    history.carousels[postData.id] = postData;

    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    console.log(`[Alpha - Instagram Bot] Recorded ${postData.id} to published-history.json`);
  } catch (err) {
    console.warn(`[Alpha - Instagram Bot] Could not update history: ${err.message}`);
  }
}

async function main() {
  console.log('================================================================');
  console.log('🤖 Alpha - Instagram Bot: Feed Carousel Dispatch');
  console.log('   Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  // Verify slide assets exist
  console.log('[Step 1/5] Verifying 7 slide assets...');
  for (let i = 0; i < SLIDE_PATHS.length; i++) {
    const p = SLIDE_PATHS[i];
    await fs.access(p);
    console.log(`  ✓ Slide ${i + 1}: ${path.basename(p)}`);
  }

  // Initialize client
  console.log('\n[Step 2/5] Initializing Instagram client and verifying quota...');
  const client = new InstagramClient({ log: console });
  if (!client.isConfigured()) {
    throw new Error('Missing Instagram credentials in server/.env');
  }

  const quota = await client.getPublishingQuota();
  console.log('  Quota usage:', quota);
  if (quota.quotaUsage !== null && quota.quotaUsage >= quota.quotaTotal) {
    throw new Error(`Instagram publishing quota exhausted: ${quota.quotaUsage}/${quota.quotaTotal}`);
  }

  // Upload local images to public CDN
  console.log('\n[Step 3/5] Ingesting 7 slide assets for Meta Graph API...');
  const uploadedUrls = [];
  for (let i = 0; i < SLIDE_PATHS.length; i++) {
    const localPath = SLIDE_PATHS[i];
    console.log(`  Uploading slide ${i + 1}/${SLIDE_PATHS.length} (${path.basename(localPath)})...`);
    const publicUrl = await uploadLocalImageForMeta(localPath);
    console.log(`    → ${publicUrl}`);
    uploadedUrls.push(publicUrl);
  }

  // Create child containers
  console.log('\n[Step 4/5] Creating and polling carousel child containers...');
  const childIds = [];
  for (let i = 0; i < uploadedUrls.length; i++) {
    const imageUrl = uploadedUrls[i];
    console.log(`  Creating child container ${i + 1}/${uploadedUrls.length}...`);
    const childContainerId = await client.createContainer({
      imageUrl,
      isCarouselItem: true,
    });
    console.log(`    Container ID: ${childContainerId}. Polling status...`);
    
    const pollResult = await client.pollContainerStatus(childContainerId, {
      maxAttempts: 15,
      intervalMs: 2000,
    });
    if (pollResult.status !== 'FINISHED') {
      throw new Error(`Child container ${childContainerId} did not finish: ${JSON.stringify(pollResult)}`);
    }
    console.log(`    ✓ Status: FINISHED`);
    childIds.push(childContainerId);
  }

  // Create Parent Carousel Container
  console.log('\n[Step 5/5] Creating master carousel container & publishing live...');
  console.log(`  Linking ${childIds.length} child containers...`);
  const carouselContainerId = await client.createCarouselContainer({
    childContainerIds: childIds,
    caption: CAPTION,
  });
  console.log(`  Master Carousel Container ID: ${carouselContainerId}`);

  console.log('  Polling master carousel container status...');
  const carouselStatus = await client.pollContainerStatus(carouselContainerId, {
    maxAttempts: 20,
    intervalMs: 3000,
  });
  if (carouselStatus.status !== 'FINISHED') {
    throw new Error(`Master carousel container ${carouselContainerId} did not finish: ${JSON.stringify(carouselStatus)}`);
  }
  console.log('  ✓ Master Container Status: FINISHED');

  // Publish Container
  console.log(`  Publishing container ${carouselContainerId} to @writon_socialapp...`);
  const publishResult = await client.publishContainer(carouselContainerId);
  console.log('\n================================================================');
  console.log('🎉 PUBLICATION SUCCESSFUL!');
  console.log('================================================================');
  console.log(`• Platform Post ID: ${publishResult.igMediaId}`);
  console.log(`• Shortcode:        ${publishResult.shortcode || 'N/A'}`);
  console.log(`• Live URL:         ${publishResult.permalink}`);
  console.log('================================================================\n');

  // Record history
  const historyEntry = {
    id: 'carousel_20260927_newwriters',
    platform: 'instagram',
    surface: 'feed_carousel',
    igMediaId: publishResult.igMediaId,
    shortcode: publishResult.shortcode,
    permalink: publishResult.permalink,
    carouselContainerId,
    childContainerIds: childIds,
    slideCount: SLIDE_PATHS.length,
    publishedAt: new Date().toISOString(),
    title: 'New Writers: 5 Beliefs to Outgrow',
  };
  await recordHistory(historyEntry);

  return publishResult;
}

main().catch(err => {
  console.error('\n❌ PUBLISHING FAILED:', err.message);
  if (err.metaError) {
    console.error('Meta Error Details:', JSON.stringify(err.metaError, null, 2));
  }
  process.exit(1);
});
