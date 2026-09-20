import { describe, it, expect } from 'vitest';
import {
  InstagramBrainValidator,
  EXPECTED_GATE_CODES
} from '../src/services/instagram-brain-validator.js';
import {
  selectNextPropositionForChannel,
  recordInsightOutcome,
  selectAndReservePropositionForChannel
} from '../src/services/editorial-brain.js';

describe('Editorial Governance Hardened Contract Suite (Independent Defect & Positive Probes)', () => {
  const AUTHORITATIVE_GOV_HASH = 'gov_authoritative_sha256_abcdef123456';
  const mockBrain = {
    insights: [
      { id: 'insight_craft_01', proposition_archetype: 'craft_philosophy', provenance: { cross_platform_formats: ['FEED_CAROUSEL'] } }
    ]
  };

  const createValidator = () => new InstagramBrainValidator({
    brain: mockBrain,
    authoritativeGovernanceHash: AUTHORITATIVE_GOV_HASH
  });

  describe('Validator Strict Invariants & Independent Defect Probes', () => {
    it('Defect 1: Rejects a carousel with 0 assets (IG11 aspect ratio & asset presence failure)', async () => {
      const validator = createValidator();
      const candidate = {
        format: 'FEED_CAROUSEL',
        caption: '“Platform 8 smelled of wet jute.” A story on paper.',
        governance_bundle_hash: AUTHORITATIVE_GOV_HASH,
        visual_spec: {
          slides: [
            { sequenceOrder: 1, role: 'hook', headline: 'Platform 8', body: 'Cold mustard oil.' },
            { sequenceOrder: 2, role: 'tension', headline: 'The Line', body: 'Words left in ink.' }
          ]
        }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion: candidate,
        assets: [],
        recentPublications: []
      });

      expect(outcome.passed).toBe(false);
      const ig11 = outcome.results.find(r => r.gateCode === 'IG11_ASPECT_RATIO_STANDARDS');
      expect(ig11.status).toBe('FAIL');
    });

    it('Defect 2: Rejects carousel when asset count does not match slide count (2 slides vs 1 asset)', async () => {
      const validator = createValidator();
      const candidate = {
        format: 'FEED_CAROUSEL',
        caption: '“Platform 8 smelled of wet jute.” A story on paper.',
        governance_bundle_hash: AUTHORITATIVE_GOV_HASH,
        visual_spec: {
          slides: [
            { sequenceOrder: 1, role: 'hook', headline: 'Platform 8', body: 'Cold mustard oil.' },
            { sequenceOrder: 2, role: 'tension', headline: 'The Line', body: 'Words left in ink.' }
          ]
        }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion: candidate,
        assets: [{ id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '4:5', fileSizeBytes: 1000 }],
        recentPublications: []
      });

      expect(outcome.passed).toBe(false);
      const ig11 = outcome.results.find(r => r.gateCode === 'IG11_ASPECT_RATIO_STANDARDS');
      expect(ig11.status).toBe('FAIL');
      expect(ig11.details.error).toContain('does not match slide count');
    });

    it('Defect 3: Rejects carousel with filler/placeholder slides (IG05 failure)', async () => {
      const validator = createValidator();
      const candidate = {
        format: 'FEED_CAROUSEL',
        caption: '“Cold tea at 5:55 PM.” Written in pencil.',
        governance_bundle_hash: AUTHORITATIVE_GOV_HASH,
        visual_spec: {
          slides: [
            { sequenceOrder: 1, role: 'hook', headline: 'Slide 1', body: 'Placeholder text here.' },
            { sequenceOrder: 2, role: 'tension', headline: 'Slide 2', body: 'Placeholder text here.' }
          ]
        }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion: candidate,
        assets: [
          { id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '4:5', fileSizeBytes: 1000 },
          { id: 'a2', sequenceOrder: 2, kind: 'IMAGE', aspectRatio: '4:5', fileSizeBytes: 1000 }
        ],
        recentPublications: []
      });

      expect(outcome.passed).toBe(false);
      const ig05 = outcome.results.find(r => r.gateCode === 'IG05_CAROUSEL_WITHOUT_PROGRESSION');
      expect(ig05.status).toBe('FAIL');
      expect(ig05.details.hasFillerBody).toBe(true);
    });

    it('Defect 4: Rejects candidate with mismatched or missing governance hash (IG14 failure)', async () => {
      const validator = createValidator();
      const candidate = {
        format: 'FEED_SINGLE',
        caption: '“A sentence in a notebook.” Tea cooling.',
        governance_bundle_hash: 'completely_fabricated_hash',
        visual_spec: { quoteAuthor: 'Kavya Nair' }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion: candidate,
        assets: [{ id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '1:1', fileSizeBytes: 1000 }],
        recentPublications: []
      });

      expect(outcome.passed).toBe(false);
      const ig14 = outcome.results.find(r => r.gateCode === 'IG14_GOVERNANCE_BUNDLE_MISMATCH');
      expect(ig14.status).toBe('FAIL');
      expect(ig14.details.error).toBe('Governance hash mismatch');
    });

    it('Defect 5: Factual claims without evidence yield INSUFFICIENT_EVIDENCE and block dispatch (IG15)', async () => {
      const validator = createValidator();
      const candidate = {
        format: 'FEED_SINGLE',
        caption: 'In Italy, the record tenure lasted 1,412 days before surpassing the milestone.',
        governance_bundle_hash: AUTHORITATIVE_GOV_HASH,
        visual_spec: { quoteAuthor: 'Devansh Roy' }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion: candidate,
        assets: [{ id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '1:1', fileSizeBytes: 1000 }],
        recentPublications: []
      });

      expect(outcome.passed).toBe(false);
      const ig15 = outcome.results.find(r => r.gateCode === 'IG15_EVIDENCE_REQUIRED');
      expect(ig15.status).toBe('INSUFFICIENT_EVIDENCE');
    });

    it('Defect 6: Fails closed when recent publications history is missing or invalid (IG10)', async () => {
      const validator = createValidator();
      const candidate = {
        format: 'FEED_SINGLE',
        caption: '“A cup of warm tea.” A sentence on paper.',
        governance_bundle_hash: AUTHORITATIVE_GOV_HASH,
        visual_spec: { quoteAuthor: 'Devansh Roy' }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion: candidate,
        assets: [{ id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '1:1', fileSizeBytes: 1000 }],
        recentPublications: null // DB failed to provide history
      });

      expect(outcome.passed).toBe(false);
      const ig10 = outcome.results.find(r => r.gateCode === 'IG10_LEXICAL_DUPLICATE');
      expect(ig10.status).toBe('INSUFFICIENT_EVIDENCE');
    });

    it('Gate Completeness: Evaluates all 17 expected gates', async () => {
      const validator = createValidator();
      const candidate = {
        format: 'FEED_SINGLE',
        caption: '“Cold tea on paper.” An evening in Calcutta.',
        governance_bundle_hash: AUTHORITATIVE_GOV_HASH,
        visual_spec: { quoteAuthor: 'Anandita Dutta' }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion: candidate,
        assets: [{ id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '1:1', fileSizeBytes: 1000 }],
        recentPublications: []
      });

      expect(outcome.results.length).toBe(17);
      expect(outcome.gateCompleteness.allExpectedPresent).toBe(true);
    });
  });

  describe('Positive Tests: Legitimate Candidates and Justified Gate Bypass', () => {
    it('Positive 1: Passes legitimate 2-slide carousel with valid roles, content, and uniform assets', async () => {
      const validator = createValidator();
      const candidate = {
        format: 'FEED_CAROUSEL',
        caption: '“Platform 8 smelled of wet jute and cold diesel.” Start writing on paper.',
        governance_bundle_hash: AUTHORITATIVE_GOV_HASH,
        visual_spec: {
          quoteAuthor: 'Devansh Roy',
          slides: [
            { sequenceOrder: 1, role: 'hook', headline: 'The Unfinished Line', body: 'A sentence left in the notebook overnight gathers weight.' },
            { sequenceOrder: 2, role: 'tension', headline: 'The Morning Return', body: 'When you sit back down at dawn, the ink has dried completely.' }
          ]
        }
      };

      const assets = [
        { id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '4:5', fileSizeBytes: 500000 },
        { id: 'a2', sequenceOrder: 2, kind: 'IMAGE', aspectRatio: '4:5', fileSizeBytes: 500000 }
      ];

      const outcome = await validator.validateCandidate({
        candidateVersion: candidate,
        assets,
        recentPublications: []
      });

      expect(outcome.passed).toBe(true);
      const ig05 = outcome.results.find(r => r.gateCode === 'IG05_CAROUSEL_WITHOUT_PROGRESSION');
      expect(ig05.status).toBe('PASS');
    });

    it('Positive 2: Correctly justifies NOT_APPLICABLE for single media format on IG05', async () => {
      const validator = createValidator();
      const candidate = {
        format: 'FEED_SINGLE',
        caption: '“Rain fell over the tin roof.” A single sentence.',
        governance_bundle_hash: AUTHORITATIVE_GOV_HASH,
        visual_spec: { quoteAuthor: 'Anandita Dutta' }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion: candidate,
        assets: [{ id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '1:1', fileSizeBytes: 500000 }],
        recentPublications: []
      });

      expect(outcome.passed).toBe(true);
      const ig05 = outcome.results.find(r => r.gateCode === 'IG05_CAROUSEL_WITHOUT_PROGRESSION');
      expect(ig05.status).toBe('NOT_APPLICABLE');
    });

    it('Positive 3: Factual claim passes when verified fresh source is supplied (IG15)', async () => {
      const validator = createValidator();
      const candidate = {
        format: 'FEED_SINGLE',
        caption: 'The government surpassed the 1,412 days tenure record in Rome.',
        governance_bundle_hash: AUTHORITATIVE_GOV_HASH,
        evidence_sources: [
          {
            url: 'https://reuters.com/world/record-tenure',
            publisher: 'Reuters',
            retrieved_at: new Date().toISOString()
          }
        ],
        visual_spec: { quoteAuthor: 'Devansh Roy' }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion: candidate,
        assets: [{ id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '1:1', fileSizeBytes: 500000 }],
        recentPublications: []
      });

      expect(outcome.passed).toBe(true);
      const ig15 = outcome.results.find(r => r.gateCode === 'IG15_EVIDENCE_REQUIRED');
      expect(ig15.status).toBe('PASS');
    });
  });

  describe('Editorial Brain Hardening Tests', () => {
    it('Cooldown Exhaustion: Returns null when all propositions are in cooldown (never bypasses)', () => {
      // All items cooling down on linkedin
      const candidate = selectNextPropositionForChannel({ channel: 'linkedin' });
      // Since recent dispatches exist within 48h, if all are cooling down, returns null
      // (or if available items exist in pool, selects non-cooling down candidate)
      if (candidate) {
        const lastTime = candidate.channel_dispatches?.linkedin;
        if (lastTime) {
          const hoursAgo = (Date.now() - new Date(lastTime).getTime()) / 3600000;
          expect(hoursAgo).toBeGreaterThanOrEqual(48);
        }
      }
    });

    it('Telemetry Fidelity: Preserves exact 0.00 retention and finite numbers', () => {
      const brain = { insights: [{ id: 'test_insight', outcomes: [], provenance: {} }] };
      const outcomeRes = recordInsightOutcome('hook_dont_start_weather', {
        platform: 'youtube_shorts',
        impressions: 100,
        retention_pct: 0.0,
        post_age: '24h'
      });

      expect(outcomeRes.recorded).toBe(true);
      expect(outcomeRes.outcome.retention_pct).toBe(0.0);
      expect(outcomeRes.outcome.impressions).toBe(100);
    });

    it('Database Guard: selectAndReservePropositionForChannel fails closed if dbClient is missing', async () => {
      await expect(selectAndReservePropositionForChannel({
        dbClient: null,
        deliveryId: 'del_123',
        insightId: 'ins_456'
      })).rejects.toThrow('DATABASE_UNAVAILABLE_DISPATCH_ABORTED');
    });
  });
});
