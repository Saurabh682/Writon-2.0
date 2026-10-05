import https from 'node:https';
import { addIdeaToBacklog } from './editorial-ledger-service.js';
import { LEGACY_WRITER_PERSONAS } from './legacy-writer-personas.js';

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

  // 1. Hardware, Audio & Product Reviews / Guides detection
  // Resolves device review/guide intent before cultural or entertainment routing
  const isHardwareOrAudio = /\b(headphone|headphones|earbud|earbuds|iem|iems|earphone|earphones|headset|headsets|speaker|speakers|soundbar|soundbars|audio gear|audio system|turntable|turntables|dac|dacs|amp|amps|amplifier|amplifiers|microphone|microphones|mic|mics|audio interface|phone|phones|smartphone|smartphones|mobile|laptop|laptops|notebook|notebooks|macbook|desktop|pc|tablet|tablets|ipad|display|displays|monitor|monitors|tv|tvs|television|console|playstation|xbox|switch|steam deck|gpu|gpus|cpu|cpus|chip|chips|processor|processors|silicon|graphics card|camera|cameras|lens|lenses|sensor|optics|ev|evs|electric vehicle|vehicle|battery|keyboard|keyboards|mouse|gadget|gadgets|hardware|device|devices|wearable|wearables|smartwatch|bose|sony|sennheiser|apple|airpods|samsung|pixel|oneplus|asus|rog|lenovo|dell|hp|nothing|jabra|sonos|jbl|audio-technica|beyerdynamic|boat|shure|dji|canon|nikon|fujifilm|nvidia|amd|intel|qualcomm|snapdragon)\b/i.test(text);

  const isReviewOrGuide = /\b(review|reviews|reviewed|guide|guides|buyer guide|buying guide|listening guide|setup guide|user guide|sound quality|audio quality|music quality|build quality|camera test|range test|drop test|battery test|battery life|benchmark|benchmarks|specs|specifications?|teardown|unboxing|hands-on|vs|versus|comparison|comparative|verdict|impressions|tested|testing|test|tests|sound test|audio test|listening test|sound profile|acoustics)\b/i.test(text);

  if (isHardwareOrAudio && isReviewOrGuide) {
    return 'Reviews';
  }

  if (/\b(review|reviewed|buyer guide|buying guide|hands-on review|camera test|range test|drop test|unboxing|teardown)\b/i.test(text) ||
      (/\b(vs|comparison|benchmark|specs|verdict)\b/i.test(text) && isHardwareOrAudio)) {
    return 'Reviews';
  }

  // 2. Tech & Engineering (Systems, hardware, software, semiconductors, AI frontier)
  if (isHardwareOrAudio || /\b(ai|openai|anthropic|gemini|llm|model|models|transformer|latency|gpu|software|cloud|code|coding|tech|technology|chip|chips|nvidia|google|apple|meta|microsoft|crypto|database|postgres|kernel|app|startup|server|api|cyber|cybersecurity|linux|hardware|semiconductor|processor)\b/i.test(text)) {
    return 'Tech';
  }

  // 3. Sports / Athletics / Tournaments (e.g. India vs Australia cricket test match)
  if (/\b(cricket|tennis|olympics|football|soccer|match|cup|winner|sport|sports|tournament|ipl|bcci|fifa|wimbledon|wicket|badminton|hockey|wrestling|akhada|athletics|f1|formula 1|grand prix)\b/i.test(text)) {
    return 'Sports';
  }

  // 4. Journalism / Investigative / Field Reports / Breaking Public Affairs
  if (/\b(investigation|expose|scam|court verdict|supreme court|high court|parliament|bill passed|election commission|probe|inquiry|whistleblower|custody|bail|police raid|arrested|cbi|ed raid|policy reform|public report)\b/i.test(text)) {
    return 'Journalism';
  }

  // 5. Business & Finance / Economy / Stocks
  if (/\b(market|markets|share price|shares|sensex|nifty|ipo|stocks|stock|economy|economic|inflation|bank|banking|rupee|invest|investing|investor|finance|financial|gdp|fiscal|rbi|sebi|earnings|revenue|quarterly profit|mutual fund|gold price|silver price|crude oil|trade deficit)\b/i.test(text)) {
    return 'Business & Finance';
  }

  // 6. Entertainment / Pop Culture / Cinema / TV (Only if not a hardware review)
  if (!isHardwareOrAudio && /\b(movie|movies|film|films|trailer|teaser|box office|actor|actress|director|cinema|bollywood|hollywood|kollywood|tollywood|ott|netflix|prime video|hotstar|album|song|soundtrack|concert|grammy|oscar|emmy|cannes|celebrity|series|season \d|episode)\b/i.test(text)) {
    return 'Entertainment';
  }

  // 7. Humour / Satire / Daily Ironies
  if (/\b(funny|joke|viral|meme|traffic|office|delay|flight|boss|meeting|corporate|samosa|hilarious|comedy|satire)\b/i.test(text)) {
    return 'Humour';
  }

  // 8. Weather / Nature / Poetry
  if (/\b(rain|flood|floods|river|weather|monsoon|autumn|hills|season|nature|dawn|night|frost|clouds|monsoon)\b/i.test(text)) {
    return 'Poetry';
  }

  // 9. Hardware & Gadgets safety guard: if gadget words exist, never fall into Culture/Fiction
  if (isHardwareOrAudio) {
    return 'Tech';
  }

  // 10. Culture / Heritage / Art / Traditions (Strictly non-hardware, non-audio)
  if (!isHardwareOrAudio && /\b(history|heritage|book|books|author|festival|music|tradition|traditions|temple|museum|art|craft|dance|ghat|folk|classical|vernacular|monument|culinary|recipe|spice)\b/i.test(text)) {
    return 'Culture';
  }
  return 'Short Stories';
}

/**
 * Parse Google News RSS XML into structured news report objects
 */
export function parseGoogleNewsRss(xml) {
  if (!xml || typeof xml !== 'string') return [];
  const articles = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && articles.length < 4) {
    const itemBlock = match[1];
    const itemTitle = /<title>(.*?)<\/title>/i.exec(itemBlock)?.[1]?.replace(/&amp;/g, '&').replace(/&quot;/g, '"')?.trim();
    const rawLink = /<link>(.*?)<\/link>/i.exec(itemBlock)?.[1]
      || /<source\s+url="([^"]+)"/i.exec(itemBlock)?.[1]
      || '';
    const itemLink = rawLink.replace(/&amp;/g, '&').trim();
    const itemPubDate = /<pubDate>(.*?)<\/pubDate>/i.exec(itemBlock)?.[1]?.trim();
    const itemSource = /<source[^>]*>(.*?)<\/source>/i.exec(itemBlock)?.[1]?.replace(/&amp;/g, '&')?.trim();

    if (itemTitle) {
      const parsedTime = itemPubDate ? Date.parse(itemPubDate) : NaN;
      const isoDate = Number.isFinite(parsedTime) ? new Date(parsedTime).toISOString() : new Date().toISOString();
      articles.push({
        headline: itemTitle,
        url: itemLink || '',
        source: itemSource || 'Major News Desk',
        publishedAt: isoDate,
        pubDate: isoDate
      });
    }
  }
  return articles;
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
    return parseGoogleNewsRss(xml);
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
    return null;
  } catch (err) {
    console.warn(`[Trend Scout] Wiki lookup failed for "${topic}": ${err.message}`);
    return null;
  }
}

/**
 * Conduct Deep Live Trend Research combining Google News, Wiki, and Algorithmic Analysis
 */
export async function conductDeepTrendResearch(topic, category, geo = 'IN', {
  fetchNews = fetchGoogleNewsResearch,
  fetchKnowledge = fetchWikipediaSummary
} = {}) {
  const [newsReports, knowledgeSummary] = await Promise.all([
    fetchNews(topic, geo),
    fetchKnowledge(topic)
  ]);

  const verifiedContext = [
    `Trending Subject: "${topic}" (Category: ${category})`,
    newsReports.length ? `Latest Real-World Headlines:\n${newsReports.map(n => `- [${n.source}] "${n.headline}" (${n.pubDate})`).join('\n')}` : '',
    knowledgeSummary ? `Contextual Knowledge:\n"${knowledgeSummary.extract}"` : ''
  ].filter(Boolean).join('\n\n');

  return {
    topic,
    category,
    newsReports,
    knowledgeSummary,
    verifiedContext,
    researchedAt: new Date().toISOString()
  };
}

/**
 * Map Trending Categories & Topics to Curated Writer Personas with Specific Angles
 */
export function getRecommendedAuthorForTrend(category, topic = '') {
  const recommendations = {
    'Tech': [
      { penName: 'aarav_tech', name: 'Aarav Mehta', angle: 'Systems architecture, concurrency, boring technology, and engineering trade-offs' },
      { penName: 'karthik_subramanian', name: 'Karthik Subramanian', angle: 'Database internals, write-ahead logs, distributed consensus, and indexing physics' },
      { penName: 'riya_sharma_systems', name: 'Riya Sharma', angle: 'Linux kernel, eBPF, network buffers, zero-copy architecture, and memory boundaries' },
      { penName: 'anand_verma_dev', name: 'Anand Verma', angle: 'Developer tooling, compiler diagnostics, build latency, and terminal ergonomics' },
      { penName: 'maya_lin_craft', name: 'Maya Lin', angle: 'Product design systems, human-computer interaction, interface latency, and tactile UI' },
      { penName: 'aiden_cross', name: 'Aiden Cross', angle: 'Cybernetics, software longevity, philosophical implications of automation, and technical ethics' },
      { penName: 'vikas_singhal', name: 'Vikas Singhal', angle: 'Hardware retro-engineering, Delhi/Noida electronics hubs, component salvage, and computing history' }
    ],
    'Business & Finance': [
      { penName: 'karan_bajwa', name: 'Karan Bajwa', angle: 'Cross-generational family businesses, industrial realities, and enterprise dynamics' },
      { penName: 'mohit_agarwal', name: 'Mohit Agarwal', angle: 'Market deal-making, merchant psychology, and commercial street realities' },
      { penName: 'sameer_wadhwa_witty', name: 'Sameer Wadhwa', angle: 'Corporate economies, commercial consumer culture, and executive rituals' },
      { penName: 'rajesh_rana', name: 'Rajesh Rana', angle: 'Small enterprise balance sheets, working capital pressures, and supply chain friction' }
    ],
    'Sports': [
      { penName: 'sameer_deshpande', name: 'Sameer Deshpande', angle: 'Weekend cricket dreams, stadium atmosphere, and sporting aspirations' },
      { penName: 'rohit_kulkarni', name: 'Rohit Kulkarni', angle: 'Physical discipline, traditional akhada wrestling, and athletic perseverance' }
    ],
    'Entertainment': [
      { penName: 'pravin_piku', name: 'Pravin Kumar (Piku)', angle: 'Cinema craft, dramatic pacing, performance subtext, and screen culture' },
      { penName: 'mona_sen', name: 'Mona Sen', angle: 'Theatrical performance, narrative staging, and artistic heritage' },
      { penName: 'devansh_roy', name: 'Devansh Roy', angle: 'Nocturnal storytelling, cinematic narrative framing, and character observation' }
    ],
    'Journalism': [
      { penName: 'riya_chakraborty', name: 'Dr. Riya Chakraborty', angle: 'Grounded human reporting, institutional realities, and frontline public interest' },
      { penName: 'sunita_banerjee', name: 'Dr. Sunita Banerjee', angle: 'In-depth investigative perspective, institutional history, and critical analysis' },
      { penName: 'sourabh_das', name: 'Sourabh Das', angle: 'Field reporting from regional hubs, labor realities, and ground-level documentation' },
      { penName: 'swati_tripathi', name: 'Swati Tripathi', angle: 'Civic records, grassroots welfare documentation, and community witness' }
    ],
    'Reviews': [
      { penName: 'pravin_piku', name: 'Pravin Kumar (Piku)', angle: 'Deep-dive critique, technical and aesthetic trade-offs, and critical appraisal' },
      { penName: 'jeanne_faith', name: 'Jeanne Faith', angle: 'Carefully measured comparative review, everyday ergonomics, and buyer value' }
    ],
    'Humour': [
      { penName: 'rohan_kapoor', name: 'Rohan Kapoor', angle: 'Corporate absurdity, whiteboard satire, and middle-management rituals' },
      { penName: 'chirag_churan', name: 'Chirag Churan', angle: 'Observational humor on urban bureaucracy and daily domestic chaos' },
      { penName: 'gopal_krishnan_jokes', name: 'Gopal Krishnan', angle: 'Apartment society micro-bureaucracy, WhatsApp admin decrees, AGM voting coups, and parking treaties' },
      { penName: 'kavita_chawla_fun', name: 'Kavita Chawla', angle: 'Extended family dynamics, kitty party diplomacy, and neighborhood etiquette' },
      { penName: 'amal_sri_batman', name: 'Amal Srivastav', angle: 'Relatable young adult misadventures, roommate economics, and comic relief' }
    ],
    'Essays': [
      { penName: 'sunita_banerjee', name: 'Dr. Sunita Banerjee', angle: 'Sociological depth, history of ideas, and contemplative modern life' },
      { penName: 'priyanka_mishra', name: 'Priyanka Mishra', angle: 'Informal markets, price discovery rituals, and economic psychology entering domestic life' },
      { penName: 'gurpreet_sandhu', name: 'Gurpreet Sandhu', angle: 'Slow living, agrarian rhythms, and ethical human community' },
      { penName: 'meera_varma', name: 'Meera Varma', angle: 'Cultural criticism, film performance, audience rituals, and modes of reception' },
      { penName: 'devashish_s_somani', name: 'Devashish Somani', angle: 'Classical philosophical reflections, intellectual lineage, and modern dilemmas' },
      { penName: 'arjun_mehra_stoic', name: 'Arjun Mehra', angle: 'Stoic philosophy, emotional self-mastery, and mental resilience' }
    ],
    'Philosophy': [
      { penName: 'sunita_banerjee', name: 'Dr. Sunita Banerjee', angle: 'Sociological epistemology and institutional philosophies' },
      { penName: 'aiden_cross', name: 'Aiden Cross', angle: 'Existential technology, cybernetic thought, and human purpose' },
      { penName: 'arjun_mehra_stoic', name: 'Arjun Mehra', angle: 'Stoic discipline and fortitude in modern noise' },
      { penName: 'devashish_s_somani', name: 'Devashish Somani', angle: 'Eastern philosophical traditions and contemplative inquiry' }
    ],
    'Poetry': [
      { penName: 'kavya_nair', name: 'Kavya Nair', angle: 'Free verse on physical geography, seasonal transitions, and quiet moments' },
      { penName: 'siddharth_menon', name: 'Siddharth Menon', angle: 'High altitude stillness, nature meditations, and solitary stone' },
      { penName: 'ananya_deshmukh', name: 'Ananya Deshmukh', angle: 'Urban poetry, rain against apartment windows, and fleeting encounters' },
      { penName: 'shreya_ghosh_rhyme', name: 'Shreya Ghosh', angle: 'Lyrical Kolkata vignettes, tramways, and monsoon introspection' },
      { penName: 'kavitha_nair_lines', name: 'Kavitha S. Nair', angle: 'Backwaters, twilight reflections, and minimalist coastal imagery' }
    ],
    'Shayari': [
      { penName: 'salim_chishti', name: 'Salim Chishti', angle: 'Classical Ghazal / Nazm on longing, memory, and the passing of time' },
      { penName: 'maryam_shehzaadi', name: 'Maryam Shehzaadi', angle: 'Atmospheric Hindustani couplets on twilight and quiet reflection' },
      { penName: 'ishaq_qureshi', name: 'Ishaq Qureshi', angle: 'Old Delhi lanes, tea glasses, and lost conversations' },
      { penName: 'tariq_anwar_poet', name: 'Tariq Anwar', angle: 'Introspective Urdu couplets on melancholy, patience, and evening prayer' },
      { penName: 'zafar_iqbal_sher', name: 'Zafar Iqbal', angle: 'Classical meters, courtyard memories, and heritage couplets' }
    ],
    'Culture': [
      { penName: 'kelly_miracle_art', name: 'Kelly Miracle', angle: 'Ceramic arts, tactile craftsmanship, and studio patience' },
      { penName: 'meera_varma', name: 'Meera Varma', angle: 'Cultural criticism, film performance, audience rituals, and modes of reception' },
      { penName: 'radhika_gowda', name: 'Radhika Gowda', angle: 'South Indian temple architecture, bronze sculpture, and living traditions' },
      { penName: 'tanya_sen', name: 'Tanya Sen', angle: 'Bengal renaissance literature, culinary traditions, and heritage neighborhoods' }
    ],
    'Short Stories': [
      { penName: 'devansh_roy', name: 'Devansh Roy', angle: 'Atmospheric urban mystery, media provenance, and archival human encounters' },
      { penName: 'gurpreet_sandhu', name: 'Gurpreet Sandhu', angle: 'Warm community portraits, chai stalls, and everyday kindness' },
      { penName: 'atharv_bhav', name: 'Atharv Bhavsar', angle: 'Subtle moral dilemmas, small-town aspirations, and train journeys' },
      { penName: 'ananya_bose', name: 'Ananya Bose', angle: 'Generational domestic secrets, quiet family dynamics, and terrace conversations' },
      { penName: 'sunny_gedam', name: 'Sunny Gedam', angle: 'Central Indian folklore, tribal landscapes, and oral storytelling traditions' }
    ]
  };

  // Cooldown filter: exclude recently published authors from trend assignment
  const TEMPORARY_COOLDOWN_PEN_NAMES = new Set(['aarav_tech', 'devansh_roy', 'sunita_banerjee', 'gurpreet_sandhu']);

  let pool = recommendations[category];
  if (!pool || pool.length === 0) {
    // Dynamically fallback to matching personas from LEGACY_WRITER_PERSONAS
    const matched = LEGACY_WRITER_PERSONAS.filter(p => p.categories && p.categories.includes(category) && !TEMPORARY_COOLDOWN_PEN_NAMES.has(p.penName));
    if (matched.length > 0) {
      pool = matched.map(m => ({ penName: m.penName, name: m.fullName, angle: `${category} perspective` }));
    } else {
      pool = recommendations['Essays'];
    }
  }

  // Filter out any cooling down personas from the pool
  const filteredPool = pool.filter(p => !TEMPORARY_COOLDOWN_PEN_NAMES.has(p.penName));
  const finalPool = filteredPool.length > 0 ? filteredPool : pool;

  return finalPool[Math.floor(Math.random() * finalPool.length)];
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

  // Parallel Zero-LLM Fan-Out for RSS feeds
  const [inResult, usResult] = await Promise.allSettled([
    fetchHttps('https://trends.google.com/trending/rss?geo=IN').then(xml => parseGoogleTrendsRss(xml, 'IN').slice(0, 15)),
    fetchHttps('https://trends.google.com/trending/rss?geo=US').then(xml => parseGoogleTrendsRss(xml, 'US').slice(0, 10))
  ]);

  if (inResult.status === 'fulfilled') results.indiaTrends = inResult.value;
  else console.warn('[Trend Scout] India RSS failed:', inResult.reason?.message);

  if (usResult.status === 'fulfilled') results.globalTrends = usResult.value;
  else console.warn('[Trend Scout] US RSS failed:', usResult.reason?.message);

  // Generate verified research dossiers and literary angles for top trends in parallel
  const combined = [...results.indiaTrends, ...results.globalTrends];
  const topTrends = combined.slice(0, 10);

  const anglePromises = topTrends.map(async (item) => {
    const author = getRecommendedAuthorForTrend(item.category, item.topic);
    let researchDossier = null;

    if (deepResearch) {
      researchDossier = await conductDeepTrendResearch(item.topic, item.category, item.geo).catch(() => null);
    }

    return {
      trendingTopic: item.topic,
      traffic: item.approxTraffic,
      headline: item.headline,
      source: item.source,
      category: item.category,
      genre: item.category,
      authorName: author.name,
      recommendedAuthor: author.name,
      authorPenName: author.penName,
      researchDossier,
      editorialAngle: `Transform "${item.topic}" into an authentic literary ${item.category.toLowerCase()} exploring ${author.angle}. Ground the piece in real-world facts from verified news reports without dry reportage—focus on lived sensory details, emotional resonance, and timeless human perspective.`
    };
  });

  const anglesSettled = await Promise.allSettled(anglePromises);
  results.curatedStoryAngles = anglesSettled
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

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
