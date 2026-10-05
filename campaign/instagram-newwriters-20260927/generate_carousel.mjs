import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, 'assets');

const SLIDES = [
  {
    slideNumber: 1,
    tag: 'WRITING CRAFT',
    type: 'cover',
    titleLine1: 'New writers: 5 writing beliefs',
    titleLine2: 'you may outgrow',
    titleLine3: '— and what to try instead',
    subtitle: 'Swipe to explore the 5 shifts →',
  },
  {
    slideNumber: 2,
    tag: 'BELIEF 01',
    type: 'belief',
    belief: '“I should polish every sentence as I draft.”',
    insteadPrefix: 'WHAT TO TRY INSTEAD',
    sentence1: 'Draft to find the idea.',
    sentence2: 'Revise to make it clear.',
  },
  {
    slideNumber: 3,
    tag: 'BELIEF 02',
    type: 'belief',
    belief: '“Big words make a line stronger.”',
    insteadPrefix: 'WHAT TO TRY INSTEAD',
    sentence1: 'Choose the exact noun and verb.',
    sentence2: 'Let precision do the work.',
  },
  {
    slideNumber: 4,
    tag: 'BELIEF 03',
    type: 'belief',
    belief: '“I need to explain what the character feels.”',
    insteadPrefix: 'WHAT TO TRY INSTEAD',
    sentence1: 'Show an action or detail.',
    sentence2: 'Give the reader room to understand it.',
  },
  {
    slideNumber: 5,
    tag: 'BELIEF 04',
    type: 'belief',
    belief: '“My story has to start at the beginning.”',
    insteadPrefix: 'WHAT TO TRY INSTEAD',
    sentence1: 'Start where something changes.',
    sentence2: 'Add the background the reader needs after.',
  },
  {
    slideNumber: 6,
    tag: 'BELIEF 05',
    type: 'belief',
    belief: '“If I worked hard on a sentence, it should stay.”',
    insteadPrefix: 'WHAT TO TRY INSTEAD',
    sentence1: 'Keep what serves the meaning, scene, or voice.',
    sentence2: 'Revise the rest.',
  },
  {
    slideNumber: 7,
    tag: 'PERSPECTIVE',
    type: 'outro',
    title: 'Your writing changes as you do.',
    instruction: 'Pick one belief to test in your next draft.',
    saveAction: 'Save this for revision day.',
  }
];

function buildSlideHtml(slide, totalSlides = 7) {
  let contentHtml = '';

  if (slide.type === 'cover') {
    contentHtml = `
      <div class="content-box cover-box">
        <div class="eyebrow-label">CRAFT ESSENTIALS</div>
        <h1 class="cover-headline">
          <span class="hl-line">${slide.titleLine1}</span>
          <span class="hl-line">${slide.titleLine2}</span>
          <span class="hl-line hl-accent">${slide.titleLine3}</span>
        </h1>
        <div class="flourish-rule">
          <span class="flourish-line"></span>
          <span class="flourish-diamond">◆</span>
          <span class="flourish-line"></span>
        </div>
        <p class="swipe-prompt">${slide.subtitle}</p>
      </div>
    `;
  } else if (slide.type === 'belief') {
    contentHtml = `
      <div class="content-box belief-box">
        <div class="belief-container">
          <div class="belief-pretitle">THE BELIEF</div>
          <h2 class="belief-text">${slide.belief}</h2>
        </div>

        <div class="flourish-rule">
          <span class="flourish-line"></span>
          <span class="flourish-diamond">◆</span>
          <span class="flourish-line"></span>
        </div>

        <div class="instead-card">
          <div class="instead-label">${slide.insteadPrefix}</div>
          <p class="instead-sentence line-primary">${slide.sentence1}</p>
          <p class="instead-sentence line-secondary">${slide.sentence2}</p>
        </div>
      </div>
    `;
  } else if (slide.type === 'outro') {
    contentHtml = `
      <div class="content-box outro-box">
        <div class="bookmark-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#D45226" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h2 class="outro-title">${slide.title}</h2>
        <p class="outro-instruction">${slide.instruction}</p>
        <div class="flourish-rule">
          <span class="flourish-line"></span>
          <span class="flourish-diamond">◆</span>
          <span class="flourish-line"></span>
        </div>
        <div class="save-pill">
          <span>${slide.saveAction}</span>
        </div>
      </div>
    `;
  }

  // Generate pagination dots
  let paginationDots = '';
  for (let i = 1; i <= totalSlides; i++) {
    const isActive = i === slide.slideNumber;
    paginationDots += `<span class="dot ${isActive ? 'active' : ''}"></span>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Slide ${slide.slideNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500;1,6..72,600&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 1080px;
      height: 1350px;
      background: #FAF5EE;
      color: #1C1917;
      font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
      position: relative;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* Natural fibrous parchment texture simulation */
    .parchment-canvas {
      position: absolute;
      inset: 0;
      background: 
        radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.8) 0%, transparent 60%),
        radial-gradient(circle at 82% 80%, rgba(244, 237, 226, 0.75) 0%, transparent 60%),
        linear-gradient(150deg, #FAF5EE 0%, #F5ECE0 50%, #FAF5EE 100%);
      z-index: 1;
    }

    /* Organic watercolor blooms in diagonal corners */
    .bloom-top-right {
      position: absolute;
      top: -100px;
      right: -100px;
      width: 520px;
      height: 480px;
      background: radial-gradient(circle, rgba(231, 90, 42, 0.18) 0%, rgba(212, 82, 38, 0.09) 45%, rgba(250, 245, 238, 0) 75%);
      filter: blur(52px);
      z-index: 2;
      pointer-events: none;
    }
    .bloom-bottom-left {
      position: absolute;
      bottom: -100px;
      left: -100px;
      width: 560px;
      height: 520px;
      background: radial-gradient(circle, rgba(212, 82, 38, 0.16) 0%, rgba(232, 176, 142, 0.10) 50%, rgba(250, 245, 238, 0) 75%);
      filter: blur(56px);
      z-index: 2;
      pointer-events: none;
    }
    .bloom-accent-gold {
      position: absolute;
      top: 42%;
      right: -70px;
      width: 360px;
      height: 360px;
      background: radial-gradient(circle, rgba(197, 160, 89, 0.09) 0%, rgba(250, 245, 238, 0) 70%);
      filter: blur(44px);
      z-index: 2;
      pointer-events: none;
    }

    /* Faint Capital Serif 'W' Watermark Centered ~8% Opacity */
    .watermark-w {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 540px;
      font-family: 'Newsreader', Georgia, serif;
      font-weight: 400;
      color: #E8DFD3;
      opacity: 0.35;
      z-index: 3;
      pointer-events: none;
      user-select: none;
    }

    /* Inner Card Frame */
    .card-frame {
      position: absolute;
      inset: 44px;
      border: 1.5px solid #E8DFD3;
      border-radius: 28px;
      background: rgba(255, 253, 249, 0.58);
      backdrop-filter: blur(2px);
      z-index: 4;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 54px 64px 40px 64px;
    }

    /* Header Bar */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .tag-badge {
      display: inline-flex;
      align-items: center;
      padding: 8px 18px;
      border-radius: 20px;
      background: #FAEDE7;
      border: 1px solid #F0D5C9;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #D45226;
      letter-spacing: 2px;
    }
    .slide-counter {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: #7C7267;
      letter-spacing: 1px;
    }

    /* Content Box with 50%+ Whitespace */
    .content-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 24px 16px 36px 16px;
    }

    /* Cover Slide Styling */
    .cover-box .eyebrow-label {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 3px;
      color: #D45226;
      margin-bottom: 28px;
      text-transform: uppercase;
    }
    .cover-headline {
      font-size: 54px;
      font-weight: 700;
      line-height: 1.28;
      color: #1C1917;
      letter-spacing: -0.8px;
      max-width: 840px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .hl-line {
      display: block;
    }
    .hl-accent {
      color: #38312C;
      font-weight: 600;
      font-style: italic;
    }
    .swipe-prompt {
      font-family: 'Newsreader', Georgia, serif;
      font-style: italic;
      font-size: 26px;
      font-weight: 500;
      color: #D45226;
      margin-top: 24px;
      letter-spacing: 0.2px;
    }

    /* Belief Slides Styling */
    .belief-box {
      max-width: 820px;
      margin: 0 auto;
      width: 100%;
    }
    .belief-container {
      margin-bottom: 6px;
    }
    .belief-pretitle {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 2.5px;
      color: #9C8F84;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .belief-text {
      font-size: 46px;
      font-weight: 600;
      line-height: 1.32;
      color: #1C1917;
      letter-spacing: -0.5px;
      max-width: 780px;
      margin: 0 auto;
    }

    .instead-card {
      background: rgba(246, 237, 226, 0.72);
      border: 1px solid #E6D7C8;
      border-radius: 22px;
      padding: 34px 44px;
      width: 100%;
      max-width: 780px;
      margin-top: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
    }
    .instead-label {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: #D45226;
      letter-spacing: 2px;
      margin-bottom: 14px;
    }
    .instead-sentence {
      font-family: 'Newsreader', Georgia, serif;
      font-size: 34px;
      line-height: 1.42;
      letter-spacing: -0.2px;
    }
    .line-primary {
      font-weight: 600;
      color: #26211D;
      margin-bottom: 6px;
    }
    .line-secondary {
      font-weight: 500;
      font-style: italic;
      color: #D45226;
    }

    /* Outro Slide Styling */
    .outro-box {
      max-width: 780px;
      margin: 0 auto;
    }
    .bookmark-icon {
      margin-bottom: 22px;
      opacity: 0.9;
    }
    .outro-title {
      font-size: 52px;
      font-weight: 700;
      line-height: 1.25;
      color: #1C1917;
      letter-spacing: -0.8px;
      margin-bottom: 22px;
    }
    .outro-instruction {
      font-family: 'Newsreader', Georgia, serif;
      font-size: 33px;
      font-style: italic;
      line-height: 1.4;
      color: #4A4239;
      margin-bottom: 12px;
    }
    .save-pill {
      display: inline-block;
      padding: 16px 38px;
      border-radius: 30px;
      background: #FAEDE7;
      border: 1.5px solid #F0D5C9;
      font-family: 'Newsreader', Georgia, serif;
      font-size: 26px;
      font-weight: 600;
      color: #D45226;
      margin-top: 18px;
      letter-spacing: 0.2px;
    }

    /* Flourish Rule */
    .flourish-rule {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 320px;
      margin: 26px auto;
      opacity: 0.65;
    }
    .flourish-line {
      flex: 1;
      height: 1px;
      background: #D45226;
    }
    .flourish-diamond {
      padding: 0 14px;
      color: #D45226;
      font-size: 10px;
    }

    /* Footer & Botanical Accents */
    .footer-bar {
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid rgba(232, 223, 211, 0.85);
    }
    .pagination-dots {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 14px;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #7C7267;
      opacity: 0.35;
      display: inline-block;
    }
    .dot.active {
      width: 18px;
      height: 6px;
      border-radius: 4px;
      background: #D45226;
      opacity: 1;
    }
    .brand-handle {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: #7C7267;
      letter-spacing: 2px;
      text-transform: lowercase;
    }

    /* Botanical Wildflower Stems in Bottom-Left */
    .botanical-left {
      position: absolute;
      bottom: 18px;
      left: 28px;
      width: 95px;
      height: 115px;
      opacity: 0.42;
      pointer-events: none;
    }
    /* Vintage Quill Feather in Bottom-Right */
    .quill-right {
      position: absolute;
      bottom: 18px;
      right: 28px;
      width: 95px;
      height: 115px;
      opacity: 0.42;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="parchment-canvas"></div>
  <div class="bloom-top-right"></div>
  <div class="bloom-bottom-left"></div>
  <div class="bloom-accent-gold"></div>
  <div class="watermark-w">W</div>

  <div class="card-frame">
    <!-- Header -->
    <div class="header-bar">
      <div class="tag-badge">${slide.tag}</div>
      <div class="slide-counter">${slide.slideNumber} / ${totalSlides}</div>
    </div>

    <!-- Main Content -->
    ${contentHtml}

    <!-- Footer -->
    <div class="footer-bar">
      <!-- Botanical Stems Bottom-Left -->
      <svg class="botanical-left" viewBox="0 0 100 120" fill="none">
        <path d="M15,115 Q35,70 50,30 Q58,12 68,2" stroke="#7C7267" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M30,85 Q12,70 8,50" stroke="#7C7267" stroke-width="1.4" stroke-linecap="round"/>
        <ellipse cx="68" cy="2" rx="6" ry="11" transform="rotate(25 68 2)" fill="#E75A2A" opacity="0.85"/>
        <ellipse cx="8" cy="50" rx="5" ry="9" transform="rotate(-30 8 50)" fill="#C5A059" opacity="0.75"/>
        <ellipse cx="45" cy="40" rx="4" ry="8" transform="rotate(35 45 40)" fill="#7C7267" opacity="0.6"/>
      </svg>

      <!-- Vintage Quill Bottom-Right -->
      <svg class="quill-right" viewBox="0 0 100 120" fill="none">
        <path d="M85,115 Q65,65 45,25 Q35,5 20,-5" stroke="#7C7267" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M20,-5 Q5,25 30,55 Q42,75 52,95 Q60,110 65,115 Q55,80 40,50 Q28,25 20,-5 Z" fill="#E75A2A" fill-opacity="0.16" stroke="#C5A059" stroke-width="1.3"/>
        <circle cx="86" cy="116" r="2.5" fill="#1C1A17" opacity="0.7"/>
      </svg>

      <div class="pagination-dots">
        ${paginationDots}
      </div>
      <div class="brand-handle">@writon_socialapp</div>
    </div>
  </div>
</body>
</html>`;
}

export async function generateAllSlides() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  console.log('🚀 Launching Chromium to render 7 Instagram carousel slides...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 1
  });

  const generatedFiles = [];

  for (const slide of SLIDES) {
    const page = await context.newPage();
    const html = buildSlideHtml(slide, SLIDES.length);
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Wait for fonts to be loaded
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const outputPath = path.join(OUTPUT_DIR, `slide_${slide.slideNumber}.png`);
    await page.screenshot({ path: outputPath, type: 'png' });
    console.log(`✅ Saved Slide ${slide.slideNumber} -> ${outputPath}`);
    generatedFiles.push(outputPath);
    await page.close();
  }

  await browser.close();
  console.log(`🎉 Successfully rendered all ${generatedFiles.length} slides!`);
  return generatedFiles;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllSlides().catch((err) => {
    console.error('❌ Error rendering carousel:', err);
    process.exit(1);
  });
}
