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
      'courtyard', 'almirah', 'verandah', 'boat', 'aarti', 'father', 'mother'
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
    /\ban\s+exploration\s+of\s+failure,\s*patience\b/i,
    /\bthrough\s+the\s+lens\s+of\b/i,
    /\bwithin\s+the\s+realm\s+of\b/i,
    /\ba\s+reflection\s+on\b/i
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
