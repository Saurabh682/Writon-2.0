/**
 * WritOn Specialist Review Generator v2
 *
 * Routes product reviews through the Gemini LLM pipeline with a review-specific
 * prompt and 7 hard quality gates. Replaces the static fill-in-the-blanks template
 * that produced generic, indefensible reviews.
 */

import { attachReviewHashtagsAndWatermark } from './watermark-service.js';

// ─────────────────────────────────────────────────────────────────────────────
// 7 REVIEW QUALITY HARD GATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Category-irrelevant terms — reject if these appear in a review for a domain
 * that doesn't have the corresponding physical component.
 */
const IRRELEVANT_CRITERIA = {
  'battery ageing': ['EDC Gear & Rugged Tools', 'Custom Mechanical Keyboards', 'Cameras, Prime Lenses & Optics', 'Coffee Gear & Espresso Tech'],
  'battery degradation': ['EDC Gear & Rugged Tools', 'Custom Mechanical Keyboards', 'Cameras, Prime Lenses & Optics', 'Coffee Gear & Espresso Tech'],
  'screen burn-in': ['EDC Gear & Rugged Tools', 'Coffee Gear & Espresso Tech', 'Headphones, IEMs & Audio Gear'],
  'cellular modem': ['EDC Gear & Rugged Tools', 'Custom Mechanical Keyboards', 'Coffee Gear & Espresso Tech', 'Cameras, Prime Lenses & Optics'],
  'app ecosystem': ['EDC Gear & Rugged Tools', 'Coffee Gear & Espresso Tech'],
  'software updates': ['EDC Gear & Rugged Tools', 'Coffee Gear & Espresso Tech', 'Custom Mechanical Keyboards']
};

const PLACEHOLDER_COMPETITORS = [
  'the category benchmark',
  'the leading alternative',
  'category benchmark',
  'leading alternatives',
  'the main rival',
  'competing product'
];

/**
 * Validate a review against 7 hard quality checks.
 * Returns { passed: boolean, failures: string[] }
 */
export function validateReviewQualityGate(content, title, productName, domain, researchDossier = null) {
  const failures = [];
  const lower = content.toLowerCase();
  const titleLower = (title || '').toLowerCase();

  // 1. Product Identity Check — actual product name must appear in first 200 chars
  const productNameLower = productName.toLowerCase();
  // Extract the core product name (first 2-3 meaningful words) for flexible matching
  const coreProductWords = productNameLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 3);
  const first200 = lower.slice(0, 200);
  const productMentioned = coreProductWords.length >= 2
    ? coreProductWords.filter(w => first200.includes(w)).length >= 2
    : first200.includes(productNameLower);
  if (!productMentioned) {
    failures.push(`Product Identity: "${productName}" not mentioned in the opening 200 characters`);
  }

  // 2. Specificity Check — reject if >50% of sentences contain no product-specific terms
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length > 4) {
    const genericCount = sentences.filter(s => {
      const sl = s.toLowerCase();
      return coreProductWords.every(w => !sl.includes(w));
    }).length;
    const genericRatio = genericCount / sentences.length;
    if (genericRatio > 0.6) {
      failures.push(`Specificity: ${Math.round(genericRatio * 100)}% of sentences contain no product-specific terms`);
    }
  }

  // 3. Score Justification Check — if a numeric score exists, must have sub-scores or evidence
  const scoreMatch = content.match(/(\d+(?:\.\d)?)\s*\/\s*10/);
  if (scoreMatch) {
    // Count sub-score patterns like "Build: 9/10", "Edge retention: 8.5/10", etc.
    const subScores = content.match(/[a-zA-Z][a-zA-Z\s]+:\s*\d+(?:\.\d)?\s*\/\s*10/g);
    const hasSubScores = subScores && subScores.length >= 3;
    // Or evidence citations — "[Source]", "according to", "tested by", "measured at"
    const evidencePatterns = (content.match(/according to|tested by|measured at|reported by|found that|showed that/gi) || []).length;
    if (!hasSubScores && evidencePatterns < 2) {
      failures.push(`Score Justification: Score ${scoreMatch[0]} given without sub-category breakdown or evidence citations`);
    }
  }

  // 4. Category Relevance Check — reject irrelevant template criteria
  for (const [term, excludedDomains] of Object.entries(IRRELEVANT_CRITERIA)) {
    if (excludedDomains.includes(domain) && lower.includes(term)) {
      failures.push(`Category Relevance: "${term}" is irrelevant for ${domain}`);
    }
  }

  // 5. Competitor Resolution Check — no placeholder competitor names
  for (const placeholder of PLACEHOLDER_COMPETITORS) {
    if (lower.includes(placeholder)) {
      failures.push(`Competitor Resolution: placeholder "${placeholder}" found instead of a named competitor`);
    }
  }

  // 6. Title-Promise Check — features named in the title should get analysis
  const titleFeatureWords = titleLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !['research', 'based', 'assessment', 'review', 'analysis'].includes(w));
  const unaddressedFeatures = titleFeatureWords.filter(w => {
    // Each meaningful title word should appear in the body at least twice
    const bodyOccurrences = (lower.match(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    return bodyOccurrences < 2; // less than 2 times in the body = not substantively addressed
  });
  if (unaddressedFeatures.length > titleFeatureWords.length * 0.5 && titleFeatureWords.length >= 3) {
    failures.push(`Title-Promise: features [${unaddressedFeatures.join(', ')}] named in title but not substantively addressed in body`);
  }

  // 7. Research Utilization Check — sources listed must contribute findings
  const sourceSection = content.match(/(?:sources|references|bibliography)[:\s]*\n([\s\S]*?)$/i);
  if (sourceSection) {
    const sourceNames = sourceSection[1].match(/[""]([^""]+)[""]/g) || [];
    const bodyWithoutSources = content.replace(sourceSection[0], '');
    const unusedSources = sourceNames.filter(name => {
      const cleanName = name.replace(/["" ]/g, '').toLowerCase().slice(0, 20);
      return !bodyWithoutSources.toLowerCase().includes(cleanName);
    });
    if (unusedSources.length > sourceNames.length * 0.5 && sourceNames.length >= 2) {
      failures.push(`Research Utilization: ${unusedSources.length} of ${sourceNames.length} cited sources contribute no findings to the body`);
    }
  }

  // 8. SOURCE_PRODUCT_MISMATCH Check — reject if primary evidence discusses a different sibling/variant
  const variantSuffixes = ['ultra', 'pro', 'plus', 'max', 'mini', 'fe', 'lite', 'se'];
  const productSuffix = variantSuffixes.find(v => productNameLower.split(/\s+/).includes(v) || titleLower.split(/\s+/).includes(v));
  if (productSuffix && researchDossier?.newsReports?.length) {
    const conflictingSuffixes = variantSuffixes.filter(v => v !== productSuffix);
    for (const report of researchDossier.newsReports) {
      const headlineLower = (report.headline || '').toLowerCase();
      for (const conflict of conflictingSuffixes) {
        if (headlineLower.includes(conflict) && !headlineLower.includes(productSuffix)) {
          const family = productNameLower.replace(new RegExp(`\\b${productSuffix}\\b.*`, 'i'), '').trim().split(/\s+/).pop();
          if (family && headlineLower.includes(family)) {
            failures.push(`SOURCE_PRODUCT_MISMATCH: Source "${report.headline}" targets ${family} ${conflict}, but review is for ${family} ${productSuffix}`);
          }
        }
      }
    }
  }

  // 9. Template & Query Leakage Check — reject search queries or boilerplates in prose
  const templateLeakagePatterns = [
    { pattern: /for the\s+[^\n.,]+vs\s+[^\n.,]+(?:periscope|telephoto|benchmark)/i, name: 'Query leaking as product name in prose' },
    { pattern: /published positioning:\s*the available material outlines/i, name: 'Empty boilerplate ("Published positioning...")' },
    { pattern: /\bthe category benchmark\b/i, name: 'Placeholder competitor ("the category benchmark")' },
    { pattern: /may deserve a place on a\s+[^\n.,]+\s+shortlist/i, name: 'Generic non-verdict ("may deserve a place on a... shortlist")' },
    { pattern: /\bwhere it cuts corners:\s*\*\s*\*\*evidence limits/i, name: 'Hedging boilerplate ("Where it cuts corners: Evidence limits")' }
  ];
  for (const { pattern, name } of templateLeakagePatterns) {
    if (pattern.test(content)) {
      failures.push(`Template Leakage: Found banned boilerplate pattern: ${name}`);
    }
  }

  // 10. Unearned Decimal Score Check
  const rawScoreMatch = content.match(/(?:research assessment|verdict|score):\s*(\d+\.\d+)\s*\/\s*10/i);
  if (rawScoreMatch) {
    const hasScorecardTable = /\|\s*(?:criterion|dimension|metric)\s*\|\s*(?:weight|score)\s*\|/i.test(content);
    if (!hasScorecardTable) {
      failures.push(`Unearned Decimal Score: Found raw score "${rawScoreMatch[0]}" without a visible weighted criteria breakdown table. Use "Evidence confidence: Moderate | High" instead.`);
    }
  }

  // 11. Comparison Architecture Check (for vs / comparison reviews)
  const isComparison = /\b(?:vs|versus|compared|comparison)\b/i.test(titleLower) || /\b(?:vs|versus|compared)\b/i.test(productNameLower);
  if (isComparison) {
    const hasTable = /\|.+\|[\r\n]+\|[-:\s|]+\|[\r\n]+\|.+\|/.test(content);
    if (!hasTable) {
      failures.push('Comparison Structure: Comparison review must contain a structured Markdown specifications/performance table.');
    }
    const hasDivergentVerdict = /choose\s+.*if:?/i.test(content);
    if (!hasDivergentVerdict) {
      failures.push('Actionable Verdict: Comparison review must provide clear divergent guidance ("Choose [Product A] if... Choose [Product B] if...").');
    }
  }

  // 12. Passive Hardware & Audio Checklist Contamination Check
  const isPassiveAudio = /\b(?:hd\s*600|hd\s*650|edition\s*xs|sundara|dt\s*990|dt\s*770|open-back|wired|planar|otl)\b/i.test(titleLower) ||
                         (/\b(?:open-back|wired|passive|planar magnetic)\b/i.test(lower) && !/\b(?:bluetooth|wireless|anc|tws|battery life)\b/i.test(titleLower));
  if (isPassiveAudio && /\b(?:battery ageing|battery degradation|charging speed)\b/i.test(lower)) {
    failures.push('Category Relevance: Passive/wired audio gear evaluated with irrelevant battery degradation/ageing checklist criteria.');
  }

  // 13. Test Condition & Electrical Suitability Gate
  const testConditionMatch = titleLower.match(/\b(?:with|on)\s+([a-z0-9\s-]+(?:amp|amplifier|tube|otl|dac|dongle|balanced|single-ended|cable))\b/i);
  if (testConditionMatch) {
    const testCondition = testConditionMatch[1].trim();
    // Verify that the test condition is substantively analyzed (impedance, damping factor, voltage swing vs current)
    const hasElectricalAnalysis = /\b(?:output\s+impedance|damping\s+factor|impedance\s+match|current|voltage\s+swing|clipping|sensitivity|ohm|load)\b/i.test(lower);
    if (!hasElectricalAnalysis) {
      failures.push(`Test Condition Suitability: Title specifies test condition "${testCondition}", but review contains no electrical or impedance compatibility analysis (output impedance, damping factor, voltage swing vs current demand).`);
    }
  }

  // 14. Synthetic Testing & Anecdote Prohibition Gate (Evidentiary Boundary)
  const isResearchReview = /research-based|research assessment|evidence basis/i.test(lower) || /research/i.test(titleLower);
  if (isResearchReview) {
    const inventedTrackPatterns = [
      /on [A-Z][a-z]+ [A-Z][a-z]+['’]s\s+["“][^"”]+["”]/, // e.g. On Gregory Porter's "Hey Laura"
      /in our (?:listening|bench|hands-on) (?:sessions?|tests?)/i,
      /when we (?:plugged in|switched to|listened to)/i
    ];
    for (const pattern of inventedTrackPatterns) {
      if (pattern.test(content)) {
        failures.push('Evidentiary Boundary: Fabricated first-person testing anecdote or invented track listening session found in a research-based review. Synthesize published measurements and community consensus instead of simulating hands-on listening sessions.');
        break;
      }
    }
  }

  // 15. Strict Provenance & Superlative Restraint Gate
  const uncalibratedSuperlatives = [
    { pattern: /\bundisputed reference benchmark\b/i, name: 'undisputed reference benchmark' },
    { pattern: /\bunmatched neutrality\b/i, name: 'unmatched neutrality' },
    { pattern: /\bpristine midrange\b/i, name: 'pristine midrange' },
    { pattern: /\bzero roll-off\b/i, name: 'zero roll-off' },
    { pattern: /\bnear-perfect synergy\b/i, name: 'near-perfect synergy' },
    { pattern: /\bcolossal (?:three-dimensional )?soundstage\b/i, name: 'colossal soundstage' }
  ];
  for (const { pattern, name } of uncalibratedSuperlatives) {
    if (pattern.test(content)) {
      failures.push(`Provenance & Restraint: Uncalibrated superlative "${name}" found. Replace with measured research description (e.g. "established reference standard", "linear frequency tracking", "minimal attenuation").`);
    }
  }

  // Check source provenance closure: if spec table cites numbers, ensure manufacturer/lab sources exist in Sources section
  if (sourceSection) {
    const sourceText = sourceSection[1].toLowerCase();
    if (lower.includes('hd 600') && !sourceText.includes('sennheiser')) {
      failures.push('Provenance & Restraint: Sennheiser HD 600 specifications cited without listing official Sennheiser documentation in Sources.');
    }
    if (lower.includes('edition xs') && !sourceText.includes('hifiman')) {
      failures.push('Provenance & Restraint: HiFiMAN Edition XS specifications cited without listing official HiFiMAN documentation in Sources.');
    }
  }

  return {
    passed: failures.length === 0,
    failures
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW GENERATION VIA GEMINI
// ─────────────────────────────────────────────────────────────────────────────

function buildReviewPrompt(productName, reviewer, researchDossier) {
  const researchBlock = researchDossier ? `
RESEARCH DOSSIER (EXTRACT AND REASON FROM THESE — DO NOT IGNORE):
- Product Topic: "${researchDossier.topic}"
${researchDossier.newsReports?.length ? `- Published Reports:
${researchDossier.newsReports.map(r => `  * "${r.headline}" — ${r.source} (${r.pubDate || 'Recent'})${r.url ? ` — ${r.url}` : ''}`).join('\n')}` : ''}
${researchDossier.knowledgeSummary ? `- Background Knowledge:
  ${researchDossier.knowledgeSummary.title}: ${researchDossier.knowledgeSummary.description || ''}
  ${researchDossier.knowledgeSummary.extract}` : ''}
${researchDossier.sourceContext ? `- Source Context: ${researchDossier.sourceContext}` : ''}
` : '';

  const isAudio = /audio|headphone|iem|sound/i.test(reviewer.domain);
  const audioGuidance = isAudio ? `
AUDIO DOMAIN GUIDANCE (CRITICAL FOR TRANSDUCERS & AMPLIFICATION):
- ELECTRICAL MATCHING: Always evaluate transducer impedance and sensitivity against the amplifier circuit. Dynamic drivers (e.g. 300Ω) require high voltage swing and mate naturally with high-output-impedance OTL tube amps (like Bottlehead Crack, ~120Ω output impedance; damping factor ~2.5). Planar magnetic drivers (e.g. 18Ω) demand current, not voltage swing into high impedance; driving them from a high-output-impedance OTL causes severe current starvation, low damping factor (<0.2), bass bloat/distortion, and clipping.
- FAIR TEST CONDITION: If an amplifier or test condition is named in the title, explicitly determine if it is a fair operating condition for each product before comparing sonic qualities.
- CONCRETE TIMBRE BENCHMARKS: Define timbre through repeatable physical listening criteria:
  * Vocal tone: Chest resonance (200-500 Hz) vs nasality/pinna glare.
  * Piano: Hammer percussive attack, wooden soundboard body, natural decay.
  * Acoustic guitar: Instrument body resonance vs exaggerated string zing.
  * Cymbals: Metallic brass texture and natural air vs splashy, brittle sizzle.
  * Cello / Double bass: Bowed friction and harmonic weight vs anemia or boomy bloat.
  * Drum skins: Membrane tone, physical transient impact and decay.
- FREQUENCY RESPONSE DATA: Integrate independently measured spectral curves (RTINGS, Headphones.com) with listening impressions.
- NO PASSIVE GEAR CONTAMINATION: Passive wired headphones have NO batteries, NO wireless codecs, and NO charging speeds. Never include battery ageing or wireless checklists in passive gear reviews.
` : '';

  return `You are ${reviewer.fullName} (@${reviewer.penName}), a specialist ${reviewer.domain} reviewer for WritOn.

YOUR PERSONA:
- Bio: ${reviewer.bio}
- Tone: ${reviewer.tone}
- Evaluation criteria you always test: ${reviewer.evaluationCriteria.join(', ')}
- Anti-goals (never do this): ${reviewer.antiGoals}

TASK: Write a thorough, authoritative, evidence-grounded review of **${productName}**.

${researchBlock}
${audioGuidance}

MANDATORY REVIEW STRUCTURE (Question -> Relevant Hardware -> Independent Evidence -> Direct Comparison -> Practical Photographic / Audio Consequence -> Uncertainty -> Verdict):

1. THE SPECIFIC QUESTION (Opening, 2-3 sentences):
   State the exact technical or comparative question being tested (e.g., for headphones on an OTL amp: does the 300Ω dynamic driver's vocal timbre hold up against the 18Ω planar's spatial resolution when constrained by a 120Ω output impedance?). Never open with generic throat-clearing.

2. RELEVANT HARDWARE SPECIFICATIONS:
   Provide an accurate Markdown comparison table contrasting the core technical hardware (driver type, impedance, sensitivity, diaphragm mechanics, weight, target amp output impedance).

3. PHYSICAL / TECHNICAL GROUNDING:
   Explain the underlying physics or optics accurately. (Example: "Lens compression" is an optical misnomer—perspective compression is fundamentally governed by viewpoint and camera-to-subject distance, not an intrinsic lens property. Stepping farther back to maintain identical subject framing is what produces flatter perspective and larger backgrounds).

4. DIRECT COMPARISON ACROSS CORE DIMENSIONS (4-6 detailed sections):
   Analyze the products across specific technical dimensions (e.g. for cameras: native framing; matched-framing perspective compression; facial rendering & distortion; background separation & bokeh; fine detail & sharpening; low-light performance; stabilization & focus consistency).
   Cite real test numbers, sensor specs, and verified behavior.

5. IMAGE PROCESSING & SOFTWARE CHARACTER:
   Compare the proprietary tuning (e.g. ZEISS vs Leica, color science, contrast curves, portrait bokeh modes, HDR tuning).

6. EVIDENCE CONFIDENCE & DERIVED SCORECARD:
   - State explicit evidence confidence: "Evidence confidence: Moderate" (or High).
   - Provide a VISIBLE weighted scorecard table showing: Criterion, Weight (%), Product Score (out of 10), and derived final score. Never present an arbitrary decimal score without this breakdown.

7. THE ACTIONABLE BUYING VERDICT:
   Provide clear, divergent recommendations:
   - "Choose [Product A] if: [specific photographic or workflow priority]..."
   - "Choose [Product B] if: [alternative priority]..."
   Never end with vague hedges like "deserves a place on a shortlist".

8. SOURCES:
   List specific, accurately matched publications and technical specification sources.

STRICT EDITORIAL RULES:
- ZERO TEMPLATE LEAKAGE: Never use phrases like "For the [Query]...", "Published positioning: The available material outlines...", "Where it cuts corners: Evidence limits", or "the category benchmark".
- ZERO SOURCE MISMATCH: Primary evidence must match the exact product model. Never cite a sibling variant (e.g. Ultra vs Pro) as the primary evidence.
- ZERO SYNTHETIC SESSIONS & FIRST-PERSON CLAIMS (HARD GATE): In research-based reviews, never fabricate fictional first-person testing anecdotes, named listening tracks, or simulated hands-on bench sessions (e.g. "On Artist's 'Track Name', the vocals..."). Do NOT write "in our testing", "in my testing", "in our tests", "in my tests", "we measured", "we observed", "I tested", "we tested", or "in our benchmarks". Attribute measurements and acoustic observations to published reviewer consensus, manufacturer specifications, and independent laboratory test data.
- STRICT PROVENANCE & CALIBRATION:
  * Whenever converting units, calculating circuit consequences, or describing measured frequency bands, state the exact baseline source or assumption (e.g., if a manufacturer's sensitivity reference unit is unstated, disclose this explicitly).
  * If assuming a specific circuit impedance (e.g. 120Ω), scope claims to the specific reference amplifier archetype (e.g. Bottlehead Crack-class) rather than generalizing to an entire amplifier category.
  * Avoid unevidenced superlatives ("undisputed reference benchmark", "unmatched neutrality", "pristine", "zero roll-off", "near-perfect synergy", "colossal soundstage"); describe acoustic findings in precise, calibrated research language.
  * Every hardware spec or laboratory measurement must have its official manufacturer or laboratory source cited in the Sources section.
- WRITE WITH CONVICTION: A review must reach conclusions. Qualify uncertainties honestly, but deliver clear technical verdicts.

Return strictly valid JSON:
{
  "title": "Clean Product or Comparison Title: Crisp Subtitle",
  "summary": "1-2 sentence hook naming the products, the core trade-off, and the key finding",
  "content": "Full markdown review following the 7-step structure above",
  "themeKeyword": "${reviewer.domain}"
}`;
}

/**
 * Generate a Gemini-powered product review with quality validation.
 */
export async function generateStructuredReview({
  productName,
  reviewer,
  researchDossier,
  generateArticle
}) {
  if (!generateArticle) {
    console.warn('[Review Generator] No generateArticle function provided, cannot generate review');
    return null;
  }

  const maxAttempts = 2;
  const reviewPrompt = buildReviewPrompt(productName, reviewer, researchDossier);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateArticle({
        persona: {
          ...reviewer,
          penName: reviewer.penName,
          fullName: reviewer.fullName
        },
        category: 'Reviews',
        topicHint: productName,
        customPrompt: reviewPrompt,
        researchDossier,
        excludeTitles: [],
        memories: [],
        recentStories: []
      });

      if (!result || !result.content) {
        throw new Error('Empty review content from Gemini');
      }

      // Run quality gates
      const gateResult = validateReviewQualityGate(
        result.content,
        result.title,
        productName,
        reviewer.domain,
        researchDossier
      );

      if (gateResult.passed) {
        // Attach domain-specific hashtags and watermark
        const finalContent = attachReviewHashtagsAndWatermark(
          result.content,
          reviewer.domain,
          productName
        );

        return {
          title: result.title,
          summary: result.summary || `A specialist ${reviewer.domain} review of ${productName} by ${reviewer.fullName}.`,
          content: finalContent,
          themeKeyword: result.themeKeyword || reviewer.domain
        };
      }

      // Quality gates failed
      console.warn(
        `[Review Generator] Quality gates failed (attempt ${attempt}/${maxAttempts}):`,
        gateResult.failures
      );

      if (attempt >= maxAttempts) {
        console.warn('[Review Generator] Max attempts reached, review rejected. Will queue for human review.');
        return null; // Signal caller to queue for human review instead of publishing
      }

      // Retry — the generateSparkArticle retry loop will produce a different output
    } catch (err) {
      console.warn(`[Review Generator] Attempt ${attempt} failed: ${err.message}`);
      if (attempt >= maxAttempts) {
        return null;
      }
    }
  }

  return null;
}
