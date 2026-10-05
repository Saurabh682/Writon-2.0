import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  wrapTextToWidth,
  validateVisualContainment,
  escapeXml
} from '../services/visual-layout-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function renderWriterSearchCardSvg() {
  const canvasWidth = 1080;
  const canvasHeight = 1350;

  // Outer border & card canvas
  const bg = '#FAF5EE';
  const border = '#E8DFD3';
  const textPrimary = '#1C1917';
  const textMuted = '#6E655B';
  const terracotta = '#D45226';
  const warmHighlight = '#FAEDE7';

  // Left & Right safe margins
  const marginX = 90;
  const contentWidth = canvasWidth - (marginX * 2); // 900px

  // 1. Giant Headline Calculation
  const headline = 'A writer can rank in search and still never gain a reader.';
  const headlineLines = [
    'A writer can rank',
    'in search and still',
    'never gain a reader.'
  ];

  // 2. Inner Comparison Card Calculation
  const boxX = marginX;
  const boxY = 600;
  const boxWidth = contentWidth; // 900px
  const paddingX = 48;
  const paddingY = 40;
  const innerWidth = boxWidth - (paddingX * 2); // 804px

  // Define contents inside the contrast card
  const item1Title = 'Search results introduce the work.';
  const item1Desc = 'Discovery only buys a first impression.';
  
  const item2Title = 'A memorable voice builds the relationship.';
  const item2Desc = 'Characters, rhythm, and clear next steps make them return.';

  const testCallout = 'THE TEST: After one piece, is their next step clear?';

  // Wrap descriptions dynamically to innerWidth (minus bullet offset of 44px)
  const textInnerWidth = innerWidth - 44;
  const item1DescLines = wrapTextToWidth(item1Desc, textInnerWidth, 23, 'sans', 'regular');
  const item2DescLines = wrapTextToWidth(item2Desc, textInnerWidth, 23, 'sans', 'regular');
  const calloutLines = wrapTextToWidth(testCallout, innerWidth, 22, 'sans', 'bold');

  // Compute dynamic height required for the card
  let currentRelY = paddingY;
  
  // Item 1
  const item1TitleY = currentRelY + 28;
  currentRelY += 64; // Plenty of room for 32px title before description
  const item1DescStartY = currentRelY;
  currentRelY += item1DescLines.length * 36 + 24;
  const divider1Y = currentRelY;
  currentRelY += 36;

  // Item 2
  const item2TitleY = currentRelY + 28;
  currentRelY += 64; // Plenty of room for 32px title before description
  const item2DescStartY = currentRelY;
  currentRelY += item2DescLines.length * 36 + 24;
  const divider2Y = currentRelY;
  currentRelY += 36;

  // Callout
  const calloutStartY = currentRelY + 26;
  currentRelY += calloutLines.length * 34 + paddingY;

  const dynamicBoxHeight = Math.ceil(currentRelY); // Exact auto-sized height!

  // Validate containment
  const containmentCheck = validateVisualContainment({
    containerName: 'ContrastCard',
    boxX,
    boxY,
    boxWidth,
    boxHeight: dynamicBoxHeight + 5, // with safety buffer
    paddingX,
    paddingY,
    elements: [
      { text: item1Title, fontSize: 32, fontCategory: 'serif', fontWeight: 'bold', lineHeight: 36, spacingBelow: 10 },
      { text: item1Desc, fontSize: 23, fontCategory: 'sans', fontWeight: 'regular', lineHeight: 34, spacingBelow: 28 },
      { text: item2Title, fontSize: 32, fontCategory: 'serif', fontWeight: 'bold', lineHeight: 36, spacingBelow: 10 },
      { text: item2Desc, fontSize: 23, fontCategory: 'sans', fontWeight: 'regular', lineHeight: 34, spacingBelow: 28 },
      { text: testCallout, fontSize: 22, fontCategory: 'sans', fontWeight: 'bold', lineHeight: 32, spacingBelow: 0 },
    ]
  });

  if (!containmentCheck.valid) {
    throw new Error(`Visual containment failure: ${JSON.stringify(containmentCheck.violations)}`);
  }

  // Render SVG Elements
  let item1DescSvg = '';
  item1DescLines.forEach((l, i) => {
    item1DescSvg += `<text x="${paddingX + 44}" y="${item1DescStartY + (i * 34)}" fill="${textMuted}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="23" font-weight="400">${escapeXml(l)}</text>\n`;
  });

  let item2DescSvg = '';
  item2DescLines.forEach((l, i) => {
    item2DescSvg += `<text x="${paddingX + 44}" y="${item2DescStartY + (i * 34)}" fill="${textMuted}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="23" font-weight="400">${escapeXml(l)}</text>\n`;
  });

  let calloutSvg = '';
  calloutLines.forEach((l, i) => {
    calloutSvg += `<text x="${paddingX}" y="${calloutStartY + (i * 32)}" fill="${terracotta}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="22" font-weight="700" letter-spacing="0.5">${escapeXml(l)}</text>\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardParchment" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFDF9"/>
      <stop offset="100%" stop-color="#FAF5EE"/>
    </linearGradient>
    <linearGradient id="terracottaAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D45226"/>
      <stop offset="100%" stop-color="#E75A2A"/>
    </linearGradient>
  </defs>

  <!-- Background Base Canvas -->
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="${bg}"/>
  <rect x="45" y="45" width="${canvasWidth - 90}" height="${canvasHeight - 90}" rx="32" fill="url(#cardParchment)" stroke="${border}" stroke-width="1.5"/>

  <!-- Top Metadata & Brand Header -->
  <rect x="${marginX}" y="105" width="290" height="42" rx="21" fill="${warmHighlight}" stroke="#F0D5C9" stroke-width="1"/>
  <text x="${marginX + 145}" y="132" fill="${terracotta}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="14" font-weight="700" letter-spacing="1.5" text-anchor="middle">WRITON CRAFT ESSAY</text>
  
  <text x="${canvasWidth - marginX}" y="136" fill="${textMuted}" font-family="Newsreader, Georgia, serif" font-size="28" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Giant Hook Headline -->
  <g transform="translate(${marginX}, 290)">
    <text font-family="Newsreader, Georgia, Cambria, serif" font-size="76" font-weight="700" fill="${textPrimary}" letter-spacing="-1.2">
      <tspan x="0" y="0">${escapeXml(headlineLines[0])}</tspan>
      <tspan x="0" y="94">${escapeXml(headlineLines[1])}</tspan>
      <tspan x="0" y="188" fill="url(#terracottaAccent)">${escapeXml(headlineLines[2])}</tspan>
    </text>
  </g>

  <!-- Separator Hairline -->
  <line x1="${marginX}" y1="535" x2="${marginX + 180}" y2="535" stroke="${terracotta}" stroke-width="3" stroke-linecap="round"/>

  <!-- Auto-Sized Contrast Card (ZERO Text Spill Invariant) -->
  <g transform="translate(${boxX}, ${boxY})">
    <rect x="0" y="0" width="${boxWidth}" height="${dynamicBoxHeight}" rx="22" fill="#FFFFFF" stroke="${border}" stroke-width="1.2"/>
    
    <!-- Item 1: Search -->
    <circle cx="${paddingX + 10}" cy="${item1TitleY - 8}" r="12" fill="#FAEDE7"/>
    <circle cx="${paddingX + 10}" cy="${item1TitleY - 8}" r="5" fill="${terracotta}"/>
    <text x="${paddingX + 44}" y="${item1TitleY}" fill="${textPrimary}" font-family="Newsreader, Georgia, serif" font-size="32" font-weight="700">${escapeXml(item1Title)}</text>
    ${item1DescSvg}

    <!-- Divider line 1 -->
    <line x1="${paddingX}" y1="${divider1Y}" x2="${boxWidth - paddingX}" y2="${divider1Y}" stroke="#F0E8DE" stroke-width="1"/>

    <!-- Item 2: Relationship -->
    <circle cx="${paddingX + 10}" cy="${item2TitleY - 8}" r="12" fill="#FAEDE7"/>
    <circle cx="${paddingX + 10}" cy="${item2TitleY - 8}" r="5" fill="${terracotta}"/>
    <text x="${paddingX + 44}" y="${item2TitleY}" fill="${textPrimary}" font-family="Newsreader, Georgia, serif" font-size="32" font-weight="700">${escapeXml(item2Title)}</text>
    ${item2DescSvg}

    <!-- Divider line 2 -->
    <line x1="${paddingX}" y1="${divider2Y}" x2="${boxWidth - paddingX}" y2="${divider2Y}" stroke="#F0E8DE" stroke-width="1"/>

    <!-- Practical Rule Callout -->
    ${calloutSvg}
  </g>

  <!-- Footer Branding and Community Note (Safe distance from card bottom: ${boxY + dynamicBoxHeight}) -->
  <g transform="translate(${marginX}, 1210)">
    <text x="0" y="0" fill="${textMuted}" font-family="Newsreader, Georgia, serif" font-style="italic" font-size="24">Slow storytelling &amp; writer craft in an algorithmic web.</text>
    <text x="${contentWidth}" y="0" fill="${textMuted}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-weight="600" font-size="18" text-anchor="end">writon.cc</text>
  </g>
</svg>`;
}

export async function renderCard() {
  const outputDir = path.resolve(__dirname, '../../../public/assets/linkedin-cards');
  await fs.mkdir(outputDir, { recursive: true });
  const svg = renderWriterSearchCardSvg();
  const outputPath = path.join(outputDir, 'writer_search_reader_hook.png');
  await sharp(Buffer.from(svg)).png({ quality: 95 }).toFile(outputPath);
  console.log(`✅ Rendered calibrated LinkedIn card with zero text spill to: ${outputPath}`);
  return outputPath;
}

renderCard().catch(console.error);
