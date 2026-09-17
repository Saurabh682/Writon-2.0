/**
 * WritOn Hashtags & Zero-Width Invisible Watermark Service
 *
 * Automatically manages hybrid thematic hashtags (1-3 trend tags + 3 genre tags, max 6)
 * and embeds truly invisible zero-width `#writon` watermarks across all stories for
 * provenance, crawler indexing, and attribution without any UI clutter.
 */

// Zero-Width space (\u200B) + Zero-Width No-Break Space (\uFEFF) wrapper around #writon
export const INVISIBLE_WATERMARK = '\u200B\uFEFF#writon\u200B';

export const CATEGORY_DEFAULT_HASHTAGS = {
  'Trending': ['#trending', '#currentstories', '#explained', '#writondiscover'],
  'Reviews': ['#reviews', '#tested', '#buyerguide', '#writondiscover'],
  'Tech': ['#tech', '#engineering', '#systemsdesign', '#softwarecraft'],
  'Essays': ['#essays', '#philosophy', '#slowreading', '#reflections'],
  'Poetry': ['#poetry', '#quietverses', '#midnightmusings', '#wordcraft'],
  'Shayari': ['#shayari', '#urdupoetry', '#ghazal', '#sukhan'],
  'Short Stories': ['#shortstories', '#urbanfiction', '#storytelling', '#flashfiction'],
  'Philosophy': ['#philosophy', '#mindfulness', '#deepthinking', '#innerstillness'],
  'Humour': ['#humour', '#satire', '#workplacechronicles', '#dailylife'],
  'Culture': ['#culture', '#heritage', '#traditions', '#regionalmemoir'],
  'Business & Finance': ['#business', '#finance', '#economy', '#markets'],
  'Sports': ['#sports', '#athletics', '#cricket', '#gameday'],
  'Entertainment': ['#entertainment', '#cinema', '#filmcraft', '#popculture'],
  'Journalism': ['#journalism', '#fieldreport', '#publicinterest', '#currentaffairs']
};

export const REVIEW_DOMAIN_HASHTAGS = {
  'EVs & Battery Tech': ['#electricvehicles', '#evreview', '#carreview', '#automotive'],
  'Performance ICE Cars': ['#carreview', '#tracktest', '#sportscars', '#automotive'],
  'Urban Commuter Bikes & EV 2W': ['#motorcycles', '#bikereview', '#twowheeler', '#cityride'],
  '4x4 Off-Roaders & Expedition SUVs': ['#4x4', '#offroad', '#suvreview', '#overlanding'],
  'Flagship Smartphones': ['#smartphonereview', '#flagshipphone', '#mobiletech', '#gadgets'],
  'Budget & Mid-Range Mobiles': ['#budgetphone', '#valuetech', '#mobilereview', '#smartphones'],
  'Laptops, Silicon & Chips': ['#laptopreview', '#ultrabook', '#hardwarebench', '#processors'],
  'Headphones, IEMs & Audio Gear': ['#audiophile', '#headphonereview', '#hifiaudio', '#soundtest'],
  'Wearables & Health Hardware': ['#smartwatch', '#wearables', '#healthtech', '#fitnesstracker'],
  'Shonen Anime & Sakuga Animation': ['#animereview', '#shonen', '#sakuga', '#animecommunity'],
  'Seinen & Psychological Anime': ['#animereview', '#seinen', '#animeanalysis', '#japaneseculture'],
  'Prestige TV & Streaming Series': ['#tvreview', '#prestigetv', '#bingewatch', '#seriesreview'],
  'Hollywood Blockbusters & Sci-Fi Cinema': ['#moviereview', '#cinema', '#imax', '#filmcritique'],
  'Regional & World Cinema': ['#worldcinema', '#filmreview', '#cinephile', '#arthousecinema'],
  'Gaming Handhelds & Consoles': ['#handheldgaming', '#gamingconsole', '#pcgaming', '#techreview'],
  'Cameras, Prime Lenses & Optics': ['#camerareview', '#photography', '#lensreview', '#mirrorless'],
  'Custom Mechanical Keyboards': ['#mechanicalkeyboards', '#customkeebs', '#desksetup', '#keeblife'],
  'Smart Home & Matter Hardware': ['#smarthome', '#iot', '#homeautomation', '#matter'],
  'Coffee Gear & Espresso Tech': ['#espresso', '#coffeegear', '#specialtycoffee', '#baristatools'],
  'EDC Gear & Rugged Tools': ['#everydaycarry', '#edcgear', '#pockettools', '#gearreview']
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'about', 'around', 'into', 'over', 'after',
  'before', 'under', 'between', 'through', 'where', 'when', 'what', 'which', 'who',
  'how', 'why', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now', 'versus', 'report', 'news', 'update', 'latest'
]);

/**
 * Extract 1 to 3 meaningful lowercase hashtags from a trending topic or headline
 */
export function extractTopicHashtags(topic = '', headline = '', max = 3) {
  const combined = `${topic} ${headline}`
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();

  if (!combined) return [];

  const rawWords = combined.split(/\s+/).filter(w => w.length > 2);
  const tags = [];
  const seen = new Set();

  for (let i = 0; i < rawWords.length; i++) {
    const word = rawWords[i];
    const lower = word.toLowerCase();

    if (STOP_WORDS.has(lower) || seen.has(lower) || lower.length < 3) continue;

    // Check if next word forms a natural pair (e.g., "blackwell" + "ultra" -> "#blackwellultra")
    const nextWord = rawWords[i + 1];
    if (nextWord && !STOP_WORDS.has(nextWord.toLowerCase()) && nextWord.length > 2) {
      const pair = `#${lower}${nextWord.toLowerCase()}`;
      if (!seen.has(pair)) {
        seen.add(pair);
        seen.add(lower);
        seen.add(nextWord.toLowerCase());
        tags.push(pair);
        i++; // Skip next word since it was paired
        if (tags.length >= max) break;
        continue;
      }
    }

    const single = `#${lower}`;
    if (!seen.has(single)) {
      seen.add(single);
      seen.add(lower);
      tags.push(single);
      if (tags.length >= max) break;
    }
  }

  return tags.slice(0, max);
}

/**
 * Generate 4 to 6 contextual hashtags (1-3 trend-specific tags + 3 category tags, all lowercase)
 */
export function generateCategoryHashtags(category = 'Essays', topic = '', themeKeyword = '') {
  const normalizedCat = Object.keys(CATEGORY_DEFAULT_HASHTAGS).find(
    k => k.toLowerCase() === (category || '').toLowerCase()
  ) || 'Essays';

  const genreTags = [...(CATEGORY_DEFAULT_HASHTAGS[normalizedCat] || CATEGORY_DEFAULT_HASHTAGS['Essays'])];
  const topicTags = extractTopicHashtags(topic, themeKeyword, 3);

  // Combine topic tags first, then genre tags, capped strictly at max 6 total
  const combined = [];
  const seen = new Set();

  for (const tag of topicTags) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      combined.push(lower);
    }
  }

  for (const tag of genreTags) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower) && combined.length < 6) {
      seen.add(lower);
      combined.push(lower);
    }
  }

  // Ensure minimum 4 and maximum 6
  return combined.slice(0, 6).join(' ');
}

/**
 * Generate 4 to 6 relevant hashtags specifically for product/gear reviews
 */
export function generateReviewHashtags(domain = '', productName = '') {
  const domainTags = REVIEW_DOMAIN_HASHTAGS[domain] || ['#productreview', '#hardwareverdict', '#buyerguide'];
  const productTags = extractTopicHashtags(productName, '', 2);

  const combined = [];
  const seen = new Set();

  for (const tag of productTags) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      combined.push(lower);
    }
  }

  for (const tag of domainTags) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower) && combined.length < 6) {
      seen.add(lower);
      combined.push(lower);
    }
  }

  return combined.slice(0, 6).join(' ');
}

/**
 * Check if text contains a hashtag line
 */
export function hasExistingHashtags(content = '') {
  const lines = (content || '').trim().split('\n');
  const lastLine = lines[lines.length - 1] || '';
  return /#[a-zA-Z0-9_]{2,}/.test(lastLine) && !lastLine.includes('#writon');
}

/**
 * Check if text contains the #writon watermark
 */
export function hasWritonWatermark(content = '') {
  return content.includes(INVISIBLE_WATERMARK) || content.includes('writon-watermark');
}

/**
 * Normalize any hashtags in a text block to lowercase
 */
export function lowercaseHashtagsInText(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/#([a-zA-Z0-9_]+)/g, (match, tag) => {
    // Preserve exact invisible watermark case/marker
    if (tag === 'writon') return match;
    return `#${tag.toLowerCase()}`;
  });
}

/**
 * Attach 4-6 thematic hashtags and zero-width invisible `#writon` watermark to story content
 */
export function attachHashtagsAndWatermark(content = '', category = 'Essays', topic = '', themeKeyword = '') {
  if (!content || typeof content !== 'string') return content;

  // First strip any legacy raw HTML tags or standalone visible #writon
  let result = stripWatermark(content).trim();

  // 1. If content already has hashtags, normalize them to lowercase; otherwise generate 4 to 6 hashtags
  if (!hasExistingHashtags(result)) {
    const tags = generateCategoryHashtags(category, topic, themeKeyword);
    result = `${result}\n\n---\n\n${tags}`;
  } else {
    result = lowercaseHashtagsInText(result);
  }

  // 2. Ensure zero-width invisible #writon watermark is embedded in the background
  if (!result.includes(INVISIBLE_WATERMARK)) {
    result = `${result}\n\n${INVISIBLE_WATERMARK}`;
  }

  return result;
}

/**
 * Attach domain-accurate review hashtags and zero-width invisible watermark to review content
 */
export function attachReviewHashtagsAndWatermark(content = '', domain = '', productName = '') {
  if (!content || typeof content !== 'string') return content;

  let result = stripWatermark(content).trim();

  if (!hasExistingHashtags(result)) {
    const tags = generateReviewHashtags(domain, productName);
    result = `${result}\n\n---\n\n${tags}`;
  } else {
    result = lowercaseHashtagsInText(result);
  }

  if (!result.includes(INVISIBLE_WATERMARK)) {
    result = `${result}\n\n${INVISIBLE_WATERMARK}`;
  }

  return result;
}

/**
 * Strip raw HTML tags, comments, and watermark artifacts when generating clean plain text
 */
export function stripWatermark(content = '') {
  if (!content || typeof content !== 'string') return '';
  const segments = content.split(/(```[\s\S]*?```)/g);
  return segments
    .map((segment, index) => {
      // Markdown code fences may legitimately contain TypeScript generics and
      // comparison operators. Treating every <...> sequence as HTML corrupts
      // Promise<Result>, Array<User>, and loops such as i < attempts.
      if (index % 2 === 1) return segment;
      return segment
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, '');
    })
    .join('')
    .replace(/[\u200B\uFEFF]#writon[\u200B\uFEFF]?/g, '')
    .replace(/^#writon$/gm, '')
    .trim();
}
