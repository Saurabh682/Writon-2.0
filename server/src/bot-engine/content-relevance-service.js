export const PUBLICATION_CATEGORIES = new Set([
  'Tech',
  'Poetry',
  'Shayari',
  'Short Stories',
  'Essays',
  'Philosophy',
  'Humour',
  'Culture',
  'Reviews',
  'Trending',
  'Journalism',
  'Business & Finance',
  'Sports',
  'Entertainment',
  'Science & Health',
  'Journal',
  'Satire',
  'Fiction'
]);

export const CATEGORY_ALIASES = {
  'satire': 'Humour',
  'fiction': 'Short Stories',
  'humor': 'Humour',
  'stories': 'Short Stories',
  'poems': 'Poetry',
  'technology': 'Tech',
  'business': 'Business & Finance',
  'finance': 'Business & Finance',
  'business and finance': 'Business & Finance',
  'business & finance': 'Business & Finance',
  'sport': 'Sports',
  'movie': 'Entertainment',
  'movies': 'Entertainment',
  'cinema': 'Entertainment',
  'science': 'Science & Health',
  'health': 'Science & Health'
};

export function normalizeCategoryName(cat) {
  if (!cat) return null;
  const lower = String(cat).trim().toLowerCase();
  if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];
  for (const c of PUBLICATION_CATEGORIES) {
    if (c.toLowerCase() === lower) return c;
  }
  return cat;
}

const TECH_REVIEW_PATTERN = /\b(evs?|battery tech|cars?|bikes?|suvs?|smartphones?|mobiles?|laptops?|silicon|chips?|headphones?|iems?|earbuds?|audio gear|wearables?|health hardware|gaming handhelds?|consoles?|cameras?|lenses?|optics|mechanical keyboards?|smart home|matter hardware|coffee gear|espresso tech|edc gear|rugged tools)\b/i;
const CULTURE_REVIEW_PATTERN = /\b(anime|sakuga|seinen|prestige tv|streaming series|cinema|films?|blockbusters?)\b/i;
const REVIEW_SIGNAL_PATTERN = /\b(review|guide|benchmark|comparison|assessment|tested|testing|performance|specifications?|buying|hardware|trade-?offs?)\b/i;
const TECH_SUBJECT_PATTERN = /\b(typescript|javascript|programming|source code|software engineering|backend|frontend|database|postgres(?:ql)?|sqlite|redis|api|distributed systems?|consensus protocol|idempotency|compiler|devops|kubernetes)\b/i;
const FENCED_TECH_CODE_PATTERN = /^```(?:ts|tsx|typescript|js|jsx|javascript|sql|python|java|kotlin|swift|go|rust|c|cpp|csharp|bash|shell)\s*$/im;
const FINANCE_PATTERN = /\b(market|share price|sensex|nifty|ipo|stocks?|economy|inflation|bank|rupee|investing|finance|gdp)\b/i;
const HUMOUR_PATTERN = /\b(funny|joke|viral meme|office|boss|meeting|corporate satire|comedy)\b/i;

const GENERIC_COMMENT_PATTERN = /^(beautifully written(?: and nostalgic)?|nostalgic|great (?:article|read|piece)|loved this|love this|well written|well said|so true|spot on|amazing|wonderful|insightful read|nice one|solid|bookmarked|felt this)[.!\s]*$/i;
const TECH_LITERARY_MISMATCH_PATTERN = /\b(beautifully written|nostalgic|lyrical|verses?|stanza|poetic|prose|heartwarming|emotional resonance|felt this)\b/i;

const TECH_ANCHORS = [
  [/\bactive noise cancellation\b|\banc\b/i, 'ANC'],
  [/\bldac\b/i, 'LDAC'],
  [/\baptx(?:\s+adaptive|\s+lossless)?\b/i, 'aptX'],
  [/\bfrequency response\b/i, 'frequency response'],
  [/\bsoundstage\b/i, 'soundstage'],
  [/\bsub-?bass\b/i, 'sub-bass'],
  [/\bmidrange\b|\bmids\b/i, 'midrange'],
  [/\bcodec(?:s)?\b/i, 'codec support'],
  [/\bheadphones?\b|\biems?\b|\bearbuds?\b|\baudio gear\b/i, 'headphone performance'],
  [/\bbattery life\b|\bbattery\b/i, 'battery life'],
  [/\bthermal(?:s| performance)?\b|\btemperature(?:s)?\b/i, 'thermal performance'],
  [/\bcamera(?:s)?\b|\blenses?\b|\boptics\b/i, 'camera performance'],
  [/\bdisplay\b|\bpwm\b/i, 'display performance'],
  [/\bkeyboard(?:s)?\b|\bswitch(?:es)?\b/i, 'keyboard feel'],
  [/\bprocessor(?:s)?\b|\bchip(?:s)?\b|\bsilicon\b/i, 'processor performance'],
  [/\bevs?\b|\belectric vehicles?\b/i, 'EV performance'],
  [/\bconsole(?:s)?\b|\bgaming handhelds?\b/i, 'gaming performance'],
  [/\bsmart home\b|\bmatter\b/i, 'smart-home reliability'],
  [/\bperformance\b/i, 'sustained performance']
];

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'because', 'before', 'between', 'could', 'from',
  'guide', 'have', 'into', 'latest', 'more', 'most', 'only', 'over', 'review', 'should',
  'that', 'their', 'there', 'these', 'they', 'this', 'through', 'under', 'very', 'what',
  'when', 'where', 'which', 'while', 'with', 'would', 'written'
]);

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stableVariant(value, count) {
  let hash = 0;
  for (const character of value) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return hash % count;
}

function getContextAnchors({ postTitle = '', snippet = '', category = 'Essays' } = {}) {
  const context = `${normalizeText(postTitle)} ${normalizeText(snippet)}`;
  if (String(category).toLowerCase() === 'tech') {
    const technical = TECH_ANCHORS
      .filter(([pattern]) => pattern.test(context))
      .map(([, label]) => label);
    if (technical.length > 0) return [...new Set(technical)];
  }

  const tokens = context.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [];
  const meaningful = tokens.filter(token => !STOP_WORDS.has(token));
  return [...new Set(meaningful)].slice(0, 3);
}

function containsAnchor(comment, anchor) {
  const normalizedComment = comment.toLowerCase();
  const normalizedAnchor = anchor.toLowerCase();
  if (normalizedComment.includes(normalizedAnchor)) return true;
  return normalizedAnchor
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 4)
    .some(token => normalizedComment.includes(token));
}

export function resolveReviewCategory(domain = '', fallbackCategory = 'Culture') {
  const normalizedDomain = normalizeText(domain);
  if (normalizedDomain) return 'Reviews';
  return PUBLICATION_CATEGORIES.has(fallbackCategory) ? fallbackCategory : 'Culture';
}

export function resolvePublicationCategory({
  declaredCategory = 'Essays',
  title = '',
  summary = '',
  content = '',
  domain = ''
} = {}) {
  const declared = PUBLICATION_CATEGORIES.has(declaredCategory) ? declaredCategory : 'Essays';
  if (declared === 'Reviews' || declared === 'Trending') return declared;
  const primaryContext = `${normalizeText(domain)} ${normalizeText(title)} ${normalizeText(summary)}`;
  const reviewContext = `${primaryContext} ${normalizeText(content).slice(0, 1200)}`;

  // Strong subject evidence outranks an incorrect generic feed label. Code fence
  // languages are checked separately because normalizeText removes line breaks.
  if (TECH_SUBJECT_PATTERN.test(primaryContext) || FENCED_TECH_CODE_PATTERN.test(content)) {
    return 'Tech';
  }

  if (REVIEW_SIGNAL_PATTERN.test(reviewContext)) {
    // Title, summary, and an explicit domain are stronger classification signals
    // than incidental examples in the body (for example, headphones used for films).
    if (TECH_REVIEW_PATTERN.test(primaryContext)) return 'Tech';
    if (CULTURE_REVIEW_PATTERN.test(primaryContext)) return 'Culture';
    if (declared === 'Reviews' && TECH_REVIEW_PATTERN.test(reviewContext)) return 'Tech';
    if (declared === 'Reviews' && CULTURE_REVIEW_PATTERN.test(reviewContext)) return 'Culture';
  }

  return declared;
}

export function resolveEngagementCategory({
  publicationCategory = 'Essays',
  title = '',
  summary = '',
  content = '',
  topicCategory = ''
} = {}) {
  if (PUBLICATION_CATEGORIES.has(topicCategory) && !['Trending', 'Reviews'].includes(topicCategory)) {
    return topicCategory;
  }
  if (!['Trending', 'Reviews'].includes(publicationCategory)) return publicationCategory;

  const primaryContext = `${normalizeText(title)} ${normalizeText(summary)}`;
  const context = `${primaryContext} ${normalizeText(content).slice(0, 1200)}`;
  if (TECH_REVIEW_PATTERN.test(primaryContext) || TECH_REVIEW_PATTERN.test(context)) return 'Tech';
  if (CULTURE_REVIEW_PATTERN.test(primaryContext) || CULTURE_REVIEW_PATTERN.test(context)) return 'Culture';
  if (FINANCE_PATTERN.test(context)) return 'Essays';
  if (HUMOUR_PATTERN.test(context)) return 'Humour';
  return publicationCategory;
}

export function buildContextualComment({
  postTitle = '',
  category = 'Essays',
  snippet = '',
  persona = null,
  depth = 'medium'
} = {}) {
  const normalizedTitle = normalizeText(postTitle) || 'this piece';
  const anchors = getContextAnchors({ postTitle: normalizedTitle, snippet, category });
  const primary = anchors[0] || normalizedTitle.slice(0, 72);
  const secondary = anchors[1] || null;
  const isTech = String(category).toLowerCase() === 'tech';
  const requestedDepth = depth === 'auto' ? 'medium' : depth;
  const seed = `${persona?.id || persona?.penName || persona?.fullName || ''}:${normalizedTitle}:${requestedDepth}`;

  if (isTech) {
    const shortComments = [
      `${primary} is the key trade-off here.`,
      `The ${primary} point makes this comparison useful.`,
      `${primary} deserves exactly this kind of scrutiny.`
    ];
    if (requestedDepth === 'short' || requestedDepth === 'micro') {
      return shortComments[stableVariant(seed, shortComments.length)];
    }

    const secondPoint = secondary ? ` alongside ${secondary}` : '';
    const mediumComments = [
      `The ${primary} discussion is the useful part of this guide. I would compare it${secondPoint} during sustained everyday use before deciding.`,
      `${primary} is a more meaningful decision point than the headline specification. A controlled comparison${secondPoint} would make the trade-off clearer.`,
      `I appreciate that the review focuses on ${primary}. The next useful check would be whether that result remains consistent${secondPoint} over longer sessions.`
    ];
    const chosen = mediumComments[stableVariant(seed, mediumComments.length)];
    if (requestedDepth !== 'deep') return chosen;
    return `${chosen} That would separate a repeatable advantage from a result that only looks good in a short test.`;
  }

  const categoryLabel = String(category || 'piece').toLowerCase();
  const shortComments = [
    `The detail about ${primary} stayed with me.`,
    `${primary} gives this ${categoryLabel} its strongest moment.`,
    `The ${primary} observation feels central here.`
  ];
  if (requestedDepth === 'short' || requestedDepth === 'micro') {
    return shortComments[stableVariant(seed, shortComments.length)];
  }

  const mediumComments = [
    `The detail about ${primary} gives this ${categoryLabel} a clear point of view. It made me reconsider the central idea rather than simply agree with it.`,
    `${primary} is the part I kept returning to. That concrete detail gives the broader argument something the reader can examine.`,
    `The way this piece connects ${primary}${secondary ? ` with ${secondary}` : ''} is its most interesting choice. I would like to see that tension explored further.`
  ];
  const chosen = mediumComments[stableVariant(seed, mediumComments.length)];
  if (requestedDepth !== 'deep') return chosen;
  return `${chosen} It opens a specific line of discussion instead of ending with general praise.`;
}

export function isContextualComment(comment, context = {}) {
  const normalizedComment = normalizeText(comment);
  if (!normalizedComment || GENERIC_COMMENT_PATTERN.test(normalizedComment)) return false;
  if (String(context.category).toLowerCase() === 'tech' && TECH_LITERARY_MISMATCH_PATTERN.test(normalizedComment)) {
    return false;
  }

  const anchors = getContextAnchors(context);
  if (anchors.length === 0) return normalizedComment.length >= 24;
  return anchors.some(anchor => containsAnchor(normalizedComment, anchor));
}

export function ensureContextualComment(comment, context = {}) {
  const normalizedComment = normalizeText(comment);
  if (isContextualComment(normalizedComment, context)) return normalizedComment;
  return buildContextualComment(context);
}
