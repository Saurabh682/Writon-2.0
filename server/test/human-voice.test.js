import { describe, it, expect } from 'vitest';
import {
  BANNED_AI_WORDS,
  VOICE_ARCHETYPES,
  getCraftVoicePrompt,
  extractSentences,
  calculateBurstiness,
  detectAiTropes,
  auditTextQuality
} from '../src/services/human-voice-prompt.js';
import { analyzeText } from '../../scripts/human_voice_linter.mjs';

describe('Human Voice & Stylometrics Service', () => {
  describe('detectAiTropes', () => {
    it('detects multiple forbidden AI clichés accurately', () => {
      const sample = 'We must delve into this rich tapestry and find a beacon of hope in this crucial realm.';
      const detected = detectAiTropes(sample);
      expect(detected).toContain('delve');
      expect(detected).toContain('tapestry');
      expect(detected).toContain('beacon of hope');
      expect(detected).toContain('crucial');
      expect(detected).toContain('realm');
    });

    it('returns empty array when text contains zero synthetic clichés', () => {
      const humanText = 'The tea was cold. She waited by the door with a brass cup in hand.';
      const detected = detectAiTropes(humanText);
      expect(detected).toEqual([]);
    });

    it('handles case-insensitivity and punctuation boundaries', () => {
      const text = 'DELVE! Tapestry, moreover...';
      const detected = detectAiTropes(text);
      expect(detected).toContain('delve');
      expect(detected).toContain('tapestry');
      expect(detected).toContain('moreover');
    });
  });

  describe('calculateBurstiness', () => {
    it('calculates mean and standard deviation accurately', () => {
      const sentences = [
        'Short line.', // 2 words
        'This is a moderately sized sentence with several words.', // 9 words
        'Here is another very long and intricate descriptive sentence that stretches out across the entire page with cadence.', // 18 words
        'Done.' // 1 word
      ];
      const stats = calculateBurstiness(sentences);
      expect(stats.counts).toEqual([2, 9, 18, 1]);
      expect(stats.mean).toBe(7.5);
      expect(stats.stdDev).toBeGreaterThan(6.0);
    });

    it('returns zero stats for empty inputs', () => {
      const stats = calculateBurstiness([]);
      expect(stats.mean).toBe(0);
      expect(stats.stdDev).toBe(0);
      expect(stats.counts).toEqual([]);
    });
  });

  describe('getCraftVoicePrompt', () => {
    it('returns system prompt containing all 4 core rules', () => {
      const prompt = getCraftVoicePrompt(VOICE_ARCHETYPES.SPARE);
      expect(prompt).toContain('BURSTINESS');
      expect(prompt).toContain('ZERO THROAT-CLEARING');
      expect(prompt).toContain('PHYSICAL SENSORY ANCHORING');
      expect(prompt).toContain('STRICTLY FORBIDDEN AI WORDS');
      expect(prompt).toContain('delve');
    });

    it('injects specific archetype directives for all 4 archetypes', () => {
      expect(getCraftVoicePrompt(VOICE_ARCHETYPES.VULNERABLE)).toContain('Conversational & Vulnerable');
      expect(getCraftVoicePrompt(VOICE_ARCHETYPES.LYRICAL)).toContain('Lyrical & Resonant');
      expect(getCraftVoicePrompt(VOICE_ARCHETYPES.ANALYTICAL)).toContain('Analytical & Precise');
      expect(getCraftVoicePrompt(VOICE_ARCHETYPES.SPARE)).toContain('Spare & Restrained');
    });
  });

  describe('analyzeText (Human Voice Linter)', () => {
    it('penalizes robotic, cliché-ridden machine prose heavily', () => {
      const aiText = "In today's fast-paced world, it is crucial to delve into the rich tapestry of human storytelling. Furthermore, this serves as a beacon of hope for writers embarking on a transformative journey. In conclusion, storytelling resonates deeply with our multifaceted existence.";
      const res = analyzeText(aiText);
      expect(res.score).toBeLessThanOrEqual(20);
      expect(res.issues.some(i => i.type === 'AI_CLICHE')).toBe(true);
      expect(res.issues.some(i => i.type === 'THROAT_CLEARING_OPENING')).toBe(true);
      expect(res.issues.some(i => i.type === 'SUMMARY_ENDING')).toBe(true);
    });

    it('awards high score to grounded human prose with high burstiness and zero clichés', () => {
      const humanText = 'The tea was already cold. At 5:55 PM, she walked to the doorway with a single brass cup in her hand, listening to the rain fall against the teak wood sill. He was not there. Five minutes passed before the street lamp flickered to life.';
      const res = analyzeText(humanText);
      expect(res.score).toBe(100);
      expect(res.stats.burstinessIndex).toBeGreaterThan(7.0);
      expect(res.stats.tropeHits).toBe(0);
      expect(res.issues).toHaveLength(0);
    });
  });

  describe('auditTextQuality (Service Function)', () => {
    it('returns passed: true for high quality prose', () => {
      const humanText = 'The tea was already cold. At 5:55 PM, she walked to the doorway with a single brass cup in her hand, listening to the rain fall against the teak wood sill. He was not there. Five minutes passed before the street lamp flickered to life.';
      const result = auditTextQuality(humanText);
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.stats.tropeHits).toBe(0);
    });

    it('returns passed: false when AI cliches are present', () => {
      const aiText = 'We must delve into this tapestry.';
      const result = auditTextQuality(aiText);
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(75);
      expect(result.stats.detectedTropes).toContain('delve');
      expect(result.stats.detectedTropes).toContain('tapestry');
    });
  });
});
