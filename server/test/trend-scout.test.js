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

  it('classifies market and economics topics into Essays', () => {
    expect(classifyTrendCategory('sensex share price', 'Stock market down 200 points')).toBe('Essays');
    expect(classifyTrendCategory('HDFC Bank IPO', 'Banking sector shifts')).toBe('Essays');
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

    const humourAuthor = getRecommendedAuthorForTrend('Humour');
    expect(['rohan_kapoor', 'chirag_churan', 'gopal_krishnan_jokes']).toContain(humourAuthor.penName);

    const poetryAuthor = getRecommendedAuthorForTrend('Poetry');
    expect(['kavya_nair', 'siddharth_menon', 'ananya_deshmukh']).toContain(poetryAuthor.penName);

    const essayAuthor = getRecommendedAuthorForTrend('Essays');
    expect(['sunita_banerjee', 'radhika_gowda', 'priyanka_mishra']).toContain(essayAuthor.penName);
  });

  it('conducts deep trend research and builds a verified factual dossier', async () => {
    const { conductDeepTrendResearch } = await import('../src/bot-engine/trend-scout-service.js');
    const dossier = await conductDeepTrendResearch('PostgreSQL', 'Tech', 'IN');
    
    expect(dossier).toBeDefined();
    expect(dossier.topic).toBe('PostgreSQL');
    expect(dossier.category).toBe('Tech');
    expect(dossier.researchedAt).toBeDefined();
    expect(typeof dossier.verifiedContext).toBe('string');
  });
});
