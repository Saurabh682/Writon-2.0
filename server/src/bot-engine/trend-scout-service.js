import https from 'node:https';
import { addIdeaToBacklog } from './editorial-ledger-service.js';

/**
 * Deep Trend Scout & Online Research Service for WritOn Autonomous Bot Network
 *
 * Performs multi-layered live research across Google Trends, Google News,
 * and Wikipedia Knowledge Graph to equip bot writers with verified facts,
 * real-world context, and authentic literary angles before writing.
 */

function fetchHttps(url, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        ...customHeaders
      },
      timeout: 8000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseGoogleTrendsRss(xml, geo = 'IN') {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemBlock = itemMatch[1];
    const titleMatch = /<title>(.*?)<\/title>/.exec(itemBlock);
    const trafficMatch = /<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/.exec(itemBlock);
    const newsTitleMatch = /<ht:news_item_title>(.*?)<\/ht:news_item_title>/.exec(itemBlock);
    const newsSnippetMatch = /<ht:news_item_snippet>(.*?)<\/ht:news_item_snippet>/.exec(itemBlock);
    const newsSourceMatch = /<ht:news_item_source>(.*?)<\/ht:news_item_source>/.exec(itemBlock);

    if (titleMatch) {
      const topic = titleMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
      const headline = newsTitleMatch ? newsTitleMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : null;
      items.push({
        topic,
        geo,
        approxTraffic: trafficMatch ? trafficMatch[1] : null,
        headline,
        snippet: newsSnippetMatch ? newsSnippetMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : null,
        source: newsSourceMatch ? newsSourceMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : null,
        category: classifyTrendCategory(topic, headline)
      });
    }
  }
  return items;
}

/**
 * Intelligent Category Classification for Trending Topics
 */
export function classifyTrendCategory(topic = '', headline = '') {
  const text = `${topic} ${headline}`.toLowerCase();

  if (/\b(ai|openai|anthropic|gemini|llm|model|models|transformer|latency|gpu|software|cloud|code|coding|tech|technology|chip|chips|nvidia|google|apple|meta|microsoft|crypto|database|postgres|kernel|app|startup|server|api|cyber|cybersecurity|linux)\b/i.test(text)) {
    return 'Tech';
  }
  if (/\b(market|share price|sensex|nifty|ipo|stocks|economy|inflation|bank|rupee|invest|investing|finance|gdp)\b/i.test(text)) {
    return 'Essays';
  }
  if (/\b(cricket|tennis|olympics|football|match|cup|score|winner|sport|race|tournament)\b/i.test(text)) {
    return 'Essays';
  }
  if (/\b(funny|joke|viral|meme|traffic|office|delay|flight|boss|meeting|corporate|samosa|hilarious|comedy)\b/i.test(text)) {
    return 'Humour';
  }
  if (/\b(rain|flood|floods|river|weather|monsoon|autumn|hills|season|nature|dawn|night|frost|clouds)\b/i.test(text)) {
    return 'Poetry';
  }
  if (/\b(history|heritage|book|author|festival|music|tradition|temple|museum|art|craft|dance)\b/i.test(text)) {
    return 'Culture';
  }
  return 'Short Stories';
}

/**
 * Fetch Deep Live News Reports & Outlets for a Given Topic
 */
export async function fetchGoogleNewsResearch(topic, geo = 'IN') {
  const hl = geo === 'US' ? 'en-US' : 'en-IN';
  const gl = geo === 'US' ? 'US' : 'IN';
  const ceid = geo === 'US' ? 'US:en' : 'IN:en';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

  try {
    const xml = await fetchHttps(url);
    const articles = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && articles.length < 4) {
      const itemTitle = /<title>(.*?)<\/title>/.exec(match[1])?.[1]?.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      const itemPubDate = /<pubDate>(.*?)<\/pubDate>/.exec(match[1])?.[1];
      const itemSource = /<source[^>]*>(.*?)<\/source>/.exec(match[1])?.[1]?.replace(/&amp;/g, '&');
      if (itemTitle) {
        articles.push({
          headline: itemTitle,
          source: itemSource || 'Major News Desk',
          pubDate: itemPubDate ? new Date(itemPubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'
        });
      }
    }
    return articles;
  } catch (err) {
    console.warn(`[Trend Scout] News lookup failed for "${topic}": ${err.message}`);
    return [];
  }
}

/**
 * Fetch Background Factual & Conceptual Knowledge from Wikipedia REST API
 */
export async function fetchWikipediaSummary(topic) {
  if (!topic || typeof topic !== 'string') return null;

  // Clean topic for encyclopedia lookup (strip vs, prices, score lines)
  const cleanTerm = topic
    .replace(/\b(vs|v\/s|score|highlights|live|price|share|news|update)\b/gi, '')
    .trim();

  try {
    const raw = await fetchHttps(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTerm)}`,
      { 'User-Agent': 'WritOnBotResearch/2.0 (contact@writon.cc)' }
    );
    const json = JSON.parse(raw);
    if (json.extract && json.extract.length > 30) {
      return {
        title: json.title,
        description: json.description || '',
        extract: json.extract
      };
    }
  } catch (err) {
    // Non-fatal if specific page not found
  }
  return null;
}

/**
 * Conduct Deep Trend Research to Build a Comprehensive Dossier
 */
export async function conductDeepTrendResearch(topic, category = 'Essays', geo = 'IN') {
  const [newsReports, wikiKnowledge] = await Promise.all([
    fetchGoogleNewsResearch(topic, geo),
    fetchWikipediaSummary(topic)
  ]);

  const verifiedHighlights = newsReports.map(r => `- "${r.headline}" (${r.source}, ${r.pubDate})`).join('\n');

  return {
    topic,
    category,
    newsReports,
    knowledgeSummary: wikiKnowledge,
    verifiedContext: verifiedHighlights || `Live public discussion and cultural discourse around ${topic}.`,
    researchedAt: new Date().toISOString()
  };
}

/**
 * Recommended Persona Matching for a Given Category
 */
export function getRecommendedAuthorForTrend(category, topic = '') {
  const recommendations = {
    'Tech': [
      { penName: 'aarav_tech', name: 'Aarav Mehta', angle: 'Systems architecture, concurrency, and engineering craftsmanship perspective' },
      { penName: 'maya_lin_craft', name: 'Maya Lin', angle: 'Product design, human-computer interaction, and UX philosophy' },
      { penName: 'tanya_mehra_dev', name: 'Tanya Mehra', angle: 'Fullstack developer realities, terminal tooling, and open source culture' }
    ],
    'Humour': [
      { penName: 'rohan_kapoor', name: 'Rohan Kapoor', angle: 'Corporate absurdity, whiteboard satire, and middle-management rituals' },
      { penName: 'chirag_churan', name: 'Chirag Churan', angle: 'Observational humor on urban bureaucracy and daily domestic chaos' },
      { penName: 'gopal_krishnan_jokes', name: 'Gopal Krishnan', angle: 'Witty take on tech park lifestyle, filter coffee, and commute dramas' }
    ],
    'Essays': [
      { penName: 'sunita_banerjee', name: 'Dr. Sunita Banerjee', angle: 'Sociological depth, history of ideas, and contemplative modern life' },
      { penName: 'radhika_gowda', name: 'Radhika Gowda', angle: 'Economic philosophy, urban expansion, and human behavior' },
      { penName: 'priyanka_mishra', name: 'Priyanka Mishra', angle: 'Cultural continuity, everyday rituals, and regional memory' }
    ],
    'Poetry': [
      { penName: 'kavya_nair', name: 'Kavya Nair', angle: 'Free verse on physical geography, seasonal transitions, and quiet moments' },
      { penName: 'siddharth_menon', name: 'Siddharth Menon', angle: 'High altitude stillness, nature meditations, and solitary stone' },
      { penName: 'ananya_deshmukh', name: 'Ananya Deshmukh', angle: 'Urban poetry, rain against apartment windows, and fleeting encounters' }
    ],
    'Shayari': [
      { penName: 'salim_chishti', name: 'Salim Chishti', angle: 'Classical Ghazal / Nazm on longing, memory, and the passing of time' },
      { penName: 'maryam_shehzaadi', name: 'Maryam Shehzaadi', angle: 'Atmospheric Hindustani couplets on twilight and quiet reflection' },
      { penName: 'ishaq_qureshi', name: 'Ishaq Qureshi', angle: 'Old Delhi lanes, tea glasses, and lost conversations' }
    ],
    'Culture': [
      { penName: 'kelly_miracle_art', name: 'Kelly Miracle', angle: 'Ceramic arts, tactile craftsmanship, and studio patience' },
      { penName: 'meera_varma', name: 'Meera Varma', angle: 'Classical Indian dance, temple architecture, and performance discipline' }
    ],
    'Short Stories': [
      { penName: 'devansh_roy', name: 'Devansh Roy', angle: 'Atmospheric urban mystery, old city lanes, and quiet human encounters' },
      { penName: 'arsh_zee', name: 'Arshdeep Singh', angle: 'Warm community portraits, chai stalls, and everyday kindness' }
    ]
  };

  const pool = recommendations[category] || recommendations['Short Stories'];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Fetch Live Daily Trends from Google Trends, conduct Deep Online Research, and Categorize Them
 */
export async function getLiveDailyTrends({ deepResearch = true } = {}) {
  const results = {
    timestamp: new Date().toISOString(),
    indiaTrends: [],
    globalTrends: [],
    curatedStoryAngles: []
  };

  try {
    const inXml = await fetchHttps('https://trends.google.com/trending/rss?geo=IN');
    results.indiaTrends = parseGoogleTrendsRss(inXml, 'IN').slice(0, 15);
  } catch (err) {
    console.error('[Trend Scout] India RSS failed:', err.message);
  }

  try {
    const usXml = await fetchHttps('https://trends.google.com/trending/rss?geo=US');
    results.globalTrends = parseGoogleTrendsRss(usXml, 'US').slice(0, 10);
  } catch (err) {
    console.error('[Trend Scout] US RSS failed:', err.message);
  }

  // Generate verified research dossiers and literary angles for top trends
  const combined = [...results.indiaTrends, ...results.globalTrends];
  const topTrends = combined.slice(0, 10);

  for (const item of topTrends) {
    const author = getRecommendedAuthorForTrend(item.category, item.topic);
    let researchDossier = null;

    if (deepResearch) {
      researchDossier = await conductDeepTrendResearch(item.topic, item.category, item.geo).catch(() => null);
    }

    results.curatedStoryAngles.push({
      trendingTopic: item.topic,
      traffic: item.approxTraffic,
      headline: item.headline,
      source: item.source,
      genre: item.category,
      recommendedAuthor: author.name,
      authorPenName: author.penName,
      researchDossier,
      editorialAngle: `Transform "${item.topic}" into an authentic literary ${item.category.toLowerCase()} exploring ${author.angle}. Ground the piece in real-world facts from verified news reports without dry reportage—focus on lived sensory details, emotional resonance, and timeless human perspective.`
    });
  }

  return results;
}

/**
 * Auto-Seed Daily Trends into WritOn's Editorial Backlog with Research Dossiers
 */
export async function seedDailyTrendsToBacklog(pool) {
  const trendsData = await getLiveDailyTrends({ deepResearch: true });
  const seeded = [];

  for (const item of trendsData.curatedStoryAngles.slice(0, 5)) {
    try {
      const idea = await addIdeaToBacklog(pool, {
        targetAuthorPenName: item.authorPenName,
        genre: item.genre,
        proposedTitle: `On ${item.trendingTopic.charAt(0).toUpperCase() + item.trendingTopic.slice(1)}: A Perspective`,
        premise: item.editorialAngle
      });

      if (idea) {
        seeded.push(idea);
      }
    } catch (e) {
      console.warn('[Trend Scout] Seed error:', e.message);
    }
  }

  return {
    success: true,
    totalTrendsDiscovered: trendsData.curatedStoryAngles.length,
    newIdeasSeeded: seeded.length,
    seeded
  };
}
