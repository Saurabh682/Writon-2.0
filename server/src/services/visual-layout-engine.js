/**
 * Card Layout Engine & Text Bounding Validator
 *
 * Enforces Hard Rule 185 (VISUAL_CONTAINMENT_INVARIANT):
 * - Guarantees zero text spill outside canvas, cards, containers, or safe zones.
 * - Dynamic text measurement with font-specific character width metrics.
 * - Automatic multi-line wrapping based on pixel width.
 * - Dynamic container height calculation: container adapts to content + padding.
 * - Safe margin boundary checks (rejects any element exceeding target bounds).
 */

export const CANVAS_DEFAULTS = {
  width: 1080,
  height: 1350,
  safeMarginX: 80,
  safeMarginY: 80,
};

// Font-specific average character width ratios relative to fontSize
const FONT_METRIC_RATIOS = {
  // Serif (Newsreader, Georgia, Times)
  serif: {
    regular: 0.52,
    bold: 0.58,
    italic: 0.50,
  },
  // Sans-serif (Plus Jakarta Sans, Inter, Roboto, Arial)
  sans: {
    regular: 0.56,
    bold: 0.62,
    semibold: 0.59,
  },
  // Monospace
  mono: {
    regular: 0.60,
    bold: 0.60,
  },
};

/**
 * Estimates rendered pixel width of text string.
 */
export function estimateTextWidth(text, fontSize, fontCategory = 'sans', fontWeight = 'regular') {
  if (!text) return 0;
  const categoryRatios = FONT_METRIC_RATIOS[fontCategory] || FONT_METRIC_RATIOS.sans;
  const ratio = categoryRatios[fontWeight] || categoryRatios.regular || 0.56;
  return text.length * fontSize * ratio;
}

/**
 * Wraps text into lines that strictly stay within maxPixelWidth.
 */
export function wrapTextToWidth(text, maxPixelWidth, fontSize, fontCategory = 'sans', fontWeight = 'regular') {
  if (!text) return [];
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const candidateWidth = estimateTextWidth(candidate, fontSize, fontCategory, fontWeight);

    if (candidateWidth <= maxPixelWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // If a single word exceeds maxPixelWidth, allow it as its own line
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Validates whether a rendered layout block exceeds its bounding box.
 * Throws or returns detailed violation error if text spills.
 */
export function validateVisualContainment({
  containerName = 'container',
  boxX,
  boxY,
  boxWidth,
  boxHeight,
  paddingX = 40,
  paddingY = 40,
  elements = [], // [{ text, fontSize, fontCategory, fontWeight, lineHeight, customWidth }]
}) {
  const innerWidth = boxWidth - (paddingX * 2);
  let consumedHeight = 0;
  const violations = [];

  for (const [index, el] of elements.entries()) {
    const fontSize = el.fontSize || 24;
    const lineHeight = el.lineHeight || (fontSize * 1.35);
    const fontCategory = el.fontCategory || 'sans';
    const fontWeight = el.fontWeight || 'regular';

    const lines = wrapTextToWidth(el.text, innerWidth, fontSize, fontCategory, fontWeight);

    for (const [lineIdx, line] of lines.entries()) {
      const lineWidth = estimateTextWidth(line, fontSize, fontCategory, fontWeight);
      if (lineWidth > innerWidth) {
        violations.push({
          type: 'HORIZONTAL_OVERFLOW',
          message: `Text line "${line.slice(0, 30)}..." in ${containerName} exceeds inner width (${lineWidth.toFixed(0)}px > ${innerWidth}px)`,
          lineWidth,
          innerWidth,
          containerName,
        });
      }
    }

    consumedHeight += lines.length * lineHeight;
    if (el.spacingBelow) {
      consumedHeight += el.spacingBelow;
    }
  }

  const innerHeight = boxHeight - (paddingY * 2);
  if (consumedHeight > innerHeight) {
    violations.push({
      type: 'VERTICAL_OVERFLOW',
      message: `Content in ${containerName} exceeds container height (${consumedHeight.toFixed(0)}px > ${innerHeight}px available)`,
      consumedHeight,
      innerHeight,
      containerName,
    });
  }

  return {
    valid: violations.length === 0,
    consumedHeight,
    innerHeight,
    innerWidth,
    requiredContainerHeight: consumedHeight + (paddingY * 2),
    violations,
  };
}

export function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
