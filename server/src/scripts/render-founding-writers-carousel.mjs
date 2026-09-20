import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxChars = 24) {
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

export const FOUNDING_WRITERS_SLIDES = [
  {
    slideNumber: 1,
    badge: 'WRITON • THE HONEST PITCH',
    headline: '25 founding writers.',
    subheadline: 'For a platform with almost no readers yet.',
    supporting: 'The honest pitch →',
  },
  {
    slideNumber: 2,
    badge: 'WRITON • EARLY ADOPTION',
    headline: 'A small library.\nA smaller readership.',
    subheadline: 'You’re early, and I’m paying attention.',
    supporting: '',
  },
  {
    slideNumber: 3,
    badge: 'WRITON • THE SANCTUARY',
    headline: 'No outrage feed.\nNo camera.\nNo follower race.',
    subheadline: 'Just writing, and people who read it.',
    supporting: '',
  },
  {
    slideNumber: 4,
    badge: 'WRITON • FOUNDING PRIVILEGES',
    headline: 'What you get',
    subheadline: '',
    bullets: [
      { title: 'A real reader at the other end.', desc: 'I’ll personally read your first few pieces and respond.' },
      { title: 'A voice in the product.', desc: 'Tell me what feels wrong, missing or unnecessary. I’ll actually use it.' },
      { title: 'Founding Writer status.', desc: 'One of the first 25 writers shaping WritOn from the beginning.' }
    ],
  },
  {
    slideNumber: 5,
    badge: 'WRITON • THE COMMITMENT',
    headline: 'Two or three pieces this month.',
    subheadline: 'And honest feedback on what feels off.',
    supporting: '',
  },
  {
    slideNumber: 6,
    badge: 'WRITON • MULTILINGUAL PROSE',
    headline: 'Stories, poems, essays.',
    subheadline: 'English · हिन्दी · मराठी · বাংলা.',
    supporting: 'Pen names welcome.',
  },
  {
    slideNumber: 7,
    badge: 'WRITON • PERSONAL INVITATION',
    headline: 'Interested?',
    subheadline: 'Comment your language, or DM me.',
    supporting: 'I’ll send you a personal invite.',
  }
];

export function buildFoundingWriterSlideSvg(slide, totalSlides = 7) {
  const bg = '#FAF5EE';
  const border = '#E8DFD3';
  const textPrimary = '#1C1917';
  const textMuted = '#6E655B';
  const terracotta = '#D45226';

  const badge = slide.badge || 'WRITON';
  const badgeWidth = Math.min(badge.length * 13 + 36, 420);

  let contentY = 360;
  let headlineElements = '';
  const headLines = slide.headline.split('\n');
  for (const raw of headLines) {
    const wrapped = wrapText(raw, 22);
    for (const line of wrapped) {
      headlineElements += `<tspan x="110" y="${contentY}">${escapeXml(line)}</tspan>\n`;
      contentY += 82;
    }
  }

  let subheadElements = '';
  if (slide.subheadline) {
    contentY += 24;
    const subLines = slide.subheadline.split('\n');
    for (const raw of subLines) {
      const wrapped = wrapText(raw, 32);
      for (const line of wrapped) {
        subheadElements += `<tspan x="110" y="${contentY}">${escapeXml(line)}</tspan>\n`;
        contentY += 56;
      }
    }
  }

  let supportingElements = '';
  if (slide.supporting) {
    contentY += 28;
    const suppLines = wrapText(slide.supporting, 32);
    for (const line of suppLines) {
      supportingElements += `<tspan x="110" y="${contentY}">${escapeXml(line)}</tspan>\n`;
      contentY += 52;
    }
  }

  let bulletElements = '';
  if (slide.bullets && slide.bullets.length > 0) {
    contentY += 10;
    for (const b of slide.bullets) {
      bulletElements += `<g transform="translate(110, ${contentY})">`;
      bulletElements += `<circle cx="8" cy="-10" r="6" fill="${terracotta}"/>`;
      bulletElements += `<text x="32" y="0" fill="${textPrimary}" font-family="Newsreader, Georgia, serif" font-size="36" font-weight="700">${escapeXml(b.title)}</text>`;
      const descLines = wrapText(b.desc, 38);
      let dy = 44;
      for (const dline of descLines) {
        bulletElements += `<text x="32" y="${dy}" fill="${textMuted}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="28" font-weight="400">${escapeXml(dline)}</text>`;
        dy += 38;
      }
      bulletElements += `</g>`;
      contentY += dy + 28;
    }
  }

  let indicatorDots = '';
  const dotSpacing = 28;
  const startX = 540 - ((totalSlides - 1) * dotSpacing) / 2;
  for (let i = 1; i <= totalSlides; i++) {
    const cx = startX + (i - 1) * dotSpacing;
    const isCur = i === slide.slideNumber;
    indicatorDots += `<circle cx="${cx}" cy="1240" r="${isCur ? 7 : 4}" fill="${isCur ? terracotta : textMuted}" opacity="${isCur ? 1 : 0.35}"/>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardParchment" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFDF9"/>
      <stop offset="100%" stop-color="#FAF5EE"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1350" fill="${bg}"/>
  <rect x="50" y="50" width="980" height="1250" rx="28" fill="url(#cardParchment)" stroke="${border}" stroke-width="1.5"/>
  <!-- Top Nav / Badge -->
  <rect x="110" y="115" width="${badgeWidth}" height="46" rx="23" fill="#FAEDE7" stroke="#F0D5C9" stroke-width="1"/>
  <text x="${110 + badgeWidth / 2}" y="144" fill="${terracotta}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">${escapeXml(badge)}</text>
  <text x="970" y="146" fill="${textMuted}" font-family="Newsreader, Georgia, serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>
  <!-- Content Body -->
  <text font-family="Newsreader, Georgia, Cambria, serif" font-size="68" font-weight="700" fill="${textPrimary}" letter-spacing="-0.5">
    ${headlineElements}
  </text>
  <text font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="36" font-weight="500" fill="${textMuted}" letter-spacing="-0.2">
    ${subheadElements}
  </text>
  <text font-family="Newsreader, Georgia, serif" font-size="36" font-style="italic" font-weight="600" fill="${terracotta}">
    ${supportingElements}
  </text>
  ${bulletElements}
  <!-- Carousel dots (no Day N footer) -->
  ${indicatorDots}
</svg>`;
}

export async function renderFoundingWritersCarousel(outputDir = path.resolve(__dirname, '../../../public/assets/founding-writers-carousel')) {
  await fs.mkdir(outputDir, { recursive: true });
  const generated = [];
  for (const s of FOUNDING_WRITERS_SLIDES) {
    const svg = buildFoundingWriterSlideSvg(s, FOUNDING_WRITERS_SLIDES.length);
    const pngPath = path.join(outputDir, `slide_${s.slideNumber}.png`);
    await sharp(Buffer.from(svg)).png({ quality: 95 }).toFile(pngPath);
    generated.push(pngPath);
  }
  return generated;
}

export const FOUNDING_WRITERS_CAPTION = `I'm looking for 25 writers to publish on a platform that has almost no readers yet.

Yes, really.

WritOn has a small library and a smaller readership. I'd rather tell you that now than have you find out later.

Here's the trade I'm offering:

• Your first stories won't be buried under thousands of others
• I'll personally read your first few pieces and send you a real response
• You'll be one of WritOn's first 25 Founding Writers, with a direct say in what I build next
• Write in English, हिन्दी, मराठी or বাংলা. Pen names welcome.

What I'm asking in return: publish two or three pieces this month, and tell me honestly what feels off.

If that sounds fair, comment with the language you write in, or DM me. I'll send you a personal invite.

Swipe for the full pitch, including the parts that don't flatter us.`;

export const FOUNDING_WRITERS_FIRST_COMMENT = `Android: https://play.google.com/store/apps/details?id=com.ibitvalley.writon · Or look around first: writon.cc`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  renderFoundingWritersCarousel().then(async (files) => {
    console.log(`✅ Successfully rendered ${files.length} Founding Writer carousel slides:`);
    files.forEach((f) => console.log(` - ${f}`));

    const { LinkedInValidatorService } = await import('../services/linkedin-validator-service.js');
    const validator = new LinkedInValidatorService();
    const evalResult = validator.evaluateGates({
      commentary: FOUNDING_WRITERS_CAPTION,
      format: 'MULTI_IMAGE',
      mediaAssets: files.map((f, i) => ({ id: `slide_${i + 1}`, localPath: f })),
      recentPublications: [],
    });

    console.log(`\n🛡️ 36 Quality Gates Check:`);
    console.log(` - Passed: ${evalResult.passedGates} / ${evalResult.totalGates}`);
    console.log(` - Verdict: ${evalResult.allPassed ? 'ALL GATES PASSED ✅' : 'GATE FAILURE ❌'}`);
    if (!evalResult.allPassed) {
      evalResult.results.filter((r) => !r.passed).forEach((r) => console.log(`   FAIL: [${r.gateCode}] ${r.failureReason}`));
    }
  }).catch(console.error);
}

