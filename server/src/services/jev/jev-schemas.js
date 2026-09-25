/**
 * Jev Decision Layer Schemas & Questions Registry
 * 
 * Defines the atomic questions and compact state serializers for:
 * 1. Spark Trend Triage (Stage 1 / Ingestion Filter)
 * 2. Post-Generation Article QA (Stage 2 / Editorial Gate)
 */

export const WRITON_EDITORIAL_CATEGORIES = [
  'Tech',
  'Essays',
  'Short Stories',
  'Poetry',
  'Shayari',
  'Culture',
  'Humour',
  'Philosophy'
];

export const JEV_CONTENT_TYPES = [
  'tech_explainer',
  'news_analysis',
  'essay',
  'review',
  'short_story',
  'cultural_commentary',
  'skip'
];

/**
 * Atomic questions for Spark Trend Triage
 */
export const TREND_TRIAGE_QUESTIONS = {
  worth_covering: {
    type: 'noul',
    instructions: 'Is this trend substantive, interesting, and worth covering on a thoughtful literary and long-form platform?'
  },
  writon_relevance: {
    type: 'score',
    instructions: 'How relevant is this trend to WritOn readers (literature, culture, craft, technology architecture, human reflection)?'
  },
  newsworthiness: {
    type: 'score',
    instructions: 'Does this represent a meaningful ongoing cultural, technical, or human development rather than clickbait gossip?'
  },
  evergreen_potential: {
    type: 'score',
    instructions: 'Does this topic have lasting value that remains interesting months or years from now?'
  },
  likely_duplicate: {
    type: 'noul',
    instructions: 'Does this topic heavily overlap or duplicate the recent topics or titles already covered in the recent context?'
  },
  recommended_content_type: {
    type: 'choice',
    instructions: 'What content format best fits this topic on WritOn?',
    options: JEV_CONTENT_TYPES
  }
};

/**
 * Builds compact, token-efficient state for trend triage
 */
export function buildTrendTriageState({
  trend,
  recentTopics = [],
  recentTitles = []
}) {
  return {
    trend: {
      topic: trend.topic || trend.canonical_topic || '',
      category: trend.category || '',
      keywords: (trend.keywords || []).slice(0, 8),
      whyTrending: (trend.whyTrending || trend.why_trending || '').slice(0, 300),
      contentOpportunity: (trend.contentOpportunity || trend.content_opportunity || '').slice(0, 300),
      recommendedAngles: (trend.recommendedAngles || []).slice(0, 2),
      sourcePlatforms: (trend.platforms || []).slice(0, 4),
      urgency: trend.urgency || 'THIS_WEEK'
    },
    writon_context: {
      supported_categories: WRITON_EDITORIAL_CATEGORIES,
      recent_covered_topics: recentTopics.slice(0, 10),
      recent_published_titles: recentTitles.slice(0, 10)
    }
  };
}

/**
 * Atomic questions for Post-Generation Article QA
 */
export const ARTICLE_QA_QUESTIONS = {
  persona_fit: {
    type: 'score',
    instructions: 'How well does this article match the intended author pen name, tone, and editorial perspective?'
  },
  topic_specificity: {
    type: 'score',
    instructions: 'Does the draft engage with specific details, concrete scenes, and domain realities rather than vague generalities?'
  },
  generic_ai_language: {
    type: 'noul',
    instructions: 'Does this draft use generic AI cliches, syrupy synthetic prose, or predictable boilerplate formulas?'
  },
  opening_is_generic: {
    type: 'noul',
    instructions: 'Is the opening paragraph a throat-clearing, generic preamble rather than an immediate scene or direct statement?'
  },
  recent_content_overlap: {
    type: 'noul',
    instructions: 'Does this draft repeat the core thesis and narrative arc of recently published pieces?'
  },
  headline_content_alignment: {
    type: 'score',
    instructions: 'Does the article body meaningfully deliver on the specific premise promised in the headline?'
  },
  reader_value: {
    type: 'score',
    instructions: 'Does reading this article offer authentic intellectual, craft, or emotional value to a discerning reader?'
  },
  requires_additional_review: {
    type: 'noul',
    instructions: 'Are there factual discrepancies, questionable claims, or boundary risks that warrant human or senior editorial review?'
  }
};

/**
 * Builds compact state for Post-Generation Article QA
 */
export function buildArticleQAState({
  title,
  summary,
  content,
  category,
  author,
  recentTitles = []
}) {
  // Extract opening passage (first ~250 words) and representative excerpt for inspection
  const words = String(content || '').trim().split(/\s+/);
  const openingExcerpt = words.slice(0, 200).join(' ');
  const middleExcerpt = words.slice(200, 450).join(' ');

  return {
    article: {
      title: title || '',
      category: category || '',
      author: typeof author === 'string' ? author : (author?.penName || author?.fullName || 'writer'),
      wordCount: words.length,
      summary: (summary || '').slice(0, 250),
      opening_passage: openingExcerpt,
      body_excerpt: middleExcerpt
    },
    writon_context: {
      recent_titles: recentTitles.slice(0, 8),
      quality_standard: 'Anti-AI-slop, concrete sensory details, zero hollow metaphors, genuine narrative stakes'
    }
  };
}
