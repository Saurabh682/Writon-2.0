#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDayContent } from './content-builder.js';
import { generateCardSvg, renderCardPng } from './render-card.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAMPAIGN_DIR = path.resolve(__dirname, '..');
const X_OUT_DIR = path.resolve(CAMPAIGN_DIR, 'x');

/**
 * Builds high-converting 2-tweet thread for X.com
 */
function buildXTweets(dayNumber, dayBundle) {
  const xPost = dayBundle.posts.find(p => p.platform === 'x') || dayBundle.posts[0];
  const { title, excerpt, author, lang } = dayBundle.themeData;

  // Tweet 1: Hook & Core Thought (Under 280 chars)
  let tweet1 = '';
  if (lang === 'hi') {
    tweet1 = `${title}\n\n“${excerpt}”\n\n#WritingCommunity #HindiLiterature #WritOn`;
  } else if (lang === 'bn') {
    tweet1 = `${title}\n\n“${excerpt}”\n\n#WritingCommunity #BanglaLiterature #WritOn`;
  } else {
    tweet1 = `${title}\n\n“${excerpt}”\n\n#WritingCommunity #AmWriting #IndieAuthors #WritOn`;
  }

  // Tweet 2: Action & Direct Download Link (Reply to Tweet 1)
  const tweet2 = `Read more original stories and write your own chapters in a distraction-free space with zero ads.\n\n📲 Download the WritOn app on Google Play:\n${xPost.linkUrl}`;

  return {
    deliveryId: xPost.deliveryId,
    linkUrl: xPost.linkUrl,
    tweet1,
    tweet2
  };
}

/**
 * Generates X (Twitter) package for a specific day
 */
export async function generateXPackage(dayNumber) {
  const dayBundle = buildDayContent(dayNumber);
  const targetDir = path.join(X_OUT_DIR, `day-${String(dayNumber).padStart(2, '0')}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const { deliveryId, linkUrl, tweet1, tweet2 } = buildXTweets(dayNumber, dayBundle);

  // Generate Square Image Card (1080x1080)
  const isDark = dayNumber % 2 === 0;
  const svg = generateCardSvg({
    theme: isDark ? 'dark' : 'light',
    aspect: 'square',
    tag: `DAY ${dayNumber} • WRITON`,
    headline: dayBundle.themeData.title,
    bodyText: dayBundle.themeData.excerpt,
    authorName: dayBundle.themeData.author,
    language: dayBundle.themeData.lang,
    footerCta: 'Read on WritOn • Ad-Free App'
  });

  const imagePath = path.join(targetDir, 'tweet-image.png');
  const tweetTextPath = path.join(targetDir, 'tweets.txt');

  await renderCardPng(svg, imagePath);

  const fullText = `=== TWEET 1 (Attach tweet-image.png) ===\n${tweet1}\n\n=== TWEET 2 (Post as Reply to Tweet 1) ===\n${tweet2}\n\n=== DIRECT PLAY STORE LINK ===\n${linkUrl}\n`;
  fs.writeFileSync(tweetTextPath, fullText, 'utf8');

  return {
    day: dayNumber,
    deliveryId,
    linkUrl,
    tweet1,
    tweet2,
    files: {
      image: imagePath,
      text: tweetTextPath
    }
  };
}

/**
 * CLI Main
 */
async function main() {
  const args = process.argv.slice(2);
  let day = 1;
  const dayIdx = args.indexOf('--day');
  if (dayIdx !== -1 && args[dayIdx + 1]) {
    day = parseInt(args[dayIdx + 1], 10);
  }

  const isAll = args.includes('--all') || (!args.includes('--day'));

  console.log(`\n===============================================================`);
  console.log(` 🐦 WritOn X (Twitter) Automation & Package Engine`);
  console.log(`===============================================================\n`);

  const daysToProcess = isAll ? [1, 2, 3, 4, 5, 6, 7] : [day];

  for (const d of daysToProcess) {
    console.log(`▶ Generating X Package for Day ${d}...`);
    const pkg = await generateXPackage(d);

    console.log(`   🖼️ Image Card:  ${pkg.files.image}`);
    console.log(`   📄 Tweet File:  ${pkg.files.text}`);
    console.log(`   🔗 Direct Link: ${pkg.linkUrl}`);
    console.log(`   📝 Tweet 1 Preview:\n${pkg.tweet1.slice(0, 100)}...\n`);
  }

  console.log(`✨ All Week 1 X.com tweet packages ready in: ${X_OUT_DIR}`);
}

main().catch(err => {
  console.error('❌ X Engine Error:', err);
  process.exit(1);
});
