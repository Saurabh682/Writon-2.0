import { extractTopicHashtags } from './watermark-service.js';

const AUTOMATIC_PUBLICATION_POLICY = Object.freeze({
  minimumTrendScore: 50,
  minimumIndependentSources: 3,
  maximumSourceAgeHours: 48,
  maximumFutureClockSkewMinutes: 15,
  allowedTopicCategories: new Set([
    'Tech',
    'Culture',
    'Essays',
    'Humour',
    'Short Stories',
    'Poetry',
    'Reviews',
    'Business & Finance',
    'Sports',
    'Entertainment',
    'Journalism',
    'Philosophy'
  ])
});

const SENSITIVE_TOPIC_PATTERN = /\b(?:election|polling|politic(?:s|al)?|parliament|government|minister|president|prime\s+minister|war|military|missile|attack|terror(?:ism|ist)?|hostage|invasion|conflict|death|dead|killed|murder|suicide|assault|abuse|minor|child|rape|sexual|medical|medicine|health|disease|diagnosis|treatment|vaccine|drug|therapy|investment|investing|stock|share\s+price|crypto|loan|mortgage|bankruptcy|financial\s+advice|court|lawsuit|legal|crime|arrest|charged|allegation|fraud|scam|communal|riot|religion|caste|protest|sanction|disaster|earthquake|flood|wildfire)\b/i;
const CATEGORY_HASHTAGS = {
  Tech: ['#Tech', '#Technology'],
  Culture: ['#Culture', '#Arts'],
  Essays: ['#Explainers', '#Ideas'],
  Humour: ['#Humour', '#Satire'],
  Poetry: ['#Poetry', '#WritingCommunity'],
  'Short Stories': ['#ShortStories', '#Storytelling'],
  Reviews: ['#Reviews', '#TechReviews'],
  'Business & Finance': ['#Business', '#Finance'],
  Sports: ['#Sports', '#Athletics'],
  Entertainment: ['#Entertainment', '#PopCulture'],
  Journalism: ['#Journalism', '#CurrentAffairs'],
  Philosophy: ['#Philosophy', '#DeepThinking']
};

const MINIMUM_PROSE_WORDS = Object.freeze({
  Tech: 300,
  Trending: 300,
  Reviews: 300
});
const UNSUPPORTED_FIRST_PERSON_TECHNICAL_EVIDENCE = /\b(?:in (?:our|my) (?:work|testing|tests|benchmarks)|we (?:measured|observed|discovered|tested|benchmarked)|i (?:measured|tested|benchmarked))\b/i;

function fencedCodeBlocks(content = '') {
  const blocks = [];
  const pattern = /^```([^\r\n]*)\r?\n([\s\S]*?)^```\s*$/gm;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    blocks.push({ language: match[1].trim().toLowerCase(), code: match[2] });
  }
  return blocks;
}

export function validateGeneratedArticleIntegrity({ title = '', content = '', category = 'Essays' } = {}) {
  const reasons = [];
  const cleanTitle = String(title).trim();
  const cleanContent = String(content).trim();
  const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;
  const fenceCount = (cleanContent.match(/^```/gm) || []).length;
  const minimumWords = MINIMUM_PROSE_WORDS[category] || 0;

  if (!cleanTitle) reasons.push('Generated article title is missing');
  if (!cleanContent) reasons.push('Generated article content is missing');
  if (fenceCount % 2 !== 0) reasons.push('Markdown code fences are unbalanced');
  if (minimumWords > 0 && wordCount < minimumWords) {
    reasons.push(`${category} bot articles must contain at least ${minimumWords} words`);
  }
  if (['Tech', 'Trending', 'Reviews'].includes(category) && UNSUPPORTED_FIRST_PERSON_TECHNICAL_EVIDENCE.test(cleanContent)) {
    reasons.push('Bot article makes an unsupported first-person testing or measurement claim');
  }

  for (const block of fencedCodeBlocks(cleanContent)) {
    if (!['ts', 'tsx', 'typescript'].includes(block.language)) continue;
    if (/:\s*(?:Promise|Array|Record|Map|Set)\s*(?=[{;,)=]|$)/m.test(block.code)) {
      reasons.push('TypeScript code appears to be missing generic type arguments');
      break;
    }
  }

  return {
    isValid: reasons.length === 0,
    reasons,
    wordCount,
    codeBlockCount: fencedCodeBlocks(cleanContent).length
  };
}

export function normalizeTrendTopic(topic = '') {
  return String(topic)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(live|latest|today|news|update|updates|202[0-9])\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function parseApproxTraffic(value) {
  const match = String(value || '').replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)\s*([kmb])?/i);
  if (!match) return 0;
  const multiplier = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[match[2]?.toLowerCase()] || 1;
  return Math.round(Number(match[1]) * multiplier);
}

export function clusterTrendCandidates(candidates = []) {
  const clusters = new Map();
  for (const candidate of candidates) {
    const normalizedTopic = normalizeTrendTopic(candidate.topic);
    if (!normalizedTopic) continue;
    const current = clusters.get(normalizedTopic) || {
      ...candidate,
      normalizedTopic,
      geographies: [],
      signals: [],
      approxTrafficValue: 0
    };
    current.geographies = [...new Set([...current.geographies, candidate.geo].filter(Boolean))];
    current.signals.push(candidate);
    current.approxTrafficValue = Math.max(current.approxTrafficValue, parseApproxTraffic(candidate.approxTraffic));
    if (!current.headline && candidate.headline) current.headline = candidate.headline;
    if (!current.source && candidate.source) current.source = candidate.source;
    clusters.set(normalizedTopic, current);
  }
  return [...clusters.values()];
}

function reportTimestamp(report) {
  const value = report?.publishedAt || report?.pubDate;
  const timestamp = value ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function validHttpUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function normalizeSourceIdentity(source = '') {
  return String(source)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(india|indian|international|global|world|news|online|digital)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function researchRiskText({ topic = '', headline = '', researchDossier = null } = {}) {
  const reportHeadlines = Array.isArray(researchDossier?.newsReports)
    ? researchDossier.newsReports.map(report => report?.headline || '').join(' ')
    : '';
  return `${topic} ${headline} ${reportHeadlines}`.trim();
}

export function verifyResearchDossier(dossier, {
  now = new Date(),
  maxAgeHours = AUTOMATIC_PUBLICATION_POLICY.maximumSourceAgeHours,
  minIndependentSources = AUTOMATIC_PUBLICATION_POLICY.minimumIndependentSources,
  maxFutureClockSkewMinutes = AUTOMATIC_PUBLICATION_POLICY.maximumFutureClockSkewMinutes
} = {}) {
  const reports = Array.isArray(dossier?.newsReports) ? dossier.newsReports : [];
  const validReports = reports.filter(report => (
    report?.headline
    && normalizeSourceIdentity(report?.source)
    && validHttpUrl(report?.url)
  ));
  const independentSources = [...new Set(validReports.map(report => normalizeSourceIdentity(report.source)))];
  const cutoff = now.getTime() - (maxAgeHours * 60 * 60 * 1000);
  const futureCutoff = now.getTime() + (maxFutureClockSkewMinutes * 60 * 1000);
  const recentReports = validReports.filter(report => {
    const timestamp = reportTimestamp(report);
    return timestamp !== null && timestamp >= cutoff && timestamp <= futureCutoff;
  });
  const recentIndependentSources = [...new Set(recentReports.map(report => normalizeSourceIdentity(report.source)))];
  const corroborated = independentSources.length >= minIndependentSources
    && recentIndependentSources.length >= minIndependentSources;

  return {
    status: corroborated ? 'corroborated' : independentSources.length === 1 ? 'single_source' : 'unverified',
    corroborated,
    validSourceCount: independentSources.length,
    recentReportCount: recentReports.length,
    recentIndependentSourceCount: recentIndependentSources.length,
    requiredIndependentSourceCount: minIndependentSources,
    maximumSourceAgeHours: maxAgeHours,
    verifiedAt: now.toISOString(),
    reasons: [
      ...(independentSources.length < minIndependentSources
        ? [`Fewer than ${minIndependentSources} independent linked news sources`]
        : []),
      ...(recentIndependentSources.length < minIndependentSources
        ? [`Fewer than ${minIndependentSources} independently published reports with valid timestamps within the ${maxAgeHours}-hour freshness window`]
        : [])
    ]
  };
}

export function scoreTrendCandidate(candidate, verification = null) {
  const traffic = Number(candidate?.approxTrafficValue || parseApproxTraffic(candidate?.approxTraffic));
  const trafficScore = traffic >= 1_000_000 ? 30 : traffic >= 100_000 ? 24 : traffic >= 10_000 ? 16 : traffic > 0 ? 8 : 0;
  const geographyCount = candidate?.geographies?.length || (candidate?.geo ? 1 : 0);
  const geographyScore = Math.min(10, geographyCount * 5);
  const signalScore = Math.min(20, Math.max(1, candidate?.signals?.length || 1) * 5);
  const sourceScore = Math.min(25, Number(verification?.validSourceCount || 0) * 10);
  const corroborationBonus = verification?.corroborated ? 15 : 0;
  return Math.min(100, trafficScore + geographyScore + signalScore + sourceScore + corroborationBonus);
}

export function buildHashtagIntelligence({ topic = '', headline = '', topicCategory = 'Essays', candidate = null, researchDossier = null } = {}) {
  const trendTags = extractTopicHashtags(topic, headline, 3);
  const categoryTags = CATEGORY_HASHTAGS[topicCategory] || ['#WritOnDiscover'];
  const hashtags = [...new Set([...trendTags, ...categoryTags, '#writon'])].slice(0, 6);
  const hasTrendSignal = Boolean(candidate?.approxTraffic || candidate?.signals?.length);
  const sourceCount = verifyResearchDossier(researchDossier).validSourceCount;
  return {
    hashtags,
    evidence: {
      googleTrends: hasTrendSignal,
      newsSourceCount: sourceCount,
      socialPlatformPopularityVerified: false
    },
    label: hasTrendSignal ? 'live-search-informed' : 'contextual-only'
  };
}

export function decideEditorialApproval({
  topic = '',
  headline = '',
  topicCategory = '',
  researchDossier = null,
  score = 0,
  verification = null
} = {}) {
  const sensitive = SENSITIVE_TOPIC_PATTERN.test(researchRiskText({ topic, headline, researchDossier }));
  const supportedCategory = AUTOMATIC_PUBLICATION_POLICY.allowedTopicCategories.has(topicCategory);
  const meetsScore = score >= AUTOMATIC_PUBLICATION_POLICY.minimumTrendScore;
  const autoApproved = !sensitive
    && supportedCategory
    && verification?.corroborated === true
    && meetsScore;
  return {
    status: autoApproved ? 'approved' : 'pending_review',
    mode: autoApproved ? 'automatic_low_risk' : 'human_required',
    sensitive,
    reasons: [
      ...(sensitive ? ['Sensitive topic requires human review'] : []),
      ...(supportedCategory ? [] : ['Topic category is not eligible for unattended factual publishing']),
      ...(verification?.corroborated
        ? []
        : verification?.reasons?.length
          ? verification.reasons
          : ['Research is not independently corroborated']),
      ...(meetsScore ? [] : [`Trend score is below the automatic publication threshold of ${AUTOMATIC_PUBLICATION_POLICY.minimumTrendScore}`])
    ]
  };
}

export function reevaluateAutomaticEditorialBrief(brief, { now = new Date() } = {}) {
  const researchDossier = brief?.research_dossier || brief?.researchDossier || null;
  const verification = verifyResearchDossier(researchDossier, { now });
  const approval = decideEditorialApproval({
    topic: brief?.topic,
    headline: brief?.headline,
    topicCategory: brief?.topic_category || brief?.topicCategory,
    researchDossier,
    score: Number(brief?.trend_score ?? brief?.trendScore ?? 0),
    verification
  });
  return { verification, approval };
}

export function validateAutomaticGeneratedArticle({
  title = '',
  summary = '',
  content = '',
  researchDossier = null,
  category = 'Trending'
} = {}) {
  const integrity = validateGeneratedArticleIntegrity({ title, content, category });
  const reasons = [...integrity.reasons];
  const cleanTitle = String(title).trim();
  const cleanContent = String(content).trim();
  const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;
  const supportedReports = Array.isArray(researchDossier?.newsReports)
    ? researchDossier.newsReports.filter(report => validHttpUrl(report?.url))
    : [];
  const citedUrls = [...new Set(supportedReports
    .map(report => report.url)
    .filter(url => cleanContent.includes(url)))];

  if (cleanTitle.length < 10 || cleanTitle.length > 100) {
    reasons.push('Generated title must be between 10 and 100 characters');
  }
  if (wordCount > 1_000) {
    reasons.push('Generated article must be between 300 and 1,000 words');
  }
  if (!/^#{1,6}\s+sources\s*$/im.test(cleanContent)) {
    reasons.push('Generated article is missing a Sources section');
  }
  if (citedUrls.length < AUTOMATIC_PUBLICATION_POLICY.minimumIndependentSources) {
    reasons.push(`Generated article cites fewer than ${AUTOMATIC_PUBLICATION_POLICY.minimumIndependentSources} supplied source links`);
  }
  if (SENSITIVE_TOPIC_PATTERN.test(`${cleanTitle} ${summary} ${cleanContent}`)) {
    reasons.push('Generated article introduced sensitive subject matter');
  }

  return {
    isValid: reasons.length === 0,
    reasons,
    wordCount,
    citedSourceCount: citedUrls.length
  };
}

export function buildEditorialBrief({ candidate, topicCategory, researchDossier, publicationCategory = 'Trending' }) {
  const verification = verifyResearchDossier(researchDossier);
  const score = scoreTrendCandidate(candidate, verification);
  const hashtagIntelligence = buildHashtagIntelligence({
    topic: candidate.topic,
    headline: candidate.headline,
    topicCategory,
    candidate,
    researchDossier
  });
  const approval = decideEditorialApproval({
    topic: candidate.topic,
    headline: candidate.headline,
    topicCategory,
    researchDossier,
    score,
    verification
  });
  return {
    topic: candidate.topic,
    normalizedTopic: candidate.normalizedTopic || normalizeTrendTopic(candidate.topic),
    category: publicationCategory,
    topicCategory,
    headline: candidate.headline || null,
    trendScore: score,
    verification,
    hashtagIntelligence,
    approval,
    researchDossier,
    researchedAt: researchDossier?.researchedAt || new Date().toISOString()
  };
}
