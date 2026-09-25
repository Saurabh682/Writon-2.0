/**
 * Jev System One Client (TypeSafe AI)
 * 
 * Thin, zero-dependency HTTP client for TypeSafe AI's Jev decision model.
 * Evaluates compact state against atomic typed questions:
 * - Choice (categorical decision)
 * - Score (continuous range [0, 1])
 * - Noul (probabilistic yes/no [0, 1])
 * 
 * Fails safely: on network error, timeout, malformed payload, or API downtime,
 * it returns a structured failure object without throwing, allowing upstream
 * callers to immediately fall back to existing deterministic or LLM pipelines.
 */

const DEFAULT_TIMEOUT_MS = 3500;

export class JevClient {
  constructor({
    apiKey = process.env.JEV_API_KEY || null,
    apiUrl = process.env.JEV_API_URL || 'https://api.typesafe.ai/v1/systemone',
    model = process.env.JEV_MODEL || 'jev-1.13.0',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchFn = globalThis.fetch
  } = {}) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchFn;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Evaluates state against defined atomic questions.
   *
   * @param {Object} params
   * @param {Object|string} params.state - Context/item to evaluate
   * @param {Object} params.questions - Map of question definitions
   * @returns {Promise<{
   *   success: boolean,
   *   model?: string,
   *   answers?: Object,
   *   latencyMs: number,
   *   inputTokens?: number,
   *   error?: string
   * }>}
   */
  async evaluate({ state, questions }) {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        success: false,
        latencyMs: 0,
        error: 'Jev API key not configured'
      };
    }

    if (!questions || typeof questions !== 'object' || Object.keys(questions).length === 0) {
      return {
        success: false,
        latencyMs: 0,
        error: 'No questions provided for Jev evaluation'
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const payload = {
        model: this.model,
        state: typeof state === 'string' ? state : JSON.stringify(state),
        questions
      };

      const response = await this.fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const latencyMs = Date.now() - startTime;
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return {
          success: false,
          latencyMs,
          error: `Jev HTTP ${response.status}: ${errText.slice(0, 200)}`
        };
      }

      const data = await response.json();
      if (!data || typeof data !== 'object' || !data.answers) {
        return {
          success: false,
          latencyMs,
          error: 'Malformed Jev response: missing "answers" object'
        };
      }

      return {
        success: true,
        model: data.model || this.model,
        answers: data.answers,
        latencyMs,
        inputTokens: data.usage?.prompt_tokens || data.inputTokens || null
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError' || err.code === 20;
      return {
        success: false,
        latencyMs,
        error: isTimeout ? `Jev request timed out after ${this.timeoutMs}ms` : err.message
      };
    }
  }
}
