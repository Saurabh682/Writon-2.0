import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Builds the SVG string for the official WritOn YouTube Banner.
 * Canvas: 2560 x 1440 (Standard YouTube TV/Desktop Canvas)
 * Desktop/Tablet/Mobile Safe Area: Centered horizontally & vertically
 *   Y Range: 508 to 932 (Height: 424px)
 *   Safe Width for Mobile & All Devices: 1546px wide (X: 507 to 2053)
 */
function buildBannerSvg() {
  const width = 2560;
  const height = 1440;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Parchment subtle fibrous texture simulation -->
    <linearGradient id="parchmentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FAF5EE"/>
      <stop offset="50%" stop-color="#F7F1E6"/>
      <stop offset="100%" stop-color="#F3ECE0"/>
    </linearGradient>

    <!-- Terracotta watercolor blooms -->
    <radialGradient id="bloomLeft" cx="15%" cy="35%" r="45%">
      <stop offset="0%" stop-color="#E75A2A" stop-opacity="0.22"/>
      <stop offset="45%" stop-color="#D45226" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#FAF5EE" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="bloomRight" cx="85%" cy="65%" r="40%">
      <stop offset="0%" stop-color="#E75A2A" stop-opacity="0.18"/>
      <stop offset="50%" stop-color="#E8B08E" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#FAF5EE" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="goldBloom" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#C5A059" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#FAF5EE" stop-opacity="0"/>
    </radialGradient>

    <!-- Gaussian blur for organic watercolor bleeding -->
    <filter id="watercolorBleed" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="36"/>
    </filter>

    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
  </defs>

  <!-- Base Canvas Background: Warm Ivory Parchment -->
  <rect width="${width}" height="${height}" fill="url(#parchmentGrad)"/>

  <!-- Organic Watercolor Bloomed Shapes (Bleeding in corners & background) -->
  <ellipse cx="280" cy="380" rx="480" ry="420" fill="url(#bloomLeft)" filter="url(#watercolorBleed)"/>
  <ellipse cx="2280" cy="1060" rx="520" ry="440" fill="url(#bloomRight)" filter="url(#watercolorBleed)"/>
  <ellipse cx="2100" cy="400" rx="350" ry="320" fill="url(#bloomLeft)" filter="url(#watercolorBleed)"/>
  <ellipse cx="450" cy="1150" rx="400" ry="360" fill="url(#bloomRight)" filter="url(#watercolorBleed)"/>

  <!-- Subtle Vintage Grid / Guide Elements -->
  <rect x="180" y="180" width="2200" height="1080" fill="none" stroke="#E8DFD3" stroke-width="1.5" stroke-dasharray="6,6" opacity="0.4"/>

  <!-- Center Decorative Watermark: Faint Serif 'W' (Opacity ~8%) -->
  <text x="1280" y="810" font-family="'Newsreader', 'EB Garamond', Georgia, serif" font-size="440" font-weight="400" fill="#E8DFD3" opacity="0.32" text-anchor="middle" dominant-baseline="central">W</text>

  <!-- ========================================================== -->
  <!-- SAFE AREA: Y: 508 to 932 (Height: 424px), X: 507 to 2053    -->
  <!-- Visible across TV, Desktop, Tablet, and Mobile             -->
  <!-- ========================================================== -->

  <!-- Top Literary Label / Category Pill inside Safe Area (y ~ 575) -->
  <g transform="translate(1280, 580)">
    <rect x="-170" y="-22" width="340" height="44" rx="22" fill="#E75A2A" fill-opacity="0.10" stroke="#E75A2A" stroke-opacity="0.25" stroke-width="1.5"/>
    <text x="0" y="7" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" letter-spacing="3.5" fill="#D45226" text-anchor="middle">CALM READING &amp; WRITING</text>
  </g>

  <!-- Main Brand Title (y ~ 670) -->
  <text x="1280" y="675" font-family="'Newsreader', 'EB Garamond', Georgia, Cambria, 'Times New Roman', serif" font-size="82" font-weight="700" fill="#1C1A17" letter-spacing="-1.5" text-anchor="middle">
    WritOn<tspan fill="#E75A2A">.</tspan>
  </text>

  <!-- Elegant Flourish / Thin Literary Rule -->
  <g transform="translate(1280, 715)">
    <line x1="-180" y1="0" x2="-30" y2="0" stroke="#E75A2A" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <circle cx="0" cy="0" r="4" fill="#E75A2A" opacity="0.8"/>
    <line x1="30" y1="0" x2="180" y2="0" stroke="#E75A2A" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  </g>

  <!-- Mission Statement & Brand Value Prop (y ~ 765) -->
  <text x="1280" y="768" font-family="'Newsreader', 'EB Garamond', Georgia, serif" font-size="28" font-style="italic" fill="#5C554E" text-anchor="middle">
    A peaceful sanctuary for verified stories, literary craft, and offline contemplation.
  </text>

  <!-- Channel Cadence & Handle Base (y ~ 825) -->
  <g transform="translate(1280, 830)">
    <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#7C7267" letter-spacing="1" text-anchor="middle">
      DAILY CRAFT SHORTS • WRITING PROMPTS • @writon_app • writon.cc
    </text>
  </g>

  <!-- Left Botanical Motif (Delicate Wildflower Stems) in Safe Area -->
  <g transform="translate(560, 680)" opacity="0.45">
    <path d="M 0,80 Q 25,20 40,-50 Q 50,-80 60,-110" fill="none" stroke="#7C7267" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="60" cy="-110" rx="8" ry="14" transform="rotate(25 60 -110)" fill="#E75A2A" opacity="0.7"/>
    <ellipse cx="40" cy="-50" rx="6" ry="10" transform="rotate(-30 40 -50)" fill="#C5A059" opacity="0.6"/>
    <ellipse cx="25" cy="20" rx="5" ry="9" transform="rotate(35 25 20)" fill="#7C7267" opacity="0.5"/>
  </g>

  <!-- Right Vintage Quill Motif in Safe Area -->
  <g transform="translate(2000, 680)" opacity="0.45">
    <path d="M 0,80 Q -15,10 -30,-45 Q -40,-85 -55,-120" fill="none" stroke="#7C7267" stroke-width="2" stroke-linecap="round"/>
    <path d="M -55,-120 Q -80,-80 -50,-40 Q -35,-10 -20,20 Q -5,60 0,80 Q -10,30 -25,-10 Q -40,-45 -55,-120 Z" fill="#E75A2A" fill-opacity="0.15" stroke="#C5A059" stroke-width="1.5"/>
    <!-- Ink droplet -->
    <circle cx="2" cy="88" r="3" fill="#1C1A17" opacity="0.6"/>
  </g>
</svg>
  `.trim();
}

async function main() {
  const outputDir = path.resolve('../public/assets');
  const banner2560Path = path.join(outputDir, 'youtube_channel_banner_2560x1440.png');
  const banner2048Path = path.join(outputDir, 'youtube_channel_banner_2048x1152.png');
  const artifactBannerPath = path.resolve('C:/Users/Kumar/.gemini/antigravity/brain/269e3b50-9933-4ab2-aeee-17be6b6fa527/youtube_channel_banner.png');

  console.log('🎨 Rendering WritOn YouTube Channel Banner...');
  const svg = buildBannerSvg();
  const svgBuffer = Buffer.from(svg);

  // 1. High-Res YouTube Recommended (2560 x 1440)
  await sharp(svgBuffer)
    .resize(2560, 1440)
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(banner2560Path);
  console.log(`✅ Saved 2560x1440 banner to: ${banner2560Path}`);

  // 2. Exact YouTube Minimum Requirement (2048 x 1152)
  await sharp(svgBuffer)
    .resize(2048, 1152)
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(banner2048Path);
  console.log(`✅ Saved 2048x1152 banner to: ${banner2048Path}`);

  // 3. Save copy in conversation artifact folder for inspection
  await sharp(svgBuffer)
    .resize(2560, 1440)
    .png({ quality: 90 })
    .toFile(artifactBannerPath);
  console.log(`✅ Saved inspection copy to: ${artifactBannerPath}`);
}

main().catch((err) => {
  console.error('❌ Failed to render banner:', err);
  process.exit(1);
});
