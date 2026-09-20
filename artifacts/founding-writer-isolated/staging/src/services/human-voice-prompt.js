/**
 * human-voice-prompt.js
 * 
 * Reusable Human Voice Prompt Directive and Stylometric Evaluator.
 * Derived from empirical analysis of 152,348 human words across 623 WritOn posts
 * (documented in campaign/HUMAN_VOICE_CODEX.md).
 * 
 * Follows Ponytail principle: zero dependencies, native regex.
 */

export const BANNED_AI_WORDS = [
  'delve', 'delving', 'tapestry', 'beacon', 'testament', 'realm', 'crucial',
  'landscape', 'unwavering', 'bustling', 'pivotal', 'moreover', 'furthermore',
  'in conclusion', 'it is important to remember', 'serves as a reminder',
  'beacon of hope', 'rich tapestry', 'vital role', 'paramount', 'dynamic',
  'multifaceted', 'ever-evolving', 'embark', 'unfurl', 'poignant reminder',
  'testament to', 'game-changer', 'fostering', 'holistic', 'intertwined',
  'nuanced', 'resonates deeply', 'seamlessly', 'shedding light'
];

export const VOICE_ARCHETYPES = {
  SPARE: 'spare_and_restrained',
  VULNERABLE: 'conversational_and_vulnerable',
  LYRICAL: 'lyrical_and_resonant',
  ANALYTICAL: 'analytical_and_precise'
};

export const CRAFT_ARCHETYPES = {
  restrained: VOICE_ARCHETYPES.SPARE,
  conversational: VOICE_ARCHETYPES.VULNERABLE,
  lyrical: VOICE_ARCHETYPES.LYRICAL,
  analytical: VOICE_ARCHETYPES.ANALYTICAL
};

export const GENRE_CRAFT_GUIDANCE = {
  Essays: `GENRE GUIDANCE: Essays
- Root the central argument in physical materials, architecture, or verifiable trade-offs.
- Avoid abstract preaching or easy moral resolutions; let the conflict cost the narrator something concrete.`,
  'Short Stories': `GENRE GUIDANCE: Short Stories
- Enter in media res with active sensory details; avoid biographical setup.
- Reveal relationships through domestic objects, imperfect habits, and unspoken frictions.`,
  Humour: `GENRE GUIDANCE: Humour
- Ground comedy in observational precision, domestic bureaucracy, and self-implicating hypocrisy.
- Avoid cynical parody or forced punchlines; let situational absurdity speak for itself.`,
  Poetry: `GENRE GUIDANCE: Poetry
- Prioritize musical cadence, line-break breath, and acoustic rhythm over decorative rhyming.
- Anchor emotional states in tactile textures and domestic details.`
};

/**
 * Returns a strict system prompt directive enforcing human cadence and anti-AI craft rules.
 * Supports both legacy string signature `getCraftVoicePrompt(VOICE_ARCHETYPES.SPARE)`
 * and options signature `getCraftVoicePrompt({ genre, archetype, destination })`.
 *
 * @param {string|object} optionsOrArchetype - Either archetype string or options object
 * @returns {string}
 */
export function getCraftVoicePrompt(optionsOrArchetype = VOICE_ARCHETYPES.SPARE) {
  let genre = null;
  let rawArchetype = VOICE_ARCHETYPES.SPARE;
  let destination = 'story';

  if (typeof optionsOrArchetype === 'object' && optionsOrArchetype !== null) {
    genre = optionsOrArchetype.genre || null;
    destination = optionsOrArchetype.destination || 'story';
    const reqArch = optionsOrArchetype.archetype;
    if (reqArch && CRAFT_ARCHETYPES[reqArch]) {
      rawArchetype = CRAFT_ARCHETYPES[reqArch];
    } else if (reqArch && Object.values(VOICE_ARCHETYPES).includes(reqArch)) {
      rawArchetype = reqArch;
    } else {
      rawArchetype = VOICE_ARCHETYPES.SPARE;
    }
  } else if (typeof optionsOrArchetype === 'string') {
    if (CRAFT_ARCHETYPES[optionsOrArchetype]) {
      rawArchetype = CRAFT_ARCHETYPES[optionsOrArchetype];
    } else if (Object.values(VOICE_ARCHETYPES).includes(optionsOrArchetype)) {
      rawArchetype = optionsOrArchetype;
    } else {
      rawArchetype = VOICE_ARCHETYPES.SPARE;
    }
  }

  let archetypeDirective = '';
  switch (rawArchetype) {
    case VOICE_ARCHETYPES.VULNERABLE:
      archetypeDirective = `
ARCHETYPE: THE CONVERSATIONAL & VULNERABLE / Conversational & Vulnerable (Domestic Friction)
- Ground the scene in an everyday mundane object or exact clock time (e.g. "At 5:55 PM, the tea was cold", glasses, doorway).
- Acknowledge awkwardness and complicity; allow self-doubt, personal hypocrisy, or honest domestic friction.
- Avoid academic polish. Sound like a person thinking out loud at their desk.`;
      break;
    case VOICE_ARCHETYPES.LYRICAL:
      archetypeDirective = `
ARCHETYPE: THE LYRICAL & RESONANT / Lyrical & Resonant (Acoustic Cadence)
- Focus on the music of the sentence: varying syllables, natural pauses, sensory resonance (rain on glass, silence in an empty corridor).
- Use em-dashes and ellipses naturally to mimic human breath.
- Code-switch with cultural/bilingual texture where appropriate.`;
      break;
    case VOICE_ARCHETYPES.ANALYTICAL:
      archetypeDirective = `
ARCHETYPE: THE ANALYTICAL & PRECISE / Analytical & Precise (Frictional Truth)
- Reject generic claims; use exact measurements, physics, physical trade-offs.
- Avoid promotional enthusiasm. State the hard reality directly.`;
      break;
    case VOICE_ARCHETYPES.SPARE:
    default:
      archetypeDirective = `
ARCHETYPE: THE SPARE & RESTRAINED / Spare & Restrained (Architectural Silence)
- Exercise sensory subtraction. Never explain an emotion; describe the physical room or object it happened in.
- Cut every decorative adjective. Keep sentences short, declarative, and tactile.`;
      break;
  }

  const genreSection = (genre && GENRE_CRAFT_GUIDANCE[genre])
    ? `\n${GENRE_CRAFT_GUIDANCE[genre]}\n`
    : '';

  const destinationSection = destination === 'comment'
    ? `
=== COMMUNITY CONVERSATION DIRECTIVE ===
- Write as an authentic fellow reader in under 25 words.
- React directly to a specific sentence, image, or concrete detail in the piece.
- Never re-summarize the post, explain the moral, or perform literary analysis.
`
    : '';

  return `
=== WRITON HUMAN CRAFT VOICE DIRECTIVE ===
You are writing in the authentic human voice of WritOn writers (derived from 152k words of genuine human prose).
Follow these strict rules without exception:

1. RHYTHM & BURSTINESS:
   - Vary sentence lengths aggressively. Interlock 3-word punchy sentences with longer sensory lines.
   - Never write two sentences of equal length consecutively. Median sentence length ~10 to 12 words (with high natural variance).

2. ZERO THROAT-CLEARING:
   - Open *in media res* on a physical action, a concrete noun, or a direct statement.
   - NEVER open with generic preambles: "In today's fast-paced world", "Writing has always been", "Throughout history".

3. PHYSICAL SENSORY ANCHORING:
   - For every abstract thought, anchor it to a concrete physical noun (timber, brass, mustard oil, ink, cold rain, teapot).

4. NO SUMMARY ENDINGS:
   - Never end on a moral lesson, a TED-talk summary, or "In conclusion". End on an unresolved sensory detail or quiet physical action.

5. Anti-Slop Discipline / STRICTLY FORBIDDEN AI WORDS:
   Do not use any of the following: delve, tapestry, beacon, testament, realm, crucial, landscape, unwavering, bustling, pivotal, moreover, furthermore, in conclusion, embark, unfurl, game-changer, holistic, intertwined, resonates deeply, seamlessly.
${archetypeDirective}
${genreSection}
${destinationSection}
=========================================
`.trim();
}

/**
 * Splits text into sentences cleanly.
 * @param {string} text 
 * @returns {string[]}
 */
export function extractSentences(text) {
  if (!text) return [];
  const clean = text
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/\n+/g, ' ');

  const raw = clean.match(/[^.!?]+[.!?]+(\s|$)/g) || [clean];
  return raw
    .map(s => s.trim())
    .filter(s => s.length > 3 && /\w/.test(s));
}

/**
 * Computes standard deviation of sentence lengths (Burstiness index).
 * @param {string[]} sentences 
 * @returns {{ mean: number, stdDev: number, counts: number[] }}
 */
export function calculateBurstiness(sentences) {
  if (!sentences || sentences.length === 0) return { mean: 0, stdDev: 0, counts: [] };
  const counts = sentences.map(s => (s.match(/[\p{L}\p{N}']+/gu) || []).length).filter(c => c > 0);
  if (counts.length === 0) return { mean: 0, stdDev: 0, counts: [] };

  const sum = counts.reduce((a, b) => a + b, 0);
  const mean = sum / counts.length;
  const variance = counts.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    counts
  };
}

/**
 * Scans text for forbidden AI cliches.
 * @param {string} text 
 * @returns {string[]} Detected tropes
 */
export function detectAiTropes(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const detected = [];
  for (const trope of BANNED_AI_WORDS) {
    const regex = new RegExp(`\\b${trope}\\b`, 'gi');
    if (regex.test(lower)) {
      detected.push(trope);
    }
  }
  return detected;
}

const THROAT_CLEARING_PATTERNS = [
  /^in today'?s/i,
  /^throughout (history|human)/i,
  /^in the (realm|world|landscape|fast-paced)/i,
  /^it is (important|crucial|essential|worth noting) to/i,
  /^we live in an? (world|era|age) where/i,
  /^writing has always been/i
];

const SUMMARY_ENDING_PATTERNS = [
  /in conclusion/i,
  /ultimately,/i,
  /so (next time|remember to|let us)/i,
  /serves as a (testament|reminder)/i,
  /at the end of the day/i
];

/**
 * Evaluates candidate prose against WritOn's empirical human voice standards.
 * Pure native regex and math (Ponytail principle - zero dependencies).
 * @param {string} text
 * @returns {{ score: number, passed: boolean, stats: object, issues: Array<{type: string, severity: string, message: string}> }}
 */
export function auditTextQuality(text) {
  const issues = [];
  let score = 100;

  if (!text || text.trim().length === 0) {
    return { score: 0, passed: false, issues: [{ type: 'EMPTY_TEXT', severity: 'HIGH', message: 'Text is empty' }], stats: {} };
  }

  // 1. Check AI Clichés
  const detectedTropes = detectAiTropes(text);
  if (detectedTropes.length > 0) {
    const penalty = Math.min(45, detectedTropes.length * 15);
    score -= penalty;
    issues.push({
      type: 'AI_CLICHE',
      severity: 'HIGH',
      message: `Detected ${detectedTropes.length} forbidden AI trope(s): ${detectedTropes.map(t => `"${t}"`).join(', ')}. Replace with direct physical nouns or literal statements.`
    });
  }

  // 2. Sentences and Burstiness
  const sentences = extractSentences(text);
  const burstiness = calculateBurstiness(sentences);

  if (sentences.length >= 3) {
    if (burstiness.stdDev < 5.0) {
      score -= 25;
      issues.push({
        type: 'MONOTONOUS_CADENCE',
        severity: 'HIGH',
        message: `Low burstiness (StdDev: ${burstiness.stdDev}, benchmark > 7.0). Sentences are too uniform in length (~${burstiness.mean} words). Interlock short punchy lines with long sensory ones.`
      });
    } else if (burstiness.stdDev < 7.0) {
      score -= 10;
      issues.push({
        type: 'MODERATE_BURSTINESS',
        severity: 'MEDIUM',
        message: `Burstiness is borderline (StdDev: ${burstiness.stdDev}). Increase variance between staccato beats and rolling descriptions.`
      });
    }
  }

  // 3. Opening Hook Inspection
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim();
    const isThroatClearing = THROAT_CLEARING_PATTERNS.some(re => re.test(firstSentence));
    if (isThroatClearing) {
      score -= 20;
      issues.push({
        type: 'THROAT_CLEARING_OPENING',
        severity: 'HIGH',
        message: `Opening has synthetic preamble: "${firstSentence.slice(0, 70)}...". Start in media res on a physical action or concrete observation.`
      });
    }
  }

  // 4. Ending Inspection
  if (sentences.length > 1) {
    const lastSentence = sentences[sentences.length - 1].trim();
    const isSummary = SUMMARY_ENDING_PATTERNS.some(re => re.test(lastSentence));
    if (isSummary) {
      score -= 15;
      issues.push({
        type: 'SUMMARY_ENDING',
        severity: 'MEDIUM',
        message: `Conclusion has an artificial summary: "${lastSentence.slice(0, 70)}...". End on an unresolved sensory detail or quiet physical action.`
      });
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    passed: score >= 75 && detectedTropes.length === 0,
    stats: {
      sentenceCount: sentences.length,
      meanSentenceLength: burstiness.mean,
      burstinessIndex: burstiness.stdDev,
      sentenceLengths: burstiness.counts,
      wordCount: (text.match(/[\p{L}\p{N}']+/gu) || []).length,
      tropeHits: detectedTropes.length,
      detectedTropes
    },
    issues
  };
}
