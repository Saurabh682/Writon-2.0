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

    activeCandidates.push({
      ...item,
      category: routing.category,
      slotId: routing.slotId,
      recommendedAuthor: routing.recommendedAuthor,
      editorialAngle: routing.editorialAngle
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

  // 1. Reviews detection (Hardware benchmarks, comparative tests, buyer guides)
  if (/\b(review|reviewed|buyer guide|buying guide|hands-on review|camera test|range test|drop test|unboxing|teardown)\b/i.test(text) ||
      (/\b(vs|comparison|benchmark|specs|verdict)\b/i.test(text) && /\b(phone|laptop|headphone|earbud|car|bike|suv|camera|keyboard|gpu|gadget|console|pixel|iphone|samsung|sony|bose)\b/i.test(text))) {
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

  // 2. Tech & Distributed Systems
  if (/\b(ai|openai|anthropic|gemini|llm|model|models|transformer|latency|gpu|software|cloud|code|coding|tech|technology|chip|chips|nvidia|google|apple|meta|microsoft|crypto|database|postgres|kernel|app|startup|server|api|cyber|cybersecurity|linux)\b/i.test(text)) {
    const techPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Tech'));
    const author = techPersonas[Math.floor(Math.random() * techPersonas.length)] || {
      penName: 'aarav_tech',
      fullName: 'Aarav Mehta'
    };
    return {
      category: 'Tech',
      slotId: 'morning_tech',
      recommendedAuthor: {
        penName: author.penName,
        fullName: author.fullName
      },
      editorialAngle: `Analyze the architectural trade-offs, operational failure modes, or systems engineering realities behind ${topic}. Prioritize mechanical sympathy over industry hype.`
    };
  }

  // 3. Humour & Workplace Satire
  if (/\b(funny|joke|viral|meme|traffic|office|delay|flight|boss|meeting|corporate|samosa|hilarious|comedy|satire|workplace|hr\b|appraisal|standup)\b/i.test(text)) {
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
      editorialAngle: `Observe the quiet absurdities, administrative rituals, and unspoken workplace ironies surrounding ${topic}. Avoid slapstick; focus on relatable social observation.`
    };
  }

  // 4. Poetry & Seasonal Meditations
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

  // 5. Shayari & Classical Urdu / Hindustani Poetry
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

  // 6. Culture, Heritage & Craft
  if (/\b(history|heritage|book|books|author|festival|music|tradition|traditions|temple|museum|art|craft|dance|ghat|folk|classical|vernacular|monument|culinary|recipe|spice)\b/i.test(text)) {
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

  // 7. Short Stories & Narrative Fiction (Default fallback)
  const fictionPersonas = LEGACY_WRITER_PERSONAS.filter(p => p.categories.includes('Short Stories'));
  const author = fictionPersonas[Math.floor(Math.random() * fictionPersonas.length)] || {
    penName: 'devansh_roy',
    fullName: 'Devansh Roy'
  };
  return {
    category: 'Short Stories',
    slotId: 'evening_fiction',
    recommendedAuthor: {
      penName: author.penName,
      fullName: author.fullName
    },
    editorialAngle: `Dramatize the human consequences, unstated relationships, and atmospheric setting around ${topic}. Put scene before summary.`
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
