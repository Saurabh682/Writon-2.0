import { describe, it, expect } from 'vitest';
import {
  parseGoogleTrendsRss,
  aggregateTrendBundle,
  routeTopicToEditorialSlot,
  harvestParallelTrends
} from '../src/bot-engine/trend-orchestrator.js';

describe('ADK 2 Pillar 1: Trend Orchestrator', () => {
  const sampleRssXml = `
    <rss version="2.0" xmlns:ht="https://trends.google.com/trending/rss">
      <channel>
        <title>Daily Search Trends</title>
        <item>
          <title>PostgreSQL 17 Benchmark</title>
          <ht:approx_traffic>100K+</ht:approx_traffic>
          <ht:news_item_title>PostgreSQL 17 Performance Gains on High-Core Servers</ht:news_item_title>
          <ht:news_item_snippet>Engineers measure transaction throughput and memory efficiency.</ht:news_item_snippet>
          <ht:news_item_source>Tech Desk</ht:news_item_source>
        </item>
        <item>
          <title>Pixel 9 Pro vs iPhone 16 Pro Review</title>
          <ht:approx_traffic>50K+</ht:approx_traffic>
          <ht:news_item_title>Flagship Camera Comparison and Thermal Test</ht:news_item_title>
          <ht:news_item_snippet>Hands-on battery curve and telephoto test.</ht:news_item_snippet>
          <ht:news_item_source>Mobility Lab</ht:news_item_source>
        </item>
        <item>
          <title>Parliament Election Controversy</title>
          <ht:approx_traffic>200K+</ht:approx_traffic>
          <ht:news_item_title>Political debate heats up in parliament session</ht:news_item_title>
          <ht:news_item_source>National Daily</ht:news_item_source>
        </item>
      </channel>
    </rss>
  `;

  it('parses Google Trends RSS into typed items correctly', () => {
    const items = parseGoogleTrendsRss(sampleRssXml, 'IN');
    expect(items).toHaveLength(3);
    expect(items[0].topic).toBe('PostgreSQL 17 Benchmark');
    expect(items[0].approxTraffic).toBe('100K+');
    expect(items[0].geo).toBe('IN');
    expect(items[1].headline).toBe('Flagship Camera Comparison and Thermal Test');
  });

  it('filters sensitive topics and deduplicates in JoinNode aggregator', () => {
    const items = parseGoogleTrendsRss(sampleRssXml, 'IN');
    // Duplicate the first item to test deduplication
    items.push({ ...items[0] });

    const bundle = aggregateTrendBundle(items, {
      antiRepetitionList: []
    });

    // Sensitive political topic should be excluded, duplicate should be pruned
    expect(bundle.activeCandidates).toHaveLength(2);
    expect(bundle.activeCandidates.some(c => c.topic.includes('Election'))).toBe(false);
    expect(bundle.activeCandidates[0].topic).toBe('PostgreSQL 17 Benchmark');
    expect(bundle.activeCandidates[1].topic).toBe('Pixel 9 Pro vs iPhone 16 Pro Review');
  });

  it('enforces anti-repetition rules against recent published titles', () => {
    const items = parseGoogleTrendsRss(sampleRssXml, 'IN');
    const bundle = aggregateTrendBundle(items, {
      antiRepetitionList: ['postgresql 17 benchmark']
    });

    // PostgreSQL item should be excluded by anti-repetition check
    expect(bundle.activeCandidates).toHaveLength(1);
    expect(bundle.activeCandidates[0].topic).toBe('Pixel 9 Pro vs iPhone 16 Pro Review');
  });

  describe('Deterministic Pure-Code Router ($0 LLM Token Cost)', () => {
    it('routes reviews and hardware benchmarks to Reviews category and morning_tech slot', () => {
      const routing = routeTopicToEditorialSlot('Sony WH-1000XM5 vs Bose QC Ultra Review', 'ANC comparison and benchmark');
      expect(routing.category).toBe('Reviews');
      expect(routing.slotId).toBe('morning_tech');
      expect(routing.recommendedAuthor).toBeDefined();
      expect(routing.editorialAngle).toContain('Avoid promotional hype');
    });

    it('routes distributed systems and AI topics to Tech category', () => {
      const routing = routeTopicToEditorialSlot('NVIDIA Blackwell GPU latency', 'Transformer inference throughput');
      expect(routing.category).toBe('Tech');
      expect(routing.slotId).toBe('morning_tech');
      expect(routing.recommendedAuthor.penName).toBeDefined();
      expect(routing.editorialAngle).toContain('mechanical sympathy');
    });

    it('routes corporate and office satire to Humour category and lunch_satire slot', () => {
      const routing = routeTopicToEditorialSlot('Annual appraisal meeting delay', 'Hilarious corporate email viral meme');
      expect(routing.category).toBe('Humour');
      expect(routing.slotId).toBe('lunch_satire');
      expect(routing.recommendedAuthor.penName).toBeDefined();
    });

    it('routes rain and monsoon nature topics to Poetry and dawn_digest slot', () => {
      const routing = routeTopicToEditorialSlot('Western Ghats monsoon rainfall', 'River levels rise after continuous rain');
      expect(routing.category).toBe('Poetry');
      expect(routing.slotId).toBe('dawn_digest');
      expect(routing.recommendedAuthor.fullName).toBeDefined();
    });

    it('routes ghazal and Urdu poetry to Shayari and midnight_poetry slot', () => {
      const routing = routeTopicToEditorialSlot('Classical ghazal mehfil in Old Delhi', 'Recitation of classical nazm');
      expect(routing.category).toBe('Shayari');
      expect(routing.slotId).toBe('midnight_poetry');
      expect(routing.recommendedAuthor.fullName).toBeDefined();
    });

    it('routes craft and heritage topics to Culture and evening_fiction slot', () => {
      const routing = routeTopicToEditorialSlot('Blue pottery tradition in Jaipur', 'Ceramic artisans preserve ancestral craft');
      expect(routing.category).toBe('Culture');
      expect(routing.slotId).toBe('evening_fiction');
      expect(routing.recommendedAuthor.fullName).toBeDefined();
    });

    it('routes investigative and civic reporting to Journalism category', () => {
      const routing = routeTopicToEditorialSlot('Municipal water audit in Bengaluru', 'Public report reveals groundwater contamination');
      expect(routing.category).toBe('Journalism');
      expect(routing.slotId).toBe('morning_tech');
      expect(routing.recommendedAuthor.penName).toBeDefined();
      expect(routing.editorialAngle).toContain('public records');
    });

    it('routes macroeconomic and commodity trends to Business & Finance category', () => {
      const routing = routeTopicToEditorialSlot('RBI repo rate decision', 'Inflation targets and wholesale commodity prices');
      expect(routing.category).toBe('Business & Finance');
      expect(routing.slotId).toBe('lunch_satire');
      expect(routing.recommendedAuthor.penName).toBe('karan_bajwa');
    });

    it('routes athletic tournaments and cricket matches to Sports category', () => {
      const routing = routeTopicToEditorialSlot('India vs Australia Test Match', 'Day 3 wicket breakdown and bowling spell');
      expect(routing.category).toBe('Sports');
      expect(routing.slotId).toBe('evening_fiction');
      expect(routing.recommendedAuthor.penName).toBe('sameer_deshpande');
    });

    it('routes cinema, trailers, and screenwriting to Entertainment category', () => {
      const routing = routeTopicToEditorialSlot('Cannes Palme d\'Or winning cinema', 'Director discusses cinematic pacing and sound design');
      expect(routing.category).toBe('Entertainment');
      expect(routing.slotId).toBe('prime_screens');
      expect(routing.recommendedAuthor.penName).toBe('pravin_piku');
    });

    it('filters out banned cynical VC and startup tropes in aggregator', () => {
      const items = [
        { topic: 'Autonomous Healing and Other Lies We Tell Our VCs', headline: 'Indiranagar pitch deck satire', approxTraffic: '10K', geo: 'IN' },
        { topic: 'Unicorn startup seed round funding', headline: 'VCs invest in generative pitch deck', approxTraffic: '20K', geo: 'IN' },
        { topic: 'Handloom weaving revival in Varanasi', headline: 'Master weavers preserve silk traditions', approxTraffic: '30K', geo: 'IN' }
      ];
      const bundle = aggregateTrendBundle(items);
      expect(bundle.activeCandidates).toHaveLength(1);
      expect(bundle.activeCandidates[0].topic).toBe('Handloom weaving revival in Varanasi');
      expect(bundle.activeCandidates[0].category).toBe('Culture');
    });
  });
});

