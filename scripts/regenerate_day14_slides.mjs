import sharp from 'sharp';
import fs from 'node:fs/promises';

const SLIDE_DATA = [
  {
    slideNumber: 1,
    lines: [
      "This carousel collects the 5 core craft",
      "ideas from Sprint 2 — each one a prompt",
      "you can return to anytime."
    ],
    caption: "Slide 1 of 5 • Sprint 2 Craft Recap"
  },
  {
    slideNumber: 2,
    lines: [
      "Instead of 'He was nervous,' show the",
      "physical tell: fingers tapping the table edge,",
      "a receipt folded in quarters."
    ],
    caption: "Slide 2 of 5 • Sprint 2 Craft Recap"
  },
  {
    slideNumber: 3,
    lines: [
      "Find the one physical object that holds the",
      "mood of the entire room. The loose shutter",
      "in rain, the tea gone cold."
    ],
    caption: "Slide 3 of 5 • Sprint 2 Craft Recap"
  },
  {
    slideNumber: 4,
    lines: [
      "Add one specific sound to your next",
      "paragraph: the drip of a tap, bicycle bells",
      "fading, the snap of a lock."
    ],
    caption: "Slide 4 of 5 • Sprint 2 Craft Recap"
  },
  {
    slideNumber: 5,
    lines: [
      "Use any of these three openings for your",
      "next piece on WritOn. Save this carousel.",
      "Return when you're ready to write."
    ],
    caption: "Slide 5 of 5 • Sprint 2 Craft Recap"
  }
];

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fixSlide(slideInfo) {
  const { slideNumber, lines, caption } = slideInfo;
  const sourcePath = `campaign/antigravity-2026-09-06-19/assets/day14/day14_carousel_slide_${slideNumber}.png`;
  const img = sharp(sourcePath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  // 1. Clean the overflow area horizontally across x=940 to 1080, y=585 to 635
  for (let x = 940; x < info.width; x++) {
    for (let y = 585; y <= 635; y++) {
      const topIdx = (550 * info.width + x) * info.channels;
      const botIdx = (670 * info.width + x) * info.channels;
      const curIdx = (y * info.width + x) * info.channels;
      data[curIdx] = Math.round((data[topIdx] + data[botIdx]) / 2);
      data[curIdx + 1] = Math.round((data[topIdx + 1] + data[botIdx + 1]) / 2);
      data[curIdx + 2] = Math.round((data[topIdx + 2] + data[botIdx + 2]) / 2);
    }
  }

  // 2. Build the inner box SVG with cleanly wrapped text
  const lineTspans = lines.map((line, idx) => {
    const yPos = 80 + idx * 44;
    return `<tspan x="51" y="${yPos}">${escapeXml(line)}</tspan>`;
  }).join('\n      ');

  const boxSvg = `
  <svg width="820" height="340" viewBox="0 0 820 340" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="820" height="340" rx="24" fill="#F6ECE0" stroke="#E9DCCF" stroke-width="1.5"/>
    <text font-family="Georgia, Cambria, serif" font-size="28" fill="#261F1C">
      ${lineTspans}
    </text>
    <text x="51" y="238" font-family="Arial, sans-serif" font-size="20" fill="#756860">${escapeXml(caption)}</text>
  </svg>
  `;

  const processedBuffer = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
    .composite([{
      input: Buffer.from(boxSvg),
      left: 130,
      top: 540
    }])
    .png({ quality: 95 })
    .toBuffer();

  const campaignDest = `campaign/antigravity-2026-09-06-19/assets/day14/day14_carousel_slide_${slideNumber}.png`;
  const publicDest = `public/assets/day14_carousel_slide_${slideNumber}.png`;

  await fs.writeFile(campaignDest, processedBuffer);
  await fs.writeFile(publicDest, processedBuffer);
  console.log(`✓ Day 14 Slide ${slideNumber} repaired and saved.`);
}

async function main() {
  console.log('Starting Day 14 carousel slide text overflow fix...');
  for (const item of SLIDE_DATA) {
    await fixSlide(item);
  }
  console.log('All 5 Day 14 slides successfully repaired!');
}

main().catch(err => {
  console.error('Error repairing slides:', err);
  process.exit(1);
});
