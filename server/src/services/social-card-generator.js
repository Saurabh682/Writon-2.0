import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Escapes XML/SVG special characters safely.
 */
export function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wraps text into lines with a maximum character width.
 */
export function wrapText(text, maxChars = 38) {
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

/**
 * Generates an SVG string for a 1080x1350 Story Editorial Quote Card.
 * Designed for Instagram 4:5 portrait, Threads, X multi-image cards.
 */
export function buildStoryQuoteCardSvg({
  title = '',
  summary = '',
  quote = '',
  category = 'Editorial',
  authorFullName = 'WritOn Author',
  authorPenName = 'author',
  readingTimeMin = 3,
  theme = 'dark',
}) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#131415' : '#FFFDF9';
  const cardBg = isDark ? '#1C1D1F' : '#F7F3EC';
  const cardBorder = isDark ? '#2D2E30' : '#E6E0D4';
  const textPrimary = isDark ? '#EDE8DF' : '#151718';
  const textSecondary = isDark ? '#A5A096' : '#6D6963';
  const brandTerracotta = '#E75A2A';

  const badgeText = `WRITON EDITORIAL • ${String(category).toUpperCase()}`;

  // Wrap title (max ~24 chars per line at 56px)
  const titleLines = wrapText(title, 24).slice(0, 3);
  let titleTspans = '';
  let currentY = 320;
  for (const line of titleLines) {
    titleTspans += `<tspan x="100" y="${currentY}">${escapeXml(line)}</tspan>\n`;
    currentY += 68;
  }

  // Choose excerpt text (quote or summary)
  const excerpt = quote || summary || '';
  const excerptLines = wrapText(excerpt, 32).slice(0, 5);
  let excerptTspans = '';
  currentY += 40;
  const quoteStartY = currentY;

  for (const line of excerptLines) {
    excerptTspans += `<tspan x="140" y="${currentY}">${escapeXml(line)}</tspan>\n`;
    currentY += 48;
  }

  const cleanPenName = authorPenName.startsWith('@') ? authorPenName : `@${authorPenName}`;

  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cardBg}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${isDark ? '#161718' : '#EFEAE0'}" stop-opacity="1"/>
    </linearGradient>
  </defs>

  <!-- Canvas Background -->
  <rect width="1080" height="1350" fill="${bg}"/>

  <!-- Main Inset Card Container -->
  <rect x="50" y="50" width="980" height="1250" rx="32" fill="url(#cardGrad)" stroke="${cardBorder}" stroke-width="2"/>

  <!-- Top Category Badge -->
  <rect x="100" y="110" width="${Math.min(badgeText.length * 14 + 40, 480)}" height="46" rx="23" fill="${brandTerracotta}" fill-opacity="0.15"/>
  <text x="${100 + Math.min(badgeText.length * 14 + 40, 480) / 2}" y="140" fill="${brandTerracotta}" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="700" letter-spacing="1.5" text-anchor="middle">${escapeXml(badgeText)}</text>

  <!-- Brand Mark Top Right -->
  <text x="960" y="140" fill="${textSecondary}" font-family="Georgia, Cambria, serif" font-size="26" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Story Title -->
  <text font-family="'Noto Sans Devanagari', 'Nirmala UI', Georgia, Cambria, 'Times New Roman', serif" font-size="56" font-weight="700" fill="${textPrimary}" letter-spacing="-0.5">
    ${titleTspans}
  </text>

  <!-- Accent Divider Bar -->
  <line x1="100" y1="${titleLines.length > 0 ? 320 + (titleLines.length * 68) - 20 : 360}" x2="220" y2="${titleLines.length > 0 ? 320 + (titleLines.length * 68) - 20 : 360}" stroke="${brandTerracotta}" stroke-width="4" stroke-linecap="round"/>

  <!-- Large Decorative Quotation Mark -->
  <text x="100" y="${quoteStartY + 20}" fill="${brandTerracotta}" font-family="Georgia, serif" font-size="90" font-weight="700" opacity="0.4">“</text>

  <!-- Excerpt / Quote Body -->
  <text font-family="'Noto Sans Devanagari', 'Nirmala UI', Georgia, Cambria, serif" font-size="32" font-style="italic" fill="${textPrimary}">
    ${excerptTspans}
  </text>

  <!-- Author Profile Block -->
  <g transform="translate(100, 940)">
    <!-- Author Monogram Avatar -->
    <circle cx="40" cy="40" r="40" fill="${brandTerracotta}" fill-opacity="0.2" stroke="${brandTerracotta}" stroke-width="2"/>
    <text x="40" y="49" fill="${brandTerracotta}" font-family="system-ui, sans-serif" font-size="28" font-weight="700" text-anchor="middle">${escapeXml(authorFullName.slice(0, 1).toUpperCase())}</text>

    <!-- Author Name & Pen Name -->
    <text x="105" y="32" fill="${textPrimary}" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="700">${escapeXml(authorFullName)}</text>
    <text x="105" y="66" fill="${brandTerracotta}" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="600">${escapeXml(cleanPenName)} • <tspan fill="${textSecondary}" font-weight="400">${readingTimeMin} min read</tspan></text>
  </g>

  <!-- Bottom CTA Banner -->
  <rect x="100" y="1100" width="880" height="96" rx="20" fill="${brandTerracotta}"/>
  <text x="540" y="1160" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" text-anchor="middle">Read Full Story on WritOn ➔</text>

  <!-- Footer Watermark -->
  <text x="540" y="1250" fill="${textSecondary}" font-family="system-ui, -apple-system, sans-serif" font-size="20" opacity="0.6" text-anchor="middle">writon.cc • Available on Google Play</text>
</svg>
`;
}

/**
 * Generates an SVG string for a 1080x1080 Square Story Summary Card.
 * Designed for Instagram Square Feed, Telegram Channel Photo, X Single Card.
 */
export function buildStorySummaryCardSvg({
  title = '',
  summary = '',
  category = 'Editorial',
  authorFullName = 'WritOn Author',
  authorPenName = 'author',
  readingTimeMin = 3,
  theme = 'dark',
}) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#131415' : '#FFFDF9';
  const cardBg = isDark ? '#1C1D1F' : '#F7F3EC';
  const cardBorder = isDark ? '#2D2E30' : '#E6E0D4';
  const textPrimary = isDark ? '#EDE8DF' : '#151718';
  const textSecondary = isDark ? '#A5A096' : '#6D6963';
  const brandTerracotta = '#E75A2A';

  const badgeText = `WRITON • ${String(category).toUpperCase()}`;

  // Wrap title (max ~24 chars per line)
  const titleLines = wrapText(title, 24).slice(0, 3);
  let titleTspans = '';
  let currentY = 270;
  for (const line of titleLines) {
    titleTspans += `<tspan x="80" y="${currentY}">${escapeXml(line)}</tspan>\n`;
    currentY += 64;
  }

  // Wrap summary (max ~32 chars per line)
  const summaryLines = wrapText(summary, 32).slice(0, 4);
  let summaryTspans = '';
  currentY += 36;
  for (const line of summaryLines) {
    summaryTspans += `<tspan x="80" y="${currentY}">${escapeXml(line)}</tspan>\n`;
    currentY += 44;
  }

  const cleanPenName = authorPenName.startsWith('@') ? authorPenName : `@${authorPenName}`;

  return `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="squareCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cardBg}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${isDark ? '#161718' : '#EFEAE0'}" stop-opacity="1"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="${bg}"/>

  <!-- Card Container -->
  <rect x="40" y="40" width="1000" height="1000" rx="28" fill="url(#squareCardGrad)" stroke="${cardBorder}" stroke-width="2"/>

  <!-- Category Badge -->
  <rect x="80" y="90" width="${Math.min(badgeText.length * 13 + 36, 400)}" height="42" rx="21" fill="${brandTerracotta}" fill-opacity="0.15"/>
  <text x="${80 + Math.min(badgeText.length * 13 + 36, 400) / 2}" y="117" fill="${brandTerracotta}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">${escapeXml(badgeText)}</text>

  <!-- Brand Mark -->
  <text x="980" y="118" fill="${textSecondary}" font-family="Georgia, serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Story Title -->
  <text font-family="'Noto Sans Devanagari', 'Nirmala UI', Georgia, serif" font-size="52" font-weight="700" fill="${textPrimary}">
    ${titleTspans}
  </text>

  <!-- Accent Divider -->
  <line x1="80" y1="${270 + (titleLines.length * 64) - 20}" x2="180" y2="${270 + (titleLines.length * 64) - 20}" stroke="${brandTerracotta}" stroke-width="4" stroke-linecap="round"/>

  <!-- Summary Body -->
  <text font-family="'Noto Sans Devanagari', 'Nirmala UI', system-ui, sans-serif" font-size="30" fill="${textSecondary}">
    ${summaryTspans}
  </text>

  <!-- Author & Reading Time -->
  <g transform="translate(80, 800)">
    <text x="0" y="30" fill="${textPrimary}" font-family="system-ui, sans-serif" font-size="28" font-weight="700">${escapeXml(authorFullName)}</text>
    <text x="0" y="65" fill="${brandTerracotta}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">${escapeXml(cleanPenName)} • <tspan fill="${textSecondary}" font-weight="400">${readingTimeMin} min read</tspan></text>
  </g>

  <!-- CTA Banner -->
  <rect x="80" y="900" width="920" height="84" rx="18" fill="${brandTerracotta}"/>
  <text x="540" y="953" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="26" font-weight="700" text-anchor="middle">Read on writon.cc ➔</text>
</svg>
`;
}

/**
 * Renders an SVG buffer or string to a PNG file on disk or returns buffer.
 */
export async function renderSvgToPng(svgString, outputPath = null) {
  const image = sharp(Buffer.from(svgString)).png({ quality: 95, compressionLevel: 8 });
  if (outputPath) {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await image.toFile(outputPath);
    return outputPath;
  }
  return await image.toBuffer();
}

/**
 * High-level helper: renders a visual card for a published story.
 *
 * @param {object} params
 * @param {object} params.story Story object
 * @param {string} [params.outputDir] Directory to save PNG to (optional)
 * @param {'portrait'|'square'} [params.format='portrait'] Format of the card
 * @param {'dark'|'light'} [params.theme='dark'] Theme
 * @returns {Promise<{ buffer: Buffer, filePath: string|null, format: string, width: number, height: number }>}
 */
export async function renderStorySocialCard({
  story,
  outputDir = null,
  format = 'portrait',
  theme = 'dark',
}) {
  const isSquare = format === 'square';
  const width = 1080;
  const height = isSquare ? 1080 : 1350;

  const author = story.author || {};
  const authorFullName = author.fullName || author.full_name || story.authorFullName || 'WritOn Author';
  const authorPenName = author.penName || author.pen_name || story.authorPenName || 'author';
  const readingTimeMin = story.readingTimeMin || story.reading_time_min || 3;

  const svg = isSquare
    ? buildStorySummaryCardSvg({
        title: story.title,
        summary: story.summary || story.content?.slice(0, 200),
        category: story.category || 'Editorial',
        authorFullName,
        authorPenName,
        readingTimeMin,
        theme,
      })
    : buildStoryQuoteCardSvg({
        title: story.title,
        summary: story.summary,
        quote: story.summary || story.content?.slice(0, 220),
        category: story.category || 'Editorial',
        authorFullName,
        authorPenName,
        readingTimeMin,
        theme,
      });

  const filename = `story_${story.slug || story.id || 'card'}_${format}.png`;
  const filePath = outputDir ? path.join(outputDir, filename) : null;

  const buffer = await sharp(Buffer.from(svg)).png({ quality: 95, compressionLevel: 8 }).toBuffer();

  if (filePath) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  return {
    buffer,
    filePath,
    format,
    width,
    height,
    filename,
  };
}

/**
 * Generates an SVG string for a 1080x1350 Carousel Slide (for marketing campaigns).
 */
export function buildCarouselSlideSvg({
  badge = 'WRITON EARLY ACCESS',
  headlineLines = [],
  highlightWord = '',
  bodyLines = [],
  bullets = [],
  ctaText = 'Claim Your Pen Name @handle ➔',
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

  let headlineTspans = '';
  let currentY = 310;
  for (const rawLine of headlineLines) {
    const wrapped = wrapText(rawLine, 26);
    for (const line of wrapped) {
      const isHighlight = highlightWord && line.includes(highlightWord);
      const fill = isHighlight ? brandRed : textPrimary;
      headlineTspans += `<tspan x="100" y="${currentY}" fill="${fill}">${escapeXml(line)}</tspan>\n`;
      currentY += 76;
    }
  }

  let bodyTspans = '';
  currentY += 28;
  for (const rawLine of bodyLines) {
    const wrapped = wrapText(rawLine, 36);
    for (const line of wrapped) {
      bodyTspans += `<tspan x="100" y="${currentY}">${escapeXml(line)}</tspan>\n`;
      currentY += 48;
    }
    currentY += 14;
  }

  let bulletElements = '';
  if (bullets && bullets.length > 0) {
    currentY += 16;
    for (const b of bullets) {
      const cleanBullet = b.replace(/^[•\-\*]\s*/, '');
      const wrapped = wrapText(cleanBullet, 34);
      bulletElements += `
        <circle cx="112" cy="${currentY - 10}" r="6" fill="${brandRed}"/>
      `;
      for (let i = 0; i < wrapped.length; i++) {
        bulletElements += `
          <text x="135" y="${currentY}" fill="${textPrimary}" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="500">${escapeXml(wrapped[i])}</text>
        `;
        currentY += 44;
      }
      currentY += 12;
    }
  }

  let indicatorDots = '';
  const dotSpacing = 28;
  const startX = 540 - ((totalSlides - 1) * dotSpacing) / 2;
  for (let i = 1; i <= totalSlides; i++) {
    const cx = startX + (i - 1) * dotSpacing;
    const isCurrent = i === slideNumber;
    indicatorDots += `<circle cx="${cx}" cy="1030" r="${isCurrent ? 7 : 4}" fill="${isCurrent ? brandRed : textSecondary}" opacity="${isCurrent ? 1 : 0.4}"/>\n`;
  }

  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cardBg}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${isDark ? '#161718' : '#EFEAE0'}" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1350" fill="${bg}"/>
  <rect x="50" y="50" width="980" height="1250" rx="32" fill="url(#cardGrad)" stroke="${cardBorder}" stroke-width="2"/>
  <rect x="100" y="110" width="${badge.length * 14 + 40}" height="46" rx="23" fill="${brandRed}" fill-opacity="0.15"/>
  <text x="${100 + (badge.length * 14 + 40) / 2}" y="140" fill="${brandRed}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" letter-spacing="1.5" text-anchor="middle">${escapeXml(badge)}</text>
  <text x="960" y="140" fill="${textSecondary}" font-family="serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>
  <text font-family="'Noto Sans Devanagari', 'Nirmala UI', Georgia, Cambria, 'Times New Roman', serif" font-size="64" font-weight="700" letter-spacing="-0.5">
    ${headlineTspans}
  </text>
  <text font-family="'Noto Sans Devanagari', 'Nirmala UI', system-ui, -apple-system, sans-serif" font-size="30" fill="${textSecondary}" font-weight="400">
    ${bodyTspans}
  </text>
  ${bulletElements}
  ${indicatorDots}
  <rect x="100" y="1100" width="880" height="96" rx="20" fill="${brandRed}"/>
  <text x="540" y="1160" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="700" text-anchor="middle">${escapeXml(ctaText)}</text>
  <text x="540" y="1250" fill="${textSecondary}" font-family="system-ui, -apple-system, sans-serif" font-size="20" opacity="0.6" text-anchor="middle">writon.cc • Google Play Store</text>
</svg>
`;
}

export async function renderDay1Carousel(outputDir) {
  const slides = [
    {
      badge: 'EARLY WRITER ACCESS',
      headlineLines: ['In 6 months,', 'you’ll wish you', 'started writing here.'],
      highlightWord: 'started writing here.',
      bodyLines: [
        'A brand-new sanctuary for writers,',
        'poets, and essayists is opening.',
        'Swipe to see why Day 1 matters ➔',
      ],
      ctaText: 'Swipe to explore ➔',
      slideNumber: 1,
    },
    {
      badge: 'THE USERNAME RACE',
      headlineLines: ['Remember joining', 'mature platforms', 'too late?'],
      highlightWord: 'too late?',
      bodyLines: [
        'You were forced to settle for:',
        '• @writer_john_8492',
        '• @real_poet_2024_official',
      ],
      bullets: [
        'Clean handles are taken on Day 1',
        'Early authors get permanent branding',
      ],
      ctaText: 'Claim your real name ➔',
      slideNumber: 2,
    },
    {
      badge: 'THE SANCTUARY',
      headlineLines: ['No algorithms.', 'No video noise.', 'Just pure craft.'],
      highlightWord: 'Just pure craft.',
      bodyLines: [
        'WritOn is built for readers and writers:',
        '• 3-minute swipeable card decks',
        '• Offline-first reading & autosave',
        '• 100% ad-free peaceful environment',
      ],
      ctaText: 'Discover the deck ➔',
      slideNumber: 3,
    },
    {
      badge: 'THE GROUND FLOOR',
      headlineLines: ['Early writers', 'earn unfair', 'reach advantages.'],
      highlightWord: 'reach advantages.',
      bodyLines: [
        'Why join right now?',
        '• Your ideal @pen_name is available',
        '• Get featured on the Daily Deck',
        '• Build a loyal readership from Day 1',
      ],
      ctaText: 'Reserve your spot ➔',
      slideNumber: 4,
    },
    {
      badge: 'EARN YOUR PLACE',
      headlineLines: ['The doors are open.', 'Don’t miss', 'the ground floor.'],
      highlightWord: 'the ground floor.',
      bodyLines: [
        'Available on Android via Google Play.',
        'Read peacefully in 3 minutes.',
        'Publish with a single tap.',
      ],
      ctaText: 'Download WritOn on Google Play ➔',
      slideNumber: 5,
    },
  ];

  const generatedFiles = [];
  for (let i = 0; i < slides.length; i++) {
    const svg = buildCarouselSlideSvg({
      ...slides[i],
      totalSlides: 5,
      theme: 'dark',
    });
    const filePath = path.join(outputDir, `day1_slide_${i + 1}.png`);
    await renderSvgToPng(svg, filePath);
    generatedFiles.push(filePath);
  }

  return generatedFiles;
}

/**
 * Renders the Day 2 "The Notes App Graveyard" 5-Slide Carousel.
 */
export async function renderDay2Carousel(outputDir) {
  const slides = [
    {
      badge: 'THE NOTES APP GRAVEYARD',
      headlineLines: ['The graveyard of', 'great writing isn’t', 'rejection letters.'],
      highlightWord: 'great writing isn’t',
      bodyLines: [
        'It’s the Notes app on your phone.',
        'Brilliant ideas, poems, and stories gathering dust.',
        'Swipe to see where they belong →',
      ],
      ctaText: 'Swipe to explore ➔',
      slideNumber: 1,
    },
    {
      badge: 'THE 2:00 AM DRAFT',
      headlineLines: ['You wrote something', 'at 2:00 AM that', 'made your chest tight.'],
      highlightWord: 'made your chest tight.',
      bodyLines: [
        'You promised yourself you’d share it.',
        'You wanted real people to read it.',
        'So why is it still sitting in your phone?',
      ],
      ctaText: 'Swipe to see why ➔',
      slideNumber: 2,
    },
    {
      badge: 'THE FEED TRAP',
      headlineLines: ['Why you never', 'published it on', 'social media:'],
      highlightWord: 'social media:',
      bodyLines: [
        '• Instagram demands dancing videos',
        '• X turns into partisan outrage',
        '• Medium put a paywall in front of it',
      ],
      ctaText: 'There is a better way ➔',
      slideNumber: 3,
    },
    {
      badge: 'THE WRITON DESK',
      headlineLines: ['A peaceful space', 'built exclusively', 'for your words.'],
      highlightWord: 'for your words.',
      bodyLines: [
        '• Distraction-free native editor',
        '• 3-minute swipeable card decks',
        '• Early writers featured on Day 1',
      ],
      ctaText: 'Claim your space ➔',
      slideNumber: 4,
    },
    {
      badge: 'TAKE IT OUT OF THE DARK',
      headlineLines: ['Take that note', 'out of the dark.', 'Publish today.'],
      highlightWord: 'Publish today.',
      bodyLines: [
        'Your ideal pen name (@handle) is free today.',
        'Zero ads. Zero video clutter. Pure craft.',
        'Available now on Google Play.',
      ],
      ctaText: 'Download WritOn on Google Play ➔',
      slideNumber: 5,
    },
  ];

  const generatedFiles = [];
  for (let i = 0; i < slides.length; i++) {
    const svg = buildCarouselSlideSvg({
      ...slides[i],
      totalSlides: 5,
      theme: 'dark',
    });
    const filePath = path.join(outputDir, `day2_slide_${i + 1}.png`);
    await renderSvgToPng(svg, filePath);
    generatedFiles.push(filePath);
  }

  return generatedFiles;
}

/**
 * Renders the Day 3 "Verified Hindi Poem/Quote" 5-Slide Carousel.
 */
export async function renderDay3HindiPoemCarousel(outputDir) {
  const slides = [
    {
      badge: 'साहित्यिक कोना • दिल्ली की शाम',
      headlineLines: ['बल्लीमारान की', 'गलियों में', 'शाम के साये।'],
      highlightWord: 'शाम के साये।',
      bodyLines: [
        'पुरानी दिल्ली का वो कोना जहाँ लफ़्ज़ सांस लेते हैं।',
        'ग़ालिब की हवेली से गुज़रती एक ख़ामोश ग़ज़ल।',
        'Swipe करके पढ़ें ➔',
      ],
      ctaText: 'पूरी ग़ज़ल पढ़ें ➔',
      slideNumber: 1,
    },
    {
      badge: 'पहला शेर',
      headlineLines: ['धूप ढलते ही', 'दर-ओ-दीवार पर', 'छा जाती है ख़ामोशी।'],
      highlightWord: 'छा जाती है ख़ामोशी।',
      bodyLines: [
        '“बल्लीमारान की गलियों में जब शाम उतरती है,',
        'दीवारों से सदियों पुरानी बातें सरगोशी करती हैं।',
        'क़दम रुक जाते हैं किसी अनकहे मिसरे पर...”',
      ],
      ctaText: 'अगला मिसरा ➔',
      slideNumber: 2,
    },
    {
      badge: 'दूसरा शेर',
      headlineLines: ['शोर के इस दौर में', 'लफ़्ज़ों का एक', 'अमन का दायरा।'],
      highlightWord: 'अमन का दायरा।',
      bodyLines: [
        '“न रील का शोर, न लाइक की होड़,',
        'सिर्फ एक शांत पन्ना और कलम का सच्चा रिश्ता।',
        'जहाँ हर लफ़्ज़ को पूरा वक़्त मिलता है।”',
      ],
      ctaText: 'WritOn पर ➔',
      slideNumber: 3,
    },
    {
      badge: 'लेखकों और शायरों के लिए',
      headlineLines: ['आपकी लिखी नज़्में', 'Notes ऐप में दबी', 'नहीं रहनी चाहिए।'],
      highlightWord: 'नहीं रहनी चाहिए।',
      bodyLines: [
        '• शांत और विज्ञापन-मुक्त रीडिंग अनुभव',
        '• हिंदी, उर्दू और शायरी का सच्चा मंच',
        '• सीधे सच्चे पाठकों और कद्रदानों तक पहुँच',
      ],
      ctaText: 'अपनी कलम को जगह दें ➔',
      slideNumber: 4,
    },
    {
      badge: 'WRITON EARLY ACCESS',
      headlineLines: ['आज ही अपना', 'कलमी नाम (@pen_name)', 'रिज़र्व करें।'],
      highlightWord: 'रिज़र्व करें।',
      bodyLines: [
        'Google Play पर उपलब्ध है WritOn ऐप।',
        'पढ़ें, लिखें और साहित्यिक समुदाय का हिस्सा बनें।',
        'writon.cc/go/2609_d03_ig_post_hi_verified_poem_quote',
      ],
      ctaText: 'Google Play से डाउनलोड करें ➔',
      slideNumber: 5,
    },
  ];

  const generatedFiles = [];
  for (let i = 0; i < slides.length; i++) {
    const svg = buildCarouselSlideSvg({
      ...slides[i],
      totalSlides: 5,
      theme: 'dark',
    });
    const filePath = path.join(outputDir, `day3_slide_${i + 1}.png`);
    await renderSvgToPng(svg, filePath);
    generatedFiles.push(filePath);
  }

  return generatedFiles;
}

/**
 * Renders the Day 4 "Anti-Casino Manifesto" Graphic.
 */

/**
 * Renders the Day 3 "The Ground Floor Advantage" 5-Slide Carousel (English).
 */
export async function renderDay3EnglishGroundFloorCarousel(outputDir) {
  const slides = [
    {
      badge: 'THE GROUND FLOOR ADVANTAGE',
      headlineLines: ['In 2015, Medium.', 'In 2018, Substack.', 'Today, WritOn.'],
      highlightWord: 'Today, WritOn.',
      bodyLines: [
        'The writers who joined early built massive lifelong audiences.',
        'Today, a new sanctuary for essays, poetry, and short fiction is opening.',
        'Swipe to see why early platforms create unfair creator advantages →',
      ],
      ctaText: 'Swipe to explore ➔',
      slideNumber: 1,
    },
    {
      badge: 'THE DISTRIBUTION WINDOW',
      headlineLines: ['When platforms mature,', 'algorithms aggressively', 'gatekeep reach.'],
      highlightWord: 'gatekeep reach.',
      bodyLines: [
        'When a platform has 10,000,000 creators, reaching readers is nearly impossible.',
        'When a platform is brand new, every piece of writing gets seen by a disproportionate % of readers.',
        'On WritOn, early creators are featured directly on the main daily card deck.',
      ],
      ctaText: 'Swipe to learn more ➔',
      slideNumber: 2,
    },
    {
      badge: 'IDENTITY SCARCITY',
      headlineLines: ['Identity matters.', 'Claim the pen name', 'you actually want.'],
      highlightWord: 'you actually want.',
      bodyLines: [
        'On mature platforms, you are forced into @alex_writer_992.',
        'On WritOn today: @alex is available. @poetry is available. @philosophy is available.',
        'Your literary brand starts with the name you actually want.',
      ],
      ctaText: 'Reserve your pen name ➔',
      slideNumber: 3,
    },
    {
      badge: 'BUILT DIFFERENTLY',
      headlineLines: ['A peaceful space', 'built exclusively', 'for your words.'],
      highlightWord: 'for your words.',
      bodyLines: [
        '• Zero ads. Zero video clutter. Zero doomscrolling.',
        '• 3–5 minute swipeable card deck format.',
        '• Multi-language support (English, Hindi, Bengali, Marathi).',
        '• Offline-first with instant autosave.',
      ],
      ctaText: 'Experience the sanctuary ➔',
      slideNumber: 4,
    },
    {
      badge: 'DON’T WAIT UNTIL YEAR 3',
      headlineLines: ['Don’t wait until Year 3', 'to wish you had', 'started at Day 1.'],
      highlightWord: 'started at Day 1.',
      bodyLines: [
        'Claim your pen name and publish your first card today.',
        'Early writers are pinned to the top of the feed.',
        'Available now on Google Play.',
      ],
      ctaText: 'Download WritOn on Google Play ➔',
      slideNumber: 5,
    },
  ];

  const generatedFiles = [];
  for (let i = 0; i < slides.length; i++) {
    const svg = buildCarouselSlideSvg({
      ...slides[i],
      totalSlides: 5,
      theme: 'dark',
    });
    const filePath = path.join(outputDir, `day3_en_slide_${i + 1}.png`);
    await renderSvgToPng(svg, filePath);
    generatedFiles.push(filePath);
  }

  return generatedFiles;
}

export async function renderDay4Manifesto(outputDir) {
  const svg = `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1080" height="1350" fill="#131415"/>
  <rect x="50" y="50" width="980" height="1250" rx="32" fill="#1A1B1D" stroke="#2D2E30" stroke-width="2"/>

  <!-- Header Badge -->
  <text x="540" y="160" fill="#E75A2A" font-family="system-ui, sans-serif" font-size="20" font-weight="700" letter-spacing="3" text-anchor="middle">WRITON MANIFESTO</text>

  <!-- Big Title -->
  <text x="540" y="270" fill="#EDE8DF" font-family="Georgia, serif" font-size="52" font-weight="700" text-anchor="middle">
    <tspan x="540" dy="0">Where do writers go</tspan>
    <tspan x="540" dy="70">when every app</tspan>
    <tspan x="540" dy="70" fill="#E75A2A">becomes a casino?</tspan>
  </text>

  <!-- Contrast Lines -->
  <g font-family="system-ui, sans-serif" font-size="30" fill="#A5A096">
    <text x="140" y="540">• Instagram wants you to dance</text>
    <text x="140" y="600">• X wants you to fight for outrage</text>
    <text x="140" y="660">• TikTok traps you in 7-second loops</text>
    <text x="140" y="720">• Medium locked everything behind paywalls</text>
  </g>

  <!-- Divider Line -->
  <line x1="140" y1="780" x2="940" y2="780" stroke="#333438" stroke-width="2"/>

  <!-- Sanctuary Prose -->
  <text x="540" y="860" fill="#EDE8DF" font-family="Georgia, serif" font-size="38" font-style="italic" text-anchor="middle">
    <tspan x="540" dy="0">"WritOn is a quiet sanctuary.</tspan>
    <tspan x="540" dy="55">3-minute swipeable card decks.</tspan>
    <tspan x="540" dy="55">No ads. Pure craft."</tspan>
  </text>

  <!-- CTA Banner -->
  <rect x="100" y="1100" width="880" height="96" rx="20" fill="#E75A2A"/>
  <text x="540" y="1160" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="30" font-weight="700" text-anchor="middle">Read &amp; Publish on WritOn ➔</text>
</svg>
`;

  const filePath = path.join(outputDir, 'day4_manifesto.png');
  await renderSvgToPng(svg, filePath);
  return filePath;
}

/**
 * Renders the Day 5 "Founding Writer Spotlight" Template.
 */
export async function renderDay5Spotlight(outputDir, {
  quote = 'We write not because we have answers, but because silence makes the questions too loud.',
  author = 'Elena Vance',
  penName = '@elena',
  category = 'Essays & Philosophy',
  number = '042',
} = {}) {
  const quoteLines = wrapText(`"${quote}"`, 26);
  let quoteTspans = '';
  let y = 460;
  for (const line of quoteLines) {
    quoteTspans += `<tspan x="540" y="${y}">${escapeXml(line)}</tspan>\n`;
    y += 65;
  }

  const svg = `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1350" fill="#131415"/>
  <rect x="50" y="50" width="980" height="1250" rx="32" fill="#1A1B1D" stroke="#2D2E30" stroke-width="2"/>

  <!-- Badge -->
  <rect x="360" y="120" width="360" height="50" rx="25" fill="#E75A2A" fill-opacity="0.15"/>
  <text x="540" y="152" fill="#E75A2A" font-family="system-ui, sans-serif" font-size="20" font-weight="700" letter-spacing="2" text-anchor="middle">FOUNDING WRITER #${number}</text>

  <!-- Quote Icon -->
  <text x="540" y="340" fill="#E75A2A" font-family="Georgia, serif" font-size="120" font-weight="700" opacity="0.4" text-anchor="middle">“</text>

  <!-- Quote Body -->
  <text font-family="Georgia, serif" font-size="46" font-style="italic" fill="#EDE8DF" text-anchor="middle">
    ${quoteTspans}
  </text>

  <!-- Author Details -->
  <text x="540" y="${y + 50}" fill="#EDE8DF" font-family="system-ui, sans-serif" font-size="34" font-weight="700" text-anchor="middle">${escapeXml(author)}</text>
  <text x="540" y="${y + 100}" fill="#E75A2A" font-family="system-ui, sans-serif" font-size="26" font-weight="500" text-anchor="middle">${escapeXml(penName)} • ${escapeXml(category)}</text>

  <!-- CTA Banner -->
  <rect x="100" y="1100" width="880" height="96" rx="20" fill="#E75A2A"/>
  <text x="540" y="1160" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="28" font-weight="700" text-anchor="middle">Want to be featured? Publish on WritOn ➔</text>
</svg>
`;

  const filePath = path.join(outputDir, 'day5_spotlight.png');
  await renderSvgToPng(svg, filePath);
  return filePath;
}

/**
 * Master function: renders all weekly visual assets automatically.
 */
export async function generateAllCampaignAssets(outputDir) {
  const day1 = await renderDay1Carousel(outputDir);
  const day2 = await renderDay2Carousel(outputDir);
  const day3 = await renderDay3HindiPoemCarousel(outputDir);
  const day4 = await renderDay4Manifesto(outputDir);
  const day5 = await renderDay5Spotlight(outputDir);
  return {
    day1,
    day2,
    day3,
    day4,
    day5,
    count: day1.length + day2.length + day3.length + 2,
  };
}
