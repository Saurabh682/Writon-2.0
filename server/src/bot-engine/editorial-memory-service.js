/**
 * WritOn Editorial Memory Service
 *
 * Persistent narrative memory for the autonomous essay pipeline.
 * Prevents structural, mechanical, and thematic repetition by storing
 * and comparing *narrative fingerprints* — the mechanics of each piece,
 * not merely words and topics.
 *
 * Tables: editorial_narrative_fingerprints, editorial_failure_patterns, editorial_cooldowns
 */

import { createHash } from 'node:crypto';

// ponytail: Cooldown durations are hardcoded here. Upgrade to DB-configurable
// if persona-specific overrides are needed beyond 10 personas.
const COOLDOWN_DAYS = {
  subject_domain:      { persona: 14, platform: 7 },
  setting:             { persona: 10, platform: 5 },
  narrative_mechanism: { persona: 14, platform: 7 },
  metaphor_family:     { persona: 10, platform: 5 },
  opening_device:      { persona: 7,  platform: 3 },
  ending_device:       { persona: 7,  platform: 3 },
  emotional_arc:       { persona: 10, platform: 5 }
};

/**
 * Extract a narrative fingerprint from published text using Gemini Flash.
 * Runs post-publish only — not on the generation hot path.
 *
 * @param {string} title - The article title
 * @param {string} content - The article body text
 * @param {object} persona - { id, fullName, penName }
 * @param {string} [category='Essays'] - Genre
 * @param {string} [apiKey] - Gemini API key (falls back to env)
 * @returns {Promise<object>} Narrative fingerprint object
 */
export async function extractNarrativeFingerprint(title, content, persona, category = 'Essays', apiKey = null) {
  const activeKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  // Fallback: if no API key, extract what we can heuristically
  if (!activeKey) {
    return buildHeuristicFingerprint(title, content, persona, category);
  }

  const prompt = `Analyze this published essay and extract its narrative fingerprint as a JSON object.

Title: "${title}"
Author: ${persona.fullName}
Category: ${category}

Text:
${content.slice(0, 3000)}

Return ONLY a valid JSON object with these exact fields:
{
  "subject_domain": "a 2-4 word slug describing the core subject (e.g. 'motorsport_commercialization', 'phone_hardware_diminishing_returns', 'mutual_fund_anxiety')",
  "setting": "the primary physical location or environment (e.g. 'Mysore office', 'Delhi dining table', 'Mumbai port')",
  "central_question": "the essay's driving question in one sentence",
  "narrative_mechanism": "the core argumentative device (e.g. 'surveillance_repackaging', 'percentage_counter_anxiety', 'generational_technology_gap')",
  "opening_device": "how the essay opens (e.g. 'domestic_scene', 'workplace_observation', 'in_media_res_dialogue', 'statistical_hook')",
  "ending_device": "how the essay ends (e.g. 'physical_object_return', 'unresolved_image', 'professional_habit', 'lingering_question')",
  "metaphor_family": "the dominant metaphor system (e.g. 'accounting_ledger', 'industrial_machinery', 'agricultural_cycle', 'surveillance_camera')",
  "emotional_arc": "the emotional trajectory (e.g. 'anxiety_to_resignation', 'curiosity_to_disquiet', 'professional_composure_to_doubt')",
  "major_objects": ["array of 3-5 key physical objects in the piece"],
  "recurring_people": ["array of people/roles mentioned"],
  "has_code_blocks": false,
  "real_person_dependent": false
}`;

  try {
    const model = process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        },
        systemInstruction: {
          parts: [{ text: 'You are a literary analyst extracting structured narrative metadata. Output strictly valid JSON.' }]
        }
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.warn(`[Editorial Memory] Gemini API ${response.status}, falling back to heuristic`);
      return buildHeuristicFingerprint(title, content, persona, category);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return buildHeuristicFingerprint(title, content, persona, category);

    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    return {
      author_id: persona.id,
      persona_name: persona.fullName,
      genre: category,
      subject_domain: parsed.subject_domain || 'general',
      setting: parsed.setting || null,
      central_question: parsed.central_question || null,
      narrative_mechanism: parsed.narrative_mechanism || 'general',
      opening_device: parsed.opening_device || 'general',
      ending_device: parsed.ending_device || 'general',
      metaphor_family: parsed.metaphor_family || 'general',
      emotional_arc: parsed.emotional_arc || 'general',
      major_objects: Array.isArray(parsed.major_objects) ? parsed.major_objects : [],
      recurring_people: Array.isArray(parsed.recurring_people) ? parsed.recurring_people : [],
      has_code_blocks: !!parsed.has_code_blocks,
      real_person_dependent: !!parsed.real_person_dependent,
      structural_hash: computeStructuralHash(title, parsed)
    };
  } catch (err) {
    console.warn(`[Editorial Memory] Fingerprint extraction failed: ${err.message}. Using heuristic.`);
    return buildHeuristicFingerprint(title, content, persona, category);
  }
}

/**
 * Heuristic fallback for fingerprint extraction when LLM is unavailable.
 */
function buildHeuristicFingerprint(title, content, persona, category) {
  const lower = `${title} ${content}`.toLowerCase();
  const words = content.split(/\s+/).length;

  // Detect opening device
  let opening = 'general';
  if (/^(the |a |my |our )/i.test(content.trim())) opening = 'definite_article_scene';
  if (/^["'"]/i.test(content.trim())) opening = 'dialogue_opening';
  if (/^\d|^[\u20B9$€£]/i.test(content.trim())) opening = 'statistical_hook';

  // Detect ending device
  const lastSentences = content.trim().split(/[.!?]+/).filter(Boolean).slice(-3).join(' ').toLowerCase();
  let ending = 'general';
  if (/bowl|table|desk|chair|window|door|glass|cup|plate/.test(lastSentences)) ending = 'physical_object_return';
  if (/\?$/.test(content.trim())) ending = 'lingering_question';

  // Detect code blocks
  const hasCode = /```/.test(content);

  return {
    author_id: persona.id,
    persona_name: persona.fullName,
    genre: category,
    subject_domain: 'general',
    setting: null,
    central_question: null,
    narrative_mechanism: 'general',
    opening_device: opening,
    ending_device: ending,
    metaphor_family: 'general',
    emotional_arc: 'general',
    major_objects: [],
    recurring_people: [],
    has_code_blocks: hasCode,
    real_person_dependent: false,
    structural_hash: computeStructuralHash(title, { subject_domain: 'general', narrative_mechanism: 'general' })
  };
}

/**
 * Compact hash for fast structural deduplication.
 */
function computeStructuralHash(title, fp) {
  const sig = `${fp.subject_domain}|${fp.narrative_mechanism}|${fp.opening_device}|${fp.ending_device}|${fp.metaphor_family}`;
  return createHash('sha256').update(sig).digest('hex').slice(0, 16);
}

/**
 * Store a narrative fingerprint in the database.
 * @param {import('pg').Pool} pool
 * @param {string} postId - UUID of the published post
 * @param {object} fp - Narrative fingerprint object
 */
export async function storeNarrativeFingerprint(pool, postId, fp) {
  await pool.query(`
    INSERT INTO public.editorial_narrative_fingerprints (
      post_id, author_id, persona_name, genre, subject_domain, setting,
      central_question, narrative_mechanism, opening_device, ending_device,
      metaphor_family, emotional_arc, major_objects, recurring_people,
      has_code_blocks, real_person_dependent, structural_hash
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (post_id) DO UPDATE SET
      subject_domain = EXCLUDED.subject_domain,
      narrative_mechanism = EXCLUDED.narrative_mechanism,
      opening_device = EXCLUDED.opening_device,
      ending_device = EXCLUDED.ending_device,
      metaphor_family = EXCLUDED.metaphor_family,
      emotional_arc = EXCLUDED.emotional_arc,
      major_objects = EXCLUDED.major_objects,
      structural_hash = EXCLUDED.structural_hash
  `, [
    postId, fp.author_id, fp.persona_name, fp.genre, fp.subject_domain, fp.setting,
    fp.central_question, fp.narrative_mechanism, fp.opening_device, fp.ending_device,
    fp.metaphor_family, fp.emotional_arc, fp.major_objects, fp.recurring_people,
    fp.has_code_blocks, fp.real_person_dependent, fp.structural_hash
  ]);
}

/**
 * Retrieve recent narrative fingerprints for a persona and the platform.
 * @param {import('pg').Pool} pool
 * @param {object} opts
 * @param {string} opts.authorId - The persona's bot ID
 * @param {number} [opts.limit=15] - Per-persona limit
 * @param {number} [opts.globalLimit=30] - Platform-wide limit
 * @returns {Promise<{persona: object[], platform: object[]}>}
 */
export async function getRecentFingerprints(pool, { authorId, limit = 15, globalLimit = 30 }) {
  const personaRes = await pool.query(`
    SELECT subject_domain, setting, central_question, narrative_mechanism,
           opening_device, ending_device, metaphor_family, emotional_arc,
           major_objects, persona_name, genre, created_at
    FROM public.editorial_narrative_fingerprints
    WHERE author_id = $1
    ORDER BY created_at DESC LIMIT $2
  `, [authorId, limit]);

  const platformRes = await pool.query(`
    SELECT subject_domain, setting, narrative_mechanism, opening_device,
           ending_device, metaphor_family, emotional_arc, persona_name, genre, created_at
    FROM public.editorial_narrative_fingerprints
    ORDER BY created_at DESC LIMIT $1
  `, [globalLimit]);

  return {
    persona: personaRes.rows,
    platform: platformRes.rows
  };
}

/**
 * Build a structured premise card before drafting.
 * This is a lightweight, deterministic object — no LLM call.
 * @param {object} persona - { id, fullName, penName, bio, personaPrompt }
 * @param {string|null} topicHint
 * @param {string} category
 * @param {object|null} researchDossier
 * @returns {object} Premise card
 */
export function buildPremiseCard(persona, topicHint, category, researchDossier = null) {
  // Purge internal planning description or meta-prompt language from topicHint
  let cleanTopicHint = topicHint || null;
  if (cleanTopicHint && /\b(?:an\s+exploration\s+of\s+failure,\s*patience|within\s+the\s+realm\s+of\s+culture|content\s+objective|planning\s+brief)\b/i.test(cleanTopicHint)) {
    cleanTopicHint = null;
  }

  // Extract source-supported facts and cultural question (SOURCE_ANGLE_BINDING)
  const sourceSubject = researchDossier?.topic || cleanTopicHint || 'Cultural continuity and performance memory';
  const rawReports = Array.isArray(researchDossier?.newsReports) ? researchDossier.newsReports : [];
  const sourceFacts = rawReports.slice(0, 5).map(r => r.headline).filter(Boolean);

  return {
    persona_id: persona.id,
    persona_name: persona.fullName,
    persona_lens: persona.personaPrompt || persona.bio || '',
    category,
    topic_hint: cleanTopicHint,
    research_topic: researchDossier?.topic || null,
    research_category: researchDossier?.category || null,
    source_subject: sourceSubject,
    source_facts: sourceFacts,
    cultural_question: null,
    subject_domain: researchDossier?.topic?.toLowerCase().replace(/\s+/g, '_').slice(0, 60) || null
  };
}

/**
 * Validate a premise against recent narrative fingerprints and active cooldowns.
 * Deterministic heuristic matching — no LLM call.
 *
 * @param {object} premiseCard - From buildPremiseCard()
 * @param {{persona: object[], platform: object[]}} recentFingerprints
 * @param {object[]} activeCooldowns - From getActiveCooldowns()
 * @returns {{passed: boolean, score: number, violations: string[], suggestedPivot: string|null}}
 */
export function validatePremiseOriginality(premiseCard, recentFingerprints, activeCooldowns = []) {
  const violations = [];
  let score = 0;

  if (!premiseCard.subject_domain) {
    return { passed: true, score: 0, violations: [], suggestedPivot: null };
  }

  const domain = premiseCard.subject_domain.toLowerCase();

  // 1. Check persona-level repetition: same subject domain in recent persona fingerprints
  for (const fp of (recentFingerprints.persona || [])) {
    if (fp.subject_domain && fp.subject_domain.toLowerCase() === domain) {
      violations.push(`PERSONA_SUBJECT_REPEAT: "${domain}" was used by ${premiseCard.persona_name} on ${fp.created_at?.toISOString?.().slice(0, 10) || 'recently'}`);
      score += 5;
      break;
    }
  }

  // 2. Check platform-level repetition: same subject domain across all recent pieces
  const platformMatches = (recentFingerprints.platform || []).filter(
    fp => fp.subject_domain && fp.subject_domain.toLowerCase() === domain
  );
  if (platformMatches.length >= 2) {
    violations.push(`PLATFORM_SUBJECT_SATURATION: "${domain}" appears ${platformMatches.length} times in recent platform feed`);
    score += 3;
  }

  // 3. Check active cooldowns
  for (const cd of activeCooldowns) {
    if (cd.dimension_type === 'subject_domain' && cd.dimension_value.toLowerCase() === domain) {
      violations.push(`COOLDOWN_ACTIVE: "${domain}" is on cooldown until ${cd.expires_at?.toISOString?.().slice(0, 10) || 'soon'}`);
      score += 4;
      break;
    }
  }

  const passed = score < 4; // Threshold: anything >= 4 is a repeat risk
  return {
    passed,
    score,
    violations,
    suggestedPivot: passed ? null : `Choose a topic completely different from "${premiseCard.topic_hint}". Avoid the subject domain "${domain}".`
  };
}

/**
 * Register a failure pattern against a draft.
 * @param {import('pg').Pool} pool
 * @param {string|null} postId
 * @param {string|null} authorId
 * @param {string} failureCode - e.g. 'DECORATIVE_CODE_FAIL'
 * @param {string} failureDetail
 * @param {string} draftTitle
 */
export async function registerFailurePattern(pool, postId, authorId, failureCode, failureDetail, draftTitle) {
  await pool.query(`
    INSERT INTO public.editorial_failure_patterns (post_id, author_id, failure_code, failure_detail, draft_title)
    VALUES ($1, $2, $3, $4, $5)
  `, [postId || null, authorId || null, failureCode, failureDetail, draftTitle]);
}

/**
 * Set cooldowns for all major narrative dimensions used in a published piece.
 * Creates both persona-specific and platform-wide cooldown entries.
 * @param {import('pg').Pool} pool
 * @param {object} fingerprint - From extractNarrativeFingerprint()
 * @param {string} postId - UUID of the published post
 */
export async function setCooldowns(pool, fingerprint, postId) {
  const now = new Date();
  const entries = [];

  for (const [dimType, durations] of Object.entries(COOLDOWN_DAYS)) {
    const value = fingerprint[dimType];
    if (!value || value === 'general') continue;

    // Persona-specific cooldown
    entries.push([
      dimType, value, fingerprint.author_id,
      new Date(now.getTime() + durations.persona * 86400000), postId
    ]);

    // Platform-wide cooldown
    entries.push([
      dimType, value, null,
      new Date(now.getTime() + durations.platform * 86400000), postId
    ]);
  }

  for (const [dimType, dimValue, authorId, expiresAt, srcPostId] of entries) {
    await pool.query(`
      INSERT INTO public.editorial_cooldowns (dimension_type, dimension_value, author_id, expires_at, source_post_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [dimType, dimValue, authorId, expiresAt, srcPostId]);
  }
}

/**
 * Retrieve active (non-expired) cooldowns for a persona and platform-wide.
 * @param {import('pg').Pool} pool
 * @param {string} authorId - Bot ID
 * @returns {Promise<object[]>}
 */
export async function getActiveCooldowns(pool, authorId) {
  const res = await pool.query(`
    SELECT dimension_type, dimension_value, author_id, expires_at
    FROM public.editorial_cooldowns
    WHERE expires_at > now()
      AND (author_id = $1 OR author_id IS NULL)
    ORDER BY dimension_type, expires_at DESC
  `, [authorId]);
  return res.rows;
}

/**
 * Format active cooldowns into a prompt context block for the LLM.
 * @param {object[]} cooldowns - From getActiveCooldowns()
 * @returns {string} Formatted block for injection into buildPrompt()
 */
export function formatCooldownsForPrompt(cooldowns) {
  if (!cooldowns || cooldowns.length === 0) return '';

  const lines = ['NARRATIVE COOLDOWNS (DO NOT REUSE these narrative dimensions):'];
  for (const cd of cooldowns) {
    const scope = cd.author_id ? 'your recent piece' : 'platform-wide';
    const days = Math.ceil((new Date(cd.expires_at) - new Date()) / 86400000);
    lines.push(`  - ${cd.dimension_type}: "${cd.dimension_value}" (used ${scope}, ${days}d cooldown remaining)`);
  }
  return lines.join('\n');
}

/**
 * Final semantic similarity audit against recent pieces.
 * Runs post-draft, pre-publish. Deterministic (no LLM) — compares
 * against stored fingerprints using weighted dimension matching.
 *
 * @param {import('pg').Pool} pool
 * @param {string} draftTitle
 * @param {string} draftContent
 * @param {object} persona - { id, fullName }
 * @returns {Promise<{passed: boolean, score: number, matchedPost: string|null, violations: string[]}>}
 */
export async function runSimilarityAudit(pool, draftTitle, draftContent, persona) {
  // Get the draft's heuristic fingerprint (lightweight, no LLM)
  const draftFp = buildHeuristicFingerprint(draftTitle, draftContent, persona, 'Essays');

  // Get recent fingerprints from DB
  const { persona: personaFps, platform: platformFps } = await getRecentFingerprints(pool, {
    authorId: persona.id,
    limit: 15,
    globalLimit: 30
  });

  const allFps = [...personaFps, ...platformFps];
  let worstScore = 0;
  let worstMatch = null;
  const worstViolations = [];

  for (const fp of allFps) {
    let matchScore = 0;
    const matches = [];

    if (draftFp.structural_hash === fp.structural_hash) {
      matchScore += 6;
      matches.push('HASH_MATCH');
    }
    if (draftFp.subject_domain !== 'general' && draftFp.subject_domain === fp.subject_domain) {
      matchScore += 3;
      matches.push(`subject:${fp.subject_domain}`);
    }
    if (draftFp.narrative_mechanism !== 'general' && draftFp.narrative_mechanism === fp.narrative_mechanism) {
      matchScore += 2;
      matches.push(`mechanism:${fp.narrative_mechanism}`);
    }
    if (draftFp.opening_device !== 'general' && draftFp.opening_device === fp.opening_device) {
      matchScore += 1;
      matches.push(`opening:${fp.opening_device}`);
    }
    if (draftFp.ending_device !== 'general' && draftFp.ending_device === fp.ending_device) {
      matchScore += 1.5;
      matches.push(`ending:${fp.ending_device}`);
    }
    if (draftFp.metaphor_family !== 'general' && draftFp.metaphor_family === fp.metaphor_family) {
      matchScore += 2;
      matches.push(`metaphor:${fp.metaphor_family}`);
    }
    if (draftFp.emotional_arc !== 'general' && draftFp.emotional_arc === fp.emotional_arc) {
      matchScore += 1;
      matches.push(`arc:${fp.emotional_arc}`);
    }

    if (matchScore > worstScore) {
      worstScore = matchScore;
      worstMatch = `${fp.persona_name}: "${fp.central_question || fp.subject_domain}"`;
      worstViolations.length = 0;
      worstViolations.push(...matches);
    }
  }

  // Threshold: 5.0 or higher = too similar
  const passed = worstScore < 5.0;
  return {
    passed,
    score: worstScore,
    matchedPost: passed ? null : worstMatch,
    violations: passed ? [] : worstViolations,
    reason: passed
      ? 'Novel narrative fingerprint.'
      : `NARRATIVE_SIMILARITY_FAIL: Draft too similar to recent piece by ${worstMatch}. Matched: ${worstViolations.join(', ')}.`
  };
}
