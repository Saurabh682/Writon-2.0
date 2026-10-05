import https from 'node:https';
import { LEGACY_WRITER_PERSONAS } from './legacy-writer-personas.js';
import { REVIEW_PERSONAS } from './review-personas.js';
import { fetchGoogleNewsResearch, fetchWikipediaSummary } from './trend-scout-service.js';

/**
 * Trend Orchestrator for WritOn Autonomous Bot Network
 *
 * Implements ADK 2 Graph & Orchestration Patterns:
 * 1. Parallel Zero-LLM Fan-Out: Concurrent harvesting of Google Trends, Google News, and Wikipedia ($0 token cost).
 * 2. JoinNode Aggregation: Combines multiple data streams into an immutable, deduplicated, anti-repetition verified TrendBundle.
 * 3. Pure-Code Deterministic Router: Instant slot classification and persona assignment without LLM routing overhead.
 */

const SENSITIVE_TOPIC_PATTERN = /\b(?:election|polling|politic(?:s|al)?|parliament|government|minister|president|prime\s+minister|war|military|missile|attack|terror(?:ism|ist)?|hostage|invasion|conflict|death|dead|killed|murder|suicide|assault|abuse|minor|child|rape|sexual|medical|medicine|health|disease|diagnosis|treatment|vaccine|drug|therapy|investment|investing|stock|share\s+price|crypto|loan|mortgage|bankruptcy|financial\s+advice|court|lawsuit|legal|crime|arrest|charged|allegation|fraud|scam|communal|riot|religion|caste|protest|sanction|disaster|earthquake|flood|wildfire)\b/i;

export const BANNED_EDITORIAL_TOPIC_PATTERN = /\b(vc|vcs|venture capital|pitch deck|seed round|series [a-d]|angel investor|unicorn|disrupt|startup hype|thought leadership parody|lies we tell our vcs|10x engineer|founder mode|pre-seed|fundraise)\b/i;

function fetchHttps(url, customHeaders = {}, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        ...customHeaders
      },
      timeout: timeoutMs
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`HTTPS request timeout after ${timeoutMs}ms: ${url}`));
    });
    req.on('error', reject);
  });
}

/**
 * Clean and unescape XML / HTML text strings
 */
function cleanXmlText(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Parse Google Trends RSS XML
 */
export function parseGoogleTrendsRss(xml, geo = 'IN') {
  if (!xml || typeof xml !== 'string') return [];
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = /<title>(.*?)<\/title>/.exec(block);
    const trafficMatch = /<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/.exec(block);
    const newsTitleMatch = /<ht:news_item_title>(.*?)<\/ht:news_item_title>/.exec(block);
    const newsSnippetMatch = /<ht:news_item_snippet>(.*?)<\/ht:news_item_snippet>/.exec(block);
    const newsSourceMatch = /<ht:news_item_source>(.*?)<\/ht:news_item_source>/.exec(block);

    if (titleMatch) {
      const topic = cleanXmlText(titleMatch[1]);
      const headline = newsTitleMatch ? cleanXmlText(newsTitleMatch[1]) : null;
      items.push({
        topic,
        geo,
        approxTraffic: trafficMatch ? trafficMatch[1] : null,
        headline,
        snippet: newsSnippetMatch ? cleanXmlText(newsSnippetMatch[1]) : null,
        source: newsSourceMatch ? cleanXmlText(newsSourceMatch[1]) : null,
        harvestedAt: new Date().toISOString()
      });
    }
  }
  return items;
}

/**
 * Pillar 1: Parallel Zero-LLM Fan-Out
 * Concurrently harvests trending RSS feeds across multiple geographic regions.
 */
export async function harvestParallelTrends({ geoList = ['IN', 'US'], timeoutMs = 6000 } = {}) {
  const fetchPromises = geoList.map(async (geo) => {
    const url = `https://trends.google.com/trending/rss?geo=${geo}`;
    try {
      const xml = await fetchHttps(url, {}, timeoutMs);
      return parseGoogleTrendsRss(xml, geo);
    } catch (err) {
      console.warn(`[Trend Orchestrator] Fan-Out RSS lookup failed for geo=${geo}: ${err.message}`);
      return [];
    }
  });

  const settled = await Promise.allSettled(fetchPromises);
  const harvestedItems = [];
  for (const result of settled) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      harvestedItems.push(...result.value);
    }
  }

  return harvestedItems;
}

/**
 * Pillar 1: JoinNode Aggregation
 * Merges parallel harvested items into an immutable, deduplicated, and policy-filtered TrendBundle.
 */
export function aggregateTrendBundle(harvestedItems = [], { antiRepetitionList = [], maxItems = 20 } = {}) {
  const seenTopics = new Set();
  const antiRepetitionNormalized = new Set(
    antiRepetitionList.map(t => String(t || '').toLowerCase().trim()).filter(Boolean)
  );

  const activeCandidates = [];

  for (const item of harvestedItems) {
    if (!item?.topic) continue;
    const normalized = item.topic.toLowerCase().trim();

    // 1. Deduplicate across incoming geos
    if (seenTopics.has(normalized)) continue;
    seenTopics.add(normalized);

    // 2. Sensitive topics filter (policy compliance)
    if (SENSITIVE_TOPIC_PATTERN.test(`${item.topic} ${item.headline || ''}`)) {
      continue;
    }

    // 2b. Banned cynical startup/VC topics filter (strict editorial standard)
    if (BANNED_EDITORIAL_TOPIC_PATTERN.test(`${item.topic} ${item.headline || ''}`)) {
      continue;
    }

    // 3. Editorial anti-repetition check
    let isRepetitive = false;
    for (const recent of antiRepetitionNormalized) {
      if (normalized.includes(recent) || recent.includes(normalized)) {
        isRepetitive = true;
        break;
      }
    }
    if (isRepetitive) continue;

    // 4. Classify category and determine slot routing
    const routing = routeTopicToEditorialSlot(item.topic, item.headline || item.snippet || '');

    // Angle distinctiveness gate: verify the angle provides distinct craft perspective beyond repeating the headline
    const angleEvaluation = evaluateEditorialAngleDistinctiveness({
      topic: item.topic,
      headline: item.headline || '',
      editorialAngle: routing.editorialAngle,
      category: routing.category
    });

    if (!angleEvaluation.distinct) {
      continue;
    }

    activeCandidates.push({
      ...item,
      category: routing.category,
      slotId: routing.slotId,
      recommendedAuthor: routing.recommendedAuthor,
      editorialAngle: routing.editorialAngle,
      angleEvaluation
    });

    if (activeCandidates.length >= maxItems) break;
  }

  return Object.freeze({
    timestamp: new Date().toISOString(),
    totalHarvested: harvestedItems.length,
    candidateCount: activeCandidates.length,
    activeCandidates
  });
}

/**
 * Pillar 1: Pure-Code Deterministic Router
 * Maps topics to categories, scheduled slots, and author personas with zero LLM API cost.
 */
export function routeTopicToEditorialSlot(topic = '', contextText = '') {
  const text = `${topic} ${contextText}`.toLowerCase();

  const resolve = () => {
    // 0. Strict negative guard against cynical startup tropes / VC cynicism
    if (BANNED_EDITORIAL_TOPIC_PATTERN.test(text)) {
      const journalismPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Journalism'));
      const author = journalismPersonas[0] || {
        penName: 'riya_chakraborty',
        fullName: 'Dr. Riya Chakraborty'
      };
      return {
        category: 'Journalism',
        slotId: 'morning_tech',
        recommendedAuthor: {
          penName: author.penName,
          fullName: author.fullName
        },
        editorialAngle: `Examine the tangible ground realities, public records, and civic accountability around ${topic}. Avoid all startup jargon and focus on verifiable human facts.`
      };
    }

  // 1. Journalism & Public Affairs (Ground reporting, investigative inquiries, civic reality)
  if (/\b(investigation|expose|scam|court verdict|supreme court|high court|parliament|bill passed|election commission|probe|inquiry|whistleblower|custody|bail|police raid|arrested|cbi|ed raid|policy reform|public report|audit|municipal|civic|infrastructure|sanitation|hospital|healthcare|pollution|ground report|rti)\b/i.test(text)) {
    const journalismPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Journalism'));
    const author = journalismPersonas[Math.floor(Math.random() * journalismPersonas.length)] || {
      penName: 'riya_chakraborty',
      fullName: 'Dr. Riya Chakraborty'
    };
    return {
      category: 'Journalism',
      slotId: 'morning_tech',
      recommendedAuthor: {
        penName: author.penName,
        fullName: author.fullName
      },
      editorialAngle: `Ground human reporting, public records, institutional accountability, and frontline civic reality around ${topic}. Avoid abstract commentary and document verifiable details.`
    };
  }

  // 2. Business & Finance (Real economy, markets, commodity prices, wholesale trade, fiscal balance sheets)
  if (/\b(market|markets|share price|shares|sensex|nifty|ipo|stocks|stock|economy|economic|inflation|bank|banking|rupee|invest|investing|finance|financial|gdp|fiscal|rbi|sebi|earnings|revenue|quarterly profit|mutual fund|gold price|silver price|crude oil|trade deficit|commodity|wholesale|supply chain|manufacturing|msme|gst)\b/i.test(text)) {
    const bizPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Business & Finance') || p.categories.includes('Essays'));
    const author = bizPersonas.find(p => p.penName === 'karan_bajwa') || bizPersonas[0] || {
      penName: 'karan_bajwa',
      fullName: 'Karan Bajwa'
    };
    return {
      category: 'Business & Finance',
      slotId: 'lunch_satire',
      recommendedAuthor: {
        penName: author.penName,
        fullName: author.fullName
      },
      editorialAngle: `Analyze the balance sheet reality, commodity dynamics, working capital cycles, and commercial trade pressures of ${topic}. Ground analysis in real economic mechanics.`
    };
  }

  // 3. Sports & Athletic Craft
  if (/\b(cricket|tennis|olympics|football|soccer|match|cup|winner|sport|sports|tournament|ipl|bcci|fifa|wimbledon|wicket|badminton|hockey|wrestling|akhada|athletics|f1|formula 1|grand prix|marathon|chess|grandmaster|test match|century|bowler|batsman)\b/i.test(text)) {
    const sportsPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Sports'));
    const author = sportsPersonas.find(p => p.penName === 'sameer_deshpande') || sportsPersonas[0] || {
      penName: 'sameer_deshpande',
      fullName: 'Sameer Deshpande'
    };
    return {
      category: 'Sports',
      slotId: 'evening_fiction',
      recommendedAuthor: {
        penName: author.penName,
        fullName: author.fullName
      },
      editorialAngle: `Explore the physical discipline, competitive tension, tactile arena atmosphere, and athletic perseverance in ${topic}.`
    };
  }

  // 4. Early Hardware, Audio & Product Reviews / Guides detection
  // Resolves subject and format together BEFORE Culture, Entertainment, or Poetry.
  // Guarantees audio products (headphones, speakers, turntables, mics) and gadget reviews/guides NEVER route to Culture.
  const isHardwareOrAudioSubject = /\b(headphone|headphones|earbud|earbuds|iem|iems|earphone|earphones|headset|headsets|speaker|speakers|soundbar|soundbars|audio gear|audio system|turntable|turntables|dac|dacs|amp|amps|amplifier|amplifiers|microphone|microphones|mic|mics|audio interface|phone|phones|smartphone|smartphones|mobile|laptop|laptops|notebook|notebooks|macbook|desktop|pc|tablet|tablets|ipad|display|displays|monitor|monitors|tv|tvs|television|console|playstation|xbox|switch|steam deck|gpu|gpus|cpu|cpus|chip|chips|processor|processors|silicon|graphics card|camera|cameras|lens|lenses|sensor|optics|ev|evs|electric vehicle|vehicle|battery|keyboard|keyboards|mouse|gadget|gadgets|hardware|device|devices|wearable|wearables|smartwatch|bose|sony|sennheiser|apple|airpods|samsung|pixel|oneplus|asus|rog|lenovo|dell|hp|nothing|jabra|sonos|jbl|audio-technica|beyerdynamic|boat|shure|dji|canon|nikon|fujifilm|nvidia|amd|intel|qualcomm|snapdragon)\b/i.test(text);

  const isReviewOrGuideIntent = /\b(review|reviews|reviewed|guide|guides|buyer guide|buying guide|listening guide|setup guide|user guide|sound quality|audio quality|music quality|build quality|camera test|range test|drop test|battery test|battery life|benchmark|benchmarks|specs|specifications?|teardown|unboxing|hands-on|vs|versus|comparison|comparative|verdict|impressions|tested|testing|test|tests|sound test|audio test|listening test|sound profile|acoustics)\b/i.test(text);

  if (isHardwareOrAudioSubject && isReviewOrGuideIntent) {
    const reviewer = REVIEW_PERSONAS[Math.floor(Math.random() * REVIEW_PERSONAS.length)] || {
      penName: 'vikram_auto_tech',
      fullName: 'Vikramaditya Chauhan',
      domain: 'EVs & Battery Tech'
    };
    return {
      category: 'Reviews',
      slotId: 'morning_tech',
      recommendedAuthor: {
        penName: reviewer.penName,
        fullName: reviewer.fullName,
        domain: reviewer.domain
      },
      editorialAngle: `Measure empirical trade-offs, ergonomic realities, and hardware performance of ${topic}. Avoid promotional hype and state measured findings directly.`
    };
  }

  // 5. Entertainment, Cinema & Dramatic Craft (Only if not a hardware review/test)
  if (!isHardwareOrAudioSubject && /\b(movie|movies|film|films|trailer|teaser|box office|actor|actress|director|cinema|bollywood|hollywood|kollywood|tollywood|ott|netflix|prime video|hotstar|album|song|soundtrack|concert|grammy|oscar|emmy|cannes|celebrity|series|theatre|screenplay|cinematography|sound design)\b/i.test(text)) {
    const entPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Entertainment') || p.categories.includes('Short Stories'));
    const author = entPersonas.find(p => p.penName === 'pravin_piku') || entPersonas[0] || {
      penName: 'pravin_piku',
      fullName: 'Pravin Kumar (Piku)'
    };
    return {
      category: 'Entertainment',
      slotId: 'prime_screens',
      recommendedAuthor: {
        penName: author.penName,
        fullName: author.fullName
      },
      editorialAngle: `Analyze dramatic pacing, performance subtext, cinematic staging, and screenwriting craft in ${topic}.`
    };
  }

  // 6. Shayari & Classical Urdu / Hindustani Poetry
  if (/\b(ghazal|shayari|urdu|nazm|ishq|dastak|dahliz|shaam|mehfil|tehzeeb|tarannum)\b/i.test(text)) {
    const shayariPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Shayari'));
    const author = shayariPersonas[Math.floor(Math.random() * shayariPersonas.length)] || {
      penName: 'ishaq_qureshi',
      fullName: 'Ishaq Qureshi'
    };
    return {
      category: 'Shayari',
      slotId: 'midnight_poetry',
      recommendedAuthor: {
        penName: author.penName,
        fullName: author.fullName
      },
      editorialAngle: `Craft classical couplets exploring longing, memory, and courtyard twilight through the lens of ${topic}.`
    };
  }

  // 7. Poetry & Seasonal Meditations
  if (/\b(rain|flood|floods|river|weather|monsoon|autumn|hills|season|nature|dawn|night|frost|clouds|mist|solitude|winter)\b/i.test(text)) {
    const poetryPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Poetry'));
    const author = poetryPersonas[Math.floor(Math.random() * poetryPersonas.length)] || {
      penName: 'kavya_nair',
      fullName: 'Kavya Nair'
    };
    return {
      category: 'Poetry',
      slotId: 'dawn_digest',
      recommendedAuthor: {
        penName: author.penName,
        fullName: author.fullName
      },
      editorialAngle: `Ground poetic verse in physical geography, seasonal transitions, and quiet sensory observations inspired by ${topic}.`
    };
  }

  // 8. Culture, Heritage & Craft (Strictly non-hardware, non-audio, non-tech human traditions, arts, literature)
  if (!isHardwareOrAudioSubject &&
      !/\b(gpu|nvidia|chip|ai|llm|software|hardware|computing|database|postgres|kernel|compiler|server|tensor|processor|phone|laptop|code|programming|semiconductor)\b/i.test(text) &&
      /\b(history|heritage|book|books|author|festival|music|tradition|traditions|temple|museum|art|craft|dance|ghat|folk|classical|vernacular|monument|culinary|recipe|spice|architecture|weaving|handloom|pottery)\b/i.test(text)) {
    const culturePersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Culture'));
    const author = culturePersonas[Math.floor(Math.random() * culturePersonas.length)] || {
      penName: 'kelly_miracle_art',
      fullName: 'Kelly Miracle'
    };
    return {
      category: 'Culture',
      slotId: 'evening_fiction',
      recommendedAuthor: {
        penName: author.penName,
        fullName: author.fullName
      },
      editorialAngle: `Explore the material traditions, generational continuity, and tactile craftsmanship evoked by ${topic}.`
    };
  }

  // 9. Humour & Domestic / Civic Observation (Strictly non-tech)
  if (/\b(funny|joke|viral|meme|traffic|parking|neighbor|society|notice board|water tank|delay|train|commute|samosa|hilarious|comedy|civic)\b/i.test(text)) {
    const humourPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Humour'));
    const author = humourPersonas[Math.floor(Math.random() * humourPersonas.length)] || {
      penName: 'rohan_kapoor',
      fullName: 'Rohan Kapoor'
    };
    return {
      category: 'Humour',
      slotId: 'lunch_satire',
      recommendedAuthor: {
        penName: author.penName,
        fullName: author.fullName
      },
      editorialAngle: `Observe the quiet absurdities, administrative rituals, and unspoken neighborhood ironies surrounding ${topic}. Avoid slapstick; focus on relatable social observation.`
    };
  }

  // 10. Tech Systems Craft & Frontier AI (Pure architecture / engineering / AI frontier, zero VC cynicism, ZERO code blocks)
  if (/\b(gpu|nvidia|chip|chips|ai|llm|transformer|latency|claude|gemini|openai|gpt|astra|frontier model|context window|prompting|postgres|postgresql|database|kernel|linux|concurrency|distributed systems|architecture|wal\b|lsn\b|memory leak|cache invalidation|compiler|rust|golang|debugger|interface|ui|ux)\b/i.test(text)) {
    const TEMPORARY_COOLDOWN_PEN_NAMES = new Set(['aarav_tech', 'devansh_roy', 'sunita_banerjee', 'gurpreet_sandhu']);
    const techPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Tech') && !TEMPORARY_COOLDOWN_PEN_NAMES.has(p.penName));
    let author = null;
    let angleDetail = 'Analyze technical constraints, trade-offs, and systems reality behind ' + topic + '.';

    if (/\b(distributed systems|architecture|concurrency|latency|throughput|gpu|nvidia|transformer|inference|scaling law)\b/i.test(text)) {
      author = techPersonas.find(p => p.penName === 'karthik_subramanian') || techPersonas[0];
      angleDetail = `Analyze frontier architecture, mechanical sympathy, latency bottlenecks, and systems engineering trade-offs behind ${topic}.`;
    } else if (/\b(database|postgres|postgresql|wal\b|lsn\b|query|index|consensus|raft|paxos|storage engine)\b/i.test(text)) {
      author = techPersonas.find(p => p.penName === 'karthik_subramanian') || techPersonas[0];
      angleDetail = `Investigate database internals, write-ahead logging, indexing physics, or storage engine guarantees behind ${topic}.`;
    } else if (/\b(kernel|linux|ebpf|buffer|zero-copy|memory leak|cache|socket|packet|driver)\b/i.test(text)) {
      author = techPersonas.find(p => p.penName === 'riya_sharma_systems') || techPersonas[0];
      angleDetail = `Examine Linux kernel mechanics, memory boundaries, zero-copy buffers, and low-level constraints around ${topic}.`;
    } else if (/\b(compiler|diagnostic|error message|build|tooling|cli|terminal|ide|developer experience|linter)\b/i.test(text)) {
      author = techPersonas.find(p => p.penName === 'anand_verma_dev') || techPersonas[0];
      angleDetail = `Explore developer ergonomics, compiler feedback loops, build latency, and terminal tooling trade-offs in ${topic}.`;
    } else if (/\b(interface|ui|ux|interaction|design system|typography|touch|haptic)\b/i.test(text)) {
      author = techPersonas.find(p => p.penName === 'maya_lin_craft') || techPersonas[0];
      angleDetail = `Reflect on tactile software craft, human-computer interaction principles, and interface responsiveness in ${topic}.`;
    } else if (/\b(ethics|longevity|cybernetics|human role|automation|dignity|philosophical)\b/i.test(text)) {
      author = techPersonas.find(p => p.penName === 'aiden_cross') || techPersonas[0];
      angleDetail = `Interrogate the human and philosophical consequences, cybernetic feedback loops, and software longevity surrounding ${topic}.`;
    } else if (/\b(hardware|circuit|retro|salvage|chip|semiconductor|repair|delhi|nehru place|component)\b/i.test(text)) {
      author = techPersonas.find(p => p.penName === 'vikas_singhal') || techPersonas[0];
      angleDetail = `Examine hardware physical realities, component-level diagnostics, electronics salvage, and computing history in ${topic}.`;
    }

    if (!author) {
      // Rotate across available non-cooldown tech writers
      author = techPersonas[Math.floor(Math.random() * techPersonas.length)] || {
        penName: 'karthik_subramanian',
        fullName: 'Karthik Subramanian'
      };
      angleDetail = `Analyze systems architecture, mechanical sympathy, latent space dynamics, or engineering craftsmanship behind ${topic}.`;
    }

    return {
      category: 'Tech',
      slotId: 'morning_tech',
      recommendedAuthor: {
        penName: author.penName,
        fullName: author.fullName
      },
      editorialAngle: `${angleDetail} Strictly avoid code blocks and startup/VC satire; explain concepts purely in lucid, engaging narrative prose.`
    };
  }

  // 11. Tech & Hardware Reviews Guard (Never route tech or hardware devices into Culture)
  const TECH_HARDWARE_INDICATORS = /\b(phone|smartphone|mobile|laptop|pc|desktop|tablet|camera|lens|optics|gpu|cpu|chip|processor|silicon|headphone|earbud|iem|audio|speaker|ev|electric vehicle|battery|gadget|console|teardown|benchmark|unboxing|hands-on|specs|hardware|keyboard|display|screen|monitor|software|app|framework|library|server|database|kernel|linux)\b/i;
  if (TECH_HARDWARE_INDICATORS.test(text)) {
    if (/\b(review|reviewed|buyer guide|buying guide|comparison|vs|specs|verdict|benchmark|tested|testing|hands-on)\b/i.test(text)) {
      const reviewer = REVIEW_PERSONAS[Math.floor(Math.random() * REVIEW_PERSONAS.length)] || {
        penName: 'vikram_auto_tech',
        fullName: 'Vikramaditya Chauhan',
        domain: 'EVs & Battery Tech'
      };
      return {
        category: 'Reviews',
        slotId: 'morning_tech',
        recommendedAuthor: {
          penName: reviewer.penName,
          fullName: reviewer.fullName,
          domain: reviewer.domain
        },
        editorialAngle: `Measure empirical trade-offs, ergonomic realities, and hardware performance of ${topic}. Avoid promotional hype and state measured findings directly.`
      };
    }

    const techPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Tech'));
    const author = techPersonas[Math.floor(Math.random() * techPersonas.length)] || {
      penName: 'karthik_subramanian',
      fullName: 'Karthik Subramanian'
    };
    return {
      category: 'Tech',
      slotId: 'morning_tech',
      recommendedAuthor: {
        penName: author.penName,
        fullName: author.fullName
      },
      editorialAngle: `Analyze technical constraints, systems architecture, and engineering trade-offs behind ${topic}. Explain concepts purely in lucid narrative prose without code blocks.`
    };
  }

  // 12. Culture / Short Stories Fallback (Default for non-tech human/arts themes)
  const culturePersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Culture'));
  const author = culturePersonas[0] || {
    penName: 'priyanka_mishra',
    fullName: 'Priyanka Mishra'
  };
  return {
    category: 'Culture',
    slotId: 'dawn_digest',
    recommendedAuthor: {
      penName: author.penName,
      fullName: author.fullName
    },
    editorialAngle: `Explore the human dimensions, generational memory, and cultural continuity evoked by ${topic}.`
  };
};

  const res = resolve();
  const angleEvaluation = evaluateEditorialAngleDistinctiveness({
    topic,
    headline: contextText,
    editorialAngle: res.editorialAngle,
    category: res.category
  });
  return { ...res, angleEvaluation };
}

/**
 * Pillar 2: Distinct Angle Evaluation Gate
 * Evaluates whether a proposed editorial angle offers a distinct craft/analytical
 * perspective beyond merely repeating or summarizing the headline.
 *
 * Distinct angle requirements:
 * 1. Must not simply rephrase or repeat the headline/topic.
 * 2. Must not be generic boilerplate (e.g. "report on X", "summary of X").
 * 3. Must introduce craft depth, technical trade-offs, institutional friction,
 *    balance-sheet mechanics, or narrative stakes.
 */
export function evaluateEditorialAngleDistinctiveness({
  topic = '',
  headline = '',
  editorialAngle = '',
  category = 'Essays'
} = {}) {
  const cleanAngle = String(editorialAngle || '').trim();
  const cleanTopic = String(topic || '').trim();
  const cleanHeadline = String(headline || '').trim();

  if (!cleanAngle || cleanAngle.length < 25) {
    return {
      distinct: false,
      decision: 'SKIP',
      reason: 'NO_DISTINCT_WRITON_ANGLE: Angle is empty or insufficiently specified (< 25 characters)'
    };
  }

  // 1. Check if angle uses generic boilerplate or placeholder phrasing
  const GENERIC_FILLER_PATTERNS = [
    /^(?:news update on|summary of|what happened with|breaking report on|headline covering|covering the news about|report on|discussion about|talking about|a look at|overview of|a complete guide to|everything you need to know about|what readers need to know about|all about)\s+/i,
    /\b(?:this is a generic|a generic (?:story|article|post|angle|writeup|piece)|just a (?:generic|simple) (?:story|post)|some thoughts on|some random thoughts|general thoughts|a basic overview)\b/i,
    /^(?:write|draft|generate) (?:a|an) (?:story|article|post|essay) (?:about|on)\s+/i,
    /^(?:explain|analyze|discuss|explore|examine)\s+(?:the\s+)?(?:topic|details|news|importance|basics|developments)\s+of\s+/i,
    /^(?:this\s+is\s+a\s+story\s+about|an\s+article\s+about|a\s+piece\s+about)\s+/i
  ];

  for (const pattern of GENERIC_FILLER_PATTERNS) {
    if (pattern.test(cleanAngle)) {
      return {
        distinct: false,
        decision: 'SKIP',
        reason: 'NO_DISTINCT_WRITON_ANGLE: Angle uses generic placeholder or boilerplate phrasing'
      };
    }
  }

  // 2. Check similarity between angle and headline/topic:
  const normAngle = cleanAngle.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const normHeadline = cleanHeadline.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const normTopic = cleanTopic.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  if (normHeadline && (normAngle === normHeadline || (normAngle.startsWith(normHeadline) && normAngle.length < normHeadline.length + 15))) {
    return {
      distinct: false,
      decision: 'SKIP',
      reason: 'NO_DISTINCT_WRITON_ANGLE: Angle is identical or trivial variation of headline'
    };
  }

  if (normTopic && (normAngle === normTopic || normAngle === `on ${normTopic}`)) {
    return {
      distinct: false,
      decision: 'SKIP',
      reason: 'NO_DISTINCT_WRITON_ANGLE: Angle merely repeats the raw topic title'
    };
  }

  // 3. Meaningful Editorial Idea Evaluation:
  // Must articulate a concrete question, causal inquiry, or tangible reader benefit/mechanism,
  // rather than checking for isolated buzzwords or allowing arbitrary length to pass.
  const words = cleanAngle.split(/\s+/).filter(Boolean);
  if (words.length < 5) {
    return {
      distinct: false,
      decision: 'SKIP',
      reason: 'NO_DISTINCT_WRITON_ANGLE: Angle is too short to articulate a meaningful idea'
    };
  }

  const HAS_QUESTION_OR_INQUIRY = /\b(how\b|why\b|what happens when\b|whether\b|when\b|does\b|can\b|who pays for\b|who benefits from\b|what is lost when\b|\?)/i.test(cleanAngle);
  const HAS_EXPLANATORY_OR_CAUSAL_VERB = /\b(explain\b|examine\b|explore\b|investigate\b|analyze\b|unravel\b|uncover\b|interrogate\b|contrast\b|trace\b|measure\b|diagnose\b|unpack\b|demonstrate\b|reveals?\b|illustrate\b|ground\b|observe\b|craft\b)/i.test(cleanAngle);
  const HAS_READER_BENEFIT_OR_MECHANISM = /\b(removes the pressure\b|helps readers\b|allows readers\b|challenges\b|shifts\b|shows why\b|replaces\b|solves\b|fails to\b|costs\b|leads to\b|creates\b|forces\b|enables\b|prevents\b|exposes\b|reclaims\b|consequence|trade-?offs?|benefits?|tensions?|dilemmas?|choice|distinction|difference|meaning|continuity|traditions?|craftsmanship|absurdities|absurdity|ironies|irony|rituals?|subtext|ergonomics?|bottlenecks?|mechanics?|sensory|physicality|balance sheet|accountability|perseverance|pressures?|longing|memory|craft|human dimensions|architecture|internals|latency|throughput|concurrency|guarantees?|benchmarks?|indexing|constraints?)\b/i.test(cleanAngle);

  // Must have a concrete inquiry (e.g. how, why, whether, ?) OR an explanatory verb coupled with a concrete mechanism/reader benefit
  const hasSubstantiveIdea = HAS_QUESTION_OR_INQUIRY || (HAS_EXPLANATORY_OR_CAUSAL_VERB && HAS_READER_BENEFIT_OR_MECHANISM);

  if (!hasSubstantiveIdea) {
    return {
      distinct: false,
      decision: 'SKIP',
      reason: 'NO_DISTINCT_WRITON_ANGLE: Angle lacks a concrete inquiry, causal mechanism, or reader benefit'
    };
  }

  return {
    distinct: true,
    decision: 'PROCEED',
    reason: 'Angle articulates a concrete question, inquiry, or reader benefit'
  };
}

/**
 * End-to-End Orchestrated Pipeline
 * Executes Parallel Fan-Out -> JoinNode -> Deterministic Routing -> Bounded Research Fan-Out
 */
export async function orchestrateTrendPipeline({
  pool = null,
  geoList = ['IN', 'US'],
  deepResearch = true,
  maxCandidates = 8
} = {}) {
  // Step 1: Query recent database posts for anti-repetition if pool is provided
  let antiRepetitionList = [];
  if (pool) {
    try {
      const recentPosts = await pool.query(`
        select title from public.posts
        where status = 'published'
        order by coalesce(published_at, created_at) desc
        limit 30
      `);
      antiRepetitionList = recentPosts.rows.map(r => r.title);
    } catch (err) {
      console.warn('[Trend Orchestrator] Could not load anti-repetition titles from DB:', err.message);
    }
  }

  // Step 2: Parallel Zero-LLM Fan-Out
  const rawItems = await harvestParallelTrends({ geoList });

  // Step 3: JoinNode Aggregation
  const bundle = aggregateTrendBundle(rawItems, {
    antiRepetitionList,
    maxItems: maxCandidates
  });

  // Step 4: Parallel Deep Research (Bounded Fan-Out across top candidates)
  if (deepResearch && bundle.activeCandidates.length > 0) {
    const researchPromises = bundle.activeCandidates.map(async (candidate) => {
      try {
        const [newsReports, knowledgeSummary] = await Promise.all([
          fetchGoogleNewsResearch(candidate.topic, candidate.geo),
          fetchWikipediaSummary(candidate.topic)
        ]);

        const verifiedContext = [
          `Trending Subject: "${candidate.topic}" (Category: ${candidate.category})`,
          newsReports.length ? `Latest Real-World Headlines:\n${newsReports.map(n => `- [${n.source}] "${n.headline}" (${n.pubDate})`).join('\n')}` : '',
          knowledgeSummary ? `Contextual Knowledge:\n"${knowledgeSummary.extract}"` : ''
        ].filter(Boolean).join('\n\n');

        return {
          ...candidate,
          researchDossier: {
            topic: candidate.topic,
            category: candidate.category,
            newsReports,
            knowledgeSummary,
            verifiedContext,
            researchedAt: new Date().toISOString()
          }
        };
      } catch (err) {
        console.warn(`[Trend Orchestrator] Deep research failed for "${candidate.topic}": ${err.message}`);
        return {
          ...candidate,
          researchDossier: null
        };
      }
    });

    const researched = await Promise.allSettled(researchPromises);
    const enrichedCandidates = researched.map((res, idx) => {
      return res.status === 'fulfilled' ? res.value : bundle.activeCandidates[idx];
    });

    return Object.freeze({
      ...bundle,
      activeCandidates: enrichedCandidates
    });
  }

  return bundle;
}
