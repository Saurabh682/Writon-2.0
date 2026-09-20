#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDayContent } from './content-builder.js';
import { generateCardSvg, renderCardPng } from './render-card.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from campaign/ or root if available
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      process.env[k.trim()] = v.join('=').trim();
    }
  }
}

/**
 * Calculates current campaign day from start date (Sept 1, 2026 by default)
 */
function calculateCampaignDay(startDateStr = '2026-09-01') {
  const start = new Date(startDateStr);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(30, diffDays));
}

/**
 * Main CLI Execution
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--publish')) {
    throw new Error('Live API publishing is disabled. Export assets, then use each platform\'s native scheduler.');
  }
  const isDryRun = args.includes('--dry-run') || !args.includes('--generate-assets');
  const isGenerateAssets = args.includes('--generate-assets');

  let day = 1;
  const dayIdx = args.indexOf('--day');
  if (dayIdx !== -1 && args[dayIdx + 1]) {
    day = parseInt(args[dayIdx + 1], 10);
  } else if (args.includes('--today')) {
    day = calculateCampaignDay();
  }

  console.log(`\n===============================================================`);
  console.log(` ✨ WritOn Social Growth Campaign Automation Runner`);
  console.log(` 📅 Target: Day ${day} / 30 | Mode: ${isGenerateAssets ? 'ASSET EXPORT' : 'DRY RUN PREVIEW'}`);
  console.log(`===============================================================\n`);

  const dayBundle = buildDayContent(day);
  const assetsDir = path.resolve(__dirname, `../assets/day-${String(day).padStart(2, '0')}`);

  console.log(`📖 Theme: "${dayBundle.themeData.title}" (${dayBundle.themeData.lang.toUpperCase()})`);
  console.log(`💬 Excerpt: "${dayBundle.themeData.excerpt}"\n`);

  // Generate visual cards
  let squarePngPath = path.join(assetsDir, `card-square.png`);
  let storyPngPath = path.join(assetsDir, `card-story.png`);

  if (isGenerateAssets || isDryRun) {
    console.log(`🎨 Generating branded visual cards into: ${assetsDir}`);
    
    // Square card (1080x1080) for Feed, Threads, X
    const squareSvg = generateCardSvg({
      theme: day % 2 === 0 ? 'dark' : 'light',
      aspect: 'square',
      tag: `DAY ${day} • STORY`,
      headline: dayBundle.themeData.title,
      bodyText: dayBundle.themeData.excerpt,
      authorName: dayBundle.themeData.author,
      language: dayBundle.themeData.lang
    });
    await renderCardPng(squareSvg, squarePngPath);

    // Vertical card (1080x1920) for Stories, Pins, Reels
    const storySvg = generateCardSvg({
      theme: 'dark',
      aspect: 'story',
      tag: `WRITON • DAY ${day}`,
      headline: dayBundle.themeData.title,
      bodyText: dayBundle.themeData.excerpt,
      authorName: dayBundle.themeData.author,
      language: dayBundle.themeData.lang
    });
    await renderCardPng(storySvg, storyPngPath);

    console.log(`   ✅ Square card created: ${squarePngPath}`);
    console.log(`   ✅ Story/Pin card created: ${storyPngPath}\n`);
  }

  // Iterate over scheduled posts for the day
  console.log(`📋 Scheduled Deliveries for Day ${day} (${dayBundle.posts.length} platforms):\n`);

  for (const post of dayBundle.posts) {
    const isVertical = post.platform === 'pin' || post.deliveryId.includes('story');
    const assignedImage = isVertical ? storyPngPath : squarePngPath;

    console.log(`---------------------------------------------------------------`);
    console.log(`📱 Platform: [${post.platform.toUpperCase()}] | Delivery ID: ${post.deliveryId}`);
    console.log(`🔗 Smart UTM Link: ${post.linkUrl}`);
    console.log(`🖼️ Attached Asset: ${path.basename(assignedImage)}`);
    console.log(`📝 Caption:\n${post.caption}\n`);

  }

  console.log(`---------------------------------------------------------------`);
  console.log(`🎉 Day ${day} processing complete!`);
  console.log(`💡 Upload approved assets through each platform's native scheduler only.\n`);
}

main().catch(err => {
  console.error('❌ Execution error:', err);
  process.exit(1);
});
