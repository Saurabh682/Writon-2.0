import { describe, it, expect } from 'vitest';
import {
  evaluateHeuristicCraftFeedback,
  analyzeCraftTask,
  craftCoachRequestSchema
} from '../src/routes/craft-coach.js';

describe('ADK 2 Pillar 4: Craft Coach Task Mode', () => {
  describe('Schema Validation', () => {
    it('validates a correct pacing_check request', () => {
      const payload = {
        text: 'The evening train to Dhanbad had stopped three kilometers before the outer signal. The carriage smelled of damp wool and cold tea.',
        task: 'pacing_check',
        category: 'Short Stories'
      };
      const parsed = craftCoachRequestSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('rejects text shorter than 20 characters', () => {
      const payload = {
        text: 'Too short',
        task: 'pacing_check'
      };
      const parsed = craftCoachRequestSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
      expect(parsed.error.flatten().fieldErrors.text).toBeDefined();
    });

    it('rejects unsupported task types', () => {
      const payload = {
        text: 'A valid text that exceeds twenty characters easily.',
        task: 'invented_task'
      };
      const parsed = craftCoachRequestSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
      expect(parsed.error.flatten().fieldErrors.task).toBeDefined();
    });
  });

  describe('Heuristic Evaluation Engine ($0 / Offline / Unit Test Reliability)', () => {
    it('analyzes pacing_check and reports sentence metrics with actionable guidance', () => {
      const longText = `The monsoon had settled heavily over the valley for three continuous weeks without letting a single ray of clear daylight break through the thick, gray canopy of cloud cover that hung directly over the slate roofs of the small hillside market town where tea merchants sat behind wooden counters waiting for customers who would never arrive in such weather. The road was washed out. No buses were running from the plains below. The town waited in silence.`;
      
      const feedback = evaluateHeuristicCraftFeedback({
        text: longText,
        task: 'pacing_check',
        category: 'Essays'
      });

      expect(feedback.task).toBe('pacing_check');
      expect(typeof feedback.score).toBe('number');
      expect(feedback.directAssessment).toContain('Average sentence length is');
      expect(feedback.observations.length).toBeGreaterThan(0);
      expect(feedback.craftRule).toBeDefined();
      expect(feedback.exercise).toBeDefined();
    });

    it('analyzes sensory_grounding and detects concrete material nouns', () => {
      const sensoryText = `He held the copper wire between two fingers, scraping the burnt enamel off with an iron nail. Cold rain battered the corrugated tin roof. Smoke from the kerosene stove filled the workshop with a bitter haze.`;

      const feedback = evaluateHeuristicCraftFeedback({
        text: sensoryText,
        task: 'sensory_grounding',
        category: 'Tech'
      });

      expect(feedback.task).toBe('sensory_grounding');
      expect(feedback.score).toBeGreaterThanOrEqual(70);
      expect(feedback.directAssessment).toContain('concrete material anchors');
      expect(feedback.observations[0].issue).toMatch(/copper|iron|rain|smoke|bitter/);
      expect(feedback.craftRule).toContain('Tactile Specificity');
    });

    it('analyzes dialogue_subtext and flags dialogue tag clutter', () => {
      const dialogueText = `
        "Where are the ledgers?" he asked loudly.
        "In the safe," she replied defensively.
        "The lock was broken yesterday," he stated angrily.
        "I didn't break it," she muttered quietly.
      `;

      const feedback = evaluateHeuristicCraftFeedback({
        text: dialogueText,
        task: 'dialogue_subtext',
        category: 'Short Stories'
      });

      expect(feedback.task).toBe('dialogue_subtext');
      expect(feedback.directAssessment).toContain('spoken dialogue turns');
      expect(feedback.craftRule).toContain('Subtextual Gap');
      expect(feedback.exercise).toContain('dialogue tag');
    });

    it('analyzeCraftTask falls back to heuristic engine when no API key is provided', async () => {
      const result = await analyzeCraftTask({
        text: 'The engine was cold. A layer of grey dust coated the steel manifold.',
        task: 'sensory_grounding',
        category: 'Reviews',
        apiKey: null
      });

      expect(result.task).toBe('sensory_grounding');
      expect(result.score).toBeDefined();
      expect(result.directAssessment).toBeDefined();
      expect(result.craftRule).toBeDefined();
    });
  });
});
