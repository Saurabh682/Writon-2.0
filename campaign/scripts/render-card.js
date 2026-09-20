import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic sharp loader from server/node_modules if needed
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  try {
    const serverSharpPath = path.resolve(__dirname, '../../server/node_modules/sharp');
    sharp = (await import(serverSharpPath)).default;
  } catch (e) {
    console.warn('Sharp module not loaded yet:', e.message);
  }
}

const LOGO_PATH = path.resolve(__dirname, '../assets/brand/writon-logo.png');
let logoDataUri = '';
if (fs.existsSync(LOGO_PATH)) {
  const logoBuf = fs.readFileSync(LOGO_PATH);
  logoDataUri = `data:image/png;base64,${logoBuf.toString('base64')}`;
}

/**
 * Brand color tokens
 */
export const PALETTE = {
  paper: '#FFFDF9',
  paperCard: '#F8F4EE',
  obsidian: '#131415',
  obsidianCard: '#1A1C1E',
  inkPrimary: '#151718',
  inkMuted: '#6D6963',
  inkLight: '#EDE8DF',
  inkLightMuted: '#9E9B95',
  writonRed: '#E75A2A',
  borderLight: '#E8E2D9',
  borderDark: '#2C2E30'
};

/**
 * Escapes XML/SVG special characters
 */
function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wraps text into multiple lines for SVG rendering
 */
function wrapText(text, maxCharsPerLine = 36) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
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
 * Generates an SVG string for a branded story/quote card
 */
export function generateCardSvg({
  theme = 'light', // 'light' or 'dark'
  aspect = 'square', // 'square' (1080x1080) or 'story' (1080x1920)
  tag = 'STORY EXCERPT',
  headline = '',
  bodyText = '',
  authorName = 'WritOn Community',
  language = 'en',
  footerCta = 'Read on WritOn • Ad-Free'
}) {
  const width = 1080;
  const height = aspect === 'story' ? 1920 : 1080;
  const isDark = theme === 'dark';

  const bg = isDark ? PALETTE.obsidian : PALETTE.paper;
  const cardBg = isDark ? PALETTE.obsidianCard : PALETTE.paperCard;
  const textColor = isDark ? PALETTE.inkLight : PALETTE.inkPrimary;
  const mutedColor = isDark ? PALETTE.inkLightMuted : PALETTE.inkMuted;
  const borderColor = isDark ? PALETTE.borderDark : PALETTE.borderLight;
  const accentColor = PALETTE.writonRed;

  const bodyLines = wrapText(bodyText, aspect === 'story' ? 30 : 36);
  const lineHeight = 54;
  const startY = aspect === 'story' ? 700 : 420;

  const renderedLines = bodyLines.map((line, idx) => {
    return `<text x="540" y="${startY + (idx * lineHeight)}" text-anchor="middle" font-family="'Newsreader', 'Georgia', serif" font-size="38" font-style="italic" fill="${textColor}">${escapeXml(line)}</text>`;
  }).join('\n      ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&amp;display=swap');
    </style>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.08"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${bg}"/>

  <!-- Subtle Inner Card Container -->
  <rect x="70" y="70" width="${width - 140}" height="${height - 140}" rx="32" fill="${cardBg}" stroke="${borderColor}" stroke-width="2" filter="url(#shadow)"/>

  <!-- Top Brand Header -->
  <g transform="translate(120, 122)">
    <!-- Official Logo -->
    ${logoDataUri ? `<image href="${logoDataUri}" x="0" y="0" width="46" height="46"/>` : `<circle cx="23" cy="23" r="14" fill="${accentColor}"/>`}
    <text x="58" y="32" font-family="'Inter', sans-serif" font-weight="700" font-size="28" fill="${textColor}" letter-spacing="1">WRITON</text>

    <!-- Tag Badge -->
    <rect x="${width - 380}" y="6" width="160" height="34" rx="8" fill="${isDark ? '#26292B' : '#EAE4D9'}"/>
    <text x="${width - 300}" y="28" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="600" font-size="14" fill="${accentColor}" letter-spacing="1.5">${escapeXml(tag.toUpperCase())}</text>
  </g>

  <!-- Decorative Quote Mark -->
  <text x="540" y="${aspect === 'story' ? 580 : 330}" text-anchor="middle" font-family="'Georgia', serif" font-size="110" fill="${accentColor}" opacity="0.35">“</text>

  <!-- Headline if present -->
  ${headline ? `<text x="540" y="${aspect === 'story' ? 640 : 370}" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="700" font-size="32" fill="${accentColor}">${escapeXml(headline)}</text>` : ''}

  <!-- Body Manuscript Lines -->
  <g>
    ${renderedLines}
  </g>

  <!-- Author Attribution -->
  <g transform="translate(0, ${aspect === 'story' ? height - 380 : height - 260})">
    <line x1="460" y1="0" x2="620" y2="0" stroke="${accentColor}" stroke-width="2" opacity="0.6"/>
    <text x="540" y="44" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="600" font-size="24" fill="${mutedColor}" letter-spacing="0.5">— ${escapeXml(authorName)}</text>
  </g>

  <!-- Footer Banner -->
  <g transform="translate(120, ${height - 150})">
    <rect x="0" y="0" width="${width - 240}" height="48" rx="12" fill="${isDark ? '#1F2224' : '#EFEAE0'}"/>
    <text x="${(width - 240) / 2}" y="31" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="600" font-size="18" fill="${textColor}" letter-spacing="0.5">${escapeXml(footerCta)}</text>
  </g>
</svg>`;
}

/**
 * Renders SVG to PNG file on disk
 */
export async function renderCardPng(svgString, outputPath) {
  if (!sharp) {
    const serverSharpPath = path.resolve(__dirname, '../../server/node_modules/sharp');
    sharp = (await import(serverSharpPath)).default;
  }
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await sharp(Buffer.from(svgString))
    .png({ quality: 95 })
    .toFile(outputPath);

  return outputPath;
}
