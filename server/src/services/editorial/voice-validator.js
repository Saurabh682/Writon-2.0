/**
 * Voice & Length Class Validator
 */

export const LENGTH_CLASSES = {
  note:    { min: 150,  max: 350,  defaultReadMinutes: 2 },
  update:  { min: 200,  max: 500,  defaultReadMinutes: 2 },
  journal: { min: 600,  max: 1200, defaultReadMinutes: 5 },
  essay:   { min: 1200, max: 2500, defaultReadMinutes: 9 },
};

export const FORBIDDEN_EDITORIAL_PATTERNS = [
  /in today('?s)? fast-paced digital world/i,
  /in an era where/i,
  /whether you('?re)? a seasoned writer/i,
  /at writon, we believe/i,
  /unlock your creativity/i,
  /\brevolutionize\b/i,
  /\bgame-changing\b/i,
  /\bdelve into\b/i,
  /\btapestry of\b/i,
  /\bbeacon of\b/i,
  /\ba testament to\b/i
];

export function calculateReadingTime(text = '') {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 140)); // 140 WPM for literary prose
}

export function validateAntiSlop(text = '') {
  for (const pattern of FORBIDDEN_EDITORIAL_PATTERNS) {
    if (pattern.test(text)) {
      return {
        valid: false,
        reason: `Contains forbidden marketing/AI cliché pattern: "${pattern.source}"`
      };
    }
  }
  return { valid: true };
}

export function validateLengthClass(type, text = '') {
  const bounds = LENGTH_CLASSES[type];
  if (!bounds) return { valid: true };
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  if (words < bounds.min) {
    return {
      valid: false,
      reason: `Length (${words} words) is below minimum of ${bounds.min} for type "${type}"`
    };
  }
  if (words > bounds.max) {
    return {
      valid: false,
      reason: `Length (${words} words) exceeds maximum of ${bounds.max} for type "${type}"`
    };
  }
  return { valid: true, wordCount: words };
}
