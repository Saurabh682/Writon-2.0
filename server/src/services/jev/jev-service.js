/**
 * Jev Decision Layer Service
 * 
 * Orchestrates Jev Triage (Stage 1) and Jev QA (Stage 2) in strict Shadow Mode.
 * Handles fail-safe fallbacks, multilingual exclusions, and metric collection.
 */

import { JevClient } from './jev-client.js';
import {
  TREND_TRIAGE_QUESTIONS,
  buildTrendTriageState,
  ARTICLE_QA_QUESTIONS,
  buildArticleQAState
} from './jev-schemas.js';
import {
  evaluateTrendTriagePolicy,
  evaluateArticleQAPolicy,
  DECISION_OUTCOMES
} from './jev-policy.js';
import {
  recordJevEvaluation,
  generateExperimentReport,
  getBufferedJevEvents,
  updateEventAdjudication,
  ADJUDICATED_RESULTS
} from './jev-telemetry.js';

export {
  DECISION_OUTCOMES,
  generateExperimentReport,
  getBufferedJevEvents,
  updateEventAdjudication,
  ADJUDICATED_RESULTS
};

export class JevDecisionService {
  constructor({
    config = {},
    pool = null,
    client = null
  } = {}) {
    const jevConfig = config.jev || {};
    this.enabled = Boolean(jevConfig.enabled);
    this.shadowMode = jevConfig.shadowMode !== false;
    this.triageEnabled = jevConfig.triageEnabled !== false;
    this.qaEnabled = jevConfig.qaEnabled !== false;
    this.thresholds = jevConfig.thresholds || {};
    this.pool = pool;

    this.client = client || new JevClient({
      apiKey: jevConfig.apiKey,
      apiUrl: jevConfig.apiUrl,
      model: jevConfig.model
    });
  }

  isOperational() {
    return this.enabled && this.client.isConfigured();
  }

  /**
   * Stage 1: Spark Trend Triage
   * 
   * In shadow mode: runs asynchronously or side-by-side, logs decisions,
   * returns the EXISTING qualification status untouched.
   * 
   * @param {Object} params
   * @param {Object} params.trend - The raw Spark trend item
   * @param {string} params.existingStatus - The deterministic system result ('qualified' | 'watchlist' | 'rejected')
   * @param {string[]} [params.recentTopics]
   * @param {string[]} [params.recentTitles]
   * @returns {Promise<{
   *   jevOutcome: string,
   *   confidence: number,
   *   executed: boolean,
   *   shadowMode: boolean,
   *   error?: string
   * }>}
   */
  async triageTrend({
    trend,
    existingStatus,
    recentTopics = [],
    recentTitles = []
  }) {
    if (!this.isOperational() || !this.triageEnabled) {
      return {
        executed: false,
        jevOutcome: 'DISABLED',
        confidence: 0,
        shadowMode: this.shadowMode
      };
    }

    // Multilingual guardrail: only evaluate English content for Phase 1
    const category = String(trend.category || '').toLowerCase();
    const topic = String(trend.topic || trend.canonical_topic || '');
    const isIndic = /[\u0900-\u097F\u0980-\u09FF]/.test(topic); // Devanagari or Bengali script
    if (isIndic) {
      return {
        executed: false,
        jevOutcome: 'SKIPPED_MULTILINGUAL',
        confidence: 0,
        shadowMode: this.shadowMode
      };
    }

    try {
      const state = buildTrendTriageState({ trend, recentTopics, recentTitles });
      const evalResult = await this.client.evaluate({
        state,
        questions: TREND_TRIAGE_QUESTIONS
      });

      if (!evalResult.success) {
        await recordJevEvaluation(this.pool, {
          stage: 'trend_triage',
          topic,
          existingSystemResult: existingStatus,
          error: evalResult.error,
          latencyMs: evalResult.latencyMs,
          shadowMode: this.shadowMode
        });

        return {
          executed: false,
          jevOutcome: 'ERROR',
          confidence: 0,
          error: evalResult.error,
          shadowMode: this.shadowMode
        };
      }

      const policy = evaluateTrendTriagePolicy(evalResult.answers, this.thresholds);

      // Record evaluation
      await recordJevEvaluation(this.pool, {
        stage: 'trend_triage',
        sourceItemId: trend.id || trend.slug || null,
        topic,
        jevModel: evalResult.model,
        inputTokens: evalResult.inputTokens,
        latencyMs: evalResult.latencyMs,
        questions: TREND_TRIAGE_QUESTIONS,
        rawAnswers: evalResult.answers,
        confidence: policy.confidence,
        policyResult: policy.outcome,
        rejectionCategory: policy.rejectionCategory,
        topChoiceProbability: policy.topChoiceProbability,
        runnerUpProbability: policy.runnerUpProbability,
        decisionMargin: policy.decisionMargin,
        reasons: policy.reasons,
        existingSystemResult: existingStatus,
        productionActionTaken: ['qualified', 'seeded'].includes(existingStatus) ? 'seeded_to_backlog' : 'watchlisted_or_rejected',
        llmCalled: ['qualified', 'seeded'].includes(existingStatus),
        estimatedLlmCallAvoided: ['qualified', 'seeded'].includes(existingStatus) && policy.outcome === DECISION_OUTCOMES.AUTO_REJECT,
        shadowMode: this.shadowMode
      });

      return {
        executed: true,
        jevOutcome: policy.outcome,
        confidence: policy.confidence,
        metrics: policy.metrics,
        reasons: policy.reasons,
        latencyMs: evalResult.latencyMs,
        shadowMode: this.shadowMode
      };
    } catch (err) {
      return {
        executed: false,
        jevOutcome: 'EXCEPTION',
        confidence: 0,
        error: err.message,
        shadowMode: this.shadowMode
      };
    }
  }

  /**
   * Stage 2: Post-Generation Article QA
   * 
   * In shadow mode: runs after LLM synthesis, logs evaluation against
   * craft dimensions (persona fit, AI cliches, reader value), does NOT block publication.
   */
  async qaArticle({
    title,
    summary,
    content,
    category,
    author,
    recentTitles = []
  }) {
    if (!this.isOperational() || !this.qaEnabled) {
      return {
        executed: false,
        jevOutcome: 'DISABLED',
        confidence: 0,
        shadowMode: this.shadowMode
      };
    }

    try {
      const state = buildArticleQAState({
        title,
        summary,
        content,
        category,
        author,
        recentTitles
      });

      const evalResult = await this.client.evaluate({
        state,
        questions: ARTICLE_QA_QUESTIONS
      });

      if (!evalResult.success) {
        await recordJevEvaluation(this.pool, {
          stage: 'article_qa',
          topic: title,
          existingSystemResult: 'passed_pre_filters',
          error: evalResult.error,
          latencyMs: evalResult.latencyMs,
          shadowMode: this.shadowMode
        });

        return {
          executed: false,
          jevOutcome: 'ERROR',
          confidence: 0,
          error: evalResult.error,
          shadowMode: this.shadowMode
        };
      }

      const policy = evaluateArticleQAPolicy(evalResult.answers, this.thresholds);

      await recordJevEvaluation(this.pool, {
        stage: 'article_qa',
        topic: title,
        jevModel: evalResult.model,
        inputTokens: evalResult.inputTokens,
        latencyMs: evalResult.latencyMs,
        questions: ARTICLE_QA_QUESTIONS,
        rawAnswers: evalResult.answers,
        confidence: policy.confidence,
        policyResult: policy.outcome,
        existingSystemResult: 'passed_pre_filters',
        llmCalled: true,
        shadowMode: this.shadowMode
      });

      return {
        executed: true,
        jevOutcome: policy.outcome,
        confidence: policy.confidence,
        metrics: policy.metrics,
        reasons: policy.reasons,
        latencyMs: evalResult.latencyMs,
        shadowMode: this.shadowMode
      };
    } catch (err) {
      return {
        executed: false,
        jevOutcome: 'EXCEPTION',
        confidence: 0,
        error: err.message,
        shadowMode: this.shadowMode
      };
    }
  }
}
