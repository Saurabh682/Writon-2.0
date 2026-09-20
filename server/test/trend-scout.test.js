import { describe, it, expect } from 'vitest';
import {
  classifyTrendCategory,
  getRecommendedAuthorForTrend
} from '../src/bot-engine/trend-scout-service.js';

describe('Trend Scout Service & Classification', () => {
  it('classifies tech and AI trending topics correctly', () => {
    expect(classifyTrendCategory('OpenAI transformer latency', 'New LLM benchmark released')).toBe('Tech');
    expect(classifyTrendCategory('Nvidia GPU architecture', 'Chip shortages impact cloud')).toBe('Tech');
    expect(classifyTrendCategory('Postgres 17 kernel release', 'Database query optimization')).toBe('Tech');
  });

  it('classifies market and economics topics into Business & Finance', () => {
    expect(classifyTrendCategory('sensex share price', 'Stock market down 200 points')).toBe('Business & Finance');
    expect(classifyTrendCategory('HDFC Bank IPO', 'Banking sector shifts')).toBe('Business & Finance');
  });

  it('classifies sports and tournament topics into Sports', () => {
    expect(classifyTrendCategory('India vs Australia cricket test', 'Final day match score')).toBe('Sports');
    expect(classifyTrendCategory('Wimbledon championship finals', 'Centre court tennis tournament')).toBe('Sports');
  });

  it('classifies cinema, film, and entertainment topics into Entertainment', () => {
    expect(classifyTrendCategory('Gal Gadot new thriller trailer', 'Box office teaser released')).toBe('Entertainment');
    expect(classifyTrendCategory('Cannes film festival premiere', 'Director presents cinema masterpiece')).toBe('Entertainment');
  });

  it('classifies investigative and breaking public reports into Journalism', () => {
    expect(classifyTrendCategory('Supreme court verdict', 'High-level probe inquiry and investigation')).toBe('Journalism');
    expect(classifyTrendCategory('Whistleblower expose', 'Public audit report reveals compliance failures')).toBe('Journalism');
  });

  it('classifies reviews, comparisons, and buyer guides into Reviews', () => {
    expect(classifyTrendCategory('Pixel 9 Pro hands-on review', 'Camera test and battery specs verdict')).toBe('Reviews');
    expect(classifyTrendCategory('Sony WH-1000XM5 vs Bose QuietComfort', 'ANC headphones buying guide and benchmark')).toBe('Reviews');
  });

  it('classifies humour, memes, and corporate topics into Humour', () => {
    expect(classifyTrendCategory('Monday morning office traffic', 'Why meetings could have been emails')).toBe('Humour');
    expect(classifyTrendCategory('Cold samosa at 4 PM', 'Corporate pantry viral meme')).toBe('Humour');
  });

  it('classifies weather, rain, and nature into Poetry', () => {
    expect(classifyTrendCategory('Monsoon in Mumbai', 'Heavy rain floods Western Express Highway')).toBe('Poetry');
    expect(classifyTrendCategory('Autumn frost in Himachal', 'Morning mist settles on pine ridges')).toBe('Poetry');
  });

  it('maps recommended author personas with distinct literary angles', () => {
    const techAuthor = getRecommendedAuthorForTrend('Tech');
    expect(['aarav_tech', 'maya_lin_craft', 'tanya_mehra_dev']).toContain(techAuthor.penName);

    const financeAuthor = getRecommendedAuthorForTrend('Business & Finance');
    expect(['karan_bajwa', 'mohit_agarwal', 'sameer_wadhwa_witty']).toContain(financeAuthor.penName);

    const sportsAuthor = getRecommendedAuthorForTrend('Sports');
    expect(['sameer_deshpande', 'rohit_kulkarni']).toContain(sportsAuthor.penName);

    const entAuthor = getRecommendedAuthorForTrend('Entertainment');
    expect(['pravin_piku', 'mona_sen', 'devansh_roy']).toContain(entAuthor.penName);

    const journalismAuthor = getRecommendedAuthorForTrend('Journalism');
    expect(['riya_chakraborty', 'sunita_banerjee', 'sourabh_das']).toContain(journalismAuthor.penName);

    const reviewsAuthor = getRecommendedAuthorForTrend('Reviews');
    expect(['pravin_piku', 'jeanne_faith']).toContain(reviewsAuthor.penName);

    const humourAuthor = getRecommendedAuthorForTrend('Humour');
    expect(['rohan_kapoor', 'chirag_churan', 'gopal_krishnan_jokes']).toContain(humourAuthor.penName);

    const poetryAuthor = getRecommendedAuthorForTrend('Poetry');
    expect(['kavya_nair', 'siddharth_menon', 'ananya_deshmukh']).toContain(poetryAuthor.penName);

    const essayAuthor = getRecommendedAuthorForTrend('Essays');
    expect(['sunita_banerjee', 'priyanka_mishra']).toContain(essayAuthor.penName);
  });

  it('extracts valid URLs, sources, headlines, and timestamps via parseGoogleNewsRss', async () => {
    const { parseGoogleNewsRss } = await import('../src/bot-engine/trend-scout-service.js');
    const sampleXml = `
      <rss version="2.0">
        <channel>
          <title>Google News</title>
          <item>
            <title>PostgreSQL 17 Released with Enhanced Query Performance &amp; Scalability</title>
            <link>https://news.google.com/rss/articles/CBMiPGh0dHBzOi8vd3d3LnBvc3RncmVzcWwub3JnL2Fib3V0L25ld3MvcG9zdGdyZXNxbC0xNy1yZWxlYXNlZC8?oc=5</link>
            <guid isPermaLink="false">tag:google.com,2024:news:12345</guid>
            <pubDate>Sun, 20 Sep 2026 10:30:00 GMT</pubDate>
            <source url="https://www.postgresql.org">PostgreSQL News</source>
          </item>
          <item>
            <title>PostgreSQL 17 Benchmark: Faster Joins and Index Memory Savings</title>
            <link>https://news.google.com/rss/articles/CBMiSmh0dHBzOi8vYXJzdGVjaG5pY2EuY29tL3RlY2gtY291bmNpbC9wb3N0Z3Jlcy0xNy1kYXRhYmFzZS1xdWVyeS1lZmZpY2llbmN5Lw?oc=5</link>
            <pubDate>Sun, 20 Sep 2026 11:15:00 GMT</pubDate>
            <source url="https://arstechnica.com">Ars Technica</source>
          </item>
        </channel>
      </rss>
    `;

    const articles = parseGoogleNewsRss(sampleXml);
    expect(articles).toHaveLength(2);

    expect(articles[0].headline).toBe('PostgreSQL 17 Released with Enhanced Query Performance & Scalability');
    expect(articles[0].url).toContain('https://news.google.com/rss/articles/');
    expect(articles[0].source).toBe('PostgreSQL News');
    expect(articles[0].publishedAt).toBe('2026-09-20T10:30:00.000Z');
    expect(articles[0].pubDate).toBe('2026-09-20T10:30:00.000Z');

    expect(articles[1].headline).toBe('PostgreSQL 17 Benchmark: Faster Joins and Index Memory Savings');
    expect(articles[1].url).toContain('https://news.google.com/rss/articles/');
    expect(articles[1].source).toBe('Ars Technica');
    expect(articles[1].publishedAt).toBe('2026-09-20T11:15:00.000Z');
  });

  it('builds an RSS research dossier that is validated and corroborated by verifyResearchDossier', async () => {
    const { conductDeepTrendResearch, parseGoogleNewsRss } = await import('../src/bot-engine/trend-scout-service.js');
    const { verifyResearchDossier } = await import('../src/bot-engine/editorial-intelligence-service.js');

    const sampleXml = `
      <rss version="2.0">
        <channel>
          <item>
            <title>PostgreSQL 17 Released with Memory Improvements</title>
            <link>https://news.google.com/rss/articles/CBMiPGh0dHBzOi8vd3d3LnBvc3RncmVzcWwub3JnL2Fib3V0L25ld3MvcG9zdGdyZXNxbC0xNy1yZWxlYXNlZC8?oc=5</link>
            <pubDate>Sun, 20 Sep 2026 10:30:00 GMT</pubDate>
            <source url="https://www.postgresql.org">PostgreSQL Global</source>
          </item>
          <item>
            <title>Benchmarking Postgres 17 in Production Workloads</title>
            <link>https://news.google.com/rss/articles/CBMiSmh0dHBzOi8vYXJzdGVjaG5pY2EuY29tL3RlY2gtY291bmNpbC9wb3N0Z3Jlcy0xNy1kYXRhYmFzZS1xdWVyeS1lZmZpY2llbmN5Lw?oc=5</link>
            <pubDate>Sun, 20 Sep 2026 11:15:00 GMT</pubDate>
            <source url="https://arstechnica.com">Ars Technica</source>
          </item>
          <item>
            <title>Linux Kernel and Postgres 17 I/O Optimization Benchmarks</title>
            <link>https://news.google.com/rss/articles/CBMiRGh0dHBzOi8vd3d3LnBob3Jvbml4LmNvbS9uZXdzL1Bvc3RncmVTLTE3LUxpbnV4LVBlcmZvcm1hbmNlLVRlc3Rz?oc=5</link>
            <pubDate>Sun, 20 Sep 2026 11:45:00 GMT</pubDate>
            <source url="https://phoronix.com">Phoronix</source>
          </item>
        </channel>
      </rss>
    `;

    const mockFetchNews = async () => parseGoogleNewsRss(sampleXml);
    const mockFetchKnowledge = async () => ({
      title: 'PostgreSQL',
      description: 'Relational database management system',
      extract: 'PostgreSQL is a free and open-source relational database management system emphasizing extensibility and SQL compliance.'
    });

    const dossier = await conductDeepTrendResearch('PostgreSQL', 'Tech', 'IN', {
      fetchNews: mockFetchNews,
      fetchKnowledge: mockFetchKnowledge
    });

    expect(dossier).toBeDefined();
    expect(dossier.topic).toBe('PostgreSQL');
    expect(dossier.newsReports).toHaveLength(3);
    expect(dossier.newsReports[0].url).toMatch(/^https:\/\//);
    expect(dossier.newsReports[1].url).toMatch(/^https:\/\//);
    expect(dossier.newsReports[2].url).toMatch(/^https:\/\//);
    expect(dossier.knowledgeSummary.title).toBe('PostgreSQL');

    // Verify through the official governance gate: verifyResearchDossier
    const evaluationTime = new Date('2026-09-20T12:00:00.000Z');
    const verification = verifyResearchDossier(dossier, { now: evaluationTime });

    expect(verification.status).toBe('corroborated');
    expect(verification.corroborated).toBe(true);
    expect(verification.validSourceCount).toBe(3);
    expect(verification.recentReportCount).toBe(3);
    expect(verification.recentIndependentSourceCount).toBe(3);
    expect(verification.reasons).toEqual([]);

    // Single source dossier must yield 'single_source' and fail corroboration
    const singleSourceDossier = {
      ...dossier,
      newsReports: [dossier.newsReports[0]]
    };
    const singleVerification = verifyResearchDossier(singleSourceDossier, { now: evaluationTime });
    expect(singleVerification.status).toBe('single_source');
    expect(singleVerification.corroborated).toBe(false);
    expect(singleVerification.validSourceCount).toBe(1);
  });
});
