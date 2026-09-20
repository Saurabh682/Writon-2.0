import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRAND_RED = '#E75A2A';
const OBSIDIAN_BG = '#111213';
const CARD_BG = '#1A1C1E';
const BORDER_COLOR = '#2A2C2E';
const TEXT_PRIMARY = '#EDE8DF';
const TEXT_MUTED = '#9A958D';

// SLIDE 1: Editorial Spotlight Cover (1080x1350)
export function renderSlide1Svg() {
  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow1" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#271914" stop-opacity="1"/>
      <stop offset="65%" stop-color="#131416" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0F1011" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="cardGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#222427"/>
      <stop offset="100%" stop-color="#161719"/>
    </linearGradient>
  </defs>

  <rect width="1080" height="1350" fill="url(#glow1)"/>
  <rect x="50" y="50" width="980" height="1250" rx="36" fill="none" stroke="${BORDER_COLOR}" stroke-width="2"/>

  <!-- Header Category Badge -->
  <rect x="100" y="110" width="250" height="46" rx="23" fill="${BRAND_RED}" fill-opacity="0.18"/>
  <text x="225" y="140" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">AUTHOR SPOTLIGHT</text>
  <text x="960" y="140" fill="${TEXT_MUTED}" font-family="Georgia, serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Big Decorative Quotation Mark -->
  <text x="100" y="290" fill="${BRAND_RED}" font-family="Georgia, serif" font-size="160" font-weight="900" opacity="0.25">“</text>

  <!-- Headline Excerpt -->
  <g transform="translate(100, 340)">
    <text font-family="Georgia, serif" font-size="52" font-weight="700" fill="${TEXT_PRIMARY}" letter-spacing="-0.5">
      <tspan x="0" y="0">“Platform 8 smelled of wet</tspan>
      <tspan x="0" y="68">jute, diesel exhaust, and cold</tspan>
      <tspan x="0" y="136" fill="${BRAND_RED}">mustard oil under the hum</tspan>
      <tspan x="0" y="204" fill="${BRAND_RED}">of fluorescent lights.”</tspan>
    </text>
  </g>

  <!-- Story & Author Meta Card -->
  <g transform="translate(100, 640)">
    <rect x="0" y="0" width="880" height="360" rx="28" fill="url(#cardGrad1)" stroke="${BORDER_COLOR}" stroke-width="1.5"/>

    <text x="50" y="60" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16" font-weight="800" letter-spacing="2">FEATURED STORY</text>
    <text x="50" y="110" fill="${TEXT_PRIMARY}" font-family="Georgia, serif" font-size="28" font-weight="700">The Last Train from Howrah Station at 2:15 AM</text>
    
    <!-- Author row -->
    <circle cx="80" cy="180" r="30" fill="#2A2C30" stroke="${BRAND_RED}" stroke-width="2"/>
    <text x="80" y="190" fill="${TEXT_PRIMARY}" font-family="Georgia, serif" font-size="24" font-weight="bold" text-anchor="middle">DR</text>
    
    <text x="130" y="175" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="24" font-weight="700">Devansh Roy</text>
    <text x="130" y="205" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="18">@devansh_roy • Novelist &amp; Short Story Writer</text>

    <!-- Divider -->
    <line x1="50" y1="245" x2="830" y2="245" stroke="${BORDER_COLOR}" stroke-width="1"/>

    <text x="50" y="290" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="20">
      A noir tale of two strangers, a yellow tram ticket, and midnight Kolkata.
    </text>
    <text x="50" y="325" fill="#4EBA6F" font-family="system-ui, sans-serif" font-size="18" font-weight="600">
      ✦ 78 Readers Engaged • 5-Minute Swipeable Deck
    </text>
  </g>

  <!-- Footer Hook -->
  <g transform="translate(100, 1080)">
    <text x="0" y="30" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="22">
      No video feeds. No 15-second stunts. Just pure craft.
    </text>
    <text x="0" y="70" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="26" font-weight="700">
      Swipe to peek inside the reader experience ➔
    </text>
  </g>

  <circle cx="540" cy="1220" r="6" fill="${BRAND_RED}"/>
  <circle cx="565" cy="1220" r="5" fill="#333"/>
  <circle cx="590" cy="1220" r="5" fill="#333"/>
  <circle cx="615" cy="1220" r="5" fill="#333"/>
  <circle cx="640" cy="1220" r="5" fill="#333"/>
</svg>`;
}

// SLIDE 2: Distraction-Free Reader Mockup (1080x1350)
export function renderSlide2Svg() {
  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1350" fill="${OBSIDIAN_BG}"/>
  <rect x="50" y="50" width="980" height="1250" rx="36" fill="none" stroke="${BORDER_COLOR}" stroke-width="2"/>

  <!-- Top bar -->
  <rect x="100" y="110" width="280" height="46" rx="23" fill="#222"/>
  <text x="240" y="140" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">THE READER INTERFACE</text>
  <text x="960" y="140" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="18" font-weight="700" text-anchor="end">ZERO CLUTTER</text>

  <g transform="translate(100, 190)">
    <text font-family="Georgia, serif" font-size="44" font-weight="700" fill="${TEXT_PRIMARY}">
      <tspan x="0" y="0">Built for those who cherish</tspan>
      <tspan x="0" y="52" fill="${BRAND_RED}">the written word.</tspan>
    </text>
    <text x="0" y="105" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="22">
      WritOn formats stories into elegant, bite-sized swipeable cards.
    </text>
  </g>

  <!-- Mobile Reader Frame Mockup -->
  <g transform="translate(190, 360)">
    <!-- Phone Outer Body -->
    <rect x="0" y="0" width="700" height="750" rx="40" fill="#18191B" stroke="#33363A" stroke-width="3"/>

    <!-- Status Bar / Story Header -->
    <rect x="40" y="40" width="620" height="50" rx="12" fill="#222427"/>
    <text x="60" y="72" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="16" font-weight="600">The Last Train from Howrah Station</text>
    <text x="630" y="72" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="end">Card 2 of 5</text>

    <!-- Reading Progress Bar -->
    <rect x="40" y="105" width="620" height="6" rx="3" fill="#2A2C30"/>
    <rect x="40" y="105" width="248" height="6" rx="3" fill="${BRAND_RED}"/>

    <!-- Actual Story Deck Text Card -->
    <rect x="40" y="130" width="620" height="470" rx="24" fill="#121315" stroke="#26282B" stroke-width="1.5"/>
    
    <g transform="translate(80, 190)">
      <text font-family="Georgia, serif" font-size="24" fill="${TEXT_PRIMARY}" line-height="1.8">
        <tspan x="0" y="0">The digital clock above the tea stall flickered</tspan>
        <tspan x="0" y="44">between 02:14 and 02:15. A boy in a soot-stained</tspan>
        <tspan x="0" y="88">vest was scraping charcoal from a clay stove,</tspan>
        <tspan x="0" y="132">his movements rhythmic, as if keeping time with</tspan>
        <tspan x="0" y="176">the shunting engines out in the yard.</tspan>
        <tspan x="0" y="240" fill="${TEXT_MUTED}" font-style="italic">“One lemon tea,” she said, her voice cutting</tspan>
        <tspan x="0" y="284" fill="${TEXT_MUTED}" font-style="italic">through the diesel drone like a tuning fork.</tspan>
      </text>
    </g>

    <!-- Bottom Controls: Reader Actions -->
    <g transform="translate(40, 630)">
      <rect x="0" y="0" width="130" height="48" rx="24" fill="#222427"/>
      <text x="65" y="31" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="16" font-weight="600" text-anchor="middle">👏 84 Applause</text>

      <rect x="150" y="0" width="110" height="48" rx="24" fill="#222427"/>
      <text x="205" y="31" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="16" font-weight="600" text-anchor="middle">💬 12 Notes</text>

      <rect x="480" y="0" width="140" height="48" rx="24" fill="${BRAND_RED}" fill-opacity="0.2" stroke="${BRAND_RED}" stroke-width="1"/>
      <text x="550" y="31" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="15" font-weight="700" text-anchor="middle">Bookmark 🔖</text>
    </g>
  </g>

  <!-- Pager Dots -->
  <circle cx="515" cy="1220" r="5" fill="#333"/>
  <circle cx="540" cy="1220" r="6" fill="${BRAND_RED}"/>
  <circle cx="565" cy="1220" r="5" fill="#333"/>
  <circle cx="590" cy="1220" r="5" fill="#333"/>
  <circle cx="615" cy="1220" r="5" fill="#333"/>
</svg>`;
}

// SLIDE 3: Author Bio & Craft Breakdown (1080x1350)
export function renderSlide3Svg() {
  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="authorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#221A16"/>
      <stop offset="100%" stop-color="#151719"/>
    </linearGradient>
  </defs>

  <rect width="1080" height="1350" fill="${OBSIDIAN_BG}"/>
  <rect x="50" y="50" width="980" height="1250" rx="36" fill="none" stroke="${BORDER_COLOR}" stroke-width="2"/>

  <!-- Top bar -->
  <rect x="100" y="110" width="240" height="46" rx="23" fill="${BRAND_RED}" fill-opacity="0.18"/>
  <text x="220" y="140" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">MEET THE WRITER</text>
  <text x="960" y="140" fill="${TEXT_MUTED}" font-family="Georgia, serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Author Hero Header -->
  <g transform="translate(100, 210)">
    <circle cx="70" cy="70" r="65" fill="#22252A" stroke="${BRAND_RED}" stroke-width="3"/>
    <text x="70" y="82" fill="${TEXT_PRIMARY}" font-family="Georgia, serif" font-size="42" font-weight="bold" text-anchor="middle">DR</text>

    <text x="165" y="55" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="42" font-weight="800">Devansh Roy</text>
    <text x="165" y="95" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">@devansh_roy</text>
    <text x="165" y="135" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="20">Novelist • Kolkata, India</text>
  </g>

  <!-- Bio & Craft Statement Box -->
  <g transform="translate(100, 420)">
    <rect x="0" y="0" width="880" height="280" rx="28" fill="url(#authorGrad)" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
    <text x="50" y="60" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16" font-weight="800" letter-spacing="2">AUTHOR BIOGRAPHY</text>
    <text x="50" y="110" fill="${TEXT_PRIMARY}" font-family="Georgia, serif" font-size="26" line-height="1.7">
      <tspan x="50" y="110">“Chronicling the nocturnal pulse of Kolkata, tram lines,</tspan>
      <tspan x="50" y="150">and forgotten tea stalls under fluorescent monsoon streetlights.”</tspan>
    </text>

    <line x1="50" y1="195" x2="830" y2="195" stroke="${BORDER_COLOR}" stroke-width="1"/>

    <text font-family="system-ui, sans-serif" font-size="20" fill="${TEXT_MUTED}">
      <tspan x="50" y="235">Writing exclusively in 5-minute decks</tspan>
      <tspan x="50" y="262">to bring back deliberate storytelling.</tspan>
    </text>
  </g>

  <!-- Metrics / Highlights Grid -->
  <g transform="translate(100, 740)">
    <rect x="0" y="0" width="275" height="180" rx="22" fill="${CARD_BG}" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
    <text x="40" y="60" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="18">GENRE</text>
    <text x="40" y="115" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="28" font-weight="700">Noir Fiction</text>
    <text x="40" y="148" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16">Original Series</text>

    <rect x="302" y="0" width="275" height="180" rx="22" fill="${CARD_BG}" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
    <text x="342" y="60" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="18">ENGAGEMENT</text>
    <text x="342" y="115" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="28" font-weight="700">84 Claps</text>
    <text x="342" y="148" fill="#4EBA6F" font-family="system-ui, sans-serif" font-size="16">Top 1% Reader Retention</text>

    <rect x="605" y="0" width="275" height="180" rx="22" fill="${CARD_BG}" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
    <text x="645" y="60" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="18">COMMUNITY</text>
    <text x="645" y="115" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="28" font-weight="700">Founding</text>
    <text x="645" y="148" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="16">Verified Pen Name</text>
  </g>

  <!-- Quote Footer -->
  <g transform="translate(100, 990)">
    <rect x="0" y="0" width="880" height="140" rx="20" fill="#17191C" stroke="#26282B" stroke-width="1"/>
    <text x="40" y="55" fill="${BRAND_RED}" font-size="28">“</text>
    <text x="75" y="55" fill="${TEXT_PRIMARY}" font-family="Georgia, serif" font-size="22" font-style="italic">
      WritOn gave my stories the quiet focus they never found on social algorithms.
    </text>
    <text x="75" y="95" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="18">
      — Devansh Roy (@devansh_roy)
    </text>
  </g>

  <!-- Pager Dots -->
  <circle cx="490" cy="1220" r="5" fill="#333"/>
  <circle cx="515" cy="1220" r="5" fill="#333"/>
  <circle cx="540" cy="1220" r="6" fill="${BRAND_RED}"/>
  <circle cx="565" cy="1220" r="5" fill="#333"/>
  <circle cx="590" cy="1220" r="5" fill="#333"/>
</svg>`;
}

// SLIDE 4: Writers' Constellation (1080x1350)
export function renderSlide4Svg() {
  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1350" fill="${OBSIDIAN_BG}"/>
  <rect x="50" y="50" width="980" height="1250" rx="36" fill="none" stroke="${BORDER_COLOR}" stroke-width="2"/>

  <!-- Top bar -->
  <rect x="100" y="110" width="280" height="46" rx="23" fill="#222"/>
  <text x="240" y="140" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">THE WRITING COMMUNITY</text>
  <text x="960" y="140" fill="${BRAND_RED}" font-family="Georgia, serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- Title -->
  <g transform="translate(100, 190)">
    <text font-family="Georgia, serif" font-size="44" font-weight="700" fill="${TEXT_PRIMARY}">
      <tspan x="0" y="0">Every literary voice</tspan>
      <tspan x="0" y="52" fill="${BRAND_RED}">finds its home here.</tspan>
    </text>
    <text x="0" y="105" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="22">
      Poets, essayists, and novelists sharing original work daily.
    </text>
  </g>

  <!-- Voice 1: Kavya Nair -->
  <g transform="translate(100, 340)">
    <rect x="0" y="0" width="880" height="200" rx="24" fill="${CARD_BG}" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
    <circle cx="60" cy="60" r="32" fill="#242028" stroke="#8E7CC3" stroke-width="2"/>
    <text x="60" y="69" fill="#EDE8DF" font-family="Georgia, serif" font-size="22" font-weight="bold" text-anchor="middle">KN</text>

    <text x="115" y="55" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="24" font-weight="700">Kavya Nair</text>
    <text x="115" y="85" fill="#8E7CC3" font-family="system-ui, sans-serif" font-size="18">@kavya_nair • Fort Kochi • Poetry</text>

    <text x="50" y="140" fill="${TEXT_MUTED}" font-family="Georgia, serif" font-size="20" font-style="italic">
      “The sky unspools its bruised grey silk, over clotheslines weighed with rain...”
    </text>
    <text x="50" y="175" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="16" font-weight="600">
      📖 Cartography of an Old Balcony • 77 Likes
    </text>
  </g>

  <!-- Voice 2: Dr. Sunita Banerjee -->
  <g transform="translate(100, 570)">
    <rect x="0" y="0" width="880" height="200" rx="24" fill="${CARD_BG}" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
    <circle cx="60" cy="60" r="32" fill="#1B262C" stroke="#4592AF" stroke-width="2"/>
    <text x="60" y="69" fill="#EDE8DF" font-family="Georgia, serif" font-size="22" font-weight="bold" text-anchor="middle">SB</text>

    <text x="115" y="55" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="24" font-weight="700">Dr. Sunita Banerjee</text>
    <text x="115" y="85" fill="#4592AF" font-family="system-ui, sans-serif" font-size="18">@sunita_banerjee • Professor of Literature • Essays</text>

    <text x="50" y="140" fill="${TEXT_MUTED}" font-family="Georgia, serif" font-size="20" font-style="italic">
      “Why the human intellect requires intentional forgetting to maintain contemplative depth.”
    </text>
    <text x="50" y="175" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="16" font-weight="600">
      📖 The Cache of the Mind • 83 Likes
    </text>
  </g>

  <!-- Voice 3: Ishaq Qureshi -->
  <g transform="translate(100, 800)">
    <rect x="0" y="0" width="880" height="200" rx="24" fill="${CARD_BG}" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
    <circle cx="60" cy="60" r="32" fill="#2A201C" stroke="${BRAND_RED}" stroke-width="2"/>
    <text x="60" y="69" fill="#EDE8DF" font-family="Georgia, serif" font-size="22" font-weight="bold" text-anchor="middle">IQ</text>

    <text x="115" y="55" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="24" font-weight="700">Ishaq Qureshi</text>
    <text x="115" y="85" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="18">@ishaq_qureshi • Shayar • Delhi Tehzeeb</text>

    <text x="50" y="140" fill="${TEXT_MUTED}" font-family="Georgia, serif" font-size="20" font-style="italic">
      “Dard jab hadd se guzarta hai toh gaa leta hoon, aankh nam hoti hai toh shama jala leta hoon...”
    </text>
    <text x="50" y="175" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="16" font-weight="600">
      📖 Dard Aur Umeed Ka Taraana • 82 Likes
    </text>
  </g>

  <!-- Bottom Notice -->
  <text x="540" y="1080" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="19" text-anchor="middle">
    Over 500+ original stories published across Hindi, English, Bengali, &amp; Marathi.
  </text>

  <!-- Pager Dots -->
  <circle cx="465" cy="1220" r="5" fill="#333"/>
  <circle cx="490" cy="1220" r="5" fill="#333"/>
  <circle cx="515" cy="1220" r="5" fill="#333"/>
  <circle cx="540" cy="1220" r="6" fill="${BRAND_RED}"/>
  <circle cx="565" cy="1220" r="5" fill="#333"/>
</svg>`;
}

// SLIDE 5: Founding Writer Pass / CTA (1080x1350)
export function renderSlide5Svg() {
  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="vipGlow" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#2B1B14" stop-opacity="1"/>
      <stop offset="65%" stop-color="#141517" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0D0E0F" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="vipBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E75A2A"/>
      <stop offset="50%" stop-color="#FF9E68"/>
      <stop offset="100%" stop-color="#E75A2A"/>
    </linearGradient>
    <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E75A2A"/>
      <stop offset="100%" stop-color="#FF7A45"/>
    </linearGradient>
  </defs>

  <rect width="1080" height="1350" fill="url(#vipGlow)"/>
  <rect x="50" y="50" width="980" height="1250" rx="36" fill="none" stroke="${BORDER_COLOR}" stroke-width="2"/>

  <!-- Top bar -->
  <rect x="100" y="110" width="280" height="46" rx="23" fill="${BRAND_RED}" fill-opacity="0.2"/>
  <text x="240" y="140" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">YOUR INVITATION</text>
  <text x="960" y="140" fill="${TEXT_MUTED}" font-family="Georgia, serif" font-size="24" font-weight="700" text-anchor="end">WritOn.</text>

  <!-- VIP TICKET PASS CONTAINER -->
  <g transform="translate(100, 210)">
    <rect x="0" y="0" width="880" height="740" rx="32" fill="#181A1C" stroke="url(#vipBorder)" stroke-width="3"/>

    <text x="60" y="70" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="18" font-weight="800" letter-spacing="2.5">
      FOUNDING WRITER PASS • 2026
    </text>

    <text x="60" y="140" font-family="Georgia, serif" font-size="48" font-weight="700" fill="${TEXT_PRIMARY}">
      Your stories deserve
      <tspan x="60" y="200" fill="${BRAND_RED}">genuine readers.</tspan>
    </text>

    <text x="60" y="260" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="24">
      Stop losing your prose to the noise of video feeds.
    </text>

    <!-- Value Props Checklist -->
    <g transform="translate(60, 310)">
      <circle cx="20" cy="25" r="16" fill="${BRAND_RED}" fill-opacity="0.2"/>
      <text x="20" y="32" fill="${BRAND_RED}" font-size="20" font-weight="bold" text-anchor="middle">✓</text>
      <text x="60" y="32" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">
        Clean 1-word pen names (@yourname) are still available
      </text>

      <circle cx="20" cy="90" r="16" fill="${BRAND_RED}" fill-opacity="0.2"/>
      <text x="20" y="97" fill="${BRAND_RED}" font-size="20" font-weight="bold" text-anchor="middle">✓</text>
      <text x="60" y="97" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">
        100% organic deck distribution directly to readers
      </text>

      <circle cx="20" cy="155" r="16" fill="${BRAND_RED}" fill-opacity="0.2"/>
      <text x="20" y="162" fill="${BRAND_RED}" font-size="20" font-weight="bold" text-anchor="middle">✓</text>
      <text x="60" y="162" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">
        Distraction-free, zero-ad sanctuary for literature
      </text>

      <circle cx="20" cy="220" r="16" fill="${BRAND_RED}" fill-opacity="0.2"/>
      <text x="20" y="227" fill="${BRAND_RED}" font-size="20" font-weight="bold" text-anchor="middle">✓</text>
      <text x="60" y="227" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">
        Offline-first mobile editor with automatic sync
      </text>
    </g>

    <!-- Ticket Tear Line -->
    <line x1="0" y1="590" x2="880" y2="590" stroke="${BORDER_COLOR}" stroke-width="2" stroke-dasharray="10 8"/>

    <text x="60" y="640" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="19">
      Pass Holder Status: <tspan fill="#4EBA6F" font-weight="700">EARLY ADOPTER ACCESS ACTIVE</tspan>
    </text>
    <text x="60" y="682" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="20" font-weight="800" letter-spacing="1">
      ✦ 100% FREE SANCTUARY ON GOOGLE PLAY
    </text>
  </g>

  <!-- CTA Button -->
  <g transform="translate(100, 1000)">
    <rect x="0" y="0" width="880" height="100" rx="50" fill="url(#btnGrad)"/>
    <text x="440" y="62" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="30" font-weight="800" text-anchor="middle" letter-spacing="1">
      DOWNLOAD WRITON ON GOOGLE PLAY ➔
    </text>
  </g>

  <!-- Shortlink Text -->
  <text x="540" y="1160" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="22" text-anchor="middle">
    writon.cc/go/2609_d05_ig_carousel_en_author_spotlight
  </text>

  <!-- Pager Dots -->
  <circle cx="440" cy="1220" r="5" fill="#333"/>
  <circle cx="465" cy="1220" r="5" fill="#333"/>
  <circle cx="490" cy="1220" r="5" fill="#333"/>
  <circle cx="515" cy="1220" r="5" fill="#333"/>
  <circle cx="540" cy="1220" r="6" fill="${BRAND_RED}"/>
</svg>`;
}

// SLIDE 6: Vertical Story (1080x1920)
export function renderStorySvg() {
  return `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="storyGlow" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#2B1A14" stop-opacity="1"/>
      <stop offset="65%" stop-color="#131416" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0F1011" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="storyCard" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#222427"/>
      <stop offset="100%" stop-color="#151618"/>
    </linearGradient>
    <linearGradient id="btnGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E75A2A"/>
      <stop offset="100%" stop-color="#FF7A45"/>
    </linearGradient>
  </defs>

  <rect width="1080" height="1920" fill="url(#storyGlow)"/>
  <rect x="50" y="90" width="980" height="1740" rx="40" fill="none" stroke="${BORDER_COLOR}" stroke-width="2" opacity="0.6"/>

  <!-- Header -->
  <g transform="translate(100, 150)">
    <rect x="0" y="0" width="250" height="52" rx="26" fill="${BRAND_RED}" fill-opacity="0.2"/>
    <circle cx="28" cy="26" r="7" fill="${BRAND_RED}"/>
    <text x="50" y="33" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="18" font-weight="800" letter-spacing="1.5">AUTHOR SPOTLIGHT</text>
    <text x="880" y="35" fill="${TEXT_PRIMARY}" font-family="Georgia, serif" font-size="28" font-weight="700" text-anchor="end">WritOn.</text>
  </g>

  <!-- Big Quote -->
  <text x="100" y="340" fill="${BRAND_RED}" font-family="Georgia, serif" font-size="180" font-weight="900" opacity="0.25">“</text>

  <g transform="translate(100, 390)">
    <text font-family="Georgia, serif" font-size="56" font-weight="700" fill="${TEXT_PRIMARY}" letter-spacing="-0.5">
      <tspan x="0" y="0">“Platform 8 smelled of wet</tspan>
      <tspan x="0" y="72">jute, diesel exhaust, and</tspan>
      <tspan x="0" y="144" fill="${BRAND_RED}">cold mustard oil under the</tspan>
      <tspan x="0" y="216" fill="${BRAND_RED}">hum of fluorescent lights.”</tspan>
    </text>
  </g>

  <text x="100" y="730" fill="${TEXT_MUTED}" font-family="Georgia, serif" font-size="26" font-style="italic">
    — From “The Last Train from Howrah Station at 2:15 AM” by Devansh Roy
  </text>

  <!-- Reader Card Preview in Story -->
  <g transform="translate(100, 820)">
    <rect x="0" y="0" width="880" height="440" rx="32" fill="url(#storyCard)" stroke="${BORDER_COLOR}" stroke-width="2"/>

    <text x="50" y="60" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="18" font-weight="800" letter-spacing="2">INSIDE WRITON</text>
    <text x="50" y="110" fill="${TEXT_PRIMARY}" font-family="Georgia, serif" font-size="32" font-weight="700">Read Original Stories in 3-Minute Decks</text>

    <!-- Checklist -->
    <g transform="translate(50, 160)">
      <rect x="0" y="0" width="780" height="65" rx="16" fill="#1B1C1E"/>
      <text x="30" y="41" fill="#4EBA6F" font-size="24" font-weight="bold">✓</text>
      <text x="70" y="41" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">Distraction-free typography (Serif / Sans / Night mode)</text>

      <rect x="0" y="85" width="780" height="65" rx="16" fill="#1B1C1E"/>
      <text x="30" y="126" fill="#4EBA6F" font-size="24" font-weight="bold">✓</text>
      <text x="70" y="126" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">100% ad-free • Offline reading enabled</text>

      <rect x="0" y="170" width="780" height="65" rx="16" fill="#1B1C1E"/>
      <text x="30" y="211" fill="#4EBA6F" font-size="24" font-weight="bold">✓</text>
      <text x="70" y="211" fill="${TEXT_PRIMARY}" font-family="system-ui, sans-serif" font-size="22" font-weight="600">Writers keep their 1-word pen names and full ownership</text>
    </g>
  </g>

  <!-- Interactive Sticker Anchor -->
  <g transform="translate(100, 1340)">
    <rect x="0" y="0" width="880" height="270" rx="32" fill="#1B1714" stroke="${BRAND_RED}" stroke-width="2"/>
    <text x="440" y="60" fill="${BRAND_RED}" font-family="system-ui, sans-serif" font-size="22" font-weight="800" letter-spacing="2" text-anchor="middle">READ NOW ON GOOGLE PLAY</text>
    
    <rect x="60" y="90" width="760" height="100" rx="50" fill="url(#btnGrad2)"/>
    <text x="440" y="152" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="30" font-weight="800" text-anchor="middle">TAP TO READ &amp; CLAIM PEN NAME ➔</text>
    
    <text x="440" y="235" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="22" text-anchor="middle">Free on Google Play • No Ads Ever</text>
  </g>

  <text x="540" y="1710" fill="${TEXT_MUTED}" font-family="system-ui, sans-serif" font-size="22" text-anchor="middle">
    writon.cc/go/2609_d05_ig_carousel_en_author_spotlight
  </text>
</svg>`;
}

export async function generateAllDay5Cards(outputDir) {
  await fs.mkdir(outputDir, { recursive: true });

  const files = [
    { name: 'day5_spotlight_slide_1.png', svg: renderSlide1Svg() },
    { name: 'day5_spotlight_slide_2.png', svg: renderSlide2Svg() },
    { name: 'day5_spotlight_slide_3.png', svg: renderSlide3Svg() },
    { name: 'day5_spotlight_slide_4.png', svg: renderSlide4Svg() },
    { name: 'day5_spotlight_slide_5.png', svg: renderSlide5Svg() },
    { name: 'day5_spotlight_story.png', svg: renderStorySvg() },
  ];

  console.log('Rendering Day 5 Visual Cards...');
  const paths = [];
  for (const item of files) {
    const filePath = path.join(outputDir, item.name);
    await sharp(Buffer.from(item.svg)).png().toFile(filePath);
    console.log(`✅ Generated: ${item.name}`);
    paths.push(filePath);
  }

  return paths;
}

if (process.argv[1] && process.argv[1].endsWith('generate-day5-spotlight-cards.mjs')) {
  const targetDir = 'd:/VibeCode/WritOn-PowerUp/campaign/day5-assets';
  generateAllDay5Cards(targetDir).catch(console.error);
}
