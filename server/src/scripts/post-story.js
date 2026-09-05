import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const BRAND_RED = '#E75A2A';
const OBSIDIAN_BG = '#111213';
const CARD_BG = '#1A1C1E';
const BORDER_COLOR = '#2A2C2E';
const TEXT_PRIMARY = '#EDE8DF';
const TEXT_MUTED = '#9A958D';

export function renderStorySvg() {
  return `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="storyGlow" cx="50%" cy="32%" r="65%">
      <stop offset="0%" stop-color="#2C1A14" stop-opacity="1"/>
      <stop offset="60%" stop-color="#141517" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0E0F10" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#202225"/>
      <stop offset="100%" stop-color="#141517"/>
    </linearGradient>
    <linearGradient id="buttonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E75A2A"/>
      <stop offset="100%" stop-color="#FF7A45"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1920" fill="url(#storyGlow)"/>

  <!-- Border outline safe frame -->
  <rect x="50" y="90" width="980" height="1740" rx="40" fill="none" stroke="${BORDER_COLOR}" stroke-width="2" opacity="0.6"/>

  <!-- Safe Zone Header: Brand & Live Tag -->
  <g transform="translate(100, 150)">
    <rect x="0" y="0" width="220" height="52" rx="26" fill="${BRAND_RED}" fill-opacity="0.2"/>
    <circle cx="28" cy="26" r="7" fill="${BRAND_RED}"/>
    <text x="50" y="33" fill="${BRAND_RED}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" letter-spacing="1.5">WRITON • LIVE</text>
    <text x="880" y="35" fill="${TEXT_PRIMARY}" font-family="Georgia, serif" font-size="28" font-weight="700" text-anchor="end">WritOn.</text>
  </g>

  <!-- Giant Quotation Mark Accent -->
  <text x="100" y="390" fill="${BRAND_RED}" font-family="Georgia, serif" font-size="190" font-weight="900" opacity="0.3">“</text>

  <!-- Headline: FOMO Hook -->
  <g transform="translate(100, 430)">
    <text font-family="'Noto Sans Devanagari', Georgia, serif" font-size="76" font-weight="800" fill="${TEXT_PRIMARY}" letter-spacing="-1">
      <tspan x="0" y="0">In 2 years,</tspan>
      <tspan x="0" y="95">you’ll wish you</tspan>
      <tspan x="0" y="190" fill="${BRAND_RED}">started writing</tspan>
      <tspan x="0" y="285" fill="${BRAND_RED}">here today.</tspan>
    </text>
  </g>

  <!-- Subtitle Quote -->
  <text x="100" y="800" fill="${TEXT_MUTED}" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="400">
    Every iconic writing platform had a 90-day golden window.
  </text>

  <!-- Comparison Timeline Card -->
  <g transform="translate(100, 860)">
    <rect x="0" y="0" width="880" height="420" rx="32" fill="url(#cardGrad)" stroke="${BORDER_COLOR}" stroke-width="2"/>
    
    <text x="50" y="60" fill="${TEXT_PRIMARY}" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700">The Early Adopter Shift:</text>
    
    <!-- Item 1 -->
    <circle cx="70" cy="120" r="10" fill="#666"/>
    <text x="100" y="128" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="24">Twitter in 2008 • Substack in 2019 • Medium in 2013</text>

    <line x1="70" y1="130" x2="70" y2="180" stroke="#333" stroke-width="2" stroke-dasharray="4 4"/>

    <!-- Item 2 -->
    <circle cx="70" cy="190" r="10" fill="${BRAND_RED}"/>
    <text x="100" y="198" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="25" font-weight="700">WritOn in 2026: The Distraction-Free Sanctuary</text>
    
    <!-- Checklist items -->
    <g transform="translate(50, 230)">
      <rect x="0" y="0" width="780" height="60" rx="16" fill="#1B1C1E"/>
      <text x="30" y="38" fill="#4EBA6F" font-size="24" font-weight="bold">✓</text>
      <text x="70" y="38" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">Clean 1-word pen names are available right now</text>

      <rect x="0" y="75" width="780" height="60" rx="16" fill="#1B1C1E"/>
      <text x="30" y="113" fill="#4EBA6F" font-size="24" font-weight="bold">✓</text>
      <text x="70" y="113" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">100% organic deck reach — zero video noise</text>
    </g>
  </g>

  <!-- Interactive Story Sticker Anchor -->
  <g transform="translate(100, 1340)">
    <rect x="0" y="0" width="880" height="270" rx="32" fill="#1B1714" stroke="${BRAND_RED}" stroke-width="2"/>
    
    <text x="440" y="60" fill="${BRAND_RED}" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" letter-spacing="2" text-anchor="middle">EXCLUSIVE FOUNDING ACCESS</text>
    
    <!-- CTA Button Mockup inside Story -->
    <rect x="60" y="90" width="760" height="100" rx="50" fill="url(#buttonGrad)"/>
    <text x="440" y="152" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="800" text-anchor="middle" letter-spacing="0.5">TAP TO CLAIM YOUR PEN NAME ➔</text>
    
    <text x="440" y="235" fill="${TEXT_MUTED}" font-family="system-ui, -apple-system, sans-serif" font-size="22" text-anchor="middle">Available on Google Play • Free &amp; Ad-Free</text>
  </g>

  <!-- Safe Zone Bottom Footer -->
  <text x="540" y="1710" fill="${TEXT_MUTED}" font-family="system-ui, -apple-system, sans-serif" font-size="22" text-anchor="middle" letter-spacing="1">
    writon.cc/go/2609_d04_ig_carousel_en_fomo
  </text>
</svg>`;
}

async function main() {
  console.log('🎨 Generating 1080x1920 vertical Story card...');
  const svg = renderStorySvg();
  const storyCardPath = path.resolve(__dirname, 'day4_fomo_story_card.png');
  await sharp(Buffer.from(svg)).png().toFile(storyCardPath);
  console.log(`✅ Saved Story card to: ${storyCardPath}`);

  const { uploadLocalImageForMeta } = await import('../services/social-poster.js');
  console.log('📤 Uploading image for Meta Graph API...');
  const imageUrl = await uploadLocalImageForMeta(storyCardPath);
  console.log(`✅ Image hosted at: ${imageUrl}`);

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  console.log(`📸 Creating Instagram Story media container on account ${accountId}...`);
  const containerRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      media_type: 'STORIES',
      access_token: token,
    }),
  });

  const containerData = await containerRes.json();
  console.log('Container response:', containerData);

  if (!containerData.id) {
    throw new Error(`Failed to create Story container: ${JSON.stringify(containerData)}`);
  }

  console.log('⏳ Waiting 4s for Meta container transcoding...');
  await new Promise(r => setTimeout(r, 4000));

  console.log(`🚀 Publishing Story container ${containerData.id}...`);
  const publishRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerData.id,
      access_token: token,
    }),
  });

  const publishData = await publishRes.json();
  console.log('Publish response:', publishData);

  if (publishData.id) {
    console.log(`🎉 INSTAGRAM STORY PUBLISHED SUCCESSFULLY! Story ID: ${publishData.id}`);
  } else {
    console.error('Failed to publish story:', publishData);
  }
}

main().catch(console.error);
