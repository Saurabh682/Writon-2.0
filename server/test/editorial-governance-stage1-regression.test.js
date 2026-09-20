import { describe, it, expect, vi } from 'vitest';
import {
  InstagramBrainValidator,
  computeSha256,
  computeAssetManifestHash,
  computeGovernanceBundleHash
} from '../src/services/instagram-brain-validator.js';
import {
  selectNextPropositionForChannel,
  recordInsightOutcome,
  loadEditorialBrain
} from '../src/services/editorial-brain.js';

describe('Editorial Governance Stage 1 Regression Suite (Failure Modes & Contract Probes)', () => {

  describe('Probe 1: Instagram Brain Validator False-Green & Evidence Probes', () => {
    const mockBrain = {
      insights: [
        { id: 'insight_craft_01', proposition_archetype: 'craft_philosophy' }
      ]
    };

    it('VERIFIED: validator rejects a carousel with 0 assets (fails on asset presence)', async () => {
      const validator = new InstagramBrainValidator({ brain: mockBrain, authoritativeGovernanceHash: 'any_string_passes_currently' });
      const candidateVersion = {
        format: 'FEED_CAROUSEL',
        caption: '“Platform 8 smelled of wet jute and diesel.” A story on paper.',
        governance_bundle_hash: 'any_string_passes_currently',
        visual_spec: {
          quoteAuthor: 'Devansh Roy',
          slides: [
            { sequenceOrder: 1, role: 'hook', headline: 'Platform 8 at 2:15 AM', body: 'Cold mustard oil.' },
            { sequenceOrder: 2, role: 'tension', headline: 'The Unfinished Line', body: 'Words left.' }
          ]
        }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion,
        assets: [],
        recentPublications: []
      });

      // HARDENED ASSERTION:
      expect(outcome.passed).toBe(false);
      const ig11 = outcome.results.find(r => r.gateCode === 'IG11_ASPECT_RATIO_STANDARDS');
      expect(ig11.status).toBe('FAIL');
    });

    it('VERIFIED: validator rejects 2 filler slides without authentic narrative progression', async () => {
      const validator = new InstagramBrainValidator({ brain: mockBrain, authoritativeGovernanceHash: 'gov_hash_fake' });
      const candidateVersion = {
        format: 'FEED_CAROUSEL',
        caption: '“Cold tea at 5:55 PM.” Written in pencil.',
        governance_bundle_hash: 'gov_hash_fake',
        visual_spec: {
          quoteAuthor: 'Devansh Roy',
          slides: [
            { sequenceOrder: 1, role: 'filler_one', headline: 'Slide 1', body: 'Placeholder text here.' },
            { sequenceOrder: 2, role: 'filler_two', headline: 'Slide 2', body: 'Placeholder text here.' }
          ]
        }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion,
        assets: [{ id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '4:5', fileSizeBytes: 1000 }, { id: 'a2', sequenceOrder: 2, kind: 'IMAGE', aspectRatio: '4:5', fileSizeBytes: 1000 }],
        recentPublications: []
      });

      // HARDENED ASSERTION:
      expect(outcome.passed).toBe(false);
      const ig05 = outcome.results.find(r => r.gateCode === 'IG05_CAROUSEL_WITHOUT_PROGRESSION');
      expect(ig05.status).toBe('FAIL');
    });

    it('VERIFIED: validator rejects arbitrary governance hash that mismatches authoritative hash', async () => {
      const validator = new InstagramBrainValidator({ brain: mockBrain, authoritativeGovernanceHash: 'authoritative_hash_official' });
      const candidateVersion = {
        format: 'FEED_SINGLE',
        caption: '“A sentence in a notebook.” Tea cooling.',
        governance_bundle_hash: 'completely_fabricated_hash_that_does_not_match_constitution',
        visual_spec: { quoteAuthor: 'Kavya Nair' }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion,
        assets: [{ id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '1:1', fileSizeBytes: 1000 }],
        recentPublications: []
      });

      // HARDENED ASSERTION:
      expect(outcome.passed).toBe(false);
      const ig14 = outcome.results.find(r => r.gateCode === 'IG14_GOVERNANCE_BUNDLE_MISMATCH');
      expect(ig14.status).toBe('FAIL');
    });

    it('VERIFIED: validator calculates lexical duplicates and rejects unverified claims', async () => {
      const validator = new InstagramBrainValidator({ brain: mockBrain, authoritativeGovernanceHash: 'gov_123' });
      const candidateVersion = {
        format: 'FEED_SINGLE',
        caption: 'Unverified technical claim: The record tenure lasted 1,412 days.',
        governance_bundle_hash: 'gov_123',
        visual_spec: { quoteAuthor: 'Aarav Mehta' }
      };

      const outcome = await validator.validateCandidate({
        candidateVersion,
        assets: [{ id: 'a1', sequenceOrder: 1, kind: 'IMAGE', aspectRatio: '1:1', fileSizeBytes: 1000 }],
        recentPublications: [{ id: 'pub_exact_duplicate', caption: candidateVersion.caption }]
      });

      // HARDENED ASSERTION:
      const ig10 = outcome.results.find(r => r.gateCode === 'IG10_LEXICAL_DUPLICATE');
      expect(ig10.status).toBe('FAIL');
      expect(ig10.details.maxJaccard).toBe(1);

      // IG15 evaluates claims without evidence to INSUFFICIENT_EVIDENCE
      const ig15 = outcome.results.find(r => r.gateCode === 'IG15_EVIDENCE_REQUIRED');
      expect(ig15.status).toBe('INSUFFICIENT_EVIDENCE');

      // IG17 computes real WCAG AA relative luminance contrast ratio
      const ig17 = outcome.results.find(r => r.gateCode === 'IG17_ACCESSIBILITY_COMPLIANCE');
      expect(ig17.status).toBe('PASS');
      expect(ig17.details.contrastRatio).toBeGreaterThanOrEqual(4.5);
    });

    it('PROBE: gate decision rule vulnerability: empty results array passes `results.every(r => r.status !== "FAIL")`', () => {
      const emptyResults = [];
      const passed = emptyResults.every(r => r.status !== 'FAIL');
      // Proving the flaw: an empty array vacuously evaluates to true!
      expect(passed).toBe(true);
      // Hardened rule must require all expected gates to be explicitly present and PASS/NOT_APPLICABLE.
    });
  });

  describe('Probe 2: Cooldown Fallback Vulnerability (Silent 48-Hour Bypass)', () => {
    it('PROBE: selectNextPropositionForChannel falls back to cooling down insight when all are cooling down', () => {
      // In editorial-brain.js:
      // const available = scored.filter(s => !s.isCoolingDown);
      // const candidatePool = available.length > 0 ? available : scored;
      // When all are cooling down, candidatePool becomes `scored`, silently bypassing cooldown!
      
      const brain = loadEditorialBrain();
      const firstInsight = brain.insights[0];
      
      // Simulate recent dispatches on all insights within 1 hour ago
      const mockInsights = [
        {
          id: 'insight_a',
          proposition_archetype: 'craft_philosophy',
          title: 'Craft A',
          channel_dispatches: { linkedin: new Date(Date.now() - 3600000).toISOString() }, // 1h ago (< 48h)
          times_dispatched: 1,
          provenance: { cross_platform_formats: ['SINGLE_IMAGE'] }
        },
        {
          id: 'insight_b',
          proposition_archetype: 'contrarian_rule',
          title: 'Craft B',
          channel_dispatches: { linkedin: new Date(Date.now() - 7200000).toISOString() }, // 2h ago (< 48h)
          times_dispatched: 1,
          provenance: { cross_platform_formats: ['SINGLE_IMAGE'] }
        }
      ];

      // Replicating selection logic from server/src/services/editorial-brain.js
      const scored = mockInsights.map(insight => {
        const lastChannelTime = new Date(insight.channel_dispatches.linkedin).getTime();
        const hoursSince = (Date.now() - lastChannelTime) / 3600000;
        const isCoolingDown = hoursSince < 48;
        return { insight, isCoolingDown, hoursSince };
      });

      const available = scored.filter(s => !s.isCoolingDown);
      expect(available).toHaveLength(0); // None are available; all cooling down!

      // VULNERABILITY: fallback to scored
      const candidatePool = available.length > 0 ? available : scored;
      expect(candidatePool.length).toBeGreaterThan(0); // Silently returns a cooling down insight!
      
      // Hardened contract requirement:
      // When available is 0, must strictly return null or { selected: null, reason: 'COOLDOWN_ACTIVE' }.
    });
  });

  describe('Probe 3: Concurrent Worker Race Condition (Same Archetype Collision)', () => {
    it('PROBE: two concurrent uncoordinated workers selecting simultaneously can choose the same archetype within 48h', async () => {
      // Worker 1 and Worker 2 both want an insight for LinkedIn at 09:00 AM IST
      // Insight 1 has archetype: 'craft_philosophy'
      // Insight 2 has archetype: 'craft_philosophy' (different insight, same archetype)
      
      let dispatchLog = [];
      const archetypeCooldownHours = 48;

      async function workerSelectAndDispatch(workerId, candidateInsight) {
        // Check if archetype is cooling down in shared dispatchLog
        const recentSameArchetype = dispatchLog.find(d => {
          if (d.archetype !== candidateInsight.proposition_archetype) return false;
          const hoursAgo = (Date.now() - d.dispatchedAt) / 3600000;
          return hoursAgo < archetypeCooldownHours;
        });

        if (recentSameArchetype) {
          return { workerId, selected: null, reason: 'ARCHETYPE_COOLDOWN_ACTIVE' };
        }

        // SIMULATE NETWORK LATENCY / GAP BEFORE WRITING TO DISPATCH LOG
        await new Promise(resolve => setTimeout(resolve, 10));

        // Write dispatch
        dispatchLog.push({
          workerId,
          insightId: candidateInsight.id,
          archetype: candidateInsight.proposition_archetype,
          dispatchedAt: Date.now()
        });

        return { workerId, selected: candidateInsight.id };
      }

      // Both workers execute concurrently without atomic locking
      const candidate1 = { id: 'insight_1', proposition_archetype: 'craft_philosophy' };
      const candidate2 = { id: 'insight_2', proposition_archetype: 'craft_philosophy' };

      const [res1, res2] = await Promise.all([
        workerSelectAndDispatch('worker_1', candidate1),
        workerSelectAndDispatch('worker_2', candidate2)
      ]);

      // Both workers succeeded!
      // This proves that without atomic transaction-scoped advisory locks or an atomic lease reservation,
      // concurrent workers violate the 48-hour cross-channel archetype spacing rule!
      expect(res1.selected).toBe('insight_1');
      expect(res2.selected).toBe('insight_2');
      expect(dispatchLog.length).toBe(2);
      expect(dispatchLog[0].archetype).toBe(dispatchLog[1].archetype);
    });
  });

  describe('Probe 4: Telemetry Cumulative Impression Inflation & Zero Conflation', () => {
    it('PROBE: recordInsightOutcome sums cumulative observations across 1h, 6h, 24h, inflating total impressions', () => {
      // Insight has 60 unique viewers at 1h, 75 at 6h, and 90 at 24h (cumulative audience)
      const outcomes = [
        { platform: 'youtube_shorts', post_age: '1h', impressions: 60, retention_pct: 45.0 },
        { platform: 'youtube_shorts', post_age: '6h', impressions: 75, retention_pct: 48.0 },
        { platform: 'youtube_shorts', post_age: '24h', impressions: 90, retention_pct: 50.0 }
      ];

      // Current logic in editorial-brain.js line 274:
      // const totalImpressions = insight.outcomes.reduce((acc, o) => acc + (o.impressions || 0), 0);
      const totalImpressions = outcomes.reduce((acc, o) => acc + (o.impressions || 0), 0);

      // 60 + 75 + 90 = 225 impressions!
      expect(totalImpressions).toBe(225);
      // In current code, totalImpressions > 150 marks it as 'proven_winner',
      // even though the post only had 90 total reach at 24h!
      expect(totalImpressions > 150).toBe(true);

      // PROBE: Genuine zero vs null conflation
      // If a video had retention_pct: 0.0 (measured complete abandonment),
      // current code: `retention_pct: retention_pct || null` turns 0 into null!
      const zeroRetention = 0.0;
      const sanitizedRetention = zeroRetention || null;
      expect(sanitizedRetention).toBe(null); // Demonstrates the zero-erasure bug!
    });
  });

  describe('Probe 5: Database Failure Boundaries (Pre-dispatch vs Post-dispatch Success)', () => {
    it('PROBE: demonstrates need for fail-closed pre-dispatch check and post-dispatch reconciliation persistence', async () => {
      let remotePlatformApiCalled = false;
      let dbConnected = false; // DB drops

      async function attemptDispatchWithDbGuard() {
        if (!dbConnected) {
          // Hardened behavior: fail closed, NEVER call remote API if DB is unavailable
          throw new Error('DATABASE_UNAVAILABLE_DISPATCH_ABORTED');
        }
        remotePlatformApiCalled = true;
        return { igMediaId: 'remote_ig_123' };
      }

      await expect(attemptDispatchWithDbGuard()).rejects.toThrow('DATABASE_UNAVAILABLE_DISPATCH_ABORTED');
      expect(remotePlatformApiCalled).toBe(false);

      // Post-dispatch failure scenario:
      // Remote API call succeeds, but DB crashes while writing CONFIRMED
      dbConnected = true;
      const remoteResult = await attemptDispatchWithDbGuard();
      expect(remoteResult.igMediaId).toBe('remote_ig_123');

      // If DB fails here, the intent must NOT be retried as a fresh post;
      // it must remain in `in_flight` / `reconciliation_required` with remote ID captured.
      let dbSaveSuccess = false;
      const unconfirmedDelivery = {
        intentId: 'intent_123',
        status: 'in_flight',
        remoteMediaId: remoteResult.igMediaId,
        reconciliationRequired: !dbSaveSuccess
      };
      expect(unconfirmedDelivery.reconciliationRequired).toBe(true);
      expect(unconfirmedDelivery.remoteMediaId).toBe('remote_ig_123');
    });
  });

});
