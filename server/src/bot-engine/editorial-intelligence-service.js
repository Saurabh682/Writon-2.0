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
  Tech: ['#tech', '#technology'],
  Culture: ['#culture', '#arts'],
  Essays: ['#explainers', '#ideas'],
  Humour: ['#humour', '#satire'],
  Poetry: ['#poetry', '#writingcommunity'],
  'Short Stories': ['#shortstories', '#storytelling'],
  Reviews: ['#reviews', '#techreviews'],
  'Business & Finance': ['#business', '#finance'],
  Sports: ['#sports', '#athletics'],
  Entertainment: ['#entertainment', '#popculture'],
  Journalism: ['#journalism', '#currentaffairs'],
  Philosophy: ['#philosophy', '#deepthinking']
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

/**
 * Hard Pre-Publication Quality Gates (Zero AI Slop Blockers):
 * 1. TRENDING_KEYWORD_AS_TITLE_FAIL: Raw search phrase used as title without transformation.
 * 2. TOPIC_SUBSTITUTION_FAIL: Central noun can be swapped out from generic template scaffolding.
 * 3. CURRENT_TOPIC_STALE_SOURCE_FAIL: "Today/latest/current" content relying on old reporting.
 * 4. ABSTRACT_CONCLUSION_WITHOUT_CAUSAL_BRIDGE_FAIL: Sweeping societal claims without causal evidence.
 * 5. PERSONA_ERASURE_FAIL: Named writer contributes zero distinctive setting, vocabulary, or cognitive lens.
 * 6. GENERIC_APHORISM_FAIL: Floating quote-card philosophy or unearned aphorisms.
 */
export function validateZeroAISlopEngineBlockers({
  title = '',
  content = '',
  summary = '',
  category = 'Essays',
  persona = null,
  researchDossier = null,
  now = new Date()
} = {}) {
  const violations = [];
  const cleanTitle = String(title || '').trim();
  const cleanContent = String(content || '').trim();
  const cleanSummary = String(summary || '').trim();
  const fullText = `${cleanTitle}\n${cleanSummary}\n${cleanContent}`;
  const currentYear = now.getFullYear();

  // 1. TRENDING_KEYWORD_AS_TITLE_FAIL
  const cannedTitleSuffixes = [
    /:\s*reflections on a changing world$/i,
    /:\s*what the current reporting establishes$/i,
    /:\s*an engineering deep-dive$/i,
    /:\s*a field guide to modern sanity$/i,
    /:\s*market forces, margins, and prudence$/i,
    /:\s*evidence, context, and open questions$/i,
    /:\s*tested, measured, and deconstructed$/i,
    /:\s*storytelling beyond the spectacle$/i
  ];
  for (const pattern of cannedTitleSuffixes) {
    if (pattern.test(cleanTitle)) {
      violations.push({
        rule: 'TRENDING_KEYWORD_AS_TITLE_FAIL',
        description: `Title "${cleanTitle}" contains a banned canned template formula suffix. Titles must emerge organically from the essay rather than template slot-in.`
      });
      break;
    }
  }

  // Raw search queries as titles without transformation
  if (/^(?:stock market today|sensex today|nifty today|election results today|gold price today|crypto market today|budget today)\b/i.test(cleanTitle)) {
    violations.push({
      rule: 'TRENDING_KEYWORD_AS_TITLE_FAIL',
      description: `Title "${cleanTitle}" begins with a raw search query. Transform into an evocative literary title (e.g. "The Number That Changes Before Lunch").`
    });
  }

  const dossierTopic = (researchDossier?.topic || '').trim().toLowerCase();
  if (dossierTopic && dossierTopic.length >= 8) {
    const normalizedTitle = cleanTitle.toLowerCase().replace(/^on\s+/i, '').replace(/:\s*$/, '').trim();
    if (normalizedTitle === dossierTopic) {
      violations.push({
        rule: 'TRENDING_KEYWORD_AS_TITLE_FAIL',
        description: `Title is identical to the raw search trend topic "${dossierTopic}" without literary transformation.`
      });
    }
  }

  // 2. TOPIC_SUBSTITUTION_FAIL
  const substitutionScaffoldingPatterns = [
    /there are moments when a single event or cultural development serves as a lens through which the wider currents/i,
    /the evolving discourse around\s+(?:\*\*)?[^*]+(?:\*\*)?\s+is precisely such a moment/i,
    /we often mistake velocity for progress\.\s*in our rush to quantify and react/i,
    /will not be measured by the headline cycle of a single afternoon,\s*but by the quiet transformations/i,
    /if there is one thing that unites human civilization across every geography/i,
    /behind every balance sheet,\s*inventory valuation,\s*and quarterly forecast/i,
    /from the classical dialogues of ancient stoics to modern inquiries into cognition/i,
    /every city carries within its stones an archive of memory/i,
    /athletic greatness is forged far from television cameras/i,
    /cinema,\s*stage,\s*and popular culture do not simply reflect the world/i,
    /responsible reporting begins where public assertions meet verifiable ground reality/i,
    /the morning mist was just beginning to lift from the old railway siding when anand stepped/i
  ];

  for (const pattern of substitutionScaffoldingPatterns) {
    if (pattern.test(cleanContent)) {
      violations.push({
        rule: 'TOPIC_SUBSTITUTION_FAIL',
        description: `Content matches generic Mad Lib template scaffolding (${pattern.source}). The central subject can be swapped with any noun without altering the argument.`
      });
      break;
    }
  }

  // 3. CURRENT_TOPIC_STALE_SOURCE_FAIL
  const hasCurrentTimeframe = /\b(today|latest|current|this week|now)\b/i.test(`${cleanTitle} ${cleanSummary}`);
  if (hasCurrentTimeframe) {
    const citationWithOldDate = cleanContent.match(/(?:reports? from|according to|highlight|coverage in|published on|dated)\s+[\s\S]{1,120}?\b(202[0-5]|20[0-1]\d)\b/i) ||
      cleanContent.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Sept|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+(202[0-5]|20[0-1]\d)\b/i);
    if (citationWithOldDate) {
      const oldYear = citationWithOldDate[1];
      violations.push({
        rule: 'CURRENT_TOPIC_STALE_SOURCE_FAIL',
        description: `Article claims current timeframe ("today/latest/current") but cites dated source material from ${oldYear} ("${citationWithOldDate[0]}").`
      });
    }

    if (Array.isArray(researchDossier?.newsReports)) {
      for (const report of researchDossier.newsReports) {
        const headline = report?.headline || '';
        const match = headline.match(/\b(202[0-5]|20[0-1]\d)\b/);
        if (match && Number(match[1]) < currentYear) {
          violations.push({
            rule: 'CURRENT_TOPIC_STALE_SOURCE_FAIL',
            description: `Lead news report in research dossier is dated ${match[1]} ("${headline}"), which cannot support a "${cleanTitle}" article in ${currentYear}.`
          });
          break;
        }
      }
    }
  }

  // 4. ABSTRACT_CONCLUSION_WITHOUT_CAUSAL_BRIDGE_FAIL
  const unearnedSocietalLeaps = [
    /fundamental shift in how public institutions,\s*markets,\s*and communities organize their priorities/i,
    /re-engineer(?:ed|ing)?\s+(?:the\s+)?(?:fabric\s+of\s+)?(?:our\s+)?(?:daily\s+)?(?:society|communities|commerce|public life)/i,
    /marks a watershed moment for the future of human civilization/i,
    /fundamentally transforms our understanding of reality/i
  ];
  for (const pattern of unearnedSocietalLeaps) {
    if (pattern.test(cleanContent)) {
      violations.push({
        rule: 'ABSTRACT_CONCLUSION_WITHOUT_CAUSAL_BRIDGE_FAIL',
        description: `Essay asserts an unsupported, sweeping macro-societal shift ("${pattern.source}") without building an empirical or situational causal bridge.`
      });
      break;
    }
  }

  // 5. PERSONA_ERASURE_FAIL
  const penName = (persona?.penName || '').toLowerCase().trim();
  if (penName.includes('priyanka') || penName.includes('mishra')) {
    const priyankaMarkers = [
      'varanasi', 'banaras', 'kashi', 'ganga', 'ghat', 'assi', 'kedar', 'dashashwamedh',
      'godowlia', 'thali', 'phulka', 'roti', 'dal', 'brass', 'steel', 'water tumbler',
      'courtyard', 'almirah', 'verandah', 'boat', 'aarti', 'father', 'mother',
      'household', 'family members', 'domestic', 'kitchen', 'dining table'
    ];
    const hitCount = priyankaMarkers.filter(m => fullText.toLowerCase().includes(m)).length;
    if (hitCount < 2) {
      violations.push({
        rule: 'PERSONA_ERASURE_FAIL',
        description: `Priyanka Mishra persona lacks distinctive sensory grounding (found ${hitCount}/2 minimum markers: Varanasi, Ganga, ghats, domestic setting, physical anchors).`
      });
    }
  }

  // 6. GENERIC_APHORISM_FAIL
  const quoteCardAphorisms = [
    />\s*["“']To observe the world with patience is to see patterns where others see only noise\.?["”']/i,
    />\s*["“']Culture is what remains when everything ephemeral has been forgotten\.?["”']/i,
    />\s*["“']A problem well-defined is a problem half-solved.*?["”']/i,
    />\s*["“']Equilibrium is not the absence of external storms.*?["”']/i,
    />\s*["“']In the silence between the words.*?["”']/i
  ];
  for (const pattern of quoteCardAphorisms) {
    if (pattern.test(cleanContent)) {
      violations.push({
        rule: 'GENERIC_APHORISM_FAIL',
        description: `Content contains an unearned, decorative quote-card aphorism (${pattern.source}). Pull-quotes must emerge from authentic character dialogue or cited historical texts.`
      });
      break;
    }
  }

  // 7. DECORATIVE_CODE_FAIL
  // Code exists but removing it changes nothing essential, or code appears in non-code genres
  const codeBlockMatch = cleanContent.match(/(?:```|~~~)[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n(?:```|~~~)/);
  if (codeBlockMatch) {
    const rawSnippet = codeBlockMatch[1].trim();
    // In Essays, Short Stories, Culture, Poetry, Shayari, Humour, Philosophy, Journalism, code is banned
    const nonCodeGenres = ['essays', 'short stories', 'culture', 'poetry', 'shayari', 'humour', 'philosophy', 'journalism'];
    const lowerCat = category.toLowerCase().trim();
    if (nonCodeGenres.includes(lowerCat)) {
      violations.push({
        rule: 'DECORATIVE_CODE_FAIL',
        description: `Code blocks are forbidden in ${category}. Express concepts and architectures purely in lucid, engaging narrative prose.`
      });
    } else {
      // Even in Tech, trivial date subtractions, mock interfaces, or boilerplate fail the Necessity Test
      const isTrivialBoilerplate = /calculateMaintenanceWindow|getTime\(\)\s*-\s*|isSupported|modelName|releaseDate/i.test(rawSnippet) ||
        /interface\s+\w+\s*\{[^}]{1,150}\}/i.test(rawSnippet);
      if (isTrivialBoilerplate) {
        violations.push({
          rule: 'DECORATIVE_CODE_FAIL',
          description: `Trivial or decorative code block detected (${rawSnippet.slice(0, 60)}...). Code in Tech must perform an essential software mechanism or query that cannot be explained in prose.`
        });
      }
    }
  }

  // 8. METAPHOR_AS_CODE_FAIL
  // Programming constructs used as metaphors for emotions, sports, ambition, human relationships
  if (codeBlockMatch) {
    const rawSnippet = codeBlockMatch[1];
    const metaphorCodePatterns = [
      /\b(?:velocity:\s*100|hesitation:\s*false|calculateUpsetProbability|pointResult|tennisMatch|gritLevel|heartRate|griefState|loveIndex|humanSoul)\b/i,
      /\b(?:class|interface|function|type)\s+(?:Grief|Grace|Ambition|Courage|Resilience|Soul|Patience|Destiny|Heart|Tennis|Victory)\b/i,
      /\b(?:let|const)\s+(?:grief|courage|destiny|grace|ambition|patience)\s*=\s*/i
    ];
    for (const pattern of metaphorCodePatterns) {
      if (pattern.test(rawSnippet)) {
        violations.push({
          rule: 'METAPHOR_AS_CODE_FAIL',
          description: `Programming constructs used as decorative metaphors for human experience or sport (${pattern.source}). Technical authenticity must come from accurate domain mechanisms, not pseudo-code allegories.`
        });
        break;
      }
    }
  }

  // 9. BROKEN_SENTENCE_FAIL
  // Article starts mid-sentence, contains obvious grammatical fragments, or corrupted syntax
  const textWithoutHeadings = cleanContent
    .split('\n')
    .filter(line => !line.trim().startsWith('#') && !line.trim().startsWith('*By ') && line.trim().length > 0)
    .join('\n')
    .trim();

  if (/^(?:through which|and so|which is why|because of which|where the wider|wherein the)\b/i.test(textWithoutHeadings)) {
    violations.push({
      rule: 'BROKEN_SENTENCE_FAIL',
      description: `Article begins mid-sentence or with a dependent clause fragment ("${textWithoutHeadings.slice(0, 50)}..."). Articles must begin with a complete, grammatically sound sentence.`
    });
  }
  if (/\b(?:witnessing a their priorities|a an\b|the their\b|in a the\b)/i.test(cleanContent)) {
    violations.push({
      rule: 'BROKEN_SENTENCE_FAIL',
      description: 'Malformed grammatical sequence detected (e.g. "witnessing a their priorities"). Indicates interrupted or corrupted text generation.'
    });
  }

  // 10. SCRAPED_DEFINITION_FAIL
  // Raw encyclopedia or search snippet definition language inserted directly into prose
  const scrapedDefinitionPatterns = [
    /Historically understood as the national association for stock car auto racing/i,
    /\b(?:is an american auto racing sanctioning and operating company)\b/i,
    /\b(?:is a private company that sanctions and operates)\b/i,
    /\b(?:is an Indian multinational|is an American multinational technology company)\b/i,
    /\b(?:llc \([a-zA-Z0-9]+\) is an american)\b/i,
    /\b(?:according to wikipedia|as defined by wikipedia)\b/i
  ];
  for (const pattern of scrapedDefinitionPatterns) {
    if (pattern.test(cleanContent)) {
      violations.push({
        rule: 'SCRAPED_DEFINITION_FAIL',
        description: `Raw encyclopedia/search-snippet definition language detected (${pattern.source}). Prohibit mechanical dictionary dumps in literary essays.`
      });
      break;
    }
  }

  // 11. TRUNCATED_SOURCE_FAIL
  // Ellipsized source text or interrupted words (e.g. "it is conside...")
  if (/\b(?:conside\.\.\.|developm\.\.\.|organi\.\.\.|signific\.\.\.|commerc\.\.\.)/i.test(cleanContent) ||
      /\b[a-z]{3,}\.\.\.\s*(?:["'\)\]]|$)/i.test(cleanContent.replace(/\.\.\.\s*(?:[A-Z]|$)/g, ''))) {
    // Look specifically for truncated word stems preceding dots
    const truncatedWordMatch = cleanContent.match(/\b([a-zA-Z]{3,})\.\.\.(?!\s*[a-zA-Z])/);
    if (truncatedWordMatch && !/etc\.\.\.|wait\.\.\.|listen\.\.\.|quiet\.\.\./i.test(truncatedWordMatch[0])) {
      violations.push({
        rule: 'TRUNCATED_SOURCE_FAIL',
        description: `Truncated source fragment detected ("${truncatedWordMatch[0]}"). Body text must never contain clipped search engine strings or broken stems.`
      });
    }
  }

  // 12. EMPTY_QUOTE_FAIL
  // Blockquote that contains only punctuation, empty quotes, or single dots
  const emptyQuoteRegex = /^>\s*["'“”«»]?\s*[\.\s]*\s*["'“”«»]?\s*$/m;
  if (emptyQuoteRegex.test(cleanContent) || /^>\s*["'“”«»]\.["'“”«»]\s*$/m.test(cleanContent)) {
    violations.push({
      rule: 'EMPTY_QUOTE_FAIL',
      description: 'Empty or single-punctuation blockquote detected (e.g. \'> "."\'). Blockquotes must contain substantive text with attribution or be removed.'
    });
  }

  // 13. GENERIC_REFLECTION_TEMPLATE_FAIL
  // Stock boilerplates that masquerade as profound commentary without concrete causal grounding
  const stockTemplatePatterns = [
    /wider currents of our society become visible/i,
    /quiet transformations? that reshape/i,
    /second-order consequences? of our/i,
    /we often mistake velocity for progress/i,
    /serves as a lens through which/i
  ];
  let templateHits = 0;
  for (const pattern of stockTemplatePatterns) {
    if (pattern.test(cleanContent)) {
      templateHits++;
    }
  }
  if (templateHits >= 2 || (templateHits >= 1 && /is precisely such a moment/i.test(cleanContent))) {
    violations.push({
      rule: 'GENERIC_REFLECTION_TEMPLATE_FAIL',
      description: 'Generic reflection template boilerplate detected ("wider currents of society", "lens through which", "mistake velocity for progress"). Replace with concrete causal mechanisms.'
    });
  }

  // 14. PERSONA_ABSENCE_FAIL
  // Enforces that named persona pieces contain minimum persona markers
  if (penName.includes('radhika') || penName.includes('gowda')) {
    const radhikaMarkers = [
      'mysore', 'mysuru', 'karnataka', 'chamundi', 'devaraja', 'silk', 'ledger', 'balance sheet',
      'salary', 'independence', 'savings', 'account', 'father', 'mother', 'brother', 'family',
      'hostel', 'pg', 'scooter', 'bus stand', 'filter coffee', 'tiffin', 'passbook'
    ];
    const hitCount = radhikaMarkers.filter(m => fullText.toLowerCase().includes(m)).length;
    if (hitCount < 2) {
      violations.push({
        rule: 'PERSONA_ABSENCE_FAIL',
        description: `Radhika Gowda persona lacks distinctive setting or life-experience anchors (found ${hitCount}/2 minimum markers: Mysore, ledger, savings, passbook, financial independence, domestic context).`
      });
    }
  }

  // 15. PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL
  // Hyper-specific synthetic numbers (frequencies, exact speeds, coordinates)
  // generated merely to simulate technical authority without verified dossier grounding.
  if (category === 'Short Stories' || category === 'Essays' || category === 'Tech') {
    const unverifiedTechnicalPrecisionPatterns = [
      /\b\d{1,2}\.\d{3}\s*MHz\b/i,
      /\b(?:118|12[1-9]|13[0-9])\s*mph\s+serve\b/i,
      /\b\d{1,2}°\d{1,2}'(?:[NSEW]|\s*[NSEW])\b/i
    ];
    for (const pattern of unverifiedTechnicalPrecisionPatterns) {
      if (pattern.test(cleanContent)) {
        const dossierStr = JSON.stringify(researchDossier || {}).toLowerCase();
        const matchToken = cleanContent.match(pattern)?.[0] || '';
        if (!dossierStr.includes(matchToken.toLowerCase())) {
          violations.push({
            rule: 'PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL',
            description: `Unverified hyper-specific technical metric detected ("${matchToken}"). Frequencies, speeds, and coordinates must not be generated merely to simulate technical authority unless backed by verified primary source dossiers.`
          });
          break;
        }
      }
    }
  }

  // 16. UNEARNED_TITLE_OCCUPATION_FAIL
  // Title claims a specific trade, profession, or craft ("The Projectionist...", "The Harbor Pilot...", "The Clockmaker...")
  // that never appears in the scene, setting, or narrative engine of the article.
  const occupationTitlePattern = /^(?:the\s+)?(projectionist|harbor\s+pilot|clockmaker|watchmaker|lighthouse\s+keeper|typesetter|linotype\s+operator|telegraphist|switchboard\s+operator)\b/i;
  const occupationMatch = cleanTitle.match(occupationTitlePattern);
  if (occupationMatch) {
    const occupationWord = occupationMatch[1].toLowerCase();
    const contentHasOccupation = cleanContent.toLowerCase().includes(occupationWord);
    if (!contentHasOccupation) {
      violations.push({
        rule: 'UNEARNED_TITLE_OCCUPATION_FAIL',
        description: `Title promises an occupation or craft persona ("${occupationMatch[0]}") that never appears in the article text or narrative engine. Ensure titles accurately match the premise.`
      });
    }
  }

  // 17. FABRICATED_SOURCE_DETAIL_FAIL
  // Hallucinating decorative atmosphere or prose attributed to factual sources (e.g. "People.com reports that the night was full of soft light and velvet fabrics")
  const fabricatedSourceAtmospherePatterns = [
    /\b(?:reports?|reported|writes?|wrote)\s+that\s+the\s+night\s+was\s+full\s+of\s+soft\s+light\b/i,
    /\bheadlines?\s+call\s+it\s+a\s+['"‘“]crown\s+jewel['"’”]/i
  ];
  for (const pattern of fabricatedSourceAtmospherePatterns) {
    if (pattern.test(cleanContent)) {
      violations.push({
        rule: 'FABRICATED_SOURCE_DETAIL_FAIL',
        description: 'Fabricated source detail detected. Attributing decorative, atmospheric claims or misattributing quotes to news outlets violates factual reporting standards.'
      });
      break;
    }
  }

  // 18. PLANNER_TEXT_LEAK_FAIL
  // Rejects draft if title or body contains internal planning description, brief, objective, or meta-prompt fragments
  const plannerLeakPatterns = [
    /\b(?:an\s+exploration\s+of\s+failure,\s*patience,\s*and\s*recovery)\b/i,
    /\b(?:within\s+the\s+realm\s+of\s+culture)\b/i,
    /\b(?:the\s+living\s+heritage\s+of\s+an\s+exploration)\b/i,
    /\b(?:the\s+living\s+conversation\s+surrounding\s+an\s+exploration)\b/i,
    /\b(?:content\s+objective|planning\s+brief|topic\s+brief|internal\s+premise|editorial\s+brief)\b/i,
    /\b(?:through\s+the\s+lens\s+of\s+culture|through\s+the\s+prism\s+of\s+culture)\b/i
  ];
  for (const pattern of plannerLeakPatterns) {
    if (pattern.test(`${cleanTitle} ${cleanContent}`)) {
      violations.push({
        rule: 'PLANNER_TEXT_LEAK_FAIL',
        description: `Internal planning language or prompt brief leaked into published title or copy ("${pattern.source}"). Internal goals must never escape into reader-facing text.`
      });
      break;
    }
  }

  // 19. TITLE_NATURALNESS_CHECK
  // Rejects unnatural titles: containing prompt instructions, sentence-length planning briefs, or > 14 words
  const titleWordCount = cleanTitle.split(/\s+/).filter(Boolean).length;
  if (/^(?:the\s+living\s+heritage\s+of\s+an\s+|reflections\s+on\s+a\s+changing\s+world|an\s+exploration\s+of\s+)/i.test(cleanTitle) ||
      /\b(?:within\s+the\s+realm\s+of|a\s+timely\s+editorial\s+exploration)\b/i.test(cleanTitle) ||
      (titleWordCount > 14 && !/[:—]/.test(cleanTitle))) {
    violations.push({
      rule: 'TITLE_NATURALNESS_CHECK',
      description: `Title "${cleanTitle}" fails natural publication test (${titleWordCount} words). Titles must be concise (<= 14 words), independently readable, and free of meta-prompt or brief language.`
    });
  }

  // 20. UNATTRIBUTED_APHORISM_FAIL
  // Blockquotes containing stock aphorisms without historical or conversational attribution
  if (/>\s*["“']Culture is what remains when everything ephemeral has been forgotten\.?["”']/i.test(cleanContent) ||
      />\s*["“']Heritage is not a static museum relic.*?["”']/i.test(cleanContent)) {
    violations.push({
      rule: 'UNATTRIBUTED_APHORISM_FAIL',
      description: 'Generic, unattributed quote-card aphorism detected in blockquote. Blockquotes must emerge from authentic spoken dialogue or cited historical figures.'
    });
  }

  // 21. ABSTRACT_CULTURE_WITHOUT_OBJECT_FAIL
  // If a Culture article contains excessive abstract cultural rhetoric without grounding in concrete people, objects, scenes, or primary source facts
  if (category.toLowerCase() === 'culture') {
    const abstractCultureTokens = cleanContent.match(/\b(?:heritage|tradition|continuum|craft|vernacular|identity|homogenization|ephemeral)\b/gi) || [];
    const concreteSensoryAnchors = cleanContent.match(/\b(?:cinema|theatre|screen|projector|film|prequel|ticket|hall|balcony|ticket\s+counter|box\s+office|verandah|brass|curtain|dialogue|purvanchal|mirzapur|munna|guddu|kaleen)\b/gi) || [];
    if (abstractCultureTokens.length >= 6 && (!concreteSensoryAnchors || concreteSensoryAnchors.length < 2)) {
      violations.push({
        rule: 'ABSTRACT_CULTURE_WITHOUT_OBJECT_FAIL',
        description: `Culture article contains ${abstractCultureTokens.length} abstract cultural buzzwords with insufficient concrete sensory or source-specific grounding (${concreteSensoryAnchors.length} anchors). Ground cultural essays in physical rituals, objects, and specific artistic artifacts.`
      });
    }
  }

  // 22. FIRST_PERSON_WITNESS_CLAIM_FAIL
  // Prohibits claiming to attend real venues, observe real crowds, witness live audience behavior,
  // or describe scene attendants in non-fiction, research-grounded or culture essays without source evidence.
  if (category.toLowerCase() === 'culture' || category.toLowerCase() === 'essays' || category.toLowerCase() === 'journalism') {
    const fabricatedWitnessPatterns = [
      /\b(?:the\s+projector\s+lamp\s+at\s+the\s+single-screen\s+theatre\s+in\s+Gorakhpur)\b/i,
      /\b(?:in\s+the\s+balcony\s+rows,\s+two\s+hundred\s+men\s+are\s+waiting)\b/i,
      /\b(?:the\s+theatre\s+attendant\s+stands\s+by\s+the\s+fire\s+exit)\b/i,
      /\b(?:front\s+stalls\s+whistle\s+at\s+him)\b/i
    ];
    for (const pattern of fabricatedWitnessPatterns) {
      if (pattern.test(cleanContent)) {
        violations.push({
          rule: 'FIRST_PERSON_WITNESS_CLAIM_FAIL',
          description: 'Fabricated first-person or eyewitness reportage detected in non-fiction commentary. Non-fiction essays must not invent scenes, venue attendance, or crowd behavior to simulate presence.'
        });
        break;
      }
    }
  }

  // 23. UNVERIFIED_INDUSTRY_FIRST_FAIL
  // Prohibits unverified sweeping historic claims ("marks the first time an Indian streaming franchise", "first ever", "first in history")
  const unverifiedIndustryFirstPatterns = [
    /\bmarks\s+the\s+first\s+time\s+an\s+Indian\s+streaming\s+franchise\b/i,
    /\bthe\s+first\s+time\s+in\s+(?:Indian\s+)?streaming\s+history\b/i,
    /\bnever\s+before\s+in\s+(?:Indian\s+)?cinema\s+history\b/i
  ];
  for (const pattern of unverifiedIndustryFirstPatterns) {
    if (pattern.test(cleanContent)) {
      violations.push({
        rule: 'UNVERIFIED_INDUSTRY_FIRST_FAIL',
        description: 'Unverified historical or industry milestone claim detected ("first time an Indian streaming franchise..."). Avoid unqualified industry-wide "firsts" without explicit source corroboration.'
      });
      break;
    }
  }

  // 24. FICTIONAL_PRECISION_FAIL
  // Prohibits synthetic technical metrics in cultural/non-fiction commentary (wattage, seat count, ticket prices)
  const fictionalPrecisionPatterns = [
    /\bfifty-kilowatt\s+surround\s+horns\b/i,
    /\beight-hundred-seat\s+cinema\s+hall\b/i,
    /\btwo\s+hundred\s+and\s+fifty\s+rupees\s+ticket\b/i
  ];
  for (const pattern of fictionalPrecisionPatterns) {
    if (pattern.test(cleanContent)) {
      violations.push({
        rule: 'FICTIONAL_PRECISION_FAIL',
        description: 'Synthetic, unverified precision metrics detected (wattage, seat counts, ticket prices). Use direct, natural phrasing instead of faux-technical quantification in cultural essays.'
      });
      break;
    }
  }

  // 25. RESULT_CONTRADICTS_PREMISE_FAIL
  // Flags when real-event reporting contradicts the article's narrative thesis (e.g. describing a grueling 5-set marathon as a predictable march)
  if (/\bpredictable\s+march\b/i.test(cleanContent) && /\b(?:five-set|5-set|marathon|four-hour|4\s*hours|after\s+2\s*a\.m\.)\b/i.test(`${cleanContent} ${JSON.stringify(researchDossier || {})}`)) {
    violations.push({
      rule: 'RESULT_CONTRADICTS_PREMISE_FAIL',
      description: 'The real-world event outcome contradicts the article\'s thesis. Describing a five-set marathon or grueling resistance as a "predictable march" forces reality into a predetermined premise.'
    });
  }

  // 26. SPORT_STYLE_GENERALIZATION_FAIL
  // Rejects sweeping, unearned claims that an entire sport or era has abandoned nuance/slice/tactics based on a single match
  const sweepingSportGeneralizations = [
    /\bmodern\s+tennis\s+has\s+discarded\s+the\s+(?:slow|loitering)\s+slice\b/i,
    /\bmodern\s+(?:tennis|game)\s+has\s+abandoned\b/i,
    /\btoday's\s+game\s+is\s+only\s+velocity\b/i,
    /\bhuman\s+worth\s+in\s+milliseconds\s+of\s+racket-head\s+speed\b/i,
    /\brallies\s+.*?end\s+only\s+when\s+someone['’]s\s+lung\s+capacity\s+fails\b/i
  ];
  for (const pattern of sweepingSportGeneralizations) {
    if (pattern.test(cleanContent)) {
      violations.push({
        rule: 'SPORT_STYLE_GENERALIZATION_FAIL',
        description: 'Sweeping, unverified sport-wide aesthetic decline claim detected. A single match cannot be used to declare that an entire era or sport has abandoned tactical variety.'
      });
      break;
    }
  }

  // 27. TITLE_OBJECT_CONTRACT_FAIL
  // Metaphorical titles with "The X and the Y" must feature BOTH objects/concepts materially in the essay
  const dualObjectTitleMatch = cleanTitle.match(/^the\s+([a-z]+)\s+and\s+the\s+([a-z]+)$/i);
  if (dualObjectTitleMatch) {
    const obj1 = dualObjectTitleMatch[1].toLowerCase();
    const obj2 = dualObjectTitleMatch[2].toLowerCase();
    const lowerContent = cleanContent.toLowerCase();
    const hasObj1 = lowerContent.includes(obj1);
    const hasObj2 = lowerContent.includes(obj2);
    if (!hasObj1 || !hasObj2) {
      const missing = !hasObj1 && !hasObj2 ? `both "${obj1}" and "${obj2}"` : (!hasObj1 ? `"${obj1}"` : `"${obj2}"`);
      violations.push({
        rule: 'TITLE_OBJECT_CONTRACT_FAIL',
        description: `Title promises two core material metaphors ("${cleanTitle}"), but the essay fails to feature ${missing}. Both nouns must materially shape the piece.`
      });
    }
  }

  // 28. PERSONA_LENS_CONTAMINATION_FAIL
  // Prevents one persona from borrowing another persona's signature domain/vocabulary merely for decorative metaphor
  if (penName.includes('sunita') || penName.includes('banerjee')) {
    const aaravSystemsMetaphor = /\b(?:cache\s+invalidation|distributed\s+systems|wal\b|replication\s+slot|lsn\b|kernel\s+panic)\b/i;
    if (aaravSystemsMetaphor.test(cleanContent)) {
      violations.push({
        rule: 'PERSONA_LENS_CONTAMINATION_FAIL',
        description: 'Persona lens contamination detected: Dr. Sunita Banerjee borrowing Aarav Mehta\'s systems engineering / cache invalidation vocabulary for metaphor convenience.'
      });
    }
  }

  // 29. SELF_REFERENCE_COOLDOWN
  // Prohibits self-referencing earlier bot essay titles purely for artificial continuity
  if (/\b(?:in\s+my\s+earlier\s+essay|as\s+i\s+wrote\s+in\s+['"“]the\s+graded\s+response['"”])\b/i.test(cleanContent)) {
    violations.push({
      rule: 'SELF_REFERENCE_COOLDOWN',
      description: 'Artificial bot network self-reference detected ("In my earlier essay..."). Continuity citations are disallowed unless the earlier piece is formally being revised or refuted.'
    });
  }

  // 30. UNSOURCED_SCENE_PRECISION_FAIL
  // Blocks fabricated crowd counts, physiological crowd reactions, food/drink behavior, or unverified point-level distance measurements
  const unsourcedScenePrecisionPatterns = [
    /\b(?:remaining\s+seventy\s+people|seventy\s+people\s+in\s+the\s+lower\s+bowl)\b/i,
    /\b(?:ball\s+boys?\s+on\s+grandstand\s+were\s+shaking\s+the\s+cramps|shaking\s+the\s+cramps\s+out\s+of\s+their\s+calves)\b/i,
    /\b(?:stopped\s+drinking\s+beer\s+and\s+started\s+drinking\s+water\s+out\s+of\s+necessity)\b/i,
    /\b(?:missed\s+a\s+backhand\s+down\s+the\s+line\s+by\s+four\s+inches)\b/i
  ];
  for (const pattern of unsourcedScenePrecisionPatterns) {
    if (pattern.test(cleanContent)) {
      violations.push({
        rule: 'UNSOURCED_SCENE_PRECISION_FAIL',
        description: 'Unsourced scene precision detected: fabricated spectator counts, body reactions, or unverified ball distances without factual telemetry or reporting.'
      });
      break;
    }
  }

  // 31. EVENT_BINDING_FAIL
  // Ensures match metadata (venue, players, round) matches verified facts (e.g. Zverev vs Halys played on Arthur Ashe Stadium, not Grandstand)
  if (/\b(?:halys|zverev)\b/i.test(cleanContent)) {
    if (/\bgrandstand\b/i.test(cleanContent) && !/\barthur\s+ashe\b/i.test(cleanContent)) {
      violations.push({
        rule: 'EVENT_BINDING_FAIL',
        description: 'Event binding mismatch: Zverev vs Halys 2026 US Open 5-set marathon was played on Arthur Ashe Stadium, not Grandstand.'
      });
    }
  }

  // 32. PERSONA_METAPHOR_CONTAMINATION_FAIL
  // Sunita Banerjee must not spontaneously adopt mechanical engineering / motor machinery metaphors
  if (penName.includes('sunita') || penName.includes('banerjee')) {
    const mechanicalEngineMetaphors = [
      /\b(?:re-torquing\s+a\s+cylinder\s+head|cylinder\s+head\s+that\s+should\s+never\s+have\s+vibrated\s+loose)\b/i,
      /\b(?:gait\s+of\s+an\s+engineer|torque\s+specifications?)\b/i,
      /\b(?:internal\s+combustion|piston\s+rings?|exhaust\s+manifold)\b/i
    ];
    for (const pattern of mechanicalEngineMetaphors) {
      if (pattern.test(cleanContent)) {
        violations.push({
          rule: 'PERSONA_METAPHOR_CONTAMINATION_FAIL',
          description: 'Persona metaphor contamination: Dr. Sunita Banerjee borrowing mechanical engineering and engine machinery metaphors. Her native domain is pedagogy, grading, rubrics, and institutional measurement.'
        });
        break;
      }
    }
  }

  // 33. SIMILE_COMPLEXITY_FAIL
  // Rejects overdesigned similes that arrive carrying multi-clause machinery, distracting from the narrative beat
  if (/\bthe\s+(?:heavy,\s*)?unhurried\s+gait\s+of\s+an\s+engineer\s+who\s+has\s+spent\s+forty-five\s+minutes\s+re-torquing\b/i.test(cleanContent)) {
    violations.push({
      rule: 'SIMILE_COMPLEXITY_FAIL',
      description: 'Overdesigned multi-clause simile detected. Literary specificity should clarify the image, not advertise generation effort or invent elaborate extraneous trades.'
    });
  }

  // 34. ANALOGY_FUNCTION_MISMATCH_FAIL
  // Analogies must match functionally: e.g. a tournament seed is an administrative prior expectation, not an evaluation made after inspecting the work
  if (/\bprovisional\s+grade\b/i.test(cleanContent) && /\b(?:administrative\s+prediction|foregone\s+conclusion)\b/i.test(cleanContent) && /\bseeding\b/i.test(cleanContent)) {
    violations.push({
      rule: 'ANALOGY_FUNCTION_MISMATCH_FAIL',
      description: 'Analogy function mismatch: Comparing a tournament seed (an a priori hierarchy establishing expectation) to a provisional grade on a submitted paper (retrospective evaluation). Use prior term GPAs, entrance ranks, or marks ledger predictions instead.'
    });
  }

  // 35. SYMBOLIC_ENDING_TOO_NEAT_FAIL
  // Reject endings where the narrator performs a neat literal gesture perfectly closing the philosophical thesis (e.g. crossing out a grade because of a tennis match)
  const symbolicNeatEndings = [
    /\b(?:draw\s+a\s+single\s+blue\s+line\s+through\s+the\s+provisional\s+grade|cross(?:ed|ing)?\s+out\s+the\s+(?:provisional\s+)?grade)\b/i,
    /\b(?:tears?\s+up\s+the\s+rubric|smashes?\s+the\s+(?:clock|watch)\s+to\s+learn\s+patience)\b/i
  ];
  for (const pattern of symbolicNeatEndings) {
    if (pattern.test(cleanContent)) {
      violations.push({
        rule: 'SYMBOLIC_ENDING_TOO_NEAT_FAIL',
        description: 'Symbolic ending too neat: The narrator immediately performs a literal physical action perfectly embodying the abstract conclusion. Prefer renewed attention, unresolved observation, or reading the evidence again.'
      });
      break;
    }
  }

  // 36. SPORTS_SEED_BINDING_FAIL
  // Accurate seed verification: Alexander Zverev was seeded fourth (No. 4) at the 2026 US Open, not third (No. 3)
  if (/\bzverev\b/i.test(cleanContent) && /\bseeded\s+third\b/i.test(cleanContent)) {
    violations.push({
      rule: 'SPORTS_SEED_BINDING_FAIL',
      description: 'Sports fact binding error: Alexander Zverev was seeded fourth (No. 4), not third, at the 2026 US Open.'
    });
  }

  // 37. REAL_TRAGEDY_FICTIONALIZATION_FAIL
  // Never turn active real criminal proceedings involving homicide, child deaths, or identifiable victims into fictionalized domestic drama
  const isRealSensitiveCriminalCase = /\b(?:lindsay\s+clancy|kevin\s+reddington)\b/i.test(cleanContent);
  if (isRealSensitiveCriminalCase) {
    const isCategorizedAsFiction = /^(?:short\s+stories|fiction|flash\s+fiction)$/i.test(category);
    const hasInventedDomesticDrama = /\b(?:preet|attic\s+bedroom|ceramic\s+mugs?|mismatched\s+ceramic|peeled\s+orange|slate\s+shingles|half-peeled\s+orange)\b/i.test(cleanContent);
    if (isCategorizedAsFiction || hasInventedDomesticDrama) {
      violations.push({
        rule: 'REAL_TRAGEDY_FICTIONALIZATION_FAIL',
        description: 'Real tragedy fictionalization detected: Source material concerns active criminal proceedings involving child fatalities and identifiable real participants (Lindsay Clancy). It must not be handled as a fictionalized domestic drama with invented characters, dialogue, or domestic props. Must be framed as a sourced legal/philosophical Essay or completely fictionalized with all real names removed.'
      });
    }
  }

  // 38. ONGOING_LEGAL_STATUS_SYNC_FAIL
  // Prohibits blending distinct procedural stages: judge announcing intent to declare mistrial vs emergency stay vs mistrial formally declared
  if (/\b(?:lindsay\s+clancy|reddington)\b/i.test(cleanContent)) {
    if (/\bthe\s+judge\s+(?:just\s+)?declared\s+it\b/i.test(cleanContent) && /\bgoing\s+for\s+an\s+emergency\s+stay\b/i.test(cleanContent)) {
      violations.push({
        rule: 'ONGOING_LEGAL_STATUS_SYNC_FAIL',
        description: 'Ongoing legal status mismatch: Conflates procedural stages. Judge Sullivan announced an intention to declare a mistrial and granted a window to seek emergency intervention; the stay request was made to pause the declaration, and only after the stay was denied was the mistrial formally declared.'
      });
    }
  }

  // 39. LEGAL_ARGUMENT_BINDING_FAIL
  // Legal arguments must bind to the actual procedural issue (emergency stay was a procedural bid to stop mistrial declaration, not underlying medical insanity defense)
  if (/\bemergency\s+stay\b/i.test(cleanContent) && /\breddington\s+will\s+argue\s+the\s+medical\s+state\b/i.test(cleanContent)) {
    violations.push({
      rule: 'LEGAL_ARGUMENT_BINDING_FAIL',
      description: 'Legal argument binding error: An emergency stay to the Supreme Judicial Court was a procedural maneuver to prevent the mistrial declaration after jury deadlock, not a venue to re-argue the medical insanity defense of the underlying trial.'
    });
  }

  // 40. CONTESTED_MENTAL_STATE_SIMPLIFICATION_FAIL
  // For real identifiable defendants, do not convert contested medical/legal insanity claims into lyrical prose ("a mind simply breaks")
  if (/\b(?:quiet,\s*empty\s+space\s+where\s+a\s+mind\s+simply\s+breaks|a\s+mind\s+simply\s+breaks)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'CONTESTED_MENTAL_STATE_SIMPLIFICATION_FAIL',
      description: 'Contested mental state simplification: Collapses a central disputed medical and legal question of criminal responsibility into an unearned lyrical diagnosis ("a mind simply breaks"). Must maintain rigorous attribution (competing accounts of postpartum psychosis, overmedication, and criminal responsibility).'
    });
  }

  // 41. SOURCE_AS_PROP_FAIL
  // Named publications must contribute evidence or an examined argument, not serve as set dressing on a fictional floor
  if (/\bwall\s+street\s+journal\b/i.test(cleanContent) && /\b(?:printout\s+on\s+the\s+floor|opinion\s+piece\s+from\s+the\s+wall\s+street\s+journal\s+stared\s+up)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'SOURCE_AS_PROP_FAIL',
      description: 'Source as prop detected: Named journalistic source (Wall Street Journal column) used merely as atmospheric floor set dressing rather than engaging with its actual substantive argument or evidence.'
    });
  }

  // 42. SCENE_TEMPORAL_CONSISTENCY_FAIL
  // Detects deterministic clock time contradictions (e.g. heading says "Morning" but prose says "three-o'clock cloudburst")
  if (/\b(?:morning|dawn|early\s+light)\b/i.test(cleanTitle) || /\b###\s*morning\b/i.test(cleanContent)) {
    if (/\b(?:three-o'clock|3\s*o'clock|3\s*pm|afternoon\s+cloudburst|dusk|late\s+afternoon)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'SCENE_TEMPORAL_CONSISTENCY_FAIL',
        description: 'Scene temporal consistency contradiction: Heading/section announces "Morning" while prose explicitly details a "three-o\'clock" afternoon cloudburst.'
      });
    }
  }

  // 43. LOCAL_GEOGRAPHY_PRECISION_FAIL
  // Ensures transit route numbers and local geography match real city corridors (e.g. S-12 minibus on Southern Avenue or route 205 heading to Rashbehari)
  if (/\bsouthern\s+avenue\b/i.test(cleanContent)) {
    if (/\bs-12\s+minibus\b/i.test(cleanContent)) {
      violations.push({
        rule: 'LOCAL_GEOGRAPHY_PRECISION_FAIL',
        description: 'Local transit geography error: S-12 minibus is an express corridor for New Town/Howrah, not Southern Avenue in South Kolkata. Generalize to "minibus" or use verified South Kolkata routes.'
      });
    }
  }

  // 44. ENVIRONMENTAL_MOTIF_DRIFT_FAIL
  // Prohibits importing maritime/coastal texture (salt-air, salt-pans, salt-crusted) into landlocked/riverine cities like South Kolkata
  if (/\b(?:kolkata|southern\s+avenue|rashbehari|ballygunge|tollygunge)\b/i.test(cleanContent)) {
    const coastalHits = (cleanContent.match(/\b(?:salt-pans?|salt-air|salt-crusted|salt-stained)\b/gi) || []).length;
    if (coastalHits >= 2) {
      violations.push({
        rule: 'ENVIRONMENTAL_MOTIF_DRIFT_FAIL',
        description: `Environmental motif drift detected: Kolkata/Southern Avenue piece contains ${coastalHits} coastal/marine salt tokens. Replace maritime props with native urban materials (soot, moss, algae on masonry, rust on railings, wet krishnachura leaves, drain water).`
      });
    }
  }

  // 45. POETRY_OVEREXPLANATION_FAIL
  // For poetry, shayari, and verses: reject retrospective explanatory sections (Notes from the Balcony/Explaining the Poem) that summarize symbols
  if (category === 'Poetry' || category === 'Shayari') {
    if (/###\s*notes\s+from\s+the\s+balcony|###\s*reflection\b|###\s*the\s+meaning\s+of\s+this\s+poem/i.test(cleanContent)) {
      violations.push({
        rule: 'POETRY_OVEREXPLANATION_FAIL',
        description: 'Poetry overexplanation detected: Appending a retrospective essay/notes section explaining civic symbols, domestic rituals, or themes after the poem has already finished. Let the verse stand alone.'
      });
    }
  }

  // 46. AUTHENTICITY_TOKEN_COOLDOWN_FAIL
  // Detects unearned repetition of the default WritOn sensory prop bundle: tea + cardamom + brass + wet mortar + old city
  const tokenList = [
    /\bcardamom\b/i,
    /\b(?:brass\s+kettle|brass\s+tumbler|brass\s+cup)\b/i,
    /\b(?:wet\s+mortar|wet\s+masonry)\b/i,
    /\ban\s+old\s+city\s+taking\s+its\s+time\b/i,
    /\bsteel\s+tumbler\s+on\s+the\s+balcony\b/i
  ];
  const matchedTokens = tokenList.filter(re => re.test(cleanContent)).length;
  if (matchedTokens >= 3) {
    violations.push({
      rule: 'AUTHENTICITY_TOKEN_COOLDOWN_FAIL',
      description: `Authenticity token cooldown triggered: Draft relies on ${matchedTokens} generic WritOn prop tokens (cardamom, brass kettle, wet mortar, old city taking its time). Replace with distinctive persona-specific civic observation.`
    });
  }

  // 47. REAL_DISASTER_FICTION_BOUNDARY_FAIL
  // If a story uses a real current disaster: bind real event/place/mechanism, do not blur real casualty reporting with invented family detail or imply unsourced reportage
  const mentionsRealDisaster = /\b(?:glacial(?:-|\s+)collapse|hydropower.*plants?|hydropower.*choked|turbines?.*silt|flood.*valley|disaster\b)/i.test(cleanContent) &&
    /\b(?:hydropower|turbines?|headrace|powerhouse)\b/i.test(cleanContent);
  if (mentionsRealDisaster) {
    // If contemporary disaster is invoked without geographic/project binding ("down in the valley", "the news reports", etc.)
    if (!/\b(?:nepal|trishuli|bhotekoshi|rasuwa|rasuwagadhi|syabrubesi|melamchi)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'REAL_DISASTER_FICTION_BOUNDARY_FAIL',
        description: 'Real disaster fiction boundary error: Contemporary glacial-collapse / hydropower flood disaster used as dramatic setting without binding the specific geography, valley, or project context (e.g. Nepal Trishuli/Bhotekoshi valley or Syabrubesi/Rasuwagadhi). Avoid creating an ambiguous halfway state between real catastrophe and generic parable.'
      });
    }
  }

  // 48. TRAGEDY_STACKING_FAIL
  // Prohibits introducing an unrelated second real tragedy (e.g. Kuhestak Iran wedding strike) merely to intensify the emotional/philosophical weight of the first (Nepal flood)
  if (/\b(?:flood|glacial|hydropower)\b/i.test(cleanContent)) {
    if (/\b(?:wedding in iran|crater|u\.s\. military|strike in iran|iranian wedding)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'TRAGEDY_STACKING_FAIL',
        description: 'Tragedy stacking detected: Unrelated contemporary civilian disaster/military strike (Kuhestak Iran wedding strike) introduced alongside a glacial flood disaster merely to amplify emotional intensity. Remove opportunistic tragedy stacking.'
      });
    }
  }

  // 49. CAUSAL_EQUIVALENCE_FAIL
  // Rejects claiming two completely distinct tragedies are "the same", "identical", or share "identical geometry"
  if (/\b(?:geometry of the tragedy is identical|redistribution of space|both tragedies are identical|the same geometry)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'CAUSAL_EQUIVALENCE_FAIL',
      description: 'Causal equivalence slop: Claiming two tragedies with radically different political, human, or geophysical causes share "identical geometry" or are "a violent redistribution of space". Maintain clear causal distinction.'
    });
  }

  // 50. SYMBOL_EXPLAINS_ITSELF_FAIL
  // If an object already carries symbolic meaning, do not append self-explanatory didactic commentary (e.g. "The damage is permanent, but the object still functions.")
  if (/\b(?:damage is permanent,?\s*but the object still functions|the cracked cup still holds water,?\s*teaching us|the broken mirror reflects\w*,?\s*reminding us|the chipped (?:pot|plate|cup)\s*reminds? us)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'SYMBOL_EXPLAINS_ITSELF_FAIL',
      description: 'Symbol explains itself: Didactic narrative line explicitly decoding the symbolism of a household object (e.g. "The damage is permanent, but the object still functions"). Let physical objects speak without authorial explanation.'
    });
  }

  // 51. ENDING_MOTIF_COOLDOWN
  // Recent WritOn endings using: damaged object -> silence -> dripping water / ambient sound -> restrained melancholy
  if (/\b(?:the drip of water from the eaves|drip of water,?\s*rhythmic and slow|listening to the drip|listening to the slow drip)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'ENDING_MOTIF_COOLDOWN',
      description: 'Ending motif cooldown: Story concludes with the overused WritOn formula (cold teapot/damaged object -> silence -> rhythmic water dripping from the eaves). End on an unadorned physical action or concrete human gesture instead.'
    });
  }

  // 52. PREMISE_TITLE_INTEGRITY_FAIL
  // Rejects titles promising materials or mechanisms that do not exist in the piece (e.g. "The Weight of Wet Concrete" when there is no wet concrete)
  if (/the weight of wet concrete/i.test(cleanTitle) && !/\b(?:poured wet concrete|curing concrete|mixer drum|fresh concrete slab)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'PREMISE_TITLE_INTEGRITY_FAIL',
      description: 'Premise title integrity violation: Title promises "Wet Concrete", but the story details silt, flood mud, debris, and hydropower tunnels rather than fresh wet concrete.'
    });
  }

  // 53. ENTITY_FACT_BINDING_FAIL & ASSET_OWNERSHIP_VALIDATION
  // For every real named project/company, facts and investment schemes must remain attached to the actual entity
  // E.g. Upper Trishuli 3A did not issue local shares; Rasuwagadhi Hydropower did (10% local resident quota in 2022).
  if (/\bupper\s+trishuli\b/i.test(cleanContent) && /\b(?:local\s+(?:resident\s+)?quota|local-share|share\s+allotment\s+certificate)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'ENTITY_FACT_BINDING_FAIL',
      description: 'Entity fact binding mismatch: Upper Trishuli 3A did not issue local shares to project-affected residents. Rasuwagadhi Hydropower Company (111 MW) issued 10% local-resident shares in 2022 and was damaged by the 2026 flood.'
    });
  }

  // 54. STATISTIC_SCOPE_DRIFT_FAIL
  // Prohibits shifting regional macro statistics down to a single localized facility (e.g. 2.2 million tonnes of disaster debris deposited inside one turbine floor)
  if (/\b(?:two\s+million\s+tonnes|2\.2\s+million\s+tonnes)\b/i.test(cleanContent) && /\b(?:turbine\s+floor|inside\s+the\s+powerhouse|in\s+the\s+kitchen)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'STATISTIC_SCOPE_DRIFT_FAIL',
      description: 'Statistic scope drift detected: 2.2 million tonnes is the regional disaster-wide debris estimate across Nepal, not sediment deposited inside a single turbine floor.'
    });
  }

  // 55. PLAUSIBLE_PRECISION_FAIL
  // Blocks speculative cinematic precision metrics (e.g. "six feet of pulverized schist", fabricated share counts) without journalistic or telemetry grounding
  if (/\bsix\s+feet\s+of\s+pulverized\s+schist\b/i.test(cleanContent)) {
    violations.push({
      rule: 'PLAUSIBLE_PRECISION_FAIL',
      description: 'Plausible precision failure: "six feet of pulverized schist" is cinematic precision rather than verified measurement. State observed physical blockage directly without synthetic ruler metrics.'
    });
  }

  // 56. GEOGRAPHIC_SETTLEMENT_PRECISION_FAIL
  // Ensures natural topography and administrative terms match reality (e.g. Rasuwa is a district, living "above Syabrubesi" or "in Rasuwa district", not "our house above Rasuwa")
  if (/\bour\s+house\s+above\s+rasuwa\b/i.test(cleanContent)) {
    violations.push({
      rule: 'GEOGRAPHIC_SETTLEMENT_PRECISION_FAIL',
      description: 'Geographic naming error: Rasuwa is an entire district, not an individual settlement. Use "our house above Syabrubesi" or "in Rasuwa district".'
    });
  }

  // 57. PLANNER_PLACEHOLDER_LEAK_FAIL
  // Blocks internal planning briefs, meta-prompts, or editorial notes leaking into titles, headings, or body text
  const placeholderBriefPatterns = [
    /\ba\s+counterintuitive\s+perspective\s+on\b/i,
    /\bstandard\s+workflows\s+and\s+craftsmanship\b/i,
    /\ban\s+exploration\s+of\b/i,
    /\ban\s+exploration\s+of\s+failure,\s*patience\b/i,
    /\bthrough\s+the\s+lens\s+of\b/i,
    /\bwithin\s+the\s+realm\s+of\b/i,
    /\ba\s+reflection\s+on\b/i,
    /\bthe\s+intersection\s+of\b/i,
    /\bplanning\s+brief\b/i,
    /\bcontent\s+objective\b/i
  ];
  for (const pat of placeholderBriefPatterns) {
    if (pat.test(cleanTitle) || pat.test(cleanContent)) {
      violations.push({
        rule: 'PLANNER_PLACEHOLDER_LEAK_FAIL',
        description: `Planner placeholder leak detected: Text contains raw editorial/meta-prompt scaffolding ("${cleanTitle || cleanContent.slice(0, 60)}"). Must be fully transformed into original literary language before drafting.`
      });
      break;
    }
  }

  // 58. SOURCE_PREMISE_COMPATIBILITY & NO_FORCED_ANGLE_RULE
  // Detects when a current political news event (e.g. Giorgia Meloni tenure / Modi congratulations) is arbitrarily stapled onto generic rural/railway templates with zero provenance or transmission angle
  if (/\b(?:giorgia\s+meloni|meloni|italian\s+government|postwar\s+era\s+government)\b/i.test(cleanContent) || (researchDossier?.topic && /\b(?:meloni|italy.*pm|longest-serving\s+italian)\b/i.test(researchDossier.topic))) {
    // If used in fiction/railway scene without media provenance / transmission framing
    if (/\b(?:railway\s+siding|station\s+clock|goods\s+train|tea\s+stalls?)\b/i.test(cleanContent) && !/\b(?:wire\s+service|reuters|headline|broadcast|transmission|press\s+release|front\s+page)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'SOURCE_PREMISE_COMPATIBILITY_FAIL',
        description: 'Source-premise incompatibility: Political milestone (Giorgia Meloni tenure / Modi congratulations) arbitrarily stapled onto a generic rural railway station scene. If a persona lacks a legitimate documentary/provenance angle for a political source, skip the source rather than forcing literary wallpaper.'
      });
    }
  }

  // 59. SOURCE_DEPENDENCY_TEST & TOPIC_SUBSTITUTION_FAIL
  // Rejects stories where removing the news event headline leaves an unchanged generic scene
  if (/\bword\s+had\s+already\s+spread\s+through\s+the\s+tea\s+stalls\s+about\b/i.test(cleanContent)) {
    violations.push({
      rule: 'SOURCE_DEPENDENCY_FAIL',
      description: 'Source dependency failure: News event is mechanically inserted into a stock tea-stall rumor template ("Word had already spread through the tea stalls about..."). The scene does not organically arise from the source material.'
    });
  }

  // 60. APHORISTIC_DIALOGUE_FAIL
  // Rejects empty, unearned philosophical dialogue engineered merely to sound quotable without character stakes
  if (/\bsome\s+things\s+change\s+overnight\b/i.test(cleanContent) && /\bsome\s+things\s+take\s+twenty\s+years\b/i.test(cleanContent)) {
    violations.push({
      rule: 'APHORISTIC_DIALOGUE_FAIL',
      description: 'Aphoristic dialogue failure: Pretentious, unearned dialogue designed for quote-cards ("Some things change overnight... and some things take twenty years just to begin") without immediate practical motivation.'
    });
  }

  // 61. SHORT_STORY_MINIMUM_STRUCTURE & EMPTY_ATMOSPHERE_FAIL
  // Short Stories must feature a concrete character desire/friction, resistance, and a consequential action rather than atmospheric closure props ("quiet promise of an unwritten journey")
  if (category === 'Short Stories') {
    if (/\b(?:quiet\s+promise\s+of\s+an\s+unwritten\s+journey|the\s+unwritten\s+journey|unwritten\s+voyage)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'EMPTY_ATMOSPHERE_FAIL',
        description: 'Empty atmospheric closure: Cliche abstraction masquerading as poetic resolution ("quiet promise of an unwritten journey"). Conclude with concrete physical consequence.'
      });
    }
  }

  // 62. DECORATIVE_SOURCE_FAIL
  // Rejects drafts where an external news event is only mentioned decoratively (e.g. as passing gossip in a tea stall or radio in the background) without structural narrative necessity
  if (researchDossier?.topic && cleanContent) {
    const hasPassingGossip = /\b(?:word had (?:already )?spread|heard on the radio|someone mentioned at the counter|read in the morning paper|chatter in the market)\b/i.test(cleanContent);
    const mentionsTopicOnlyPassingly = cleanContent.split('\n').filter(line => /\b(?:spread|radio|paper|chatter|someone mentioned|news|headline)\b/i.test(line)).length <= 2;
    if (hasPassingGossip && mentionsTopicOnlyPassingly && !/\b(?:documentary record|archival record|wire copy|news wire|dispatch|logbook|regulatory filing|official release|transmission)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'DECORATIVE_SOURCE_FAIL',
        description: 'Decorative source failure: The research dossier source is mentioned merely as incidental gossip or background radio chatter. Removing the source leaves the scene virtually unaltered. Source must drive the narrative engine or be skipped.'
      });
    }
  }

  // 63. STOCK_NARRATIVE_SCAFFOLD_FAIL
  // Enforces global cooldown and blocks the generic short-story scaffold:
  // [railway platform/siding + station clock + tea stall + goods train + unwritten journey / slow departure]
  const railwayScaffoldHits = [
    /\b(?:railway\s+siding|railway\s+platform|old\s+station)\b/i.test(cleanContent),
    /\b(?:station\s+clock|clock\s+stuck|stopped\s+clock)\b/i.test(cleanContent),
    /\b(?:tea\s+stall|wooden\s+counter|station\s+master)\b/i.test(cleanContent),
    /\b(?:goods\s+train|train\s+whistle|distant\s+whistle)\b/i.test(cleanContent),
    /\b(?:unwritten\s+journey|twenty\s+years\s+just\s+to\s+begin|weathered\s+benches)\b/i.test(cleanContent)
  ].filter(Boolean).length;

  if (railwayScaffoldHits >= 3) {
    violations.push({
      rule: 'STOCK_NARRATIVE_SCAFFOLD_FAIL',
      description: `Stock narrative scaffold detected (${railwayScaffoldHits}/5 elements): Draft reuses the stock railway platform / stopped clock / tea stall / goods train / weathered bench template. This scaffold is on global cooldown.`
    });
  }

  // 64. UNSUPPORTED_CONCRETE_EXAMPLE_FAIL
  // Blocks converting broad sourced categories (e.g. "public services remain weak") into unsourced vivid specifics
  // (e.g. "train delays, hospital waitlists/queues, regional wage growth") unless those exact specifics are corroborated in the dossier.
  if (researchDossier?.topic && /\b(?:meloni|italian\s+government|postwar)\b/i.test(researchDossier.topic)) {
    if (/\b(?:hospital\s+waitlists?|regional\s+train\s+delays?|low\s+wage\s+growth)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'UNSUPPORTED_CONCRETE_EXAMPLE_FAIL',
        description: 'Unsupported concrete examples: Broad sourced critique of public administration and economy converted into manufactured specific examples ("hospital waitlists, regional train delays, low wage growth"). Sourced reporting discusses healthcare, education, public administration, and economic performance without these invented civic specifics.'
      });
    }
  }

  // 65. DOCUMENT_COUNT_INTEGRITY
  // If title/premise promises N documents/headlines/frames, the essay must examine exactly those N sources.
  // Prohibits introducing an unexplained fourth metaphorical or physical medium (e.g. "regional ledger", "train manifests") at the end.
  const titleNumberMatch = cleanTitle.match(/\b(three|four|five|six|two)\s+(headlines|documents|dispatches|transmissions|records|perspectives)\b/i);
  if (titleNumberMatch) {
    const wordToNum = { two: 2, three: 3, four: 4, five: 5, six: 6 };
    const promisedCount = wordToNum[titleNumberMatch[1].toLowerCase()];
    if (promisedCount === 3 && /\bregional\s+ledger\b/i.test(cleanContent)) {
      violations.push({
        rule: 'DOCUMENT_COUNT_INTEGRITY',
        description: 'Document count integrity violation: Title promises three headlines/dispatches, but the conclusion injects an unexplained fourth metaphorical source ("regional ledger"). Stay strictly with the promised documentary sources.'
      });
    }
  }

  // 66. POLITICAL_ATTRIBUTION_LOCK
  // Political claims of trust, stability, mandate, reform, or electoral success must remain explicitly attached to the speaker/institution making them.
  // Prohibits narrator upgrading government/diplomatic spin into objective historical facts (e.g. claiming longevity "had cured parliamentary fragmentation").
  if (/\b(?:had\s+cured\s+parliamentary\s+fragmentation|curing\s+parliamentary\s+fragmentation)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'POLITICAL_ATTRIBUTION_LOCK',
      description: 'Political attribution lock violation: Political claims of stability or legislative continuity converted into narrator conclusions ("had cured parliamentary fragmentation"). Keep duration presented as government/speaker claim ("In that framing, duration became evidence of political stability").'
    });
  }

  // 67. FACTUAL_PRECISION_HISTORICAL_RECORD_FAIL
  // Ensures historical benchmarks and dates are precise (e.g. 1,412 days of Berlusconi's second government, 68 governments since 1946; not vague approximations or unsourced time intervals).
  if (/\b(?:two\s+hours\s+later)\b/i.test(cleanContent) || (/\b(?:surpassed\s+Silvio\s+Berlusconi(?:'s)?\s+2001[–-]2006\s+record)\b/i.test(cleanContent) && !/\b1[,.]?412\b/.test(cleanContent))) {
    violations.push({
      rule: 'FACTUAL_PRECISION_HISTORICAL_RECORD_FAIL',
      description: 'Factual precision error: Arbitrary time interval ("Two hours later") inserted or previous record misstated without exact duration (must cite 1,412-day record of Berlusconi\'s second government and 68 postwar governments). Remove unverified chronological decoration and bind to verified historical data.'
    });
  }

  // 68. SOURCE_CAUSAL_RELEVANCE_FAIL
  // A source may enter a story only if it materially changes:
  // - the character's situation,
  // - the factual context,
  // - the central argument,
  // - or the reader's understanding of the conflict.
  // Prohibits topical association / thematic perfume (e.g. grafting Uttarakhand Waqf Board nikahnama revisions or Bollywood actor wills onto family land disputes).
  if (/\b(?:waqf\s+board|nikahnama|chandrachur\s+singh|actors?\s+and\s+relatives)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'SOURCE_CAUSAL_RELEVANCE_FAIL',
      description: 'Source causal relevance failure: External news event (Waqf Board / nikahnama or celebrity property disputes) has zero material causal link to the fictional domestic conflict. Thematic similarity of the word "inheritance" does not constitute causal relevance.'
    });
  }

  // 69. METAPHORIC_SOURCE_BRIDGING_FAIL
  // Rejects rhetorical transitions of the form: real event A -> "the friction is identical" -> fictional problem B
  // unless the two are actually linked by law, mechanism, history, institution, or consequence.
  if (/\b(?:the\s+friction\s+is\s+identical|the\s+geometry\s+of\s+the\s+tragedy\s+is\s+identical|the\s+tension\s+is\s+the\s+same|the\s+underlying\s+math\s+is\s+identical)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'METAPHORIC_SOURCE_BRIDGING_FAIL',
      description: 'Metaphoric source bridging failure: Synthetic rhetorical transition ("the friction is identical") artificially couples an unrelated news event with a fictional scene. Remove ungrounded rhetorical equivalence bridges.'
    });
  }

  // 70. SHORT_STORY_STAKES_BINDING
  // In Short Stories, legal or domestic choices must have defined stakes.
  // If a character declares "I do not sign anything", the document, the demand, what is surrendered, and the consequence of refusal must be concretely established.
  if (category === 'Short Stories' && /\b(?:i\s+do\s+not\s+sign|refuse\s+to\s+sign|did\s+not\s+sign)\b/i.test(cleanContent)) {
    const hasDefinedStakes = /\b(?:affidavit|mutation|cadastral|patta|resurvey|survey\s+boundary|tehsildar|revenue\s+circle|sub-divisional)\b/i.test(cleanContent);
    if (!hasDefinedStakes) {
      violations.push({
        rule: 'SHORT_STORY_STAKES_BINDING',
        description: 'Short story stakes binding failure: Narrator makes a refusal ("I do not sign anything") without establishing the concrete legal document, the uncle/party\'s demand, or what is surrendered. Establish exact documentary stakes before the choice.'
      });
    }
  }

  // 71. MATERIAL_REALITY_OVER_SYMBOLISM
  // If a physical phenomenon can directly affect the conflict, use it as mechanism before using it as metaphor.
  // Rejects using river erosion merely as a poetic symbol for family decay ("who is merely permitted to stand upon it while the water rises") while ignoring the cadastral deed mismatch.
  if (/\b(?:merely\s+permitted\s+to\s+stand\s+upon\s+it\s+while\s+the\s+water\s+rises|navigat(?:e|ing)\s+the\s+shifting\s+currents\s+without\s+a\s+compass)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'MATERIAL_REALITY_OVER_SYMBOLISM',
      description: 'Material reality over symbolism violation: River erosion or rising water is reduced to an abstract poetic metaphor ("navigating shifting currents without a compass" / "who is merely permitted to stand upon it while the water rises"). Environmental phenomena must operate as concrete physical mechanisms altering legal boundaries.'
    });
  }

  // 72. GLOBAL_PROP_CLUSTER_COOLDOWN
  // Current high-frequency WritOn props:
  // - fountain pen
  // - mahogany / teak desk
  // - brass object / tumbler
  // - cooling tea
  // - film on tea (oil / skin)
  // - chipped ceramic / chipped teapot
  // - monsoon rain on roof / tin roof
  // - old paper / wet legal document
  // - ambient drip / hum / sound ending
  // If a draft uses 3+ of these clichéd props simultaneously, flag a prop cluster cooldown violation.
  const propClichés = [
    /\b(?:fountain\s+pen)\b/i.test(cleanContent),
    /\b(?:mahogany|teak)\s+(?:desk|table)\b/i.test(cleanContent),
    /\b(?:brass\s+tumbler|brass\s+object|brass\s+can|brass\s+tray)\b/i.test(cleanContent),
    /\b(?:cooling\s+tea|tea\s+is\s+cooling|lukewarm\s+tea)\b/i.test(cleanContent),
    /\b(?:film\s+of\s+oil|skin\s+forming|skin\s+on\s+the\s+tea|film\s+forming)\b/i.test(cleanContent),
    /\b(?:chipped\s+teapot|chipped\s+vessel|chipped\s+cup|chipped\s+saucer)\b/i.test(cleanContent),
    /\b(?:monsoon\s+rain\s+hammers|corrugated\s+tin\s+roof|tin\s+roof)\b/i.test(cleanContent),
    /\b(?:stain\s+like\s+a\s+bruise|bruised\s+plum)\b/i.test(cleanContent)
  ];
  const activePropHits = propClichés.filter(Boolean).length;
  if (activePropHits >= 3) {
    violations.push({
      rule: 'GLOBAL_PROP_CLUSTER_COOLDOWN',
      description: `Global prop cluster cooldown: Draft combines ${activePropHits} high-frequency WritOn props (mahogany desk, fountain pen, chipped teapot, film on tea, bruised stain, tin roof). Break the prop cluster and substitute with domain-native practical objects.`
    });
  }

  // 73. PROCEDURAL_CONFLATION_FAIL
  // When a story invokes an administrative or legal system, adjacent distinct legal procedures must not be collapsed into one.
  // In revenue land records (e.g. Assam Mission Basundhara / Land Records Manual):
  // - Mutation by inheritance records heirs in the Jamabandi (Record of Rights).
  // - Partition divides a joint revenue estate into separate physical holdings and part-dags.
  // The two cannot be conflated such that signing an inheritance mutation directly allocates specific physical parcels ("you take upper parcel, I get lower katha") without a partition application/demarcation.
  if (/\b(?:mutation)\b/i.test(cleanContent) && /\b(?:you\s+will\s+take\s+the\s+dry\s+upper\s+parcel|partition\s+the\s+ancestral\s+three\s+kathas\s+on\s+paper)\b/i.test(cleanContent)) {
    if (!/\b(?:partition|demarcation|part-dag|joint\s+holding|co-pattadar)\b/i.test(cleanContent) || /\b(?:agreed\s+to\s+the\s+mutation.*?allowing\s+the\s+title\s+to\s+pass\s+jointly\s+into\s+his\s+name\s+for\s+settlement)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'PROCEDURAL_CONFLATION_FAIL',
        description: 'Procedural conflation failure: Conflated inheritance mutation with partition/demarcation. Mutation records legal heirs into the Jamabandi; partition divides the physical holding. Papers must explicitly reference undisputed partition or partition consent rather than claiming mutation alone divides physical land.'
      });
    }
  }

  // 74. METADATA_HASHTAG_FRAGMENTATION_FAIL
  // Prevents accidental phrase fragmentation in hashtags (e.g. #brahmaputrashort #stories instead of #brahmaputra #shortstories).
  if (/#(?:brahmaputrashort|stories\b.*#shortstories)\b/i.test(cleanContent) || /#[a-z0-9_]+short\s+#stories\b/i.test(cleanContent)) {
    violations.push({
      rule: 'METADATA_HASHTAG_FRAGMENTATION_FAIL',
      description: 'Metadata hashtag fragmentation detected: Hashtag phrases were broken or duplicated (e.g. #brahmaputrashort #stories). Keep tags clean, atomic, and canonical.'
    });
  }

  // 75. REAL_EVENT_POETRY_BOUNDARY
  // When poetry anchors to an active, real-world disaster or news event:
  // - Verified facts may include: place, warning, official action, documented flow/evacuation outcome.
  // - The poem may imaginatively transform: narrator's own response, metaphor, distant comparison, rhythm.
  // - The poem may NOT invent: victims' thoughts, victims' dialogue, exact physical actions, crowd behavior,
  //   or sensory details at the disaster site (e.g. "I see the villagers looking up at the slopes", "walk the ridge with lanterns held low",
  //   "watching the water rise against the dam of pride", "no bird sings above the silence of the silt").
  if (category === 'Poetry' && /\b(?:chaulani|darchula|bhattar|api\s+himal|landslide|disaster)\b/i.test(cleanContent)) {
    const inventedWitnessPatterns = [
      /\bi\s+see\s+the\s+villagers\s+looking\s+up\b/i,
      /\bwalk\s+the\s+ridge\s+with\s+lanterns\b/i,
      /\bno\s+bird\s+sings\s+above\b/i,
      /\bdam\s+of\s+pride\b/i,
      /\bholding\s+its\s+breath\s+behind\s+a\s+wall\b/i
    ];
    if (inventedWitnessPatterns.some(p => p.test(cleanContent))) {
      violations.push({
        rule: 'REAL_EVENT_POETRY_BOUNDARY',
        description: 'Real-event poetry boundary violation: When anchoring poetry to a real, ongoing news disaster, you cannot invent eyewitness behavior, fictional lanterns, victims\' internal states, or false emotional claims at the disaster site. Ground in reported physical processes and official hydrology.'
      });
    }
  }

  // 76. POETRY_ABSTRACTION_DENSITY_FAIL
  // Flags when a short poem repeatedly uses high-altitude philosophical abstractions
  // (memory, ghosts, heart, names, silence, ache, weight, transit, temporary agreement)
  // without concrete material action or domain-specific physical processes carrying the claim.
  if (category === 'Poetry') {
    const abstractionPatterns = [
      /\bmemory\b/gi,
      /\bghosts?\b/gi,
      /\bthe\s+heart\s+of\s+the\s+village\b/gi,
      /\bour\s+names\b/gi,
      /\ban\s+ache\b/gi,
      /\btemporary\s+agreement\b/gi,
      /\bin\s+a\s+state\s+of\s+transit\b/gi,
      /\bmemory\s+moving\s+toward\s+the\s+pen\b/gi,
      /\biron\s+grip\b/gi
    ];
    let abstractionHits = 0;
    for (const pat of abstractionPatterns) {
      const matches = cleanContent.match(pat);
      if (matches) abstractionHits += matches.length;
    }
    if (abstractionHits >= 4) {
      violations.push({
        rule: 'POETRY_ABSTRACTION_DENSITY_FAIL',
        description: `Poetry abstraction density failure: Draft contains ${abstractionHits} ungrounded high-altitude abstractions (ghosts, memory moving toward pen, temporary agreement, iron grip, state of transit). Replace pre-digested thematic statements with concrete physical mechanisms and observable contrasts.`
      });
    }
  }

  // 77. SETTING_NECESSITY_CHECK
  // For every named narrator setting, the place must be causally or perceptually necessary to the piece.
  // If Fort Kochi is used purely as picturesque background (fishing nets, salt air props) without contrasting
  // coastal tidal predictability against mountain flash-blockage hydrology, flag as decorative setting.
  if (/\b(?:fort\s+kochi|kochi)\b/i.test(cleanContent) && /\b(?:darchula|chaulani|mountain|himal)\b/i.test(cleanContent)) {
    const hasHydrologicalContrast = /\b(?:tide|tidal|estuary|low\s+tide|high\s+tide|inlet|vembanad|seawall|pilings)\b/i.test(cleanContent);
    if (!hasHydrologicalContrast) {
      violations.push({
        rule: 'SETTING_NECESSITY_CHECK',
        description: 'Setting necessity check failure: Fort Kochi setting operates as decorative tourist atmosphere rather than an essential perceptual lens. Contrast coastal tidal predictability against mountain flash stoppage to earn the geographical anchor.'
      });
    }
  }

  // 78. GLOBAL_POETRY_MOTIF_COOLDOWN
  // High-frequency repetitive poetic motifs placed on strict cooldown:
  // - cold cup of tea at elbow
  // - brass lamps flickering
  // - memory moving toward the pen
  // - solitary palm frond drifting toward mud
  // - dark water as final generic closure
  const bannedPoetryMotifs = [
    /\b(?:cold\s+cup\s+of\s+tea\s+at\s+my\s+elbow|cup\s+of\s+tea\s+at\s+my\s+elbow)\b/i.test(cleanContent),
    /\b(?:brass\s+lamps\s+flicker)\b/i.test(cleanContent),
    /\b(?:memory\s+moving\s+toward\s+the\s+pen)\b/i.test(cleanContent),
    /\b(?:single\s+palm\s+frond\s+drift|palm\s+frond\s+drift.*?spinning\s+slowly\s+toward\s+the\s+mud)\b/i.test(cleanContent)
  ];
  const activeMotifCount = bannedPoetryMotifs.filter(Boolean).length;
  if (activeMotifCount >= 2) {
    violations.push({
      rule: 'GLOBAL_POETRY_MOTIF_COOLDOWN',
      description: `Global poetry motif cooldown triggered: Draft combines ${activeMotifCount} over-indexed platform tropes (cold tea at elbow, brass lamps, memory toward pen, palm frond drifting into mud). Break these habitual closures with precise physical realities.`
    });
  }

  // 79. HUMOUR_MECHANISM_REQUIRED
  // A Humour category piece must possess a functional comic engine:
  // - Comic Premise: Inherent contradiction (e.g. residents debating reality TV while their own WhatsApp group behaves identically).
  // - Escalation: Progression of actions (rumor -> argument -> poll -> admin intervention -> dramatic exit).
  // - Repetition / Pattern: Recurring behavior with variation (e.g. exit/re-add, escalating caps-lock circulars).
  // - Turn: Exposure or reversal (Gopal realizing the society group is already the show).
  // - Button: Punchy comic closure.
  // Rejects pieces that merely sprinkle humorous observations into an essayistic or contemplative reflection.
  if (category === 'Humour') {
    const hasComicMechanism = /\b(?:poll|leaving\s+this\s+group|added\s+her\s+back|who\s+switched\s+it\s+on|only\s+admins\s+can\s+send\s+messages|forty-seven\s+people\s+are\s+typing)\b/i.test(cleanContent);
    const hasContemplativeAtmosphere = /\b(?:i\s+envy\s+her\s+silence|addicted\s+to\s+the\s+friction|looking\s+tired|irony\s+was\s+heavy|slow,?\s+rhythmic\s+sound|indifferent\s+to\s+the\s+chaos|reflection\s+in\s+the\s+hallway\s+mirror)\b/i.test(cleanContent);
    if (hasContemplativeAtmosphere && !hasComicMechanism) {
      violations.push({
        rule: 'HUMOUR_MECHANISM_REQUIRED',
        description: 'Humour mechanism failure: Draft substitutes contemplative essay reflection ("I envy her silence", "irony was heavy", "rain indifferent to chaos") for a functional comic engine (premise, escalation, repetition, turn, and button).'
      });
    }
  }

  // 80. HUMOUR_LITERARY_ATMOSPHERE_FAIL
  // In Humour, flag excessive use of poetic weather, reflective silence, symbolic household objects,
  // melancholy sensory endings, and philosophical self-analysis unless they directly support a joke.
  if (category === 'Humour') {
    const atmosphereClichés = [
      /\b(?:cold\s+brass\s+handle)\b/i.test(cleanContent),
      /\b(?:dust\s+motes\s+dancing)\b/i.test(cleanContent),
      /\b(?:fried\s+fish\s+and\s+wet\s+concrete|scent\s+of\s+wet\s+concrete)\b/i.test(cleanContent),
      /\b(?:steaming\s+cup\s+of\s+ginger\s+tea.*?cut\s+through|tea\s+momentarily\s+cut\s+through)\b/i.test(cleanContent),
      /\b(?:rain\s+began\s+to\s+tap\s+against\s+the\s+windowpane|rain.*?indifferent\s+to\s+the\s+chaos)\b/i.test(cleanContent),
      /\b(?:irony\s+was\s+heavy,?\s+like\s+a\s+wet\s+wool\s+blanket)\b/i.test(cleanContent),
      /\b(?:i\s+envy\s+her\s+silence|addicted\s+to\s+the\s+friction\s+of\s+these\s+threads)\b/i.test(cleanContent),
      /\b(?:set\s+the\s+phone\s+face\s+down|left\s+the\s+phone\s+face\s+down)\b/i.test(cleanContent),
      /\b(?:deep,?\s+shuddering\s+groan\s+that\s+vibrated)\b/i.test(cleanContent)
    ];
    const atmosphereHits = atmosphereClichés.filter(Boolean).length;
    if (atmosphereHits >= 2) {
      violations.push({
        rule: 'HUMOUR_LITERARY_ATMOSPHERE_FAIL',
        description: `Humour literary atmosphere failure: Draft contains ${atmosphereHits} contemplative literary tropes (cold brass handle, dust motes, wet concrete, ginger tea cut-through, rain indifferent to chaos, wet wool blanket irony, phone-face-down ending). Humour requires comic timing and escalation, not literary melancholy.`
      });
    }
  }

  // 81. ENTERTAINMENT_STATUS_LOCK
  // When a story references an active entertainment competition or reality show (e.g. Bigg Boss):
  // Differentiates historical source being intentionally dramatized vs stale prediction treated as current.
  // Prohibits using "probable contestants" or speculative pre-launch lists after the show has already launched and contestants/captains are confirmed.
  if (/\b(?:bigg\s+boss|reality\s+show)\b/i.test(cleanContent)) {
    const usesStaleProbableContestants = /\b(?:list\s+of\s+probable\s+contestants|probable\s+contestants?|speculative\s+contestant\s+list)\b/i.test(cleanContent);
    const isExplicitlyHistorical = /\b(?:back\s+in\s+august|before\s+the\s+premiere|prior\s+to\s+the\s+launch|weeks\s+before\s+season\s+\d+\s+began)\b/i.test(cleanContent);
    if (usesStaleProbableContestants && !isExplicitlyHistorical) {
      violations.push({
        rule: 'ENTERTAINMENT_STATUS_LOCK',
        description: 'Entertainment status lock violation: Using stale pre-launch prediction phrasing ("list of probable contestants") for an active show that has already premiered. Update to reflect active house status or explicitly frame as historical.'
      });
    }
  }

  // 82. TITLE_OBJECT_CONTRACT_FAIL
  // The title must connect directly to the central object, premise, or mechanism of the story.
  // If the title references a specific object or unit ("The Glass Wall of Flat 402") that never appears in the text
  // or has zero material/comedic consequence, flag TITLE_OBJECT_CONTRACT_FAIL.
  if (cleanTitle) {
    const glassWallMatch = /\bglass\s+wall\b/i.test(cleanTitle) && !/\bglass\s+wall\b/i.test(cleanContent);
    const flat402Irrelevant = /\bflat\s+402\b/i.test(cleanTitle) && !/\bflat\s+402\b/i.test(cleanContent);
    if (glassWallMatch || flat402Irrelevant) {
      violations.push({
        rule: 'TITLE_OBJECT_CONTRACT_FAIL',
        description: `Title object contract failure: Title "${cleanTitle}" promises a specific object or setting ("glass wall" / "Flat 402") that has zero presence or structural consequence in the text. Title must align with the comic mechanism (e.g. "Mrs Menon Has Left the Group").`
      });
    }
  }

  // 83. HUMOUR_BUTTON_FAIL
  // A Humour piece must end on a comic button: reversal, callback, escalation, contradiction, or deadpan consequence.
  // Rejects endings that collapse into generic WritOn reflective fade-outs:
  // - phone placed face down
  // - staring out at rain
  // - listening to pump groaning or ambient machinery
  // - solitary walking away into kitchen
  if (category === 'Humour') {
    const trailingSnippet = cleanContent.slice(-600);
    const hasReflectiveFadeOut = /\b(?:(?:set|left|placed)\s+the\s+phone\s+face\s+down|leaving\s+the\s+phone\s+face\s+down|walked\s+to\s+the\s+kitchen|rain\s+began\s+to\s+tap|pump.*?groan|shuddering\s+groan)\b/i.test(trailingSnippet);
    const hasComicButton = /\b(?:typing|who\s+switched\s+it\s+on|motor\s+off|forty-seven\s+people|bye-laws?|admin-only)\b/i.test(trailingSnippet);
    if (hasReflectiveFadeOut && !hasComicButton) {
      violations.push({
        rule: 'HUMOUR_BUTTON_FAIL',
        description: 'Humour button failure: The piece ends on a contemplative fade-out (phone face down, rain tapping, groaning pump, walking away) instead of a comic button (reversal, callback, escalation, contradiction, or deadpan consequence).'
      });
    }
  }

  // 84. JOKE_EXPLANATION_OVERFLOW
  // After a successful punchline or dialogue observation stating the comic thesis,
  // do not immediately stack 3+ rhetorical examples explaining why it is funny.
  // Allow at most 1-2 reinforcing beats before moving to the next action or button.
  if (category === 'Humour') {
    const hasDialogueThesis = /\b(?:while\s+running\s+the\s+exact\s+same\s+reality\s+show|same\s+reality\s+show\s+for\s+\d+\s+years)\b/i.test(cleanContent);
    if (hasDialogueThesis) {
      const explanationParallels = [
        /\b(?:every\s+three-wheel\s+auto|parking\s+bay\s+b-14\s+is\s+a\s+captaincy\s+challenge)\b/i.test(cleanContent),
        /\b(?:every\s+circular\s+pasted\s+with\s+brown\s+cello-tape|lift\s+no\.?\s*2\s+is\s+an\s+eviction\s+notice)\b/i.test(cleanContent),
        /\b(?:the\s+lift\s+lobby\s+is\s+the\s+confession\s+room|lift\s+lobby\s+is\s+our\s+confession\s+room)\b/i.test(cleanContent),
        /\b(?:courier\s+package\s+ban.*?is\s+the\s+luxury\s+budget\s+task)\b/i.test(cleanContent)
      ];
      const parallelHits = explanationParallels.filter(Boolean).length;
      if (parallelHits >= 3) {
        violations.push({
          rule: 'JOKE_EXPLANATION_OVERFLOW',
          description: `Joke explanation overflow: Story stacks ${parallelHits} post-thesis parallel explanations explaining the joke. When dialogue or an observation establishes the comic premise, allow at most 1-2 reinforcing beats before moving to the button.`
        });
      }
    }
  }

  // 85. COMIC_INSTITUTIONAL_PLAUSIBILITY
  // For fictional apartment society by-laws, notices, and rules:
  // Prefer plausible, real-world bureaucratic language misapplied absurdly (e.g. "Use of Common Areas for Activities Other Than Residential Purpose")
  // over hyper-tailored modern regulations that exist solely to describe WhatsApp in a 2018 document.
  if (category === 'Humour' && /\b(?:201[0-9]\s+bye-laws?|bye-laws?\s+of\s+201[0-9])\b/i.test(cleanContent)) {
    if (/\b(?:digital\s+misuse\s+of\s+association\s+channels|unregulated\s+canvassing\s+and\s+digital\s+misuse)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'COMIC_INSTITUTIONAL_PLAUSIBILITY',
        description: 'Comic institutional plausibility failure: Using overly tailored, anachronistic WhatsApp-specific language in older bye-laws. Prefer authentic real-world society clauses absurdly stretched by administrators.'
      });
    }
  }

  // 86. LIVE_SHOW_STATE_LOCK
  // When referencing an active broadcast/reality show (e.g. Bigg Boss Malayalam Season 8):
  // Ensure the week, captaincy, and contest state match documented broadcast reality.
  // Season 8: Week 1 captain was Jaseela Parveen; Rahul Easwar became captain in the second week.
  if (/\b(?:bigg\s+boss\s+malayalam\s+(?:season\s+)?8)\b/i.test(cleanContent)) {
    if (/\b(?:premiere\s+week\s+of\s+bigg\s+boss|first\s+week\s+of\s+bigg\s+boss)\b/i.test(cleanContent) && /\brahul\s+easwar\s+had\s+(?:just\s+been\s+appointed|become)\s+house\s+captain\b/i.test(cleanContent)) {
      violations.push({
        rule: 'LIVE_SHOW_STATE_LOCK',
        description: 'Live show state lock violation: Rahul Easwar was appointed house captain in the second week of Bigg Boss Malayalam Season 8, not during premiere/first week (first captain was Jaseela Parveen).'
      });
    }
  }

  // 87. HUMOUR_PROPAGATION_RULE
  // In Humour pieces, after the comic premise is initiated, every subsequent beat must either:
  // 1. Escalate it
  // 2. Complicate it
  // 3. Reverse it
  // 4. Call back to it, or
  // 5. Reveal character through it.
  // Flags decorative atmosphere-only paragraphs inserted into comedy drafts.
  if (category === 'Humour') {
    const hasAtmosphereOnlyStall = /\b(?:the\s+wood\s+is\s+scarred\s+where\s+i\s+accidentally|upholstery\s+feeling\s+coarse\s+against\s+my\s+skin|slow,?\s+rhythmic\s+sound,?\s+indifferent)\b/i.test(cleanContent);
    if (hasAtmosphereOnlyStall) {
      violations.push({
        rule: 'HUMOUR_PROPAGATION_RULE',
        description: 'Humour propagation failure: Inserted inert, atmosphere-only paragraph (e.g. furniture descriptions, coarse upholstery, rhythmic rain) that stalls comic momentum rather than escalating, complicating, reversing, or revealing character.'
      });
    }
  }

  // 88. DOMESTIC_VS_WORKPLACE_HASHTAG_FAIL
  // Ensures hashtags match the actual institutional domain.
  // If story is situated entirely in residential/apartment society micro-bureaucracy,
  // do not tag with workplace comedy tags (#workplacechronicles, #officelife).
  // Use #apartmentlife, #residentassociation, #housingbureaucracy instead.
  if (category === 'Humour' && /\b(?:palm\s+meadows|housing\s+society|resident\s+association|flat\s+\d+|apartment\s+complex|residents\s+group)\b/i.test(cleanContent)) {
    if (/#(?:workplacechronicles|officelife|corporatehumour|cubiclelife)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'DOMESTIC_VS_WORKPLACE_HASHTAG_FAIL',
        description: 'Domestic vs workplace hashtag mismatch: Residential apartment society satire tagged with workplace hashtag (#workplacechronicles). Use #apartmentlife or #residentassociation instead.'
      });
    }
  }

  // 89. PERSONA_BIOGRAPHY_INVENTION_FAIL
  // The generator may not invent that a persona has professional training, degrees,
  // childhood experiences, illnesses/injuries, artistic practice, stage experience,
  // or physical craft credentials (e.g. calloused toes, rehearsal hours, stage friends)
  // unless established in persona memory. Metaphorical usefulness is NOT permission to invent biography.
  const hasInventedPractitionerBiography = /\b(?:(?:my\s+toes\s+are\s+calloused|skin\s+toughened\s+from\s+years\s+of\s+friction|as\s+we\s+feel\s+the\s+weight\s+of\s+a\s+held\s+pose|when\s+we\s+are\s+mid-rehearsal|i\s+have\s+watched\s+friends\s+leave\s+the\s+stage|bells\s+around\s+our\s+ankles))\b/i.test(cleanContent);
  const isEstablishedPractitioner = persona && (persona.isPractitioner === true || /\b(?:professional\s+dancer|performing\s+artist)\b/i.test(persona.personaPrompt || ''));
  if (hasInventedPractitionerBiography && !isEstablishedPractitioner) {
    violations.push({
      rule: 'PERSONA_BIOGRAPHY_INVENTION_FAIL',
      description: 'Persona biography invention failure: Draft claims bodily practitioner authority and physical rehearsal biography ("my toes are calloused", "as we feel the weight of a held pose in Varnam", "when we are mid-rehearsal") not established in persona memory. An informed observer or cultural critic must not invent personal stage credentials.'
    });
  }

  // 90. NUMBER_MEANING_DRIFT_FAIL
  // Sourced numbers must retain what they actually measure.
  // 7 minutes = duration of post-screening standing ovation at Venice;
  // MUST NOT drift into "holding an audience for seven minutes in a state of suspended animation" during the performance.
  if (/\b(?:seven-minute\s+ovation|seven\s+minutes)\b/i.test(cleanContent) && /\b(?:hold\s+an\s+audience\s+for\s+seven\s+minutes\s+in\s+a\s+state\s+of\s+suspended\s+animation|seven\s+minutes\s+of\s+suspended\s+animation)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'NUMBER_MEANING_DRIFT_FAIL',
      description: 'Number meaning drift failure: Transformed post-screening standing ovation duration (seven minutes of applause) into duration of artistic suspension during the performance ("hold an audience for seven minutes in a state of suspended animation"). Metrics must preserve what they genuinely measure.'
    });
  }

  // 91. CULTURAL_TECHNIQUE_INVENTION_FAIL
  // When explaining how an artistic tradition works, verify physical and technical claims.
  // In Bharatanatyam, ankle bells (salangai/ghungroo) articulate rhythmic placement; a missed beat sounds like rhythmic misalignment,
  // not a "dull, metallic thud instead of a sharp resonant ring".
  if (/\b(?:ghungroo|salangai|ankle\s+bells)\b/i.test(cleanContent)) {
    if (/\b(?:dull,?\s+metallic\s+thud\s+instead\s+of\s+a\s+sharp,?\s+resonant\s+ring|miss\s+a\s+beat.*?(?:dull|metallic)\s+thud)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'CULTURAL_TECHNIQUE_INVENTION_FAIL',
        description: 'Cultural technique invention failure: Invented fictitious physical mechanics for ghungroo/salangai ("dull metallic thud instead of resonant ring"). Ankle bells amplify rhythm and timing errors sound like metric displacement, not muffled timbre.'
      });
    }
  }

  // 92. UNSOURCED_CRITICAL_CONSENSUS_FAIL
  // Fabricating sweeping critical quotes or synthetic attribution (e.g. claiming The Hindu and The Statesman described it as a "singular, crushing intensity").
  if (/\b(?:singular,?\s+crushing\s+intensity)\b/i.test(cleanContent) && /\b(?:the\s+hindu|the\s+statesman)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'UNSOURCED_CRITICAL_CONSENSUS_FAIL',
      description: 'Unsourced critical consensus failure: Attributed hyperbolic invented consensus phrase ("singular, crushing intensity") to specific news outlets (*The Hindu*, *The Statesman*) that did not use it.'
    });
  }

  // 93. CROSS_TRADITION_DECORATIVE_GATE
  // Cultural comparisons must share an exact formal property and illuminate both works,
  // rather than serving as decorative prestige scaffolding or bodily projection.
  if (/\b(?:pattinson|primetime)\b/i.test(cleanContent) && /\b(?:bharatanatyam|varnam)\b/i.test(cleanContent)) {
    if (/\b(?:feels\s+the\s+same\s+ache\s+in\s+his\s+joints|ache\s+in\s+his\s+joints|same\s+craft\s+as\s+the\s+dancer\s+who\s+holds\s+a\s+single,?\s+agonizing\s+balance)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'CROSS_TRADITION_DECORATIVE_GATE',
        description: 'Cross-tradition comparison gate failure: Projects ungrounded bodily sensations ("ache in his joints") onto contemporary actors to bridge an unearned comparison between Hollywood screen acting and classical dance postures.'
      });
    }
  }

  // 94. GLOBAL_CULTURE_PROP_COOLDOWN
  // Catches over-indexed culture furniture: wilted jasmine, cold tea, midnight studio, moth circling lamp, amber streetlights, rain on tin roof.
  const culturePropClichés = [
    /\b(?:jasmine\s+is\s+wilting|smell\s+of\s+damp\s+jasmine)\b/i.test(cleanContent),
    /\b(?:moth\s+circle\s+the\s+lamp|wings\s+beating\s+a\s+soft,?\s+erratic\s+tempo)\b/i.test(cleanContent),
    /\b(?:streetlights\s+casting\s+long,?\s+amber\s+shadows)\b/i.test(cleanContent),
    /\b(?:rain\s+sounds\s+against\s+the\s+corrugated\s+tin\s+roof)\b/i.test(cleanContent),
    /\b(?:ink\s+has\s+dried|ink\s+pooling\s+in\s+the\s+grain)\b/i.test(cleanContent)
  ];
  const culturePropHits = culturePropClichés.filter(Boolean).length;
  if (culturePropHits >= 3) {
    violations.push({
      rule: 'GLOBAL_CULTURE_PROP_COOLDOWN',
      description: `Global culture prop cooldown triggered: Draft combines ${culturePropHits} over-indexed cultural tropes (damp jasmine, moth circling lamp, amber streetlights, rain on tin roof, dried ink). Strip the lyrical starter kit and focus on the structural inquiry.`
    });
  }

  // 95. CULTURAL_TECHNICAL_DETAIL_GATE
  // In cultural criticism, avoid gratuitous, over-specialized musicological/dance ornament
  // when simpler descriptive phrasing preserves the analytical argument.
  // Flags "fraction of a matra" or pedantic samam micromeasurement claims.
  if (/\b(?:fraction\s+of\s+a\s+matra|anticipates\s+it\s+by\s+a\s+fraction)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'CULTURAL_TECHNICAL_DETAIL_GATE',
      description: 'Cultural technical detail gate failure: Uses ornamental micro-technical jargon ("fraction of a matra") that distracts from the cultural critique. Simplify to rhythmic precision, phrasing, and resolution within the cycle.'
    });
  }

  // 96. BIOGRAPHICAL_PORTRAYAL_ACCURACY_FAIL
  // Ensures accurate framing of real-person portrayals.
  // In Primetime at Venice, Pattinson portrays real-life television host Chris Hansen directly (in a dramatized film),
  // not a fictionalized character merely "modeled on" Chris Hansen under a different name.
  if (/\b(?:primetime|pattinson)\b/i.test(cleanContent)) {
    if (/\b(?:fictionalized\s+investigative\s+journalist\s+modeled\s+on\s+chris\s+hansen|character\s+modeled\s+on\s+chris\s+hansen)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'BIOGRAPHICAL_PORTRAYAL_ACCURACY_FAIL',
        description: 'Biographical portrayal accuracy failure: Described Pattinson as playing a fictionalized character modeled on Chris Hansen. Official Venice documentation records Pattinson playing Chris Hansen directly in a dramatized portrayal.'
      });
    }
  }

  // 97. CRITICAL_INTERIORITY_PROJECTION_FAIL
  // In cultural criticism, an essayist must not claim to know the internal bodily state or private experience of living artists.
  // Differentiates between what the work or metric reveals vs epistemic restraint ("we cannot know what remains in an actor", "what the work cost the performer").
  if (/\b(?:pattinson|real-life\s+actor)\b/i.test(cleanContent)) {
    if (/\b(?:what\s+remains\s+in\s+an\s+actor\s+once\s+the\s+character\s+is\s+surrendered|feels\s+the\s+same\s+ache|loss\s+of\s+that\s+fragile,?\s+shared\s+silence)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'CRITICAL_INTERIORITY_PROJECTION_FAIL',
        description: 'Critical interiority projection failure: Projects unprovable emotional or somatic states onto a living actor. Maintain epistemic restraint: state clearly that external metrics cannot recover what the work cost the performer.'
      });
    }
  }

  // 98. MARKET_EVENT_STATUS_LOCK
  // In market and financial writing, timestamps are part of the fact.
  // Prohibits treating historical market events as "just opened" or "looming" in present tense when dates have lapsed.
  // Pranav Constructions opened on Sep 7 and listed on NSE around Sep 12; NSE IPO opened on Sep 17.
  if (/\b(?:pranav\s+constructions|nse\s+ipo)\b/i.test(cleanContent)) {
    const isExplicitlyDated = /\b(?:september\s+7,?\s+2026|sep(?:tember)?\s+2026\s+archive|as\s+of\s+september\s+7)\b/i.test(cleanContent);
    const usesStalePresentTense = /\b(?:has\s+just\s+opened\s+for\s+subscription|looming\s+on\s+the\s+horizon|awaiting\s+the\s+allocation)\b/i.test(cleanContent);
    if (usesStalePresentTense && !isExplicitlyDated) {
      violations.push({
        rule: 'MARKET_EVENT_STATUS_LOCK',
        description: 'Market event status lock violation: Market events that have already listed or opened (Pranav Constructions listed Sep 12, NSE IPO opened Sep 17) described in present tense ("has just opened", "looming on the horizon") without explicit dating ("Varanasi, September 7, 2026"). In financial writing, timestamps are part of the fact.'
      });
    }
  }

  // 99. REPORTED_ESSAY_FICTION_HYBRID_FAIL
  // In category 'Essays', the text must not fabricate named eyewitness characters, dialogue,
  // or physical gestures ("Subodh's thumb smears grease across his phone screen", "Subodh mutters") to dramatize public data.
  // Either submit as 'Short Stories' with clearly framed fiction, or write an analytical essay built on sourced data.
  if (category === 'Essays') {
    const hasInventedEyewitnessPersona = /\b(?:subodh’s\s+thumb|subodh's\s+thumb|subodh\s+says|subodh\s+mutters|subodh\s+remembers|talks\s+to\s+his\s+tea\s+glass)\b/i.test(cleanContent);
    if (hasInventedEyewitnessPersona) {
      violations.push({
        rule: 'REPORTED_ESSAY_FICTION_HYBRID_FAIL',
        description: 'Reported essay fiction hybrid failure: Sourced essay invents fictional eyewitness character ("Subodh") with fabricated quotes and physical gestures to dramatize public market data. Either classify as Short Stories or frame as an analytical essay.'
      });
    }
  }

  // 100. FINANCIAL_MECHANISM_BINDING & FINANCIAL_TERM_BOUNDARY (Rule 100 & Rule 103)
  // Enforces structural precision in financial mechanisms:
  // - GMP is an unofficial, informal price discovery signal/premium attached to anticipated share value in the grey market, not an exchange price or guaranteed listing gain.
  // - Grey market deals in applications (kostak: payment regardless of allotment; subject-to-sauda: payment conditional on allotment) must not be collapsed together with GMP.
  // - In retail demat bidding, distinct family members apply through their own individual demat/PAN and bank accounts; one person cannot be described as owning multiple accounts for allotment gaming.
  if (/\b(?:grey\s+market|gmp)\b/i.test(cleanContent)) {
    if (/\b(?:he\s+has\s+three\s+different\s+demat\s+accounts\s+open.*?each\s+registered\s+to\s+a\s+different\s+family\s+member)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'FINANCIAL_MECHANISM_BINDING',
        description: 'Financial mechanism binding error: Conflates legitimate family applications with a single individual owning multiple demat identities. Frame accurately: family members apply from their own respective PAN-linked accounts.'
      });
    }
    // Conflating GMP with unallotted application rights without separation
    if (/\b(?:informal\s+price\s+difference\s+at\s+which\s+traders.*?deal\s+in\s+unallotted\s+application\s+rights\s+or\s+pre-listing\s+shares)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'FINANCIAL_TERM_BOUNDARY',
        description: 'Financial term boundary error: Collapses GMP with application trading. GMP is specifically the unofficial premium over the issue price attached to anticipated shares; kostak and subject-to-sauda are separate application-based arrangements.'
      });
    }
    // ASBA bank freezes vs ASBA fund blocks
    if (/\basba\s+bank\s+freezes\b/i.test(cleanContent)) {
      violations.push({
        rule: 'FINANCIAL_MECHANISM_BINDING',
        description: 'Financial mechanism error: ASBA does not freeze the bank account. Funds are blocked in the account until allotment. Use "funds blocked through ASBA" or "ASBA fund blocks".'
      });
    }
  }

  // 101. HISTORICAL_PARALLEL_FAIL
  // Flags ungrounded heritage wallpaper invoked to make modern financial behavior feel ancient
  // ("For generations, merchants here have wagered on the arrival of cotton boats...", "brass-turners of Peetal Nagri").
  if (/\b(?:for\s+generations,?\s+merchants\s+here\s+have\s+wagered\s+on\s+the\s+arrival\s+of\s+cotton\s+boats|brass-turners\s+of\s+peetal\s+nagri)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'HISTORICAL_PARALLEL_FAIL',
      description: 'Historical parallel failure: Injected decorative historical wallpaper ("wagered on cotton boats", "brass-turners of Peetal Nagri") with zero evidentiary connection to modern IPO grey-market trading.'
    });
  }

  // 102. SYMBOLIC_CONTRAST_STAGING_FAIL
  // Prohibits manufactured old-vs-new contrasts staged solely to oppose a digital action
  // (e.g. inserting an old man in a handloom dhoti counting brass coins for a clay cup of water beside a smartphone trading app).
  if (/\b(?:old\s+man\s+in\s+a\s+handloom\s+dhoti\s+is\s+counting\s+brass\s+coins|clay\s+cup\s+of\s+water)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'SYMBOLIC_CONTRAST_STAGING_FAIL',
      description: 'Symbolic contrast staging failure: Staged theatrical old-vs-new contrast (old man in dhoti counting brass coins for clay cup of water vs smartphone demat trading). If the contrast has no causal role, remove it.'
    });
  }

  // 104. REGULATORY_TIMELINE_LOCK
  // Prohibits turning a specific calendar interval into a generalized market rule.
  // India's public-issue timeline is T+3 working days from issue closure, not an arbitrary "five-day lag".
  if (/\b(?:the\s+five-day\s+lag\s+between\s+subscription\s+close\s+and\s+exchange\s+listing)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'REGULATORY_TIMELINE_LOCK',
      description: 'Regulatory timeline lock error: Stated "the five-day lag between subscription close and exchange listing" as a generalized rule. Under SEBI guidelines, public issues follow a T+3 working-day framework. Frame accurately as the few working days between subscription close, allotment, and exchange listing.'
    });
  }

  // 105. DECORATIVE_PERSONA_GEOGRAPHY_FAIL
  // Do not automatically begin every persona article with their city, tea stall, river, balcony, street or neighborhood.
  // Named geography must affect the argument, provide verified firsthand context, or materially shape the persona's interpretation.
  // Prohibits synthetic opening geography like "Along the stone steps above Kedar Ghat, the conversation between the morning tea stalls is rarely about philosophy..."
  if (/\b(?:along\s+the\s+stone\s+steps\s+above\s+kedar\s+ghat.*?conversation\s+between\s+the\s+morning\s+tea\s+stalls)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'DECORATIVE_PERSONA_GEOGRAPHY_FAIL',
      description: 'Decorative persona geography failure: Staged pseudo-reportage opening stapling persona geography (Kedar Ghat tea stalls) onto an analytical essay without verified observation or thematic relevance.'
    });
  }

  // 106. FINANCIAL_RISK_WORDING
  // Prefer precise institutional absence ("outside exchange settlement/investor-protection mechanisms")
  // over broad dramatic claims ("entirely unprotected", "no rules", "anything can happen").
  if (/\b(?:that\s+price\s+discovery\s+is\s+entirely\s+unprotected)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'FINANCIAL_RISK_WORDING',
      description: 'Financial risk wording error: Used sweeping, hyperbolic phrase "entirely unprotected". Frame with institutional precision: "those transactions sit outside the settlement, grievance-redressal and investor-protection mechanisms available on recognized exchanges".'
    });
  }

  // 107. AUDIENCE_CIRCULATION_CLAIM_FAIL
  // Claims such as "went viral", "traveled across retail messaging groups", "everyone was discussing",
  // "retail investors flooded forums" require specific evidence. Media reporting != proof of private group circulation.
  if (/\b(?:traveled\s+across\s+retail\s+messaging\s+groups|spread\s+through\s+whatsapp\s+groups|went\s+viral\s+in\s+investor\s+forums)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'AUDIENCE_CIRCULATION_CLAIM_FAIL',
      description: 'Audience circulation claim failure: Asserts unverified private messaging-group or forum circulation ("traveled across retail messaging groups"). Frame strictly based on verified evidence: "The number drawing attention across financial portals was not simply...".'
    });
  }

  // 108. FINANCIAL_INSTITUTIONAL_WORDING_FAIL
  // Prefer actual process terms: basis of allotment, RHP/offer documents, ASBA blocked amounts, demat accounts, exchange settlement.
  // Avoid tech-perfumed or inaccurate substitutes: "computerized allotment algorithms", "statutory balance sheet" (in place of prospectus/offer documents).
  if (/\b(?:computerized\s+allotment\s+algorithms|statutory\s+balance\s+sheet)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'FINANCIAL_INSTITUTIONAL_WORDING_FAIL',
      description: 'Financial institutional wording error: Uses tech-perfumed or inaccurate substitute ("computerized allotment algorithms" or "statutory balance sheet"). Use exact institutional terms: "SEBI-mandated disclosures", "published financial statements / offer documents", "regulated basis of allotment".'
    });
  }

  // 109. MARKET_ESSAY_BOUNDARY_FAIL
  // Market essays must explain mechanisms, incentives, psychology, and facts without converting into
  // personalized financial direction or tips ("buy this IPO", "guaranteed listing gains").
  if (/\b(?:you\s+should\s+apply\s+for\s+this\s+ipo|guaranteed\s+listing\s+gain|buy\s+these\s+shares\s+now)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'MARKET_ESSAY_BOUNDARY_FAIL',
      description: 'Market essay boundary failure: Sourced essay gives direct investment advice or promises listing gains instead of explaining mechanisms, incentives, and psychology.'
    });
  }

  // 110. PERSONA_LOCATION_LOCK
  // Each persona has an established home base. Do not infer or change location based on surname, language,
  // ethnicity, or aesthetic associations. Dr. Sunita Banerjee lives in Mayur Vihar, Delhi / Shantiniketan.
  // She cannot casually wake up in Kolkata simply because of Bengali surname associations.
  if (penName.includes('sunita') || penName.includes('banerjee')) {
    if (/\b(?:clouds\s+linger\s+low\s+over\s+kolkata|outside,?\s+(?:grey\s+clouds\s+linger\s+low\s+over\s+)?kolkata|my\s+apartment\s+in\s+kolkata)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'PERSONA_LOCATION_LOCK',
        description: 'Persona location lock error: Dr. Sunita Banerjee has an established home base in Mayur Vihar, Delhi. Setting the piece in Kolkata without an explicit travel pretext violates persona continuity based on surname matching.'
      });
    }
  }

  // 111. MARKET_CLOSURE_SCOPE_FAIL
  // When reporting a market holiday (such as Labor Day on NYSE/Nasdaq), bind exactly what stopped:
  // regular U.S. equity trading on NYSE and Nasdaq.
  // Do NOT generalize to "financial system went dark", "trading floors silenced for twenty-four hours",
  // "absence of price discovery", or "markets stopped" when futures, overseas bourses, FX, and commodities continue trading.
  if (/\b(?:labor\s+day|market\s+closed)\b/i.test(cleanContent)) {
    if (/\b(?:silenced\s+their\s+trading\s+floors\s+for\s+twenty-four\s+hours|institutional\s+trading\s+desks\s+sit\s+dark|absence\s+of\s+price\s+discovery\s+for\s+a\s+single\s+day|wires\s+carry\s+only\s+quiet)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'MARKET_CLOSURE_SCOPE_FAIL',
        description: 'Market closure scope error: Generalizes regular NYSE/Nasdaq equity trading session closure into total global financial shutdown ("silenced for twenty-four hours", "absence of price discovery", "wires carry only quiet"). Futures, foreign exchanges, FX, and consumer businesses remain active.'
      });
    }
    // Search trend overstatement
    if (/\btops\s+search\s+trends\b/i.test(cleanContent)) {
      violations.push({
        rule: 'AUDIENCE_CIRCULATION_CLAIM_FAIL',
        description: 'Audience circulation claim failure: Asserts "tops search trends" without empirical Google Trends telemetry.'
      });
    }
  }

  // 112. HISTORICAL_CAUSAL_COMPRESSION_FAIL
  // Do not collapse distinct historical labor struggles into a single neat causal origin story.
  // Labor Day emerged from organized labor recognition/parades, while the eight-hour campaign was an overlapping but distinct movement.
  // Disallows: "Consider what Labor Day once demanded. ... Eight hours for work..." without distinguishing the movements.
  if (/\b(?:consider\s+what\s+labor\s+day\s+once\s+demanded.*?eight\s+hours\s+for\s+work)\b/i.test(cleanContent)) {
    violations.push({
      rule: 'HISTORICAL_CAUSAL_COMPRESSION_FAIL',
      description: 'Historical causal compression failure: Collapses the origin of the Labor Day holiday with the separate eight-hour day campaign. Frame accurately: "The labor movement that produced the holiday also fought over control of time".'
    });
  }

  // 113. THEMATIC_COUNTEREVIDENCE_GATE
  // An essay thesis cannot omit the primary real-world fact that contradicts it.
  // In an essay about Labor Day pausing markets in honor of labor, the counterevidence—that millions of service, retail, logistics, and emergency workers still work on Labor Day—must be directly confronted.
  if (/\blabor\s+day\b/i.test(cleanContent) && /\b(?:pause|quiet|stillness|slow)\b/i.test(cleanContent) && category === 'Essays') {
    const addressesWorkingLabor = /\b(?:supermarket\s+cashier|airport\s+ground\s+crew|restaurant\s+dishwasher|still\s+working|service\s+workers|shifts\b|logistics|convenience\s+stores|hospitals?)\b/i.test(cleanContent);
    if (!addressesWorkingLabor) {
      violations.push({
        rule: 'THEMATIC_COUNTEREVIDENCE_GATE',
        description: 'Thematic counterevidence gate failure: Romanticizes Labor Day market closure as a collective social pause while ignoring the primary complicating reality that service, logistics, and retail workers remain on shift.'
      });
    }
  }

  // 114. PERSONA_PROP_SATURATION
  // Tracks and restricts repetitive aesthetic costume clusters per persona.
  // For Dr. Sunita Banerjee, flags drafts deploying 3+ recurring desk props (fountain pen, brass clock/paperweight, tea in porcelain cup, teak desk, clothbound book, indigo ink) when they serve merely as aesthetic wallpaper.
  if (penName.includes('sunita') || penName.includes('banerjee')) {
    const sunitaProps = [
      /\b(?:brass\s+fountain\s+pen|fountain\s+pen)\b/i.test(cleanContent),
      /\b(?:brass\s+clock|brass\s+paperweight)\b/i.test(cleanContent),
      /\b(?:black\s+tea\s+steaming\s+in\s+a\s+porcelain\s+cup|porcelain\s+cup)\b/i.test(cleanContent),
      /\b(?:cool\s+grain\s+of\s+teak|teak\s+desk)\b/i.test(cleanContent),
      /\b(?:clothbound\s+volume|clothbound\s+book)\b/i.test(cleanContent),
      /\b(?:indigo\s+ink|cream\s+paper)\b/i.test(cleanContent)
    ];
    const hitProps = sunitaProps.filter(Boolean).length;
    if (hitProps >= 3) {
      violations.push({
        rule: 'PERSONA_PROP_SATURATION',
        description: `Persona prop saturation failure: Sunita Banerjee draft deploys ${hitProps}/6 signature aesthetic desk props (fountain pen, brass clock, porcelain cup, teak desk, clothbound book, indigo ink) as decorative costume. Strip the still-life staging and ground the argument in behavioral and structural analysis.`
      });
    }
  }

  // 115. CURRENT_EVENT_SCENE_CHECK
  // In reported or current-event essays, do not invent plausible cinematic scenes merely because they are statistically plausible
  // (e.g. "commuter trains running beneath the streets are already full", "cashiers wiping counters").
  // Either support with verified reporting, state generically, or omit.
  if (category === 'Essays') {
    if (/\b(?:commuter\s+trains\s+running\s+beneath\s+the\s+streets\s+are\s+already\s+full|trains\s+beneath\s+the\s+streets\s+are\s+already\s+full)\b/i.test(cleanContent)) {
      violations.push({
        rule: 'CURRENT_EVENT_SCENE_CHECK',
        description: 'Current event scene check failure: Injects an unverified cinematic assertion ("commuter trains running beneath the streets are already full") without reporting support. Frame with factual restraint: "Across the country, grocery stores and retailers are already doing business."'
      });
    }
  }

  // 116. POPULATION_QUANTIFIER_CHECK
  // Unverified hyperbolic population quantifiers ("millions of workers", "countless employees", "nearly everyone")
  // require specific census/labor statistical citation. Use precise, supportable categories ("many workers", "retail employees", "grocery workers").
  if (category === 'Essays' && /\bmillions\s+of\s+workers\s+still\s+report\s+for\s+their\s+shifts\b/i.test(cleanContent)) {
    violations.push({
      rule: 'POPULATION_QUANTIFIER_CHECK',
      description: 'Population quantifier failure: Asserts "millions of workers still report for their shifts" without labor telemetry citation. Use supportable qualitative framing: "many workers still report for shifts".'
    });
  }

  // 117. RELATED_HISTORY_NOT_IDENTICAL_HISTORY
  // For historical context, distinguish between the direct statutory origin of an institution and a broader related movement of the era.
  // E.g. The labor movement helped turn Labor Day itself into law, rather than generically creating "public holidays".
  if (/\bhelped\s+enshrine\s+public\s+holidays\s+into\s+law\b/i.test(cleanContent)) {
    violations.push({
      rule: 'RELATED_HISTORY_NOT_IDENTICAL_HISTORY',
      description: 'Related history causal error: Over-generalizes the labor movement\'s outcome to "enshrine public holidays into law". State specifically: "succeeded in turning Labor Day itself into law".'
    });
  }

  // 118. SPORTS_VIEWING_TIME_BINDING
  // If a fiction or essay references watching a real sporting event at a specific local time, that scene time must either
  // overlap the real event's broadcast window or explicitly establish it is a replay/delayed viewing.
  // US Open Day 7 (Sept 7, 2026): Andreeva vs Potapova started ~11:00 AM EDT = ~8:30 PM IST.
  // A Kolkata scene at "4:00 AM" watching live score updates is temporally impossible without explicit replay framing.
  if (category === 'Short Stories') {
    const hasLiveScoreUpdates = /\bscore\s+updates?\b|\bserve\s+by\s+serve\b|\blive\s+score\b/i.test(cleanContent);
    const has4amKolkata = /\b4[:\s]*00\s*a\.?m\.?\b.*kolkata|\bkolkata.*\b4[:\s]*00\s*a\.?m\.?\b/i.test(cleanContent);
    const hasReplayTag = /\breplay\b|\bdelayed\s+broadcast\b|\brecorded\s+coverage\b/i.test(cleanContent);
    if (hasLiveScoreUpdates && has4amKolkata && !hasReplayTag) {
      violations.push({
        rule: 'SPORTS_VIEWING_TIME_BINDING',
        description: 'Broadcast time binding failure: A 4:00 AM Kolkata scene cannot watch Andreeva vs Potapova (Louis Armstrong Stadium, 11:00 AM EDT / 8:30 PM IST) as a live match with real-time score updates. Either shift the scene time, reference a replay explicitly, or restructure around delayed/recorded viewing.'
      });
    }
  }

  // 119. SPORT_SURFACE_REALISM
  // Sport details must be bound to the actual court/pitch surface, not imported from a different sport's surface.
  // US Open hard court (acrylic DecoTurf): painted lines, no clay dust, no chalk puffs, ball skids and kicks off baseline.
  // Clay: red clay dust on Hawkeye lines. Grass: divots, skid and stay. Never cross-contaminate.
  const hasClaySurfaceOnHardCourt = /\bdust\s+kicks?\s+up\b|\bline\s+dust\b|\bclay\s+dust\b|\bchalk\s+(?:dust|cloud|puff)\b/i.test(cleanContent);
  const hasUSOpenReference = /\bus\s+open\b|\bflushing\s+meadows\b|\blouis\s+armstrong\b|\barena\b.*\btennis\b/i.test(cleanContent);
  if (hasClaySurfaceOnHardCourt && hasUSOpenReference) {
    violations.push({
      rule: 'SPORT_SURFACE_REALISM',
      description: 'Surface realism error: US Open is played on acrylic hard court (DecoTurf). Lines are painted; no clay-style dust clouds or chalk puffs occur on ball-line contact. Do not import clay-court sensory details into a hard-court scene.'
    });
  }

  // 120. TITLE_EVENT_CONTRACT
  // If the title explicitly names a game phase ("Second Set", "Final Over", "Third Quarter", "Last Lap"),
  // that phase must materially change the conflict, decision, relationship, or outcome in the narrative.
  // A phase-named title where the named phase only supplies ambient atmosphere fails this contract.
  if (category === 'Short Stories') {
    const titlePhasePattern = /\b(second\s+set|final\s+over|third\s+quarter|last\s+lap|final\s+set|first\s+half|second\s+half)\b/i;
    if (titlePhasePattern.test(title)) {
      const phaseWord = (title.match(titlePhasePattern) || [])[0] || '';
      const phaseInContent = new RegExp(`\\b${phaseWord.replace(/\s+/g, '\\s+')}\\b`, 'i').test(cleanContent);
      if (!phaseInContent) {
        violations.push({
          rule: 'TITLE_EVENT_CONTRACT',
          description: `Title phase contract failure: Title names "${phaseWord}" but that phase either does not appear or does no narrative work in the story body. Either the named phase must materially alter conflict/decision/outcome, or the title must be renamed.`
        });
      }
    }
  }

  // 121. DEVANSH_PROP_COOLDOWN
  // Devansh Roy's Kolkata corner-shop stage set is on permanent cooldown as a repeated aesthetic costume.
  // Recurring character (Bimal) is allowed; recurring identical stage set is not.
  // Stage set props: Bimal alone + tram tracks + monsoon static + clay cups + wobbling fan + cold tea + chipped rim + lone yellow bulb.
  if (penName.includes('devansh') || penName.includes('devansh_roy')) {
    const devanshCooldownProps = [
      /\btram\s+tracks?\b/i.test(cleanContent),
      /\bwobbling\s+fan\b|\bceiling\s+fan\s+wobbl/i.test(cleanContent),
      /\bclay\s+cup\b|\bmitti\s+ka\s+kullad\b/i.test(cleanContent),
      /\bcold\s+tea\b/i.test(cleanContent),
      /\bchipped\s+(?:rim|glass|cup)\b/i.test(cleanContent),
      /\blone\s+(?:yellow\s+)?bulb\b|\bsingle\s+(?:yellow\s+)?bulb\b/i.test(cleanContent),
      /\bwet\s+jute\b/i.test(cleanContent),
    ];
    const cooldownHits = devanshCooldownProps.filter(Boolean).length;
    if (cooldownHits >= 3) {
      violations.push({
        rule: 'DEVANSH_PROP_COOLDOWN',
        description: `Devansh stage-set prop saturation: ${cooldownHits}/7 recurring Kolkata corner-shop props deployed (tram tracks, wobbling fan, clay cups, cold tea, chipped rim, lone bulb, wet jute). The recurring character (Bimal) is allowed; the identical atmospheric stage set is not. Build a new spatial context or strip the prop cluster.`
      });
    }
  }

  // 122. DEVANSH_LENS_ENFORCEMENT
  // Devansh Roy's core cognitive lens is: information transforms when mediated, delayed, replayed, or transmitted.
  // Strong story engines: spoiler vs. delayed broadcast, archived record vs. breaking report, score notification arriving before experience.
  // FAIL: "media distance" expressed only through atmosphere (glowing TV in background) with no transmission conflict.
  // A story that only has a character watching a broadcast with no information-mediation conflict fails this lens.
  if (penName.includes('devansh') || penName.includes('devansh_roy')) {
    if (category === 'Short Stories') {
      const hasTransmissionConflict =
        /\bspoil\b|\bspoiler\b|\balready\s+know\b|\bdon.t\s+tell\b|\bnotification\b|\bresult\s+(?:already|first)\b|\bknows?\s+the\s+(?:score|result|outcome)\b|\bdelayed\s+(?:replay|broadcast|feed)\b|\breplay\s+uncertainty\b/i.test(cleanContent);
      const hasOnlyAtmosphere =
        /\bglowing\b.*\btelevi[sz]ion\b|\btelevi[sz]ion.*\bglowing\b|\bsilent\b.*\bscreen\b|\bscreen.*\bsilent\b/i.test(cleanContent);
      if (!hasTransmissionConflict && category === 'Short Stories') {
        violations.push({
          rule: 'DEVANSH_LENS_ENFORCEMENT',
          description: 'Devansh Roy core lens failure: Story contains no information-mediation conflict (spoiler vs delayed broadcast, notification arriving before experience, replay uncertainty, score known before the set concludes). A TV glowing in the background is atmosphere, not a Devansh lens. Rebuild around: what happens when information arrives faster than experience?'
        });
      }
    }
  }

  // 123. SHORT_STORY_VIGNETTE_FAIL
  // A Short Story requires desire + resistance + decision + change.
  // A draft that only has atmosphere + observation + symbolic ending but no want/conflict/decision/changed situation
  // must be reclassified as a vignette or rebuilt with story structure.
  if (category === 'Short Stories') {
    const hasWant = /\bwant(?:s|ed)?\b|\bwish(?:es|ed)?\b|\bhope(?:s|d)?\b|\bneed(?:s|ed)?\b|\btrying\s+to\b|\basks?\b|\bdemands?\b|\bdecid(?:es|ed)?\b|\bforbids?\b|\borders?\b/i.test(cleanContent);
    const hasConflict = /\brefuse[sd]?\b|\bwon.t\b|\bforbid\b|\bstop\b|\bblock\b|\bspoil\b|\bargue[sd]?\b|\bshout\b|\bprotest\b|\bnot\s+supposed\b|\bno\s+one\s+is\s+allowed\b|\bprohibit\b/i.test(cleanContent);
    // Only flag very short stories (under 400 words) with neither want nor conflict — avoids false positives on longer prose
    const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;
    if (wordCount < 450 && !hasWant && !hasConflict) {
      violations.push({
        rule: 'SHORT_STORY_VIGNETTE_FAIL',
        description: 'Vignette detection: Short story under 450 words contains no detectable desire, conflict, decision, or changed situation. Atmosphere + observation + symbolic ending is a vignette, not a Short Story. Introduce: a character want, an obstacle, a decision, and a changed state by the end.'
      });
    }
  }

  // 124. SPORTS_REPLAY_CHRONOLOGY
  // A replay of a completed match is only possible after the match has ended.
  // VIEWING_DATETIME < MATCH_END_DATETIME means no completed-match replay is possible.
  // The 86/100 failure: "Sunday evening" replay of a Monday match — the match had not yet happened.
  // Binds: MATCH_DATE × VIEWER_TIMEZONE × MODE (LIVE / RECORDED / REPLAY / HIGHLIGHTS).
  if (category === 'Short Stories') {
    // Pattern: "replay" + a day/time earlier than or incompatible with the match date
    const hasSundayReplay = /\b(sunday\s+(?:evening|afternoon|night|morning)|sunday\b(?!\s+open))/i.test(cleanContent);
    const hasMondayEvent = /\bmonday\b/i.test(cleanContent);
    const hasReplay = /\breplay\b|\bdelayed\s+broadcast\b/i.test(cleanContent);
    const hasMondayUSOpenContext = /\b(us\s+open|louis\s+armstrong|flushing\s+meadows)\b/i.test(cleanContent);
    // Flag: Sunday replay of a Monday US Open match (Labor Day round)
    if (hasSundayReplay && hasReplay && hasMondayUSOpenContext && !hasMondayEvent) {
      violations.push({
        rule: 'SPORTS_REPLAY_CHRONOLOGY',
        description: 'Replay chronology failure: Story places a replay of a US Open Labor Day match (Monday) on "Sunday evening" — before the match took place. A completed-match replay requires VIEWING_DATETIME > MATCH_END_DATETIME. Move viewing to late Monday night or Tuesday to satisfy the temporal constraint.'
      });
    }
  }

  // 125. SPORTS_POINT_DETAIL_GATE
  // Exact intra-match claims (broke in fourth game, saved set point at 4-5, hit winner on match point,
  // served at N mph) require point-level evidence from a match report or official score.
  // If only set-level or final-score reporting is available: stay at set-level description.
  // The 86/100 failure: "Potapova was going to break serve in the fourth game" — unsupported by any source.
  if (category === 'Short Stories') {
    const pointLevelClaim = /\b(?:break?\s+serve\s+in\s+the\s+(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+game|saved?\s+(?:set|match|break)\s+point\s+at\s+\d[-–]\d|served?\s+at\s+\d{2,3}\s+mph|hit\s+(?:a\s+)?(?:forehand|backhand)\s+winner\s+on\s+match\s+point)\b/i.test(cleanContent);
    if (pointLevelClaim) {
      violations.push({
        rule: 'SPORTS_POINT_DETAIL_GATE',
        description: 'Point-level sports detail gate: Story asserts exact intra-game detail (break in specific game, saved point at specific score, mph) without point-level sourcing. If only set/final-score reporting is available, describe the set outcome instead: "Bimal now knew that Andreeva would eventually take it 6–4. He watched the first rally anyway."'
      });
    }
  }

  // 126. REAL_BRAND_UI_INVENTION
  // When using a real broadcaster (ESPN, Hotstar, BBC Sport, Sky Sports) or app (SwissInfo, WTA, ATP):
  // do not invent exact ticker format, notification wording, graphic layout, or screen text
  // unless that exact format is sourced or documented.
  // Fiction may invent a generic interface: "a results crawl appeared along the bottom of the sports channel."
  // The 86/100 failure: "the crawl that ESPN runs continuously" + exact "(QF)" format string.
  const brandedTickerPattern = /(?:espn|hotstar|star\s+sports|bbc\s+sport|sky\s+sports|sony\s+liv)\s+(?:runs?\s+continuously|ticker|crawl|broadcast|live\s+score)/i.test(cleanContent);
  if (brandedTickerPattern) {
    violations.push({
      rule: 'REAL_BRAND_UI_INVENTION',
      description: 'Real broadcaster UI invention: Story attributes a specific ticker format or continuous crawl behaviour to a named broadcaster (ESPN, Hotstar, etc.) without a documented source. Use a generic fictional interface instead: "A results crawl appeared along the bottom of the sports channel."'
    });
  }

  // 127. THEME_ALREADY_DRAMATIZED_FAIL
  // After the central action has physically demonstrated the theme, paragraphs that re-explain
  // its philosophical meaning are redundant and weaken the ending.
  // Pattern: story already showed event → response → consequence; then adds narrator gloss.
  // The 86/100 failure: "He was not sure what that meant about replays. Or about results. Or about
  // the distance between a fact arriving and a fact being experienced."
  if (category === 'Short Stories') {
    const postClimaxGloss = /\bhe\s+was\s+not\s+sure\s+what\s+that\s+meant\s+about\b|\bshe\s+was\s+not\s+sure\s+what\s+that\s+meant\s+about\b|\bwhat\s+it\s+meant\s+about\s+(?:replays|memory|time|waiting|distance|information|silence)\b/i.test(cleanContent);
    if (postClimaxGloss) {
      violations.push({
        rule: 'THEME_ALREADY_DRAMATIZED_FAIL',
        description: 'Post-climax theme restatement: Story has already shown the theme through action (spoiler arrives → watching changes → character stops) but then adds a narrator gloss explaining the philosophical meaning. Trust the scene. Cut from the gloss onward; end on the last behavioral consequence.'
      });
    }
  }

  // 128. DEVANSH_SUCCESS_PATTERN (informational — flags absence of the pattern, not presence)
  // The proven Devansh engine: information exists → character deliberately lacks it →
  // transmission channel breaches that ignorance → experience changes though external event does not →
  // consequence is behavioral, not philosophical narration.
  // This rule enforces that consequence must be behavioral (switching off, leaving, deciding)
  // rather than a philosophical interior monologue about the meaning of information.
  if ((penName.includes('devansh') || penName.includes('devansh_roy')) && category === 'Short Stories') {
    const hasBehavioralConsequence =
      /\bswitch(?:es|ed)?\s+(?:off|it)\b|\bturned?\s+(?:off|it)\b|\bleft?\s+(?:without|quietly)\b|\bdecid(?:es|ed)?\b|\bput(?:s|ting)?\s+(?:down|away)\b|\bclosed?\s+(?:the|it)\b|\bwalk(?:s|ed)?\s+out\b/i.test(cleanContent);
    const hasPhilosophicalMonologue =
      /\bhe\s+was\s+not\s+sure\s+what\s+that\s+meant\b|\bshe\s+was\s+not\s+sure\s+what\s+that\s+meant\b|\bwhat\s+(?:it|this)\s+(?:all\s+)?meant\s+(?:about|for)\b|\bthe\s+(?:question|meaning)\s+of\s+(?:information|replays|distance|waiting)\b/i.test(cleanContent);
    if (hasBehavioralConsequence && hasPhilosophicalMonologue) {
      violations.push({
        rule: 'DEVANSH_SUCCESS_PATTERN',
        description: 'Devansh success pattern violation: Story has a behavioral consequence (switching off, walking out) but then adds a philosophical interior monologue about the meaning of that action. The behavioral consequence IS the meaning. Delete the monologue; end on the behavior.'
      });
    }
  }

  // 129. CHARACTER_KNOWLEDGE_LEDGER
  // In any story whose central subject is the TIMING OF KNOWLEDGE (spoilers, delayed broadcasts,
  // secrets, election results, medical diagnoses, etc.), knowledge itself must have continuity.
  // A fact cannot arrive as a dramatic revelation if the character already possesses that fact
  // through earlier dialogue or explicit scene narration.
  // In spoiler-protection stories, all earlier spoiler attempts must be blocked before any
  // result escapes; the climactic disclosure (e.g. TV crawl) must be the first successful breach.
  if (category === 'Short Stories') {
    const lc = content.toLowerCase();
    const isKnowledgeTimingStory =
      lc.includes('replay') || lc.includes('spoiler') || lc.includes('score') ||
      lc.includes('result') || lc.includes('crawl') || lc.includes('ticker') ||
      lc.includes('broadcast') || lc.includes("didn't want to know") ||
      lc.includes("don't want to know") || lc.includes('uncertainty');

    if (isKnowledgeTimingStory) {
      // Detect: spoiler landed in dialogue before the climax
      const earlySpoilerLanded =
        /["""][A-Z][a-z]+ (won|lost|beat|defeated)[,."""']/.test(content) ||
        /["""]?(She|He|[A-Z][a-z]+) (took|won) the (first|second|third|fourth|fifth) set/i.test(content);
      const lateDiscovery =
        /\b(now knew|suddenly knew|now he knew|now she knew|for the first time|realised|realized)\b/i.test(content) ||
        /\b(arrived in the same frame|arrived together|arrived at once)\b/i.test(content);

      if (earlySpoilerLanded && lateDiscovery) {
        violations.push({
          rule: 'CHARACTER_KNOWLEDGE_LEDGER',
          severity: 'hard',
          description:
            'CHARACTER_KNOWLEDGE_LEDGER: A character is told the result explicitly in early dialogue, ' +
            'then the prose presents the same fact as a dramatic discovery. ' +
            'In a story about the timing of knowledge, a fact cannot arrive twice. ' +
            'Fix: ensure all earlier spoiler attempts are BLOCKED before any result escapes; ' +
            'reserve the complete result for the one intended climactic disclosure.'
        });
      }
    }
  }

  // 130. DEVANSH_PROP_CLUSTER_HARD_FAIL
  // Blocks the overused Devansh Kolkata atmospheric costume cluster.
  // When 3 or more of these stereotypical props appear together, abort.
  if ((penName.includes('devansh') || penName.includes('devansh_roy')) || category === 'Short Stories') {
    const devanshProps = [
      /\btea\s+stall\b/i,
      /\bradio\s+static\b|\btransistor\b/i,
      /\b(?:kolkata\s+)?tram(?:\s+tracks?|\s+lines?)?\b/i,
      /\b(?:monsoon\s+)?rain\s+(?:drummed|fell|lashed|slanted)\b|\braindrop\s+on\s+glass\b/i,
      /\bnotebook\s+(?:with\s+)?bleeding\s+ink\b|\bink\s+(?:blur(?:red)?|bleeding)\b/i,
      /\bstray\s+dog\b|\bstreet\s+dog\b/i,
      /\btea\s+(?:burns?\s+tongue|cooling|cold\s+tea|steaming\s+tea)\b/i,
      /\b(?:old\s+)?(?:shopkeeper|proprietor|haren-?da|bhabani-?da|bimal)\s+(?:dispensing|whispered|said|nodded|poured|wiped)\b/i,
      /\bcorrugated\s+tin\b|\brusted\s+tin\b|\bwet\s+jute\b|\btarpaulin\b/i,
      /\bclay\s+cup(?:s)?\b|\bkulhad\b|\bchipped\s+glass\b/i,
      /\b(?:damp|wet)\s+newspaper\b|\bsoaked\s+paper\b/i,
      /\b(?:rag|cloth)\s+(?:wip(?:ed|ing)|swiped)\b/i,
      /\b(?:dying|dimming|flickering|drained)\s+(?:phone\s+)?(?:screen|battery)\b|\bphone\s+battery\s+at\s+\d+%/i
    ];
    const matchedProps = devanshProps.filter(p => p.test(cleanContent));
    if (matchedProps.length >= 3) {
      violations.push({
        rule: 'DEVANSH_PROP_CLUSTER_HARD_FAIL',
        severity: 'hard',
        description: `DEVANSH_PROP_CLUSTER_HARD_FAIL: Detected ${matchedProps.length} props from the retired Devansh costume cluster (tea stall, radio static, tram tracks, bleeding ink notebook, stray dog, tea as emotional punctuation, old shopkeeper wisdom, wet jute/rusted tin, clay cup, wet newspaper, wiping rag, dying battery/screen). If 3+ appear together, draft must be rejected at premise stage.`
      });
    }
  }

  // 131. REAL_PERSON_PRIVATE_MEMORY_FAIL
  // For a real deceased person or biographical subject: do not invent unverified private memories,
  // domestic intimacies, sensory gestures, or imagined final moments.
  const mentionsRealDeceasedOrFigure =
    /\b(?:jon\s+small|billy\s+joel|elizabeth\s+weber|attila|the\s+hassles)\b/i.test(cleanContent) ||
    researchDossier?.topic?.toLowerCase().includes('death') ||
    researchDossier?.topic?.toLowerCase().includes('obituary');

  if (mentionsRealDeceasedOrFigure) {
    const inventedPrivateScenes = [
      /\bcigarette(?:s)?\s+shared\s+(?:at\s+3\s*am|in\s+a\s+studio)\b/i,
      /\bhum\s+of\s+a\s+(?:bass\s+)?guitar\s+that\s+only\s+two\s+people\s+heard\b/i,
      /\bfrustration\s+of\s+a\s+melody\s+that\s+refused\s+to\s+land\b/i,
      /\bshared\s+(?:whisper|glance|silence)\s+(?:at\s+midnight|in\s+the\s+dark)\b/i,
      /\bhe\s+thought\s+of\s+him\s+as\s+he\s+closed\s+his\s+eyes\b/i
    ];
    for (const inv of inventedPrivateScenes) {
      if (inv.test(cleanContent)) {
        violations.push({
          rule: 'REAL_PERSON_PRIVATE_MEMORY_FAIL',
          severity: 'hard',
          description: 'REAL_PERSON_PRIVATE_MEMORY_FAIL: Story manufactures unsourced private memories, intimate studio moments, or private domestic gestures for a real biographical/deceased person. Use only documented events, attributed recollections, or clearly marked analytical inference.'
        });
        break;
      }
    }
  }

  // 132. DECORATIVE_SOURCE_FAIL
  // If a current event or real person is used merely as an atmospheric mood cue or permission
  // for generic grief/melancholy without structural necessity (e.g. "he didn't know who X was, but understood silence").
  const genericBridgePattern =
    /\b(?:he|she)\s+didn['’]t\s+know\s+who\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+was[,\s\w]*\bbut\s+(?:he|she)\s+understood\s+(?:the\s+silence|the\s+loss|grief|sadness)\b/i.test(cleanContent) ||
    /\bthe\s+news\s+on\s+the\s+radio\s+spoke\s+of\s+[,\s\w]*\bbut\s+here\s+in\s+the\s+(?:city|room|alley)\b/i.test(cleanContent);
  if (genericBridgePattern) {
    violations.push({
      rule: 'DECORATIVE_SOURCE_FAIL',
      severity: 'hard',
      description: 'DECORATIVE_SOURCE_FAIL: The real news/source is decorative rather than structural. A specific real person/event is used as a generic bridge to an unrelated fictional character ("didn\'t know who X was, but understood silence"). The source must create a concrete informational conflict or media provenance problem.'
    });
  }

  // 133. THEMATIC_APHORISM_DIALOGUE_FAIL
  // Dialogue that delivers an on-the-nose metaphorical summary of the piece, sounds like an AI quote card,
  // or exists only to dispense thematic wisdom rather than genuine character desire/pressure.
  const cannedThematicDialogue = [
    /["""][^"”]*when\s+a\s+man\s+who\s+keeps\s+the\s+rhythm\s+goes[^"”]*["""]/i,
    /["""][^"”]*the\s+drummer\s+feels\s+it\s+in\s+his\s+own\s+wrists[^"”]*["""]/i,
    /["""][^"”]*we\s+are\s+all\s+just\s+(?:waiting|notes|shadows|clocks)[^"”]*["""]/i,
    /["""][^"”]*some\s+stories\s+aren['’]t\s+meant\s+to\s+be\s+written[^"”]*["""]/i,
    /["""][^"”]*you\s+worry\s+about\s+(?:the\s+)?[\w\s]+[.,;]\s*i\s+worry\s+about\s+(?:the\s+)?[\w\s]+[^"”]*["""]/i
  ];
  for (const dial of cannedThematicDialogue) {
    if (dial.test(cleanContent)) {
      violations.push({
        rule: 'THEMATIC_APHORISM_DIALOGUE_FAIL',
        severity: 'hard',
        description: 'THEMATIC_APHORISM_DIALOGUE_FAIL: Dialogue contains a polished, thematically perfect aphorism that sounds like an AI quote card rather than authentic human speech under pressure. Dialogue must create character resistance, not deliver the author\'s essay thesis.'
      });
      break;
    }
  }

  // 134. SHORT_STORY_ENGINE_GATE
  // A Short Story requires desire, obstacle, decision, and changed state.
  // Reject mood vignettes where the protagonist merely listens to news, ponders, drinks tea, and closes a notebook.
  if (category === 'Short Stories') {
    const isVignetteAutopilot =
      /\b(?:closed?\s+(?:his|her|the)?\s*notebook|notebook\s+shut|closed\s+the\s+pages)\b/i.test(cleanContent) &&
      !/\b(?:decid(?:ed|ing)|confront(?:ed)?|refus(?:ed|ing)|hid(?:den)?|confess(?:ed)?|chose|torn|deleted|signed|spoke\s+up|refused\s+to)\b/i.test(cleanContent);
    const hasZeroFictionalConflict =
      /\bhear(?:d|ing)?\s+(?:the\s+)?news\b/i.test(cleanContent) &&
      /\bthought\s+of\b/i.test(cleanContent) &&
      /\btea\b/i.test(cleanContent) &&
      /\bclosed?\s+the\s+notebook\b/i.test(cleanContent) &&
      !/\b(?:because\s+he|she\s+could\s+not|he\s+refused|argument|consequence|choice)\b/i.test(cleanContent);

    if (isVignetteAutopilot || hasZeroFictionalConflict) {
      violations.push({
        rule: 'SHORT_STORY_ENGINE_GATE',
        severity: 'hard',
        description: 'SHORT_STORY_ENGINE_GATE: Draft lacks minimum short story architecture (desire, obstacle, decision, changed state). A character hearing news, drinking tea, reflecting, and closing a notebook is a mood vignette, not a story. Ground the story in a character decision with actual friction.'
      });
    }
  }

  // 135. AMBIENT_MELANCHOLY_ENDING_FAIL
  // Flags endings composed of auto-pilot sensory decay props (tea cooling, rain on glass, notebook closing, solitary droplet).
  const endingSlice = cleanContent.slice(-450);
  const endingSensoryProps = [
    /\b(?:tea|coffee|cup|chai)\b/i,
    /\b(?:rain|drop|droplet|mist|water|drizzle)\b/i,
    /\b(?:notebook|pen|ink|paper|cap)\b/i,
    /\b(?:glass|window|pane|mirror)\b/i,
    /\b(?:street|road|traffic|alley|lane)\b/i,
    /\b(?:quietly|silence|observing|watched|looked\s+out)\b/i,
    /\b(?:blur(?:red)?|smudge|faded)\b/i
  ];
  const matchedEndingProps = endingSensoryProps.filter(p => p.test(endingSlice));
  if (matchedEndingProps.length >= 4) {
    violations.push({
      rule: 'AMBIENT_MELANCHOLY_ENDING_FAIL',
      severity: 'hard',
      description: `AMBIENT_MELANCHOLY_ENDING_FAIL: Ending contains ${matchedEndingProps.length} ambient melancholy props in the closing lines (beverage, rain/droplet, notebook/ink, windowpane, street observation, blurring/fading). The system is drafting ending-shaped atmosphere instead of an ending. Regenerate ending from narrative consequence.`
    });
  }

  // 136. DEVANSH_SOURCE_MECHANIC_REQUIREMENT
  // When Devansh Roy engages with a source or obituary, it must turn on an INFORMATION PROBLEM
  // (relationship compression, conflicting records, omission, delayed disclosure), NOT generic mood or grief.
  if (penName.includes('devansh') || (category === 'Essays' && cleanTitle.toLowerCase().includes('obituary'))) {
    const addressesInformationMechanic =
      /\b(?:compress(?:es|ed|ion)?|label|omitt?ed|omission|prov(?:enance)?|record|transmission|archiv(?:e|al)|headline|euphemism|safe\s+noun|contradiction|conflict)\b/i.test(cleanContent);
    const hasGenericGriefMood =
      /\b(?:silence\s+that\s+followed|grief\s+of\s+a\s+city|mourning\s+a\s+friend|unseen\s+person\s+behind\s+the\s+star)\b/i.test(cleanContent);
    if (!addressesInformationMechanic && hasGenericGriefMood) {
      violations.push({
        rule: 'DEVANSH_SOURCE_MECHANIC_REQUIREMENT',
        severity: 'hard',
        description: 'DEVANSH_SOURCE_MECHANIC_REQUIREMENT: Devansh source engagement must interrogate an information/provenance problem (how an obituary headline or label compresses, omits, or re-engineers a complex history). It cannot rely on generic grief mood or distant mourning.'
      });
    }
  }

  // 137. REPRESENTATION_VS_RECORD_GATE
  // When a piece centers on visual media, an AI-generated image, viral screenshot, or trading screen claim,
  // it must contrast the representation directly against primary filings/records (SEC 8-K, formal agreement, statutory disclosure).
  const hasRepresentationSubject =
    /\b(?:ai[- ]generated\s+image|synthetic\s+image|trading\s+screen|viral\s+screenshot|viral\s+claim|social\s+media\s+post)\b/i.test(cleanContent) &&
    /\b(?:stock|trade|intel|\$\d+|\d+\s+billion|shares?)\b/i.test(cleanContent);
  if (hasRepresentationSubject) {
    const examinesPrimaryRecord =
      /\b(?:sec|8-k|filing|statutory|primary\s+record|contract|agreement|regulatory|disclosure|formal\s+documentation|cost\s+basis|appropriation|warrants?)\b/i.test(cleanContent);
    if (!examinesPrimaryRecord) {
      violations.push({
        rule: 'REPRESENTATION_VS_RECORD_GATE',
        severity: 'hard',
        description: 'REPRESENTATION_VS_RECORD_GATE: Story centers on an image, screenshot, or viral claim but fails to examine or contrast it against the primary underlying record (e.g. SEC filing, formal agreement, statutory record, regulatory disclosure). Devansh media analysis requires interrogating the gap between representation and record.'
      });
    }
  }

  // 138. TITLE_CONCEPT_CONTRACT
  // If title promises a "Ledger", "Balance Sheet", "Audit", or statutory accounting construct,
  // the text must materially engage with ledger/accounting mechanics, reconciliation, or transaction structures.
  const promisesLedgerConcept = /\b(?:ledger|balance\s+sheet|audit|double-entry|statutory\s+books)\b/i.test(cleanTitle);
  if (promisesLedgerConcept) {
    const engagesLedgerMechanics =
      /\b(?:shares?|equity|warrants?|dilution|filing|cost\s+basis|valuation|sec|accounting|balance\s+sheet|amortiz(?:ed|ation)|capital|ledger|transaction|appropriation|debit|credit|discrepancy|reconcil(?:e|iation))\b/i.test(cleanContent);
    if (!engagesLedgerMechanics) {
      violations.push({
        rule: 'TITLE_CONCEPT_CONTRACT',
        severity: 'hard',
        description: 'TITLE_CONCEPT_CONTRACT: Title promises a "Ledger" or accounting record, but text contains no material ledger, financial reconciliation, or statutory accounting concepts, reducing the title concept to decorative metaphor.'
      });
    }
  }

  // 139. CURRENT_EVENT_STORY_GATE
  // Short story anchored to a current event must establish: SOURCE_EVENT, PROTAGONIST_WANTS, OBSTACLE, DECISION, and CHANGE.
  // Rejects stories where a passive character merely witnesses breaking news/posts without stakes or active choice.
  if (category === 'Short Stories') {
    const anchorsToNewsEvent =
      /\b(?:breaking\s+news|viral\s+post|president(?:'s)?\s+(?:post|claim|image)|trading\s+screen|press\s+conference|ticker|stock\s+trade)\b/i.test(cleanContent);
    const hasProtagonistAgency =
      /\b(?:decid(?:ed|ing)|confront(?:ed)?|refus(?:ed|ing)|hid(?:den)?|confess(?:ed)?|chose|torn|deleted|signed|spoke\s+up|refused\s+to|drafted|filed|flagged|marked|submitt(?:ed|ing)|typed|wrote\s+down|corrected|queried|logged)\b/i.test(cleanContent);
    if (anchorsToNewsEvent && !hasProtagonistAgency) {
      violations.push({
        rule: 'CURRENT_EVENT_STORY_GATE',
        severity: 'hard',
        description: 'CURRENT_EVENT_STORY_GATE: Short story anchored to a current event lacks protagonist agency (wants, obstacle, decision, change). A character passively watching news or a social post without an active decision or consequence fails the story engine gate.'
      });
    }
  }

  // 140. MARKET_CAUSALITY_DISCIPLINE
  // Prevents simplistic monocausal explanations attributing complex stock market moves solely to a single post or meme.
  const hasMarketMoveClaim =
    /\b(?:stock|share\s+price|market\s+cap|valuation)\s+(?:surged|jumped|climbed|rose|fell|crashed)\b/i.test(cleanContent) &&
    /(?:\$|\bpercent\b|%)/i.test(cleanContent);
  if (hasMarketMoveClaim) {
    const monocausalPostAttribution =
      /\b(?:solely\s+because|single-handedly\s+caused|the\s+post\s+(?:made|drove)\s+the\s+stock\s+to|because\s+he\s+posted,\s+the\s+stock\s+surged)\b/i.test(cleanContent);
    const acknowledgesBroaderCatalysts =
      /\b(?:catalyst|analyst|foundry|upgrade|macro|earnings|guidance|speculative|sentiment|volume|fundamentals|chips\s+act|multi-factor|broader\s+market)\b/i.test(cleanContent);
    if (monocausalPostAttribution && !acknowledgesBroaderCatalysts) {
      violations.push({
        rule: 'MARKET_CAUSALITY_DISCIPLINE',
        severity: 'hard',
        description: 'MARKET_CAUSALITY_DISCIPLINE: Piece reduces multi-factor market movement to an ungrounded monocausal narrative (e.g. attributing a stock surge solely to a social media image without noting other catalysts like analyst upgrades, foundry developments, or market sentiment).'
      });
    }
  }

  // 141. NARRATIVE_CONSEQUENCE_TEST (Short Stories)
  // Identifies inciting change, choice/action, cost of choice, and observable consequence.
  // Rejects mood vignettes where a character merely looks at a screen/catalog/object, reflects or discusses philosophically,
  // and closes the tab/page with deferred action ("not yet", "waiting for the right kind of road").
  if (category === 'Short Stories') {
    const hasScreenBrowsingPremise =
      /\b(?:browser\s+tab|on\s+(?:his|her)\s+phone|looking\s+at\s+the\s+screen|configurator|catalog|online\s+listing|scrolling|clicked\s+through)\b/i.test(cleanContent);
    const hasDeferredEnding =
      /\b(?:not\s+yet|some\s+stories\s+aren['’]t\s+meant\s+to\s+be\s+started\s+yet|keep\s+in\s+our\s+pockets|waiting\s+for\s+the\s+right\s+kind\s+of\s+road|closed?\s+the\s+(?:tab|page|screen|browser))\b/i.test(cleanContent);
    const hasPhysicalConsequence =
      /\b(?:bought|ordered|signed|wrote\s+(?:down|on)|tighten(?:ed|ing)|invoice|cheque|cash|down\s+payment|roof|workshop|repaired|replaced|sold|handed\s+over|refused|deposit|lathe)\b/i.test(cleanContent);

    if (hasScreenBrowsingPremise && hasDeferredEnding && !hasPhysicalConsequence) {
      violations.push({
        rule: 'NARRATIVE_CONSEQUENCE_TEST',
        severity: 'hard',
        description: 'NARRATIVE_CONSEQUENCE_TEST: Short story lacks narrative consequence (inciting change, choice/action, cost of choice, observable consequence). A character browsing a product on a screen, reflecting with a friend, and closing the tab with a deferred non-action ("not yet") is a mood vignette wearing fictional overalls. Anchor the story in a consequential choice with physical stakes.'
      });
    }
  }

  // 142. METAPHOR_DEPENDENCY_FAIL
  // Rejects when a real subject (product, launch, sporting match) primarily exists as a decorative vehicle
  // for generic life conditions (ambition, freedom, grief, hesitation, escape, "moving forward")
  // without its concrete mechanical or transactional properties driving the conflict.
  // Replacement test: If replacing the subject with a camera, laptop, or tennis match leaves the piece intact, fail.
  const genericMetaphorVehicle =
    /\b(?:machine\s+isn['’]t\s+just|motorcycle\s+isn['’]t\s+just|vehicle\s+isn['’]t\s+just|product\s+isn['’]t\s+just)\s+an?\s+(?:entry\s+in\s+a\s+catalog|machine|motorcycle|device)[^.,;]*[.,;]\s*it['’]s\s+a\s+(?:marker|metaphor|symbol|testament|reminder)\s+of\s+(?:a\s+specific\s+kind\s+of\s+arrival|our\s+collective|freedom|restless|ambition)/i.test(cleanContent) ||
    /\b(?:the\s+machine\s+is\s+only\s+as\s+fast\s+as\s+the\s+story\s+you\s+are\s+trying\s+to\s+outrun|we\s+don['’]t\s+buy\s+the\s+vehicle,\s+we\s+buy\s+the\s+next\s+mile)\b/i.test(cleanContent);
  if (genericMetaphorVehicle) {
    violations.push({
      rule: 'METAPHOR_DEPENDENCY_FAIL',
      severity: 'hard',
      description: 'METAPHOR_DEPENDENCY_FAIL: Subject exists primarily to symbolize a generic life condition (ambition, freedom, hesitation, escape). Fails the subject-dependency replacement test: if replacing the motorcycle with a camera, laptop, or train preserves the essay, the premise is insufficiently bound to the subject\'s factual reality.'
    });
  }

  // 143. SUPPORTING_CHARACTER_AS_THESIS_MOUTHPIECE_FAIL
  // Flags supporting characters who deliver artificial aphorisms summarizing the author's philosophical thesis
  // instead of authentic, grounded speech under interpersonal pressure.
  const supportingCharacterAphorism = [
    /\bThe machine is only as fast as the story you are trying to outrun\b/i,
    /\bSome stories aren['’]t meant to be started yet\b/i,
    /\bWe are not buying the metal[,\s]+we are buying\b/i,
    /\bA motorcycle is just a clock that moves forward\b/i
  ];
  const narratorVentriloquism =
    /\bnot\s+with\s+the\s+hunger\s+of\s+a\s+consumer[,\s]+but\s+with\s+the\s+(?:quiet\s+)?appraisal\s+of\s+a\s+novelist\b/i.test(cleanContent);

  for (const pat of supportingCharacterAphorism) {
    if (pat.test(cleanContent) || narratorVentriloquism) {
      violations.push({
        rule: 'SUPPORTING_CHARACTER_AS_THESIS_MOUTHPIECE_FAIL',
        severity: 'hard',
        description: 'SUPPORTING_CHARACTER_AS_THESIS_MOUTHPIECE_FAIL: Supporting character delivers a polished quote-card aphorism or narrator attributes novelist sensibilities to a mundane character. Dialogue must sound like authentic human speech under pressure (e.g. "Two-ten on road; they never put that number in the headline"), not the author\'s essay thesis.'
      });
      break;
    }
  }


  // 144. CODE_POLICY_STRICT_ENFORCEMENT (WRITER_RULE_VIOLATION: CODE_INSERTED_WHEN_FORBIDDEN)
  // Hard critic gate: detects pseudocode interfaces, decision functions, or algorithmic metaphors
  // inserted into non-software premises (e.g. motorcycle buying, sports, grief).
  if (category !== 'Tech') {
    const codeBlock = cleanContent.match(/(?:```|~~~)[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n(?:```|~~~)/);
    if (codeBlock) {
      violations.push({
        rule: 'WRITER_RULE_VIOLATION_CODE_FORBIDDEN',
        severity: 'hard',
        description: `WRITER_RULE_VIOLATION: CODE_INSERTED_WHEN_FORBIDDEN: Code block detected in ${category} piece. Pseudo-code interfaces (e.g. interface Aspirations, decidePurchase, return false) masquerading as emotional or narrative logic violate editorial code policy. Code is strictly forbidden outside genuine software technical tutorials.`
      });
    }
  }

  // 145. ARSHDEEP_TITLE_COOLDOWN & Lexical Title Recurrence
  // Prevents repetitive title tokens for Arshdeep Singh / Gurpreet Sandhu (geometry, dust, static, baseline, underdog, choosing).
  if (penName.includes('arsh') || penName.includes('gurpreet')) {
    const overusedTitleTokens = /\b(?:geometry|dust|static|baseline|lines|underdog|choosing)\b/i;
    if (overusedTitleTokens.test(cleanTitle)) {
      violations.push({
        rule: 'ARSHDEEP_TITLE_COOLDOWN',
        severity: 'hard',
        description: `ARSHDEEP_TITLE_COOLDOWN: Title "${cleanTitle}" contains exhausted title token (${cleanTitle.match(overusedTitleTokens)[0]}). Following "The Geometry of the Underdog", title motifs including geometry, dust, static, baseline, lines, and choosing are on mandatory cooldown for Arshdeep/Gurpreet. Use domain-concrete titles.`
      });
    }
  }

  // 146. HOUSE_STYLE_PROP_DENSITY
  // Detects the synthetic WritOn atmospheric perfume cluster:
  // (rain/monsoon humidity + garage dust/grease + phone glow/screen tab + dark room + deferred decision/not yet).
  // When 3+ high-frequency motifs appear together without subject necessity, require domain-specific substitutions.
  const houseStyleProps = [
    /\b(?:rain|monsoon|humidity|rainy-season)\b/i,
    /\b(?:garage\s+dust|workbench\s+grease|scent\s+of\s+old\s+grease)\b/i,
    /\b(?:phone\s+(?:glow|tab\s+flickered)|screen\s+glow|flickering\s+tab)\b/i,
    /\b(?:dark(?:ened)?\s+room|shadows\s+in\s+the\s+garage)\b/i,
    /\b(?:tea|chai|kettle)\b/i,
    /\b(?:not\s+yet|logic\s+of\s+the\s+['’]not\s+yet['’]|waiting\s+for\s+the\s+right\s+road)\b/i
  ];
  const matchedHouseProps = houseStyleProps.filter(p => p.test(cleanContent));
  if (matchedHouseProps.length >= 3) {
    violations.push({
      rule: 'HOUSE_STYLE_PROP_DENSITY',
      severity: 'hard',
      description: `HOUSE_STYLE_PROP_DENSITY: Detected ${matchedHouseProps.length} high-frequency WritOn costume props (rain, garage dust/grease, phone glow, dark room, tea, deferred "not yet" ending). Replace synthetic mood props with domain-specific objects (e.g. dealer quotation, chain lube, torque wrench, workshop invoice, leaking roof, lathe).`
    });
  }

  // 147. NUMERICAL_PRECISION_AND_LOCAL_REALITY
  // For product launches, enforce factual reporting precision and regional cost reality.
  // E.g. Jawa 42 All Stars is ₹1.85 lakh ex-showroom (₹1.90 lakh for Black), not a floating "1.80 to 1.85 lakh",
  // and real on-road pricing in Punjab/Jalandhar is ~₹2.10 lakh.
  // Also flags ungrounded cross-story contamination (e.g. Boston attic / Lindsay Clancy leaks in a Punjab story).
  if (/\bjawa\s+42\b/i.test(cleanContent)) {
    const vaguePricing = /\b1\.80\s*(?:and|to|-)\s*1\.85\s*lakh\b/i.test(cleanContent);
    if (vaguePricing) {
      violations.push({
        rule: 'NUMERICAL_PRECISION_AND_LOCAL_REALITY',
        severity: 'hard',
        description: 'NUMERICAL_PRECISION_AND_LOCAL_REALITY: Inaccurate pricing statement. Jawa 42 All Stars launched at ₹1.85 lakh ex-showroom (₹1.90 lakh for Black), not a floating "1.80 to 1.85 lakh". Ground the friction in actual on-road dealer pricing (e.g. ~₹2.10 lakh in Jalandhar).'
      });
    }
  }

  const crossStoryContamination = /\b(?:student\s+in\s+a\s+drafty\s+boston\s+attic|lindsay\s+clancy)\b/i.test(cleanContent) &&
    /\b(?:jawa|punjab|kabir|workshop)\b/i.test(cleanContent);
  if (crossStoryContamination) {
    violations.push({
      rule: 'CROSS_STORY_CONTAMINATION_FAIL',
      severity: 'hard',
      description: 'CROSS_STORY_CONTAMINATION_FAIL: Unrelated narrative artifact leaked across stories (Boston attic / Clancy reference inside Punjab motorcycle piece). Enforce strict narrative isolation.'
    });
  }

  return {
    isValid: violations.length === 0,
    violations,
    reasons: violations.map(v => `${v.rule}: ${v.description}`)
  };

}

export function validateGeneratedArticleIntegrity({
  title = '',
  content = '',
  category = 'Essays',
  summary = '',
  persona = null,
  researchDossier = null
} = {}) {
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
  if (/\b(lies we tell our vcs|pitch deck|venture capitalist|venture capital|series [a-d] funding|unicorn startup|seed round|pre-seed|angel investor|disrupting the space|thought leadership parody)\b/i.test(`${cleanTitle} ${cleanContent}`)) {
    reasons.push('Article contains banned cynical VC/startup tropes, which violate WritOn editorial policy');
  }
  if (/(?:```|~~~)/i.test(cleanContent)) {
    reasons.push('Article contains code blocks, which are currently prohibited by editorial policy');
  }

  for (const block of fencedCodeBlocks(cleanContent)) {
    if (!['ts', 'tsx', 'typescript'].includes(block.language)) continue;
    if (/:\s*(?:Promise|Array|Record|Map|Set)\s*(?=[{;,)=]|$)/m.test(block.code)) {
      reasons.push('TypeScript code appears to be missing generic type arguments');
      break;
    }
  }

  // Zero AI Slop Engine Blockers Check
  const slopCheck = validateZeroAISlopEngineBlockers({
    title: cleanTitle,
    content: cleanContent,
    summary,
    category,
    persona,
    researchDossier
  });
  if (!slopCheck.isValid) {
    reasons.push(...slopCheck.reasons);
  }

  return {
    isValid: reasons.length === 0,
    reasons,
    wordCount,
    codeBlockCount: fencedCodeBlocks(cleanContent).length,
    slopViolations: slopCheck.violations
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
  const categoryTags = CATEGORY_HASHTAGS[topicCategory] || ['#writondiscover'];
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
  const integrity = validateGeneratedArticleIntegrity({ title, content, category, summary, researchDossier });
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
