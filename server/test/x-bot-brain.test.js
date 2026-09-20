import { describe, it, expect, vi } from 'vitest';
import {
  computeBrainHash,
  computeTextHash,
  evaluateRepetition,
  evaluateBlockers,
  generateDraftsFromInsight,
  dispatchCandidateVersion,
  REPETITION_ENGINE_VERSION,
  BLOCKER_ENGINE_VERSION
} from '../src/services/x-bot-service.js';

describe('𝕏 Bot Governance & Constitutional Engine (Brain-Governed)', () => {

  describe('1. Cryptographic Identity & Hashing', () => {
    it('computes deterministic SHA-256 brain_hash from EDITORIAL_BRAIN.json', () => {
      const hash1 = computeBrainHash();
      const hash2 = computeBrainHash();
      expect(hash1).toBeDefined();
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64);
      expect(hash1).toBe(hash2);
    });

    it('computes deterministic text hash', () => {
      const h1 = computeTextHash('A character wanting something is enough to start a scene.');
      const h2 = computeTextHash('  A character wanting something is enough to start a scene.  ');
      expect(h1).toBe(h2);
    });
  });

  describe('2. Deterministic Repetition Engine v1.0', () => {
    const publishedDispatches = [
      {
        id: 'disp_1',
        text_hash: computeTextHash('One character. One place. One thing they want.'),
        published_root_text: 'One character. One place. One thing they want. That is enough to begin a scene.',
        created_at: new Date().toISOString()
      },
      {
        id: 'disp_2',
        text_hash: computeTextHash('Nehru Place repair counters teach hardware reality.'),
        published_root_text: 'Nehru Place repair counters teach hardware reality in ten minutes of observation.',
        created_at: new Date().toISOString()
      }
    ];

    it('flags exact duplicate text permanently', () => {
      const result = evaluateRepetition(
        'One character. One place. One thing they want. That is enough to begin a scene.',
        publishedDispatches
      );
      expect(result.passed).toBe(false);
      expect(result.decision).toBe('FAIL');
      expect(result.similarity_score).toBe(1.0);
    });

    it('flags identical opening 4-word prefix against past dispatches', () => {
      const result = evaluateRepetition(
        'One character. One place. Different second half entirely.',
        publishedDispatches
      );
      expect(result.passed).toBe(false);
      expect(result.decision).toBe('FAIL');
      expect(result.reason).toContain('Repeated opening 4-word pattern');
    });

    it('flags 3-gram Jaccard similarity when >= 0.75', () => {
      const result = evaluateRepetition(
        'Nehru Place repair counters teach hardware reality in ten minutes of observing.',
        publishedDispatches
      );
      expect(result.passed).toBe(false);
      expect(result.similarity_score).toBeGreaterThanOrEqual(0.75);
    });

    it('passes genuinely novel copy', () => {
      const result = evaluateRepetition(
        'The water arrived at 5:55 PM in an unwashed brass tumbler.',
        publishedDispatches
      );
      expect(result.passed).toBe(true);
      expect(result.decision).toBe('PASS');
    });
  });

  describe('3. 31 Constitutional Blockers & 4-State Gate Evaluation', () => {
    it('evaluates all 31 gates with 4-state output (PASS, FAIL, NOT_APPLICABLE, INSUFFICIENT_EVIDENCE)', () => {
      const candidate = {
        text: 'The water arrived in a brass tumbler. Neither of us spoke for twenty minutes.',
        archetype: 'The Spare & Restrained',
        evidence_bundle: null
      };
      const evaluation = evaluateBlockers(candidate);
      expect(evaluation.blocker_engine).toBe(BLOCKER_ENGINE_VERSION);
      expect(evaluation.total_blockers_evaluated).toBe(31);
      expect(evaluation.outcomes.length).toBe(31);

      const states = new Set(evaluation.outcomes.map(o => o.status));
      for (const s of states) {
        expect(['PASS', 'FAIL', 'NOT_APPLICABLE', 'INSUFFICIENT_EVIDENCE']).toContain(s);
      }
      expect(evaluation.passed).toBe(true);
    });

    it('strips trailing hashtags before checking broken sentence fragment (G13)', () => {
      const candidate = {
        text: 'A character who wants something specific begins any scene. #writon #writingcraft',
        hook_type: 'craft_truth',
        evidence_bundle: null
      };
      const evaluation = evaluateBlockers(candidate);
      expect(evaluation.results['BROKEN_SENTENCE_FAIL'].status).toBe('PASS');
    });

    it('vetoes decorative code blocks in literary prose (G07)', () => {
      const candidate = {
        text: 'interface WriterState { draft: string; } const x = 1;',
        archetype: 'The Spare & Restrained'
      };
      const evaluation = evaluateBlockers(candidate);
      expect(evaluation.passed).toBe(false);
      const gate = evaluation.outcomes.find(o => o.id === 'DECORATIVE_CODE_FAIL');
      expect(gate.status).toBe('FAIL');
    });

    it('vetoes uppercase hashtags under X06_UPPERCASE_HASHTAG_VIOLATION', () => {
      const candidate = {
        text: 'Keep your dialogue grounded in action. #WritingCommunity #amwriting',
        archetype: 'The Spare & Restrained'
      };
      const evaluation = evaluateBlockers(candidate);
      expect(evaluation.passed).toBe(false);
      const gate = evaluation.outcomes.find(o => o.id === 'X06_UPPERCASE_HASHTAG_VIOLATION');
      expect(gate.status).toBe('FAIL');
    });

    it('vetoes canned motivational aphorisms under GENERIC_APHORISM_FAIL', () => {
      const candidate = {
        text: 'Success is a journey not a destination in modern creative life.',
        archetype: 'The Conversational & Vulnerable'
      };
      const evaluation = evaluateBlockers(candidate);
      expect(evaluation.passed).toBe(false);
      const gate = evaluation.outcomes.find(o => o.id === 'GENERIC_APHORISM_FAIL');
      expect(gate.status).toBe('FAIL');
    });

    it('flags INSUFFICIENT_EVIDENCE when technical metrics lack verified evidence bundle under PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL', () => {
      const candidate = {
        text: 'The processor frequency throttled to 1.84 GHz after twelve minutes of sustained rendering.',
        archetype: 'The Analytical & Architectural',
        evidence_bundle: null // Missing evidence
      };
      const evaluation = evaluateBlockers(candidate);
      expect(evaluation.passed).toBe(false);
      const gate = evaluation.outcomes.find(o => o.id === 'PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL');
      expect(gate.status).toBe('INSUFFICIENT_EVIDENCE');
    });

    it('passes technical metric when backed by verified evidence bundle', () => {
      const candidate = {
        text: 'The processor frequency throttled to 1.84 GHz after twelve minutes of sustained rendering.',
        archetype: 'The Analytical & Architectural',
        evidence_bundle: {
          source_type: 'lab_test',
          claims: ['1.84 GHz throttle']
        }
      };
      const evaluation = evaluateBlockers(candidate);
      const gate = evaluation.outcomes.find(o => o.id === 'PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL');
      expect(gate.status).toBe('PASS');
    });

    it('vetoes link in text if not using canonical writon.cc shortcut', () => {
      const candidate = {
        text: 'The opening scene sets the stakes. Read full guide: https://someotherdomain.com/guide',
        archetype: 'The Spare & Restrained'
      };
      const evaluation = evaluateBlockers(candidate);
      expect(evaluation.passed).toBe(false);
      const gate = evaluation.outcomes.find(o => o.id === 'X07_MALFORMED_WRITON_URL');
      expect(gate.status).toBe('FAIL');
    });
  });

  describe('4. Autonomous Dispatch Reliability & Isolation', () => {
    it('quarantines unknown network error into outcome_unknown and reconciliation_required', async () => {
      const queryLog = [];
      const client = {
        query: async (sql, params) => {
          queryLog.push({ sql, params });
          const lower = sql.toLowerCase();
          if (lower.includes('from public.x_bot_candidate_versions')) {
            return {
              rowCount: 1,
              rows: [{
                candidate_id: 'cand_1',
                version: 1,
                text: 'Water was brought in an unwashed brass tumbler at 5:55 PM.',
                reply_text: null,
                brain_hash: computeBrainHash(),
                status: 'approved'
              }]
            };
          }
          if (lower.includes('from public.x_bot_dispatches')) {
            return { rowCount: 0, rows: [] };
          }
          return { rowCount: 1, rows: [{ id: '1' }] };
        },
        release: () => {}
      };
      const mockPool = {
        connect: async () => client,
        query: async (sql, params) => client.query(sql, params)
      };

      const result = await dispatchCandidateVersion(mockPool, 'cand_1', 1, {
        posterOverride: async () => {
          const err = new Error('Gateway Timeout');
          err.code = 'ETIMEDOUT';
          throw err;
        }
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('outcome_unknown');
      expect(result.reason).toContain('reconciliation_required');

      const statusUpdate = queryLog.find(q => q.sql.includes('x_bot_dispatches') && q.sql.includes("status = 'outcome_unknown'"));
      expect(statusUpdate).toBeDefined();
    });

    it('vetoes dispatch if brain_hash in constitution changed after candidate approval (X12)', async () => {
      const client = {
        query: async (sql) => {
          const lower = sql.toLowerCase();
          if (lower.includes('from public.x_bot_candidate_versions')) {
            return {
              rowCount: 1,
              rows: [{
                candidate_id: 'cand_stale',
                version: 1,
                text: 'Observation of a quiet room with teak wood desks.',
                brain_hash: 'stale_hash_from_older_constitution_000000000000000000000000000',
                status: 'approved'
              }]
            };
          }
          return { rowCount: 0, rows: [] };
        },
        release: () => {}
      };
      const mockPool = {
        connect: async () => client,
        query: async (sql) => client.query(sql)
      };

      const result = await dispatchCandidateVersion(mockPool, 'cand_stale', 1);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Brain constitution hash mismatch');
      expect(result.status).toBe('rejected');
    });

    it('succeeds dispatch in dry-run mode and returns simulation metadata', async () => {
      const client = {
        query: async (sql) => {
          const lower = sql.toLowerCase();
          if (lower.includes('from public.x_bot_candidate_versions')) {
            return {
              rowCount: 1,
              rows: [{
                candidate_id: 'cand_ok',
                version: 1,
                text: 'The water arrived at 5:55 PM in a brass tumbler.',
                reply_text: 'Neither of us spoke for twenty minutes.',
                brain_hash: computeBrainHash(),
                status: 'approved'
              }]
            };
          }
          if (lower.includes('from public.x_bot_dispatches')) {
            return { rowCount: 0, rows: [] };
          }
          return { rowCount: 1, rows: [{ id: '1' }] };
        },
        release: () => {}
      };
      const mockPool = {
        connect: async () => client,
        query: async (sql) => client.query(sql)
      };

      const result = await dispatchCandidateVersion(mockPool, 'cand_ok', 1, { dryRun: true });
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.candidate.id).toBe('cand_ok');
      expect(result.validation.passed).toBe(true);
    });
  });

});
