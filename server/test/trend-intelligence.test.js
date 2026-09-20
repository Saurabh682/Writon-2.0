import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calculatePayloadHash,
  slugify,
  evaluateSyntacticEvidence,
  classifySensitivity,
  calculateWritOnRelevance,
  computeVelocityAndStatus,
  rankPersonaCandidates,
  sparkPayloadSchema
} from '../src/services/trend-intelligence-service.js';

describe('Trend Intelligence Unit Logic', () => {
  it('computes deterministic payload hash', () => {
    const payload1 = { date: '2026-09-18', region: 'India', trends: [{ topic: 'A', score: 80 }] };
    const payload2 = { region: 'India', date: '2026-09-18', trends: [{ topic: 'A', score: 80 }] };
    expect(calculatePayloadHash(payload1)).toBe(calculatePayloadHash(payload2));
  });

  it('slugifies topics correctly for canonical keys', () => {
    expect(slugify('AI Agents for Writers!')).toBe('ai-agents-for-writers');
    expect(slugify('  Agentic AI & Authors   ')).toBe('agentic-ai-authors');
  });

  describe('Zero-SSRF Syntactic Evidence Scorer', () => {
    it('evaluates reputable domains and blocks localhost / private networks', () => {
      const sources = [
        { platform: 'Google', url: 'https://trends.google.com/explore' },
        { platform: 'The Verge', url: 'https://theverge.com/article' },
        { platform: 'Private Exploit', url: 'http://127.0.0.1:8080/bad' },
        { platform: 'Internal Exploit', url: 'https://192.168.1.1/secret' },
        { platform: 'Localhost Exploit', url: 'http://localhost/admin' }
      ];

      const res = evaluateSyntacticEvidence(sources);
      // Only 2 valid external domains should be counted
      expect(res.validSourceCount).toBe(2);
      expect(res.uniqueDomainsCount).toBe(2);
      expect(res.reputableDomainMatches).toBe(2);
      expect(res.computedEvidenceConfidence).toBeGreaterThanOrEqual(0.7);
    });

    it('returns low baseline confidence when sources array is empty', () => {
      const res = evaluateSyntacticEvidence([]);
      expect(res.computedEvidenceConfidence).toBe(0.3);
      expect(res.validSourceCount).toBe(0);
    });
  });

  describe('Sensitivity Policy Classifier', () => {
    it('classifies crime and violence correctly', () => {
      expect(classifySensitivity('Gruesome murder in downtown', '', [])).toBe('crime');
    });

    it('classifies political election cycles', () => {
      expect(classifySensitivity('Upcoming Lok Sabha elections and voting trends', '', [])).toBe('political');
    });

    it('classifies financial hype scams', () => {
      expect(classifySensitivity('New 100x gem crypto pump and airdrop', '', [])).toBe('financial');
    });

    it('classifies benign literary and tech topics as safe', () => {
      expect(classifySensitivity('Quiet writing tools in the age of distractions', 'writers seeking calm', ['essays'])).toBe('safe');
      expect(classifySensitivity('Latency reduction in SQLite distributed nodes', '', ['database'])).toBe('safe');
    });
  });

  describe('WritOn Domain Relevance Calculator', () => {
    it('assigns high score to craft, essays, tech, and cultural topics', () => {
      const score = calculateWritOnRelevance('AI agents for essay writers', 'Essays', ['human voice in the age of generative models'], ['craft', 'literature']);
      expect(score).toBeGreaterThanOrEqual(75);
    });

    it('assigns baseline/moderate score to generic unrelated topics', () => {
      const score = calculateWritOnRelevance('Top automobile tires for rainy weather', 'Automotive', ['tire grip comparisons'], ['cars']);
      expect(score).toBeLessThanOrEqual(50);
    });
  });

  describe('Time-Normalized Velocity & Status', () => {
    it('calculates velocity against previous snapshot using elapsed observation hours with 6h clamping', () => {
      const prev = {
        score: 60,
        observed_at: '2026-09-17T08:00:00Z'
      };
      // 24 hours later, score +12 -> velocityPerDay = 12
      const currObserved = '2026-09-18T08:00:00Z';
      const res = computeVelocityAndStatus(72, prev, currObserved);

      expect(res.scoreDelta).toBe(12);
      expect(res.elapsedHours).toBe(24);
      expect(res.velocityPerDay).toBe(12);
      expect(res.computedStatus).toBe('RISING');
    });

    it('intraday 2-hour jump is normalized against minimum 6-hour window to prevent fireworks', () => {
      const prev = {
        score: 60,
        observed_at: '2026-09-17T08:00:00Z'
      };
      // 2 hours later, score +12
      // With 6h clamp: velocityPerDay = (12 / 6) * 24 = 48 -> BREAKOUT
      const currObserved = '2026-09-17T10:00:00Z';
      const res = computeVelocityAndStatus(72, prev, currObserved);

      expect(res.scoreDelta).toBe(12);
      expect(res.elapsedHours).toBe(2);
      expect(res.velocityPerDay).toBe(48);
      expect(res.computedStatus).toBe('BREAKOUT');
    });

    it('handles first-time detection cleanly without previous snapshot', () => {
      const res = computeVelocityAndStatus(85, null, '2026-09-17T08:00:00Z');
      expect(res.scoreDelta).toBe(0);
      expect(res.velocityPerDay).toBe(0);
      expect(res.computedStatus).toBe('BREAKOUT');
    });
  });

  describe('Persona Candidate Ranking', () => {
    it('ranks relevant tech personas higher for software architecture trends', () => {
      const personas = rankPersonaCandidates('Distributed databases and latency optimization', 'Tech', ['boring technology']);
      expect(personas.length).toBeGreaterThan(0);
      expect(personas[0].penName).toBe('aarav_tech');
      expect(personas[0].affinity).toBeGreaterThan(70);
    });

    it('ranks poets and essayists higher for literary solitude trends', () => {
      const personas = rankPersonaCandidates('Monsoon poetry and the texture of memory', 'Poetry', ['rain in kochi']);
      expect(personas.length).toBeGreaterThan(0);
      expect(personas[0].affinity).toBeGreaterThan(65);
    });
  });

  describe('Zod Schema Validation', () => {
    it('accepts a fully compliant Spark intelligence payload', () => {
      const validPayload = {
        schemaVersion: '1.0.0',
        externalRunId: 'spark-2026-09-18',
        observedAt: '2026-09-18T08:30:00+05:30',
        date: '2026-09-18',
        region: 'India',
        source: 'gemini-trend-research',
        runType: 'daily',
        trends: [
          {
            rank: 1,
            topic: 'AI Writing Agents',
            category: 'Tech',
            score: 85,
            status: 'BREAKOUT',
            momentum: 'VERY_HIGH',
            platforms: ['Google Trends'],
            keywords: ['ai', 'writing'],
            sources: [
              {
                platform: 'Google Trends',
                url: 'https://trends.google.com/trends',
                signalType: 'OBSERVED'
              }
            ],
            urgency: 'ACT_NOW',
            confidence: 0.95
          }
        ]
      };

      const parsed = sparkPayloadSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
    });

    it('rejects payload with invalid date format or missing trends', () => {
      const invalid = {
        date: '18-09-2026',
        trends: []
      };
      const parsed = sparkPayloadSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('validates sample spark trend report fixture against Schema 1.0.0', async () => {
      const { readFile } = await import('node:fs/promises');
      const fixtureRaw = await readFile(new URL('./fixtures/sample-spark-trend-report.json', import.meta.url), 'utf8');
      const fixtureJson = JSON.parse(fixtureRaw);
      const parsed = sparkPayloadSchema.safeParse(fixtureJson);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.trends.length).toBe(3);
        expect(parsed.data.trends[0].topic).toBe('AI Agents for Fiction & Narrative Architecture');
      }
    });
  });
});
import { describe, it, expect, vi } from 'vitest';
import { ingestTrendReport } from '../src/services/trend-intelligence-service.js';

describe('Master Ingest Pipeline Integration & Edge Cases', () => {
  it('handles duplicate payload idempotently without duplicating report or processing', async () => {
    const payload = {
      externalRunId: 'spark-run-1',
      date: '2026-09-18',
      region: 'India',
      trends: [
        {
          topic: 'AI Agents for Fiction',
          category: 'Tech',
          score: 85,
          status: 'BREAKOUT',
          momentum: 'VERY_HIGH',
          urgency: 'ACT_NOW',
          confidence: 0.9
        }
      ]
    };

    const parsed = sparkPayloadSchema.parse(payload);
    const exactHash = calculatePayloadHash(parsed);

    const mockReport = {
      id: 'report-123',
      run_id: 'run-123',
      external_run_id: 'spark-run-1',
      payload_hash: exactHash,
      processing_status: 'processed',
      processing_summary: {
        ingestion: { received: 1, normalized: 1, merged: 0 },
        editorialGate: { qualified: 1, watchlisted: 0, rejected: 0 },
        backlog: { ideasCreated: 1, duplicatesPrevented: 0, cooldownBlocked: 0 }
      }
    };

    const mockPool = {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes('from public.trend_reports')) {
          return Promise.resolve({ rows: [mockReport] });
        }
        return Promise.resolve({ rows: [] });
      })
    };

    const res = await ingestTrendReport(mockPool, payload);
    expect(res.status).toBe(200);
    expect(res.isDuplicate).toBe(true);
    expect(res.reportId).toBe('report-123');
    expect(res.editorialGate.qualified).toBe(1);
  });

  it('throws 409 Conflict when existing external_run_id arrives with a different payload hash', async () => {
    const existingReport = {
      id: 'report-123',
      external_run_id: 'spark-run-conflict',
      payload_hash: 'hash-first-version',
      processing_status: 'processed'
    };

    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [existingReport] })
    };

    const payload = {
      externalRunId: 'spark-run-conflict',
      date: '2026-09-18',
      region: 'India',
      trends: [
        {
          topic: 'Different Topic Sent With Same Run ID',
          score: 50
        }
      ]
    };

    await expect(ingestTrendReport(mockPool, payload)).rejects.toThrow(/Conflict: external_run_id/);
  });

  it('returns 202 when existing report is currently in processing state', async () => {
    const payload = {
      externalRunId: 'spark-in-flight',
      date: '2026-09-18',
      region: 'India',
      trends: [{ topic: 'In flight test', score: 80 }]
    };

    const parsed = sparkPayloadSchema.parse(payload);
    const exactHash = calculatePayloadHash(parsed);

    const inFlightReport = {
      id: 'report-in-flight',
      run_id: 'run-in-flight',
      external_run_id: 'spark-in-flight',
      payload_hash: exactHash,
      processing_status: 'processing'
    };

    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [inFlightReport] })
    };

    const res = await ingestTrendReport(mockPool, payload);
    expect(res.status).toBe(202);
    expect(res.message).toMatch(/currently being processed/);
  });
});
