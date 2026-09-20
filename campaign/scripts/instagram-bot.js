#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDayContent, THEME_CORPUS } from './content-builder.js';
import { generateCardSvg, renderCardPng, PALETTE } from './render-card.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAMPAIGN_DIR = path.resolve(__dirname, '..');
const INSTAGRAM_OUT_DIR = path.resolve(CAMPAIGN_DIR, 'instagram');

/**
 * Creates multi-slide Instagram Carousel SVG slides
 */
function generateCarouselSlides({ day, themeData }) {
  const isDark = day % 2 === 0;

  // Slide 1: Hook / Cover Slide
  const slide1Svg = generateCardSvg({
    theme: isDark ? 'dark' : 'light',
    aspect: 'square',
    tag: `WRITON • DAY ${day}`,
    headline: themeData.title,
    bodyText: themeData.excerpt,
    authorName: themeData.author,
    language: themeData.lang,
    footerCta: 'Swipe to Read →'
  });

  // Slide 2: In-Depth Excerpt / Literary Reflection
  const reflectionText = themeData.lang === 'hi'
    ? 'एक शांत कोना जहाँ शब्द सांस लेते हैं। कोई पॉपअप नहीं, कोई विज्ञापन नहीं। सिर्फ शुद्ध साहित्य।'
    : 'A sanctuary built for readers who cherish the craft of storytelling. Free of intrusive ads and distraction.';

  const slide2Svg = generateCardSvg({
    theme: isDark ? 'light' : 'dark',
    aspect: 'square',
    tag: 'WRITON SANCTUARY',
    headline: 'Distraction-Free Reading',
    bodyText: reflectionText,
    authorName: 'WritOn Community',
    language: themeData.lang,
    footerCta: 'Discover on WritOn • Ad-Free'
  });

  // Slide 3: Call-To-Action Slide
  const ctaHeadline = themeData.lang === 'hi' ? 'आज ही पढ़ना शुरू करें' : 'Start Reading Today';
  const ctaBody = themeData.lang === 'hi'
    ? 'गूगल प्ले से रिटॉन (WritOn) ऐप डाउनलोड करें। अपनी पसंदीदा कहानियों को सहेजें और ऑफलाइन पढ़ें।'
    : 'Download the WritOn app on Google Play. Discover thousands of stories and write your own chapters in peace.';

  const slide3Svg = generateCardSvg({
    theme: isDark ? 'dark' : 'light',
    aspect: 'square',
    tag: 'GET THE APP',
    headline: ctaHeadline,
    bodyText: ctaBody,
    authorName: 'writon.cc',
    language: themeData.lang,
    footerCta: 'Link in Bio • Google Play'
  });

  // Companion Story Slide (9:16 Vertical)
  const storySvg = generateCardSvg({
    theme: 'dark',
    aspect: 'story',
    tag: `DAY ${day} STORY`,
    headline: themeData.title,
    bodyText: themeData.excerpt,
    authorName: themeData.author,
    language: themeData.lang,
    footerCta: 'Tap Link Sticker to Read'
  });

  return {
    slide1Svg,
    slide2Svg,
    slide3Svg,
    storySvg
  };
}

/**
 * Builds and renders the full Instagram package for a specific day
 */
export async function generateInstagramPackage(dayNumber) {
  const dayBundle = buildDayContent(dayNumber);
  const igPost = dayBundle.posts.find(p => p.platform === 'ig') || dayBundle.posts[0];
  const igStory = dayBundle.posts.find(p => p.platform === 'ig_story') || igPost;

  const targetDir = path.join(INSTAGRAM_OUT_DIR, `day-${String(dayNumber).padStart(2, '0')}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const { slide1Svg, slide2Svg, slide3Svg, storySvg } = generateCarouselSlides({
    day: dayNumber,
    themeData: dayBundle.themeData
  });

  const slide1Path = path.join(targetDir, 'feed-slide-1.png');
  const slide2Path = path.join(targetDir, 'feed-slide-2.png');
  const slide3Path = path.join(targetDir, 'feed-slide-3.png');
  const storyPath = path.join(targetDir, 'story-vertical.png');
  const captionPath = path.join(targetDir, 'caption.txt');

  await renderCardPng(slide1Svg, slide1Path);
  await renderCardPng(slide2Svg, slide2Path);
  await renderCardPng(slide3Svg, slide3Path);
  await renderCardPng(storySvg, storyPath);

  const formattedCaption = `${igPost.caption}\n\n📲 Story Link Sticker URL:\n${igStory.linkUrl}`;
  fs.writeFileSync(captionPath, formattedCaption, 'utf8');

  return {
    day: dayNumber,
    theme: dayBundle.themeData.title,
    feedPostDeliveryId: igPost.deliveryId,
    feedPostLinkUrl: igPost.linkUrl,
    storyDeliveryId: igStory.deliveryId,
    storyLinkUrl: igStory.linkUrl,
    caption: formattedCaption,
    files: {
      slide1: slide1Path,
      slide2: slide2Path,
      slide3: slide3Path,
      story: storyPath,
      captionTxt: captionPath
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

  const isAll = args.includes('--all');
  if (args.includes('--publish')) {
    throw new Error('Live API publishing is disabled. Use Meta Business Suite or Instagram\'s native scheduler.');
  }

  console.log(`\n===============================================================`);
  console.log(` 📸 WritOn Instagram Automation & Asset Engine`);
  console.log(`===============================================================\n`);

  const daysToProcess = isAll ? Array.from({ length: 30 }, (_, i) => i + 1) : [day];

  for (const d of daysToProcess) {
    console.log(`▶ Generating Instagram Package for Day ${d}...`);
    const pkg = await generateInstagramPackage(d);

    console.log(`   🎨 Carousel Slide 1: ${pkg.files.slide1}`);
    console.log(`   🎨 Carousel Slide 2: ${pkg.files.slide2}`);
    console.log(`   🎨 Carousel Slide 3: ${pkg.files.slide3}`);
    console.log(`   📱 Story (9:16):     ${pkg.files.story}`);
    console.log(`   📄 Caption File:     ${pkg.files.captionTxt}`);
    console.log(`   🔗 Feed UTM Link:    ${pkg.feedPostLinkUrl}`);
    console.log(`   🔗 Story UTM Link:   ${pkg.storyLinkUrl}\n`);

  }

  console.log(`✨ All requested Instagram assets generated into: ${INSTAGRAM_OUT_DIR}`);
  console.log(`\n💡 How to use right now:`);
  console.log(`1. Open Meta Business Suite (https://business.facebook.com) or Instagram App.`);
  console.log(`2. Upload the 3 square slides as a Carousel or the vertical image as a Story.`);
  console.log(`3. Copy the caption from caption.txt and paste!`);
  console.log(`4. In the Story, add a 'Link' sticker with URL: https://writon.cc/go/${dayBundleOrSample(day)}`);
}

function dayBundleOrSample(d) {
  return `2609_d${String(d).padStart(2, '0')}_ig_story_story_...`;
}

main().catch(err => {
  console.error('❌ Instagram Automation Error:', err);
  process.exit(1);
});
