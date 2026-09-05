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

const BRAND_RED = '#E75A2A';
const OBSIDIAN_BG = '#111213';
const CARD_BG = '#1A1C1E';
const BORDER_COLOR = '#2A2C2E';
const TEXT_PRIMARY = '#EDE8DF';
const TEXT_MUTED = '#9A958D';

// =========================================================================
// SLIDE 1: Dramatic Editorial Cover
// =========================================================================
function renderSlide1Svg() {
  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="coverGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#221A17" stop-opacity="1"/>
      <stop offset="100%" stop-color="#111213" stop-opacity="1"/>
    </radialGradient>
  </defs>

  <rect width="1080" height="1350" fill="url(#coverGlow)"/>
  <rect x="50" y="50" width="980" height="1250" rx="36" fill="none" stroke="${BORDER_COLOR}" stroke-width="2"/>

  <!-- Top Badge -->
  <rect x="100" y="110" width="230" height="46" rx="23" fill="${BRAND_RED}" fill-opacity="0.18"/>
  <text x="215" y="140" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">WRITERS' FOMO ALERT</text>
  <text x="960" y="140" fill="${TEXT_MUTED}" font-family="serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Big Decorative Quotation Mark -->
  <text x="100" y="320" fill="${BRAND_RED}" font-family="Georgia, serif" font-size="160" font-weight="900" opacity="0.3">“</text>

  <!-- Massive Headline -->
  <text x="100" y="380" font-family="'Noto Sans Devanagari', Georgia, serif" font-size="70" font-weight="800" fill="${TEXT_PRIMARY}" letter-spacing="-1">
    <tspan x="100" y="380">In 2 years,</tspan>
    <tspan x="100" y="465">you’ll wish you</tspan>
    <tspan x="100" y="550" fill="${BRAND_RED}">started writing</tspan>
    <tspan x="100" y="635" fill="${BRAND_RED}">here today.</tspan>
  </text>

  <!-- Editorial Card -->
  <rect x="100" y="720" width="880" height="260" rx="24" fill="${CARD_BG}" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
  <text x="140" y="780" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="28" font-weight="600">Every major platform had that golden window:</text>
  <text x="140" y="835" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="24">✦ Twitter in 2008 • Medium in 2013 • Substack in 2019</text>
  <text x="140" y="890" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="24">Right now, early writers on WritOn get 100% organic deck reach.</text>
  <text x="140" y="945" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">Before algorithmic saturation hits, Day 1 matters most ➔</text>

  <!-- Dots -->
  <circle cx="500" cy="1050" r="7" fill="${BRAND_RED}"/>
  <circle cx="528" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="556" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="584" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="612" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>

  <!-- CTA -->
  <rect x="100" y="1110" width="880" height="96" rx="22" fill="${BRAND_RED}"/>
  <text x="540" y="1170" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="30" font-weight="700" text-anchor="middle">Swipe to see what's happening ➔</text>

  <text x="540" y="1255" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="20" opacity="0.6" text-anchor="middle">writon.cc • Google Play Store</text>
</svg>
`;
}

// =========================================================================
// SLIDE 2: Interactive Scarcity Matrix (The Handle Claim Rush)
// =========================================================================
function renderSlide2Svg() {
  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1350" fill="${OBSIDIAN_BG}"/>
  <rect x="50" y="50" width="980" height="1250" rx="36" fill="none" stroke="${BORDER_COLOR}" stroke-width="2"/>

  <!-- Top Badge -->
  <rect x="100" y="110" width="220" height="46" rx="23" fill="${BRAND_RED}" fill-opacity="0.18"/>
  <text x="210" y="140" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">THE USERNAME RUSH</text>
  <text x="960" y="140" fill="${TEXT_MUTED}" font-family="serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Headline -->
  <text x="100" y="240" font-family="'Noto Sans Devanagari', Georgia, serif" font-size="52" font-weight="800" fill="${TEXT_PRIMARY}">
    <tspan x="100" y="240">The 1-word pen names</tspan>
    <tspan x="100" y="305" fill="${BRAND_RED}">are disappearing fast.</tspan>
  </text>
  <text x="100" y="360" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="24">Early writers are securing clean literary handles right now:</text>

  <!-- Taken Handles Matrix -->
  <!-- Chip 1 -->
  <rect x="100" y="400" width="880" height="74" rx="16" fill="#181A1C" stroke="#252729" stroke-width="1.5"/>
  <circle cx="140" cy="437" r="14" fill="#2E3033"/>
  <text x="140" y="443" fill="#8E9296" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">@</text>
  <text x="175" y="446" fill="#A5A096" font-family="monospace" font-size="26" font-weight="600">poet</text>
  <rect x="800" y="418" width="150" height="38" rx="10" fill="#2E2020"/>
  <text x="875" y="443" fill="#E57373" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">CLAIMED</text>

  <!-- Chip 2 -->
  <rect x="100" y="490" width="880" height="74" rx="16" fill="#181A1C" stroke="#252729" stroke-width="1.5"/>
  <circle cx="140" cy="527" r="14" fill="#2E3033"/>
  <text x="140" y="533" fill="#8E9296" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">@</text>
  <text x="175" y="536" fill="#A5A096" font-family="monospace" font-size="26" font-weight="600">kafka</text>
  <rect x="800" y="508" width="150" height="38" rx="10" fill="#2E2020"/>
  <text x="875" y="533" fill="#E57373" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">CLAIMED</text>

  <!-- Chip 3 -->
  <rect x="100" y="580" width="880" height="74" rx="16" fill="#181A1C" stroke="#252729" stroke-width="1.5"/>
  <circle cx="140" cy="617" r="14" fill="#2E3033"/>
  <text x="140" y="623" fill="#8E9296" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">@</text>
  <text x="175" y="626" fill="#A5A096" font-family="monospace" font-size="26" font-weight="600">storyteller</text>
  <rect x="800" y="598" width="150" height="38" rx="10" fill="#2E2020"/>
  <text x="875" y="623" fill="#E57373" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">CLAIMED</text>

  <!-- Chip 4: YOUR NAME (AVAILABLE) Glowing Hero Card -->
  <rect x="100" y="675" width="880" height="110" rx="20" fill="#2A1B16" stroke="${BRAND_RED}" stroke-width="2.5"/>
  <circle cx="150" cy="730" r="22" fill="${BRAND_RED}"/>
  <text x="150" y="738" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="24" font-weight="700" text-anchor="middle">@</text>
  <text x="195" y="739" fill="#FFFFFF" font-family="monospace" font-size="32" font-weight="700">your_signature_name</text>
  <rect x="730" y="705" width="220" height="50" rx="12" fill="${BRAND_RED}"/>
  <text x="840" y="737" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="18" font-weight="800" text-anchor="middle">AVAILABLE ⚡</text>

  <!-- Warning Box -->
  <rect x="100" y="815" width="880" height="160" rx="20" fill="${CARD_BG}" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
  <text x="140" y="865" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="24" font-weight="700">⚠️ Wait 6 months and your real name will be gone.</text>
  <text x="140" y="910" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="22">You'll be forced to add numbers like <tspan fill="#E57373">@writer_john_8492</tspan>.</text>
  <text x="140" y="945" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="22">Claim your permanent literary identity today on Google Play.</text>

  <!-- Dots -->
  <circle cx="500" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="528" cy="1050" r="7" fill="${BRAND_RED}"/>
  <circle cx="556" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="584" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="612" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>

  <!-- CTA -->
  <rect x="100" y="1110" width="880" height="96" rx="22" fill="${BRAND_RED}"/>
  <text x="540" y="1170" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="30" font-weight="700" text-anchor="middle">Secure your signature handle ➔</text>

  <text x="540" y="1255" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="20" opacity="0.6" text-anchor="middle">writon.cc • Google Play Store</text>
</svg>
`;
}

// =========================================================================
// SLIDE 3: Split Comparison (The Video Feed Trap vs WritOn Sanctuary)
// =========================================================================
function renderSlide3Svg() {
  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1350" fill="${OBSIDIAN_BG}"/>
  <rect x="50" y="50" width="980" height="1250" rx="36" fill="none" stroke="${BORDER_COLOR}" stroke-width="2"/>

  <!-- Top Badge -->
  <rect x="100" y="110" width="200" height="46" rx="23" fill="${BRAND_RED}" fill-opacity="0.18"/>
  <text x="200" y="140" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">ATTENTION CRISIS</text>
  <text x="960" y="140" fill="${TEXT_MUTED}" font-family="serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Headline -->
  <text x="100" y="240" font-family="'Noto Sans Devanagari', Georgia, serif" font-size="52" font-weight="800" fill="${TEXT_PRIMARY}">
    <tspan x="100" y="240">Stop feeding essays</tspan>
    <tspan x="100" y="305" fill="${BRAND_RED}">to video algorithms.</tspan>
  </text>

  <!-- Split Comparison Card 1: OTHER SOCIAL APPS -->
  <rect x="100" y="360" width="880" height="280" rx="22" fill="#18191B" stroke="#3A2828" stroke-width="2"/>
  <rect x="130" y="385" width="220" height="34" rx="8" fill="#3D2020"/>
  <text x="240" y="408" fill="#FF8A80" font-family="system-ui, sans-serif" font-size="15" font-weight="800" text-anchor="middle">OTHER SOCIAL APPS</text>
  
  <text x="140" y="465" fill="#E57373" font-family="system-ui, sans-serif" font-size="24" font-weight="700">❌ Your 1,000-word piece is crushed by dance videos</text>
  <text x="140" y="515" fill="#9E9B95" font-family="system-ui, sans-serif" font-size="22">✦ 0.2% organic reach unless you pay to boost</text>
  <text x="140" y="560" fill="#9E9B95" font-family="system-ui, sans-serif" font-size="22">✦ 3-second attention span before users swipe away</text>
  <text x="140" y="605" fill="#9E9B95" font-family="system-ui, sans-serif" font-size="22">✦ Intrusive banner ads interrupt your prose</text>

  <!-- Split Comparison Card 2: WRITON SANCTUARY -->
  <rect x="100" y="670" width="880" height="310" rx="22" fill="#1F1B19" stroke="${BRAND_RED}" stroke-width="2.5"/>
  <rect x="130" y="695" width="220" height="34" rx="8" fill="${BRAND_RED}"/>
  <text x="240" y="718" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="15" font-weight="800" text-anchor="middle">WRITON SANCTUARY</text>

  <text x="140" y="775" fill="#FFE082" font-family="system-ui, sans-serif" font-size="24" font-weight="700">✨ Built exclusively for readers and serious writers</text>
  <text x="140" y="825" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22">✦ 100% text-first 3-minute swipeable card decks</text>
  <text x="140" y="870" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22">✦ 14+ minutes average sustained reading time</text>
  <text x="140" y="915" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22">✦ Zero video noise, zero intrusive banner ads</text>
  <text x="140" y="955" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="20" font-weight="700">✦ Authentic applause &amp; meaningful literary comments</text>

  <!-- Dots -->
  <circle cx="500" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="528" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="556" cy="1050" r="7" fill="${BRAND_RED}"/>
  <circle cx="584" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="612" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>

  <!-- CTA -->
  <rect x="100" y="1110" width="880" height="96" rx="22" fill="${BRAND_RED}"/>
  <text x="540" y="1170" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="30" font-weight="700" text-anchor="middle">Experience quiet reading ➔</text>

  <text x="540" y="1255" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="20" opacity="0.6" text-anchor="middle">writon.cc • Google Play Store</text>
</svg>
`;
}

// =========================================================================
// SLIDE 4: Product Showcase / App Interface Preview
// =========================================================================
async function renderSlide4SvgWithPhone() {
  const phonePath = path.resolve('d:/VibeCode/WritOn-PowerUp/public/assets/hero-phones.png');
  const phoneBuffer = await fs.readFile(phonePath);
  const phoneBase64 = phoneBuffer.toString('base64');

  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1350" fill="${OBSIDIAN_BG}"/>
  <rect x="50" y="50" width="980" height="1250" rx="36" fill="none" stroke="${BORDER_COLOR}" stroke-width="2"/>

  <!-- Top Badge -->
  <rect x="100" y="110" width="220" height="46" rx="23" fill="${BRAND_RED}" fill-opacity="0.18"/>
  <text x="210" y="140" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">PRODUCT SHOWCASE</text>
  <text x="960" y="140" fill="${TEXT_MUTED}" font-family="serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Headline -->
  <text x="100" y="235" font-family="'Noto Sans Devanagari', Georgia, serif" font-size="52" font-weight="800" fill="${TEXT_PRIMARY}">
    <tspan x="100" y="235">Early writers get 100%</tspan>
    <tspan x="100" y="295" fill="${BRAND_RED}">of the organic deck.</tspan>
  </text>
  <text x="100" y="345" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="24">Your stories delivered directly to readers across Android.</text>

  <!-- Phone Graphic Inset -->
  <g transform="translate(260, 365) scale(0.82)">
    <image href="data:image/png;base64,${phoneBase64}" width="676" height="683"/>
  </g>

  <!-- Floating Feature Badges -->
  <g transform="translate(90, 875)">
    <rect width="280" height="70" rx="18" fill="#1C1E20" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
    <text x="140" y="44" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="19" font-weight="700" text-anchor="middle">📖 Pure Serif Reader</text>
  </g>

  <g transform="translate(390, 875)">
    <rect width="290" height="70" rx="18" fill="#1C1E20" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
    <text x="145" y="44" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="19" font-weight="700" text-anchor="middle">⚡ 3-Min Card Decks</text>
  </g>

  <g transform="translate(700, 875)">
    <rect width="280" height="70" rx="18" fill="#1C1E20" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
    <text x="140" y="44" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="19" font-weight="700" text-anchor="middle">🌙 Obsidian Dark Mode</text>
  </g>

  <text x="540" y="995" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="22" text-anchor="middle">Every published deck reaches authentic, thoughtful readers.</text>

  <!-- Dots -->
  <circle cx="500" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="528" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="556" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="584" cy="1050" r="7" fill="${BRAND_RED}"/>
  <circle cx="612" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>

  <!-- CTA -->
  <rect x="100" y="1110" width="880" height="96" rx="22" fill="${BRAND_RED}"/>
  <text x="540" y="1170" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="30" font-weight="700" text-anchor="middle">Start publishing today ➔</text>

  <text x="540" y="1255" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="20" opacity="0.6" text-anchor="middle">writon.cc • Google Play Store</text>
</svg>
`;
}

// =========================================================================
// SLIDE 5: The Founding Writer VIP Invitation Pass
// =========================================================================
function renderSlide5Svg() {
  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1350" fill="${OBSIDIAN_BG}"/>
  <rect x="50" y="50" width="980" height="1250" rx="36" fill="none" stroke="${BORDER_COLOR}" stroke-width="2"/>

  <!-- Top Badge -->
  <rect x="100" y="110" width="220" height="46" rx="23" fill="${BRAND_RED}" fill-opacity="0.18"/>
  <text x="210" y="140" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">INVITATION TICKET</text>
  <text x="960" y="140" fill="${TEXT_MUTED}" font-family="serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Headline -->
  <text x="100" y="240" font-family="'Noto Sans Devanagari', Georgia, serif" font-size="54" font-weight="800" fill="${TEXT_PRIMARY}">
    <tspan x="100" y="240">Your craft deserves</tspan>
    <tspan x="100" y="305" fill="${BRAND_RED}">readers, not scrolls.</tspan>
  </text>

  <!-- VIP Pass / Ticket Card -->
  <rect x="100" y="360" width="880" height="610" rx="28" fill="#1A1817" stroke="${BRAND_RED}" stroke-width="2"/>

  <!-- Ticket Header Band -->
  <path d="M 100 388 C 100 372 112 360 128 360 L 952 360 C 968 360 980 372 980 388 L 980 460 L 100 460 Z" fill="${BRAND_RED}"/>
  <text x="540" y="422" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="26" font-weight="800" letter-spacing="2" text-anchor="middle">★ FOUNDING WRITER PASS • COHORT 01 ★</text>

  <!-- Ticket Body Items -->
  <g transform="translate(150, 510)">
    <circle cx="20" cy="20" r="16" fill="${BRAND_RED}" fill-opacity="0.2"/>
    <text x="20" y="27" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="20" font-weight="900" text-anchor="middle">✓</text>
    <text x="60" y="28" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="26" font-weight="700">Permanent Signature Pen Name</text>
    <text x="60" y="60" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="20">Claim your 1-word literary handle before it's taken.</text>
  </g>

  <g transform="translate(150, 610)">
    <circle cx="20" cy="20" r="16" fill="${BRAND_RED}" fill-opacity="0.2"/>
    <text x="20" y="27" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="20" font-weight="900" text-anchor="middle">✓</text>
    <text x="60" y="28" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="26" font-weight="700">100% Organic Deck Distribution</text>
    <text x="60" y="60" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="20">Every story is presented to active readers in 3-min decks.</text>
  </g>

  <g transform="translate(150, 710)">
    <circle cx="20" cy="20" r="16" fill="${BRAND_RED}" fill-opacity="0.2"/>
    <text x="20" y="27" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="20" font-weight="900" text-anchor="middle">✓</text>
    <text x="60" y="28" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="26" font-weight="700">Distraction-Free Offline Reading &amp; Sync</text>
    <text x="60" y="60" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="20">Autosaved drafts, offline reader mode, zero video noise.</text>
  </g>

  <!-- Dashed Ticket Divider -->
  <line x1="130" y1="815" x2="950" y2="815" stroke="#3A322D" stroke-width="2" stroke-dasharray="12,10"/>

  <text x="540" y="870" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="24" font-weight="700" text-anchor="middle">Download Free on Google Play • Setup in 10 Seconds</text>
  <text x="540" y="910" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="20" text-anchor="middle">Publish your first swipeable story card deck tonight.</text>

  <!-- Dots -->
  <circle cx="500" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="528" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="556" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="584" cy="1050" r="4" fill="${TEXT_MUTED}" opacity="0.4"/>
  <circle cx="612" cy="1050" r="7" fill="${BRAND_RED}"/>

  <!-- CTA -->
  <rect x="100" y="1110" width="880" height="96" rx="22" fill="${BRAND_RED}"/>
  <text x="540" y="1170" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="30" font-weight="700" text-anchor="middle">Claim Your Pen Name on Google Play ➔</text>

  <text x="540" y="1255" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="20" opacity="0.6" text-anchor="middle">writon.cc • Google Play Store</text>
</svg>
`;
}

async function run() {
  const outputDir = 'C:/Users/Kumar/.gemini/antigravity/brain/4688c67b-8b46-4ec9-b19a-e1fea52e9fa9/social-cards';
  await fs.mkdir(outputDir, { recursive: true });

  console.log('Rendering distinct visual carousel slides...');

  // Slide 1
  const svg1 = renderSlide1Svg();
  await sharp(Buffer.from(svg1)).png({ quality: 95 }).toFile(path.join(outputDir, 'day4_fomo_slide_1.png'));
  console.log('Rendered Slide 1 (Editorial Cover)');

  // Slide 2
  const svg2 = renderSlide2Svg();
  await sharp(Buffer.from(svg2)).png({ quality: 95 }).toFile(path.join(outputDir, 'day4_fomo_slide_2.png'));
  console.log('Rendered Slide 2 (Scarcity Matrix with @handle Chips)');

  // Slide 3
  const svg3 = renderSlide3Svg();
  await sharp(Buffer.from(svg3)).png({ quality: 95 }).toFile(path.join(outputDir, 'day4_fomo_slide_3.png'));
  console.log('Rendered Slide 3 (Split Comparison: Video Feed vs Sanctuary)');

  // Slide 4
  const svg4 = await renderSlide4SvgWithPhone();
  await sharp(Buffer.from(svg4)).png({ quality: 95 }).toFile(path.join(outputDir, 'day4_fomo_slide_4.png'));
  console.log('Rendered Slide 4 (App Interface Showcase with hero-phones)');

  // Slide 5
  const svg5 = renderSlide5Svg();
  await sharp(Buffer.from(svg5)).png({ quality: 95 }).toFile(path.join(outputDir, 'day4_fomo_slide_5.png'));
  console.log('Rendered Slide 5 (Founding Writer VIP Ticket)');

  console.log('All 5 distinct slides generated successfully!');
}

run().catch(console.error);
