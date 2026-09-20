import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkedInClient } from '../src/services/linkedin-client.js';
import { LinkedInValidatorService } from '../src/services/linkedin-validator-service.js';

describe('Modern LinkedIn Bot Subsystem Unit Tests', () => {
  let client;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new LinkedInClient({
      accessToken: 'mock_bearer_token',
      personUrn: 'urn:li:person:mock_123',
      apiVersion: '202609',
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
  });

  it('correctly reports configuration status', () => {
    expect(client.isConfigured()).toBe(true);

    const empty = new LinkedInClient({ accessToken: null, personUrn: null });
    expect(empty.isConfigured()).toBe(false);
  });

  it('formats Posts API payload with Linkedin-Version 202609 and captures x-restli-id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 201,
      headers: new Headers({
        'x-restli-id': 'urn:li:share:123456789',
      }),
      json: async () => ({ id: 'urn:li:share:123456789' }),
    });

    const result = await client.createPost({
      commentary: 'A quiet sentence written on paper.',
      format: 'TEXT_ONLY',
    });

    expect(result.success).toBe(true);
    expect(result.outcome).toBe('SUCCESS');
    expect(result.postUrn).toBe('urn:li:share:123456789');
    expect(result.rawXRestliId).toBe('urn:li:share:123456789');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('https://api.linkedin.com/rest/posts');
    expect(opts.headers['Linkedin-Version']).toBe('202609');
    expect(opts.headers['X-Restli-Protocol-Version']).toBe('2.0.0');
  });

  it('classifies HTTP 201 without x-restli-id as UNKNOWN (preventing duplicate retry)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 201,
      headers: new Headers(), // missing x-restli-id
      json: async () => ({}),
    });

    const result = await client.createPost({
      commentary: 'Valid commentary text.',
      format: 'TEXT_ONLY',
    });

    expect(result.success).toBe(false);
    expect(result.outcome).toBe('UNKNOWN');
    expect(result.httpStatus).toBe(201);
  });

  it('validates 19 LinkedIn-specific quality gates (LI01-LI19)', () => {
    const validator = new LinkedInValidatorService();

    // Rejects empty thought-leadership bait
    const baitEvaluation = validator.evaluateGates({
      commentary: 'A long paragraph explaining writing habits. Agree?',
      format: 'TEXT_ONLY',
    });
    expect(baitEvaluation.allPassed).toBe(false);
    const li02 = baitEvaluation.results.find((r) => r.gateCode === 'LI02_EMPTY_THOUGHT_LEADERSHIP');
    expect(li02.passed).toBe(false);

    // Rejects corporate jargon density
    const jargonEvaluation = validator.evaluateGates({
      commentary: 'We need to leverage our 10x flywheel and synergy to scale the platform.',
      format: 'TEXT_ONLY',
    });
    expect(jargonEvaluation.allPassed).toBe(false);
    const li03 = jargonEvaluation.results.find((r) => r.gateCode === 'LI03_CORPORATE_JARGON_DENSITY');
    expect(li03.passed).toBe(false);

    // Rejects simulated persona bylines that compromise trust (LI17)
    const personaEval = validator.evaluateGates({
      commentary: 'A wonderful essay by Dr. Sunita Banerjee on writing habits and student rubrics.',
      format: 'TEXT_ONLY',
    });
    expect(personaEval.allPassed).toBe(false);
    const li17 = personaEval.results.find((r) => r.gateCode === 'LI17_AUTHOR_VOICE_MISMATCH');
    expect(li17.passed).toBe(false);

    // Rejects label-as-hook openings (LI18)
    const labelEval = validator.evaluateGates({
      commentary: 'The Craft of Writing: Verified writing walkthrough\n\nHere is how to write your story.',
      format: 'TEXT_ONLY',
    });
    expect(labelEval.allPassed).toBe(false);
    const li18 = labelEval.results.find((r) => r.gateCode === 'LI18_HOOK_LABEL_PROHIBITION');
    expect(li18.passed).toBe(false);

    // Rejects outside allowed days or time windows (LI20)
    // Sunday 14:00 IST
    const sundayDate = new Date('2026-09-20T08:30:00.000Z'); // Sunday 14:00 IST
    const invalidDayEval = validator.evaluateGates({
      commentary: 'Valid craft thought.',
      format: 'TEXT_ONLY',
      targetDate: sundayDate,
    });
    expect(invalidDayEval.allPassed).toBe(false);
    const li20 = invalidDayEval.results.find((r) => r.gateCode === 'LI20_SCHEDULE_DAY_WINDOW');
    expect(li20.passed).toBe(false);

    // Monday 09:00 AM IST (03:30 UTC)
    const validMondayMorning = new Date('2026-09-21T03:30:00.000Z');

    // Passes authentic, clean craft commentary on allowed day/window
    const cleanEvaluation = validator.evaluateGates({
      commentary:
        '“Replace \'He was happy\' with one action a reader could see.”\n\nCrafting stories is not about telling readers what to feel. It is about giving them the physical gesture, the pause, and the sensory detail to feel it themselves.',
      format: 'TEXT_ONLY',
      targetDate: validMondayMorning,
    });
    expect(cleanEvaluation.allPassed).toBe(true);
    expect(cleanEvaluation.failedGates).toBe(0);
  });

  it('deletes post via LinkedIn Posts API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 204,
      headers: new Headers(),
      text: async () => '',
    });

    const result = await client.deletePost('urn:li:share:12345');
    expect(result.success).toBe(true);
    expect(result.httpStatus).toBe(204);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.linkedin.com/rest/posts/urn%3Ali%3Ashare%3A12345',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
