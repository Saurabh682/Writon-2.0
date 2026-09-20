import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxChars = 32) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxChars) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function generateWarmParchmentSlideSvg({
  slideNumber = 1,
  totalSlides = 4,
  role = 'hook',
  tag = 'WRITON CRAFT TRUTH',
  headline = '',
  bodyText = '',
  authorName = 'WritOn Community',
  footerCta = 'Swipe to Read →'
}) {
  const width = 1080;
  const height = 1350;

  const headlineLines = wrapText(headline, 22).slice(0, 3);
  // Dynamic layout calculation based on headline line count
  let headlineTspans = '';
  let headlineY = 400;
  for (const line of headlineLines) {
    headlineTspans += `<tspan x="140" y="${headlineY}">${escapeXml(line)}</tspan>\n`;
    headlineY += 62;
  }

  // Accent divider placed cleanly 24px below the last headline line
  const dividerY = headlineY - 14;

  // Body text starts cleanly below the divider with comfortable breathing room
  let bodyY = dividerY + 56;
  const bodyLines = wrapText(bodyText, 30).slice(0, 5);
  let bodyTspans = '';
  for (const line of bodyLines) {
    bodyTspans += `<tspan x="140" y="${bodyY}">${escapeXml(line)}</tspan>\n`;
    bodyY += 48;
  }

  const badgeText = escapeXml(tag.toUpperCase());

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="parchmentBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FAF5EE"/>
      <stop offset="100%" stop-color="#F4EFE6"/>
    </linearGradient>
  </defs>

  <!-- Background Base Canvas -->
  <rect width="${width}" height="${height}" fill="url(#parchmentBg)"/>

  <!-- Subtle Watercolor Corner Bloom Top-Right -->
  <circle cx="1000" cy="80" r="220" fill="#E75A2A" fill-opacity="0.05"/>
  <!-- Subtle Watercolor Corner Bloom Bottom-Left -->
  <circle cx="80" cy="1270" r="240" fill="#D45226" fill-opacity="0.05"/>

  <!-- Inner Card Container -->
  <rect x="60" y="60" width="960" height="1230" rx="28" fill="#FFFDF9" stroke="#E8DFD3" stroke-width="2"/>

  <!-- Tag Header -->
  <g transform="translate(140, 140)">
    <rect x="0" y="0" width="${Math.min(badgeText.length * 12 + 32, 360)}" height="38" rx="19" fill="#FAEDE7"/>
    <text x="${Math.min(badgeText.length * 12 + 32, 360) / 2}" y="24" fill="#D45226" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="1.5" text-anchor="middle">${badgeText}</text>
    <text x="780" y="26" fill="#6E655B" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" text-anchor="end">${slideNumber} / ${totalSlides}</text>
  </g>

  <!-- Decorative Quotation Mark -->
  <text x="140" y="320" fill="#D45226" font-family="Georgia, serif" font-size="90" font-weight="700" opacity="0.4">“</text>

  <!-- Headline -->
  <text font-family="Georgia, Cambria, serif" font-size="46" font-weight="700" fill="#1C1917" letter-spacing="-0.5">
    ${headlineTspans}
  </text>

  <!-- Accent Divider (Dynamically positioned with safe breathing room) -->
  <line x1="140" y1="${dividerY}" x2="260" y2="${dividerY}" stroke="#D45226" stroke-width="3" stroke-linecap="round" opacity="0.85"/>

  <!-- Body Text -->
  <text font-family="Georgia, Cambria, serif" font-size="30" font-style="italic" fill="#4A4239">
    ${bodyTspans}
  </text>

  <!-- Author Byline -->
  <g transform="translate(140, 980)">
    <text x="0" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#6E655B">— ${escapeXml(authorName)}</text>
  </g>

  <!-- Bottom CTA Anchor Bar -->
  <g transform="translate(140, 1150)">
    <line x1="0" y1="0" x2="800" y2="0" stroke="#E8DFD3" stroke-width="1"/>
    <text x="0" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" fill="#1C1917" letter-spacing="0.5">writon.cc</text>
    <text x="800" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600" fill="#D45226" text-anchor="end">${escapeXml(footerCta)}</text>
  </g>
</svg>
`;
}

export async function renderSlidePng(svgString, outputPath) {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await sharp(Buffer.from(svgString))
    .png({ quality: 95 })
    .toFile(outputPath);
  return outputPath;
}
