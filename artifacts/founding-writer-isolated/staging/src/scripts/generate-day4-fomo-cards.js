import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxChars = 36) {
  if (!text) return [];
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function buildCarouselSlideSvg({
  badge = 'WRITON EARLY ACCESS',
  headlineLines = [],
  highlightWord = '',
  bodyLines = [],
  bullets = [],
  ctaText = 'Claim Your Pen Name ➔',
  slideNumber = 1,
  totalSlides = 5,
  theme = 'dark',
}) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#131415' : '#FFFDF9';
  const cardBg = isDark ? '#1C1D1F' : '#F7F3EC';
  const cardBorder = isDark ? '#2D2E30' : '#E6E0D4';
  const textPrimary = isDark ? '#EDE8DF' : '#151718';
  const textSecondary = isDark ? '#A5A096' : '#6D6963';
  const brandRed = '#E75A2A';

  // Start headlines higher to give full breathing room (y=255 instead of 310)
  let headlineTspans = '';
  let currentY = 255;
  for (const rawLine of headlineLines) {
    const wrapped = wrapText(rawLine, 24);
    for (const line of wrapped) {
      const isHighlight = highlightWord && line.includes(highlightWord);
      const fill = isHighlight ? brandRed : textPrimary;
      headlineTspans += `<tspan x="100" y="${currentY}" fill="${fill}">${escapeXml(line)}</tspan>\n`;
      currentY += 72;
    }
  }

  // Body text with 28px font, 42px line height
  let bodyTspans = '';
  currentY += 18;
  for (const rawLine of bodyLines) {
    const wrapped = wrapText(rawLine, 36);
    for (const line of wrapped) {
      bodyTspans += `<tspan x="100" y="${currentY}">${escapeXml(line)}</tspan>\n`;
      currentY += 42;
    }
    currentY += 8;
  }

  // Bullets with 28px font, 38px line height
  let bulletElements = '';
  if (bullets && bullets.length > 0) {
    currentY += 12;
    for (const b of bullets) {
      const cleanBullet = b.replace(/^[•\-\*]\s*/, '');
      const wrapped = wrapText(cleanBullet, 34);
      bulletElements += `
        <circle cx="112" cy="${currentY - 9}" r="5" fill="${brandRed}"/>
      `;
      for (let i = 0; i < wrapped.length; i++) {
        bulletElements += `
          <text x="135" y="${currentY}" fill="${textPrimary}" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="500">${escapeXml(wrapped[i])}</text>
        `;
        currentY += 38;
      }
      currentY += 10;
    }
  }

  // Slide indicator dots at y=1040
  let indicatorDots = '';
  const dotSpacing = 28;
  const startX = 540 - ((totalSlides - 1) * dotSpacing) / 2;
  for (let i = 1; i <= totalSlides; i++) {
    const cx = startX + (i - 1) * dotSpacing;
    const isCurrent = i === slideNumber;
    indicatorDots += `<circle cx="${cx}" cy="1040" r="${isCurrent ? 7 : 4}" fill="${isCurrent ? brandRed : textSecondary}" opacity="${isCurrent ? 1 : 0.4}"/>\n`;
  }

  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cardBg}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${isDark ? '#161718' : '#EFEAE0'}" stop-opacity="1"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1350" fill="${bg}"/>

  <!-- Inset Card -->
  <rect x="50" y="50" width="980" height="1250" rx="32" fill="url(#cardGrad)" stroke="${cardBorder}" stroke-width="2"/>

  <!-- Top Badge -->
  <rect x="100" y="110" width="${badge.length * 13 + 40}" height="44" rx="22" fill="${brandRed}" fill-opacity="0.15"/>
  <text x="${100 + (badge.length * 13 + 40) / 2}" y="139" fill="${brandRed}" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="700" letter-spacing="1.5" text-anchor="middle">${escapeXml(badge)}</text>

  <!-- Brand Mark Top Right -->
  <text x="960" y="140" fill="${textSecondary}" font-family="serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Headline -->
  <text font-family="'Noto Sans Devanagari', 'Nirmala UI', Georgia, Cambria, 'Times New Roman', serif" font-size="60" font-weight="700" letter-spacing="-0.5">
    ${headlineTspans}
  </text>

  <!-- Body -->
  <text font-family="'Noto Sans Devanagari', 'Nirmala UI', system-ui, -apple-system, sans-serif" font-size="28" fill="${textSecondary}" font-weight="400">
    ${bodyTspans}
  </text>

  <!-- Bullets -->
  ${bulletElements}

  <!-- Slide Dots -->
  ${indicatorDots}

  <!-- Bottom CTA Banner -->
  <rect x="100" y="1100" width="880" height="96" rx="20" fill="${brandRed}"/>
  <text x="540" y="1160" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="700" text-anchor="middle">${escapeXml(ctaText)}</text>

  <!-- Footer Watermark -->
  <text x="540" y="1250" fill="${textSecondary}" font-family="system-ui, -apple-system, sans-serif" font-size="20" opacity="0.6" text-anchor="middle">writon.cc • Google Play Store</text>
</svg>
`;
}

async function run() {
  const outputDir = 'C:/Users/Kumar/.gemini/antigravity/brain/4688c67b-8b46-4ec9-b19a-e1fea52e9fa9/social-cards';
  await fs.mkdir(outputDir, { recursive: true });

  const slidesData = [
    {
      badge: "WRITERS' FOMO ALERT",
      headlineLines: ["In 2 years,", "you'll wish you", "started writing here."],
      highlightWord: "started writing here.",
      bodyLines: [
        "Every major literary network had that golden window.",
        "Early Twitter in 2008. Early Substack in 2019.",
        "WritOn is in that golden window right now."
      ],
      ctaText: "Swipe to see why Day 1 matters ➔",
      slideNumber: 1,
    },
    {
      badge: "THE USERNAME RUSH",
      headlineLines: ["The 1-word pen names", "are disappearing fast."],
      highlightWord: "disappearing fast.",
      bodyLines: [
        "Early creators are claiming clean handles:",
        "• @poet   • @storyteller   • @kafka",
        "• @ghalib • @wordsmith     • @shadow"
      ],
      bullets: [
        "Wait 6 months and you'll be @writer_8492",
        "Permanent claim on your author brand",
        "Featured discovery on the Home deck"
      ],
      ctaText: "Secure your signature handle ➔",
      slideNumber: 2,
    },
    {
      badge: "ATTENTION CRISIS",
      headlineLines: ["Stop feeding prose", "to 15-second", "video algorithms."],
      highlightWord: "video algorithms.",
      bodyLines: [
        "Your story gets buried because social feeds prioritize short video loops.",
        "On WritOn, readers come specifically to read."
      ],
      bullets: [
        "Zero video noise or algorithmic chaos",
        "Pure 3-minute swipeable card decks",
        "14+ min average reading engagement"
      ],
      ctaText: "Experience quiet reading ➔",
      slideNumber: 3,
    },
    {
      badge: "GROUND FLOOR REACH",
      headlineLines: ["Early writers get 100%", "of the organic", "reader deck."],
      highlightWord: "reader deck.",
      bodyLines: [
        "Before algorithmic saturation hits,",
        "every published story is delivered directly",
        "to active reader feeds across the platform."
      ],
      bullets: [
        "No pay-to-play 'boost' buttons",
        "Serif typography & dark obsidian mode",
        "Direct distribution to genuine readers"
      ],
      ctaText: "Start publishing today ➔",
      slideNumber: 4,
    },
    {
      badge: "CLAIM YOUR INK",
      headlineLines: ["Your craft deserves", "readers, not", "fast scrolls."],
      highlightWord: "fast scrolls.",
      bodyLines: [
        "Join the founding community of writers defining modern mobile storytelling."
      ],
      bullets: [
        "Download free on Google Play Store",
        "Claim your signature pen name in 10s",
        "Publish your first card deck tonight"
      ],
      ctaText: "Claim Your Pen Name on Google Play ➔",
      slideNumber: 5,
    },
  ];

  for (let i = 0; i < slidesData.length; i++) {
    const s = slidesData[i];
    const svg = buildCarouselSlideSvg({
      badge: s.badge,
      headlineLines: s.headlineLines,
      highlightWord: s.highlightWord,
      bodyLines: s.bodyLines,
      bullets: s.bullets,
      ctaText: s.ctaText,
      slideNumber: s.slideNumber,
      totalSlides: 5,
      theme: 'dark',
    });
    const outPath = path.join(outputDir, `day4_fomo_slide_${i + 1}.png`);
    await sharp(Buffer.from(svg))
      .png({ quality: 95, compressionLevel: 8 })
      .toFile(outPath);
    console.log(`Rendered slide ${i + 1} -> ${outPath}`);
  }
}

run().catch(console.error);
