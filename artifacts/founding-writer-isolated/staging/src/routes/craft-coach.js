import { z } from 'zod';
import { callGeminiApi } from '../bot-engine/gemini-spark-client.js';

/**
 * Interactive In-App Craft Coach API
 *
 * Implements ADK 2 Pillar 4: Task Mode Interaction.
 * Provides real-time, structured schema-validated craft feedback for writers across:
 * - pacing_check: Narrative progression, sentence cadence, and scene density.
 * - sensory_grounding: Concrete tactile details, material reality, and physical anchor density.
 * - dialogue_subtext: Conversation authenticity, spoken rhythm, and unstated emotional stakes.
 *
 * Adheres strictly to WritOn's Anti-Mannered Prose / Direct Statement Rule:
 * Eliminates decorative flourishes and ornamental metaphors.
 */

export const craftCoachRequestSchema = z.object({
  text: z.string().min(20, 'Text must be at least 20 characters long').max(25_000, 'Text exceeds 25,000 character limit'),
  task: z.enum(['pacing_check', 'sensory_grounding', 'dialogue_subtext'], {
    errorMap: () => ({ message: 'Task must be one of: pacing_check, sensory_grounding, dialogue_subtext' })
  }),
  category: z.string().optional().default('Essays'),
  persona: z.string().optional().nullable()
});

/**
 * Deterministic Heuristic Fallback Analysis
 * Guarantees zero downtime, offline capability, and predictable test execution.
 */
export function evaluateHeuristicCraftFeedback({ text, task, category = 'Essays' }) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (task === 'pacing_check') {
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.length ? Math.round(sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length) : 15;
    const longSentences = sentenceLengths.filter(len => len > 35).length;
    const shortSentences = sentenceLengths.filter(len => len < 8).length;

    const observations = [];
    if (longSentences > 2) {
      observations.push({
        location: 'Extended Clauses',
        issue: `${longSentences} sentences exceed 35 words, creating cognitive fatigue during narrative momentum.`,
        recommendation: 'Break multi-clause compound sentences at conjunctions. Let subject-verb actions land before adding qualifiers.'
      });
    }
    if (shortSentences < 2 && sentences.length > 5) {
      observations.push({
        location: 'Sentence Cadence',
        issue: 'Lack of staccato or short sentences creates uniform, monophonic rhythm.',
        recommendation: 'Insert single-clause impact statements following dense exposition to re-anchor reader attention.'
      });
    }
    if (paragraphs.length === 1 && words.length > 150) {
      observations.push({
        location: 'Paragraph Density',
        issue: 'Single unbroken text block obscures narrative beat changes.',
        recommendation: 'Insert paragraph break at the shift in character focus or physical action.'
      });
    }

    const score = Math.max(50, Math.min(95, 88 - (longSentences * 4) - (paragraphs.length === 1 ? 8 : 0)));

    return {
      task,
      score,
      directAssessment: `Average sentence length is ${avgLength} words across ${sentences.length} sentences. Narrative moves steadily, with ${longSentences > 0 ? 'occasional clause drag' : 'good sentence variance'}.`,
      observations: observations.length > 0 ? observations : [
        {
          location: 'Overall Passage',
          issue: 'No severe pacing drag detected.',
          recommendation: 'Maintain alternating sentence lengths to preserve scene momentum.'
        }
      ],
      craftRule: 'Variable Cadence: short sentences accelerate impact; medium sentences convey scene detail; long sentences trace contemplative thought.',
      exercise: 'Find your longest sentence and split it into two distinct statements. Keep the second sentence under 10 words.'
    };
  }

  if (task === 'sensory_grounding') {
    const sensoryTerms = /\b(copper|brass|iron|cold|warm|damp|dust|smoke|diesel|monsoon|rain|stone|timber|salt|bitter|sharp|hum|rattle|shadow|light|glare|rough|silk|leather|glass|chalk)\b/gi;
    const matches = text.match(sensoryTerms) || [];
    const uniqueSensory = Array.from(new Set(matches.map(m => m.toLowerCase())));
    const sensoryDensity = words.length > 0 ? Math.round((matches.length / words.length) * 100) : 0;

    const observations = [];
    if (uniqueSensory.length < 2) {
      observations.push({
        location: 'Sensory Detail',
        issue: 'Passage relies primarily on internal monologue and abstract explanation without physical grounding.',
        recommendation: 'Name two concrete objects within arm\'s reach of the character or speaker. Include texture, temperature, or ambient sound.'
      });
    } else {
      observations.push({
        location: 'Material Anchors',
        issue: `Found ${matches.length} physical details (${uniqueSensory.join(', ')}).`,
        recommendation: 'Ensure each sensory detail advances character intention rather than functioning as passive room decoration.'
      });
    }

    const score = Math.max(50, Math.min(95, 60 + (uniqueSensory.length * 8)));

    return {
      task,
      score,
      directAssessment: `Physical sensory density is ${sensoryDensity}%. Found ${uniqueSensory.length} concrete material anchors.`,
      observations,
      craftRule: 'Tactile Specificity: abstract emotional states gain credibility when anchored to physical surfaces, temperatures, and sounds.',
      exercise: 'Identify one abstract feeling in your text and replace it with a physical reaction to a specific material object.'
    };
  }

  // task === 'dialogue_subtext'
  const quoteCount = (text.match(/["“][^"”]+["”]/g) || []).length;
  const tagCount = (text.match(/\b(said|replied|asked|whispered|shouted|muttered|stated|exclaimed)\b/gi) || []).length;

  const observations = [];
  if (quoteCount === 0) {
    observations.push({
      location: 'Spoken Exchange',
      issue: 'No direct spoken lines found in submitted excerpt.',
      recommendation: 'If this scene involves two characters, introduce direct speech where one character wants something the other will not give.'
    });
  } else if (tagCount > quoteCount * 0.8) {
    observations.push({
      location: 'Dialogue Attribution',
      issue: 'Frequent explanatory dialogue tags interrupt the spoken rhythm.',
      recommendation: 'Cut repetitive attribution tags. Let action beats or distinctive speech cadences identify who is speaking.'
    });
  } else {
    observations.push({
      location: 'Conversational Tension',
      issue: 'Dialogue lines are functional.',
      recommendation: 'Check whether characters say exactly what they mean. In real exchanges, speakers deflect, compress, or change the subject.'
    });
  }

  const score = Math.max(55, Math.min(95, quoteCount > 0 ? 82 - Math.max(0, tagCount - quoteCount) * 5 : 65));

  return {
    task,
    score,
    directAssessment: quoteCount > 0
      ? `Found ${quoteCount} spoken dialogue turns. Attribution is ${tagCount <= quoteCount ? 'clean' : 'tag-heavy'}.`
      : 'Passage contains descriptive prose without spoken exchange.',
    observations,
    craftRule: 'Subtextual Gap: tension exists in the distance between what a character needs and what they allow themselves to say.',
    exercise: 'Delete every dialogue tag and adverb in the scene. Replace only where speaker identity is genuinely ambiguous.'
  };
}

/**
 * AI-Assisted Craft Coach Evaluation via Gemini Flash
 */
export async function analyzeCraftTask({
  text,
  task,
  category = 'Essays',
  persona = null,
  apiKey = null
}) {
  const activeKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!activeKey) {
    return evaluateHeuristicCraftFeedback({ text, task, category });
  }

  const taskPrompts = {
    pacing_check: 'Analyze narrative progression, sentence cadence, clause density, and scene momentum. Identify where text drags or rushes.',
    sensory_grounding: 'Analyze concrete sensory details (texture, sound, light, temperature, materials). Identify where abstract explanation needs tactile grounding.',
    dialogue_subtext: 'Analyze spoken rhythm, conversational authenticity, unstated stakes, and dialogue tag economy. Identify where characters over-explain.'
  };

  const systemInstruction = `You are a rigorous literary editor and craft coach at WritOn.
You evaluate prose using the Direct Statement Rule:
- Eliminate mannered prose, decorative flourishes, and ornamental metaphors.
- Never substitute a metaphor for a direct statement.
- Be concise, direct, and actionable.
Output strictly valid JSON matching this schema:
{
  "task": "${task}",
  "score": <integer between 0 and 100>,
  "directAssessment": "<1-2 sentence direct evaluation of primary strength and structural weakness>",
  "observations": [
    {
      "location": "<paragraph/sentence location>",
      "issue": "<direct explanation of the craft issue>",
      "recommendation": "<concrete rewrite action>"
    }
  ],
  "craftRule": "<name and core principle of the craft technique applied>",
  "exercise": "<a 5-minute targeted revision exercise>"
}`;

  const userPrompt = `TASK: ${task.toUpperCase()}
CATEGORY: ${category}
${persona ? `COACHING VOICE / LENS: ${persona}` : ''}
INSTRUCTIONS: ${taskPrompts[task]}

SUBMITTED TEXT:
"""
${text}
"""`;

  try {
    const rawOutput = await callGeminiApi({
      apiKey: activeKey,
      model: process.env.GEMINI_FLASH_MODEL || 'gemini-3.5-flash',
      prompt: userPrompt,
      systemInstruction,
      temperature: 0.3,
      timeoutMs: 12000
    });

    const cleaned = rawOutput.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);

    return {
      task,
      score: typeof parsed.score === 'number' ? parsed.score : 80,
      directAssessment: parsed.directAssessment || 'Assessment completed.',
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
      craftRule: parsed.craftRule || 'Write with direct statements and precise verbs.',
      exercise: parsed.exercise || 'Revise the opening sentence to state the core conflict directly.'
    };
  } catch (err) {
    console.warn(`[Craft Coach] LLM analysis failed (${err.message}). Falling back to heuristic evaluator.`);
    return evaluateHeuristicCraftFeedback({ text, task, category });
  }
}

/**
 * Fastify Routes Plugin for Craft Coach
 */
export async function craftCoachRoutes(fastify, options) {
  fastify.post('/api/v1/craft/coach', async (request, reply) => {
    const parsed = craftCoachRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid craft coach request',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const { text, task, category, persona } = parsed.data;

    try {
      const result = await analyzeCraftTask({
        text,
        task,
        category,
        persona,
        apiKey: options?.apiKey
      });

      return reply.code(200).send(result);
    } catch (err) {
      fastify.log?.error?.(err, '[Craft Coach Error]');
      return reply.code(500).send({
        error: 'Craft coach analysis failed',
        message: err.message
      });
    }
  });
}
