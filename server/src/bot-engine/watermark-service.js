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
 * Clean and format a keyword or phrase into a valid lowercase hashtag
 * (e.g., "supervisory tax" -> "#supervisorytax", "#ai_agents" -> "#ai_agents")
 */
export function formatKeywordToHashtag(keyword = '') {
  if (!keyword || typeof keyword !== 'string') return '';
  const cleaned = keyword
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[^a-z0-9_]/g, '');
  return cleaned ? `#${cleaned}` : '';
}

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
 * Generate 4 to 6 contextual hashtags (trending keywords from DB/brain + topic tags + category tags, all lowercase)
 * @param {string} category Story category
 * @param {string} topic Topic or headline
 * @param {string} themeKeyword Additional theme keyword
 * @param {string[]|string} trendingKeywords Trending keywords/search phrases from database or Editorial Brain
 */
export function generateCategoryHashtags(category = 'Essays', topic = '', themeKeyword = '', trendingKeywords = []) {
  const normalizedCat = Object.keys(CATEGORY_DEFAULT_HASHTAGS).find(
    k => k.toLowerCase() === (category || '').toLowerCase()
  ) || 'Essays';

  const genreTags = [...(CATEGORY_DEFAULT_HASHTAGS[normalizedCat] || CATEGORY_DEFAULT_HASHTAGS['Essays'])];
  const topicTags = extractTopicHashtags(topic, themeKeyword, 3);

  // Normalize incoming trending keywords into hashtags
  const rawTrendingList = Array.isArray(trendingKeywords)
    ? trendingKeywords
    : (typeof trendingKeywords === 'string' && trendingKeywords.trim() ? [trendingKeywords] : []);
  const trendTags = rawTrendingList
    .map(kw => formatKeywordToHashtag(kw))
    .filter(tag => tag && tag.length > 2);

  // Combine trend tags first (high priority for SEO), then topic tags, then genre tags, capped strictly at max 6 total
  const combined = [];
  const seen = new Set();

  for (const tag of trendTags) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower) && combined.length < 6) {
      seen.add(lower);
      combined.push(lower);
    }
  }

  for (const tag of topicTags) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower) && combined.length < 6) {
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
 * Clean, sanitize and deduplicate hashtag lines, preventing accidental phrase fragmentation (e.g. #brahmaputrashort #stories)
 */
export function sanitizeHashtags(text = '') {
  if (!text || typeof text !== 'string') return '';
  const lines = text.split('\n');
  const sanitizedLines = lines.map(line => {
    if (!/#[a-zA-Z0-9_]/.test(line)) return line;
    // Extract individual hashtags
    const rawTags = line.match(/#[a-zA-Z0-9_]+/g) || [];
    const cleanedTags = [];
    const seen = new Set();
    for (let tag of rawTags) {
      if (tag === '#writon') continue;
      // Fix broken compound suffixes like #brahmaputrashort followed by #stories -> #brahmaputra
      let cleanTag = tag.toLowerCase();
      if (/#[a-z0-9_]+short$/i.test(cleanTag)) {
        cleanTag = cleanTag.replace(/short$/i, '');
      }
      if (cleanTag === '#stories' && rawTags.some(t => t.toLowerCase() === '#shortstories')) {
        continue; // drop fragmented #stories if #shortstories is present
      }
      if (cleanTag.length > 2 && !seen.has(cleanTag)) {
        seen.add(cleanTag);
        cleanedTags.push(cleanTag);
      }
    }
    return cleanedTags.join(' ');
  });
  return sanitizedLines.join('\n');
}

/**
 * Normalize any hashtags in a text block to lowercase and sanitize fragmentation
 */
export function lowercaseHashtagsInText(text = '') {
  if (!text || typeof text !== 'string') return '';
  let cleaned = sanitizeHashtags(text);
  return cleaned.replace(/#([a-zA-Z0-9_]+)/g, (match, tag) => {
    // Preserve exact invisible watermark case/marker
    if (tag === 'writon') return match;
    return `#${tag.toLowerCase()}`;
  });
}

/**
 * Attach 4-6 thematic hashtags and zero-width invisible `#writon` watermark to story content
 * @param {string} content Raw story markdown
 * @param {string} category Story category
 * @param {string} topic Topic or title
 * @param {string} themeKeyword Additional theme keyword
 * @param {string[]|string} trendingKeywords Trending keywords/search phrases from database or Editorial Brain
 */
export function attachHashtagsAndWatermark(content = '', category = 'Essays', topic = '', themeKeyword = '', trendingKeywords = []) {
  if (!content || typeof content !== 'string') return content;

  // First strip any legacy raw HTML tags or standalone visible #writon
  let result = stripWatermark(content).trim();

  // 1. If content already has hashtags, normalize them to lowercase; otherwise generate 4 to 6 hashtags
  if (!hasExistingHashtags(result)) {
    const tags = generateCategoryHashtags(category, topic, themeKeyword, trendingKeywords);
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

/**
 * Fetch top trending search keywords from public.trend_signals database table for a category,
 * with graceful fallback to Editorial Brain if DB query is unavailable or empty.
 * @param {import('pg').Pool} pool PostgreSQL connection pool
 * @param {string} category Story category
 * @param {number} limit Max keywords to retrieve (default: 3)
 * @returns {Promise<string[]>}
 */
export async function fetchTrendingKeywordsForCategory(pool, category = 'Essays', limit = 3) {
  if (!pool || typeof pool.query !== 'function') return [];
  try {
    const res = await pool.query(`
      select normalized_keywords
      from public.trend_signals
      where ($1::text is null or lower(category) = lower($1))
      order by latest_score desc, velocity_per_day desc
      limit 5
    `, [category || null]);

    const keywords = [];
    const seen = new Set();
    for (const row of res.rows) {
      if (Array.isArray(row.normalized_keywords)) {
        for (const kw of row.normalized_keywords) {
          const lower = kw.trim().toLowerCase();
          if (lower && !seen.has(lower)) {
            seen.add(lower);
            keywords.push(lower);
            if (keywords.length >= limit) return keywords;
          }
        }
      }
    }
    return keywords;
  } catch (err) {
    console.warn(`[Watermark Service] Failed to fetch trending keywords from DB: ${err.message}`);
    return [];
  }
}

