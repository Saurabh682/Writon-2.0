import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JevDecisionService } from '../src/services/jev/jev-service.js';
import { evaluateTrendTriagePolicy, evaluateArticleQAPolicy, DECISION_OUTCOMES } from '../src/services/jev/jev-policy.js';
import { buildTrendTriageState, buildArticleQAState } from '../src/services/jev/jev-schemas.js';

describe('Jev Decision Layer Unit Suite', () => {
  let mockClient;
  let mockPool;

  beforeEach(() => {
    mockClient = {
      isConfigured: vi.fn().mockReturnValue(true),
      evaluate: vi.fn()
    };
    mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };
  });

  describe('Policy Evaluation', () => {
    it('Trend Triage: AUTO_ACCEPT when relevance and worth_covering are high and duplicate is low', () => {
      const answers = {
        writon_relevance: { score: 0.85, confidence: 0.85 },
        worth_covering: { noul: 0.90, confidence: 0.90 },
        likely_duplicate: { noul: 0.15, confidence: 0.80 },
        newsworthiness: { score: 0.75, confidence: 0.75 },
        evergreen_potential: { score: 0.80, confidence: 0.80 },
        recommended_content_type: { choice: 'essay', confidence: 0.88 }
      };

      const result = evaluateTrendTriagePolicy(answers);
      expect(result.outcome).toBe(DECISION_OUTCOMES.AUTO_ACCEPT);
      expect(result.confidence).toBeGreaterThan(0.60);
      expect(result.metrics.writonRelevance).toBe(0.85);
      expect(result.metrics.worthCovering).toBe(0.90);
    });

    it('Trend Triage: AUTO_REJECT when likely_duplicate exceeds maximum threshold', () => {
      const answers = {
        writon_relevance: { score: 0.80, confidence: 0.80 },
        worth_covering: { noul: 0.70, confidence: 0.80 },
        likely_duplicate: { noul: 0.85, confidence: 0.85 }, // High duplicate
        newsworthiness: { score: 0.70, confidence: 0.70 },
        evergreen_potential: { score: 0.50, confidence: 0.70 }
      };

      const result = evaluateTrendTriagePolicy(answers);
      expect(result.outcome).toBe(DECISION_OUTCOMES.AUTO_REJECT);
      expect(result.reasons.some(r => r.includes('Likely duplicate probability'))).toBe(true);
    });

    it('Trend Triage: AUTO_REJECT when relevance or worth_covering is too low', () => {
      const answers = {
        writon_relevance: { score: 0.30, confidence: 0.85 }, // Very low relevance
        worth_covering: { noul: 0.40, confidence: 0.85 },
        likely_duplicate: { noul: 0.20, confidence: 0.85 }
      };

      const result = evaluateTrendTriagePolicy(answers);
      expect(result.outcome).toBe(DECISION_OUTCOMES.AUTO_REJECT);
    });

    it('Trend Triage: NEEDS_LLM_REVIEW when values fall in borderline zone', () => {
      const answers = {
        writon_relevance: { score: 0.58 }, // Just above min 0.55
        worth_covering: { noul: 0.62 },    // Just above min 0.60
        likely_duplicate: { noul: 0.35 }
      };

      const result = evaluateTrendTriagePolicy(answers);
      expect(result.outcome).toBe(DECISION_OUTCOMES.NEEDS_LLM_REVIEW);
    });

    it('Article QA: AUTO_ACCEPT when craft is high and generic AI language is low', () => {
      const answers = {
        persona_fit: { score: 0.85 },
        topic_specificity: { score: 0.90 },
        generic_ai_language: { noul: 0.10 },
        opening_is_generic: { noul: 0.15 },
        recent_content_overlap: { noul: 0.10 },
        reader_value: { score: 0.88 },
        requires_additional_review: { noul: 0.10 }
      };

      const result = evaluateArticleQAPolicy(answers);
      expect(result.outcome).toBe(DECISION_OUTCOMES.AUTO_ACCEPT);
      expect(result.metrics.genericAiLanguage).toBe(0.10);
    });

    it('Article QA: AUTO_REJECT when generic AI language or opening is overly synthetic', () => {
      const answers = {
        persona_fit: { score: 0.70, confidence: 0.85 },
        topic_specificity: { score: 0.70, confidence: 0.85 },
        generic_ai_language: { noul: 0.85, confidence: 0.90 }, // High synthetic tells
        opening_is_generic: { noul: 0.85, confidence: 0.90 },
        recent_content_overlap: { noul: 0.10, confidence: 0.85 },
        reader_value: { score: 0.50, confidence: 0.85 },
        requires_additional_review: { noul: 0.80, confidence: 0.85 }
      };

      const result = evaluateArticleQAPolicy(answers);
      expect(result.outcome).toBe(DECISION_OUTCOMES.AUTO_REJECT);
    });
  });

  describe('JevDecisionService Coordinator & Guardrails', () => {
    it('Bypasses Indic scripts (Hindi/Bengali) safely for Phase 1', async () => {
      const service = new JevDecisionService({
        config: { jev: { enabled: true, shadowMode: true } },
        pool: mockPool,
        client: mockClient
      });

      // Hindi Devanagari script topic
      const hindiResult = await service.triageTrend({
        trend: { topic: 'सड़क पर चाय और बारिश की कहानी' },
        existingStatus: 'qualified'
      });

      expect(hindiResult.executed).toBe(false);
      expect(hindiResult.jevOutcome).toBe('SKIPPED_MULTILINGUAL');
      expect(mockClient.evaluate).not.toHaveBeenCalled();

      // Bengali script topic
      const bengaliResult = await service.triageTrend({
        trend: { topic: 'কলকাতার ট্রাম ও পুরানো দিন' },
        existingStatus: 'qualified'
      });

      expect(bengaliResult.executed).toBe(false);
      expect(bengaliResult.jevOutcome).toBe('SKIPPED_MULTILINGUAL');
      expect(mockClient.evaluate).not.toHaveBeenCalled();
    });

    it('Gracefully fails open on Jev API error without throwing', async () => {
      mockClient.evaluate.mockResolvedValue({
        success: false,
        error: 'API rate limit or connection timeout',
        latencyMs: 3500
      });

      const service = new JevDecisionService({
        config: { jev: { enabled: true, shadowMode: true } },
        pool: mockPool,
        client: mockClient
      });

      const result = await service.triageTrend({
        trend: { topic: 'Autonomous Coding Agents' },
        existingStatus: 'qualified'
      });

      expect(result.executed).toBe(false);
      expect(result.jevOutcome).toBe('ERROR');
      expect(result.error).toContain('API rate limit');
      expect(result.shadowMode).toBe(true);
    });

    it('Correctly processes valid English trend triage in shadow mode', async () => {
      mockClient.evaluate.mockResolvedValue({
        success: true,
        model: 'jev-1.13.0',
        inputTokens: 140,
        latencyMs: 120,
        answers: {
          writon_relevance: { score: 0.88, confidence: 0.85 },
          worth_covering: { noul: 0.92, confidence: 0.90 },
          likely_duplicate: { noul: 0.10, confidence: 0.85 },
          newsworthiness: { score: 0.80, confidence: 0.80 },
          evergreen_potential: { score: 0.85, confidence: 0.80 },
          recommended_content_type: { choice: 'essay', confidence: 0.90 }
        }
      });

      const service = new JevDecisionService({
        config: { jev: { enabled: true, shadowMode: true } },
        pool: mockPool,
        client: mockClient
      });

      const result = await service.triageTrend({
        trend: { topic: 'The Supervisory Tax of AI Code Review' },
        existingStatus: 'qualified'
      });

      expect(result.executed).toBe(true);
      expect(result.jevOutcome).toBe(DECISION_OUTCOMES.AUTO_ACCEPT);
      expect(result.shadowMode).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.60);
    });
  });

  describe('Phase 1B Live Shadow Evaluation & Adjudication', () => {
    it('generates Phase 1B report with sample sufficiency, calibration buckets, and false negatives', async () => {
      const { generateExperimentReport, recordJevEvaluation, updateEventAdjudication, ADJUDICATED_RESULTS } = await import('../src/services/jev/jev-telemetry.js');

      const ev1 = await recordJevEvaluation(null, {
        stage: 'trend_triage',
        topic: 'Autonomous Code Reviews',
        confidence: 0.88,
        policyResult: 'AUTO_ACCEPT',
        existingSystemResult: 'qualified',
        adjudicatedResult: ADJUDICATED_RESULTS.VALUABLE
      });

      const ev2 = await recordJevEvaluation(null, {
        stage: 'trend_triage',
        topic: 'Duplicate Topic',
        confidence: 0.86,
        policyResult: 'AUTO_REJECT',
        rejectionCategory: 'duplicate',
        reasons: ['Likely duplicate'],
        existingSystemResult: 'qualified',
        adjudicatedResult: ADJUDICATED_RESULTS.DUPLICATE
      });

      const ev3 = await recordJevEvaluation(null, {
        stage: 'trend_triage',
        topic: 'Missed Gem Topic',
        confidence: 0.89,
        policyResult: 'AUTO_REJECT',
        rejectionCategory: 'low_relevance',
        existingSystemResult: 'qualified',
        adjudicatedResult: ADJUDICATED_RESULTS.VALUABLE // False Negative!
      });

      const report = generateExperimentReport();
      expect(report.totalEvaluations).toBeGreaterThanOrEqual(3);
      expect(report.triageMetrics.sampleSufficiency.targetMinimum).toBe(100);
      expect(report.triageMetrics.calibrationBuckets['0.80-0.89'].count).toBeGreaterThanOrEqual(3);
      expect(report.triageMetrics.falseNegativeCount).toBeGreaterThanOrEqual(1);
      expect(report.triageMetrics.highConfidenceFalseNegatives.length).toBeGreaterThanOrEqual(1);

      // Verify update adjudication
      const updated = await updateEventAdjudication(null, ev3.id, {
        adjudicatedResult: ADJUDICATED_RESULTS.LOW_VALUE,
        adjudicationNotes: 'Topic was actually derivative upon review'
      });
      expect(updated.adjudicated_result).toBe(ADJUDICATED_RESULTS.LOW_VALUE);
      expect(updated.adjudication_notes).toContain('derivative');
    });

    it('correctly filters disagreements in generateExperimentReport', async () => {
      const { generateExperimentReport } = await import('../src/services/jev/jev-telemetry.js');
      const disagreementReport = generateExperimentReport(null, { filter: 'disagreement' });
      expect(disagreementReport).toBeDefined();
      expect(disagreementReport.triageMetrics.representativeDisagreements).toBeDefined();
    });
  });

  describe('Phase 1C Live Evidence Collection & Adjudication Safety', () => {
    it('enforces experiment namespace on persisted evaluation events', async () => {
      const { recordJevEvaluation } = await import('../src/services/jev/jev-telemetry.js');
      const event = await recordJevEvaluation(null, {
        stage: 'trend_triage',
        topic: 'Verification of Namespace Isolation',
        confidence: 0.92,
        policyResult: 'AUTO_ACCEPT',
        existingSystemResult: 'qualified'
      });

      expect(event.experiment_type).toBe('jev_decision_layer');
      expect(event.experiment_version).toBe('phase_1c');
      expect(event.policy_version).toBe('phase_1c_baseline_v1');
    });

    it('rejects adjudication updates for nonexistent events with 404', async () => {
      const { updateEventAdjudication, ADJUDICATED_RESULTS } = await import('../src/services/jev/jev-telemetry.js');
      await expect(
        updateEventAdjudication(null, 'nonexistent-uuid-1234', {
          adjudicatedResult: ADJUDICATED_RESULTS.VALUABLE
        })
      ).rejects.toThrow(/not found/i);
    });

    it('rejects adjudication updates with invalid enum outcomes with 400', async () => {
      const { updateEventAdjudication } = await import('../src/services/jev/jev-telemetry.js');
      await expect(
        updateEventAdjudication(null, 'test-id', {
          adjudicatedResult: 'SUPER_GREAT_STORY'
        })
      ).rejects.toThrow(/Invalid adjudicatedResult/i);
    });

    it('sanitizes adjudication notes and preserves raw machine evidence immutability', async () => {
      const { recordJevEvaluation, updateEventAdjudication, ADJUDICATED_RESULTS } = await import('../src/services/jev/jev-telemetry.js');
      const ev = await recordJevEvaluation(null, {
        stage: 'trend_triage',
        topic: 'Immutable Evidence Topic',
        confidence: 0.87,
        policyResult: 'AUTO_ACCEPT',
        rawAnswers: { writon_relevance: { score: 0.85 } },
        existingSystemResult: 'qualified'
      });

      const updated = await updateEventAdjudication(null, ev.id, {
        adjudicatedResult: ADJUDICATED_RESULTS.VALUABLE,
        adjudicationNotes: '  Authentic human craft angle.  ',
        reviewerId: 'chief_editor_42'
      });

      expect(updated.adjudicated_result).toBe(ADJUDICATED_RESULTS.VALUABLE);
      expect(updated.adjudication_notes).toBe('Authentic human craft angle.');
      expect(updated.adjudicated_by).toBe('chief_editor_42');
      expect(updated.adjudicated_at).toBeDefined();

      // Ensure machine evidence was NOT altered
      expect(updated.confidence).toBe(0.87);
      expect(updated.policy_result).toBe('AUTO_ACCEPT');
      expect(updated.raw_structured_decisions.writon_relevance.score).toBe(0.85);
    });
  });
});


