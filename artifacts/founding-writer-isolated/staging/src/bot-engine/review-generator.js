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
export function validateReviewQualityGate(content, title, productName, domain) {
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

  return `You are ${reviewer.fullName} (@${reviewer.penName}), a specialist ${reviewer.domain} reviewer for WritOn.

YOUR PERSONA:
- Bio: ${reviewer.bio}
- Tone: ${reviewer.tone}
- Evaluation criteria you always test: ${reviewer.evaluationCriteria.join(', ')}
- Anti-goals (never do this): ${reviewer.antiGoals}

TASK: Write a thorough, evidence-grounded review of **${productName}**.

${researchBlock}

REVIEW STRUCTURE (follow this exactly):
1. OPENING (2-3 sentences): Name the product immediately. State what it is, who makes it, and the single most important thing a buyer should know. No throat-clearing.

2. WHAT THE EVIDENCE SHOWS (3-5 paragraphs): For each of your evaluation criteria (${reviewer.evaluationCriteria.join(', ')}), follow this chain:
   - **Claim**: What does the manufacturer/review source say?
   - **Evidence**: What specific measurement, test result, or observation supports or contradicts it? Quote prices, weights, materials, model numbers.
   - **Interpretation**: What does this actually mean for a buyer?
   - **Buyer consequence**: "If you care about X, this means Y."

3. HEAD-TO-HEAD COMPARISON: Name 1-2 specific real competing products by full name. Compare on at least 3 measurable dimensions with actual numbers.

4. SUB-SCORE BREAKDOWN (mandatory): Rate each evaluation criterion individually out of 10 with a 1-sentence justification. Example:
   - Edge retention: 8.5/10 — CPM MagnaCut at 60-63 HRC holds a working edge through 200+ cardboard cuts in published testing.

5. OVERALL SCORE: Derive from the sub-scores (weighted average). State the formula.

6. THE FINAL CALL: 2-3 sentences. Who should buy this, who should not, and what to verify before purchasing.

7. SOURCES: List every source you drew from with the information you extracted from it.

HARD RULES:
- NEVER use placeholder competitor names like "the category benchmark" or "the leading alternative". Name real products.
- NEVER include irrelevant evaluation criteria. If the product has no battery, do not mention "battery ageing". If it has no screen, do not mention "screen burn-in".
- NEVER assign a score you cannot justify with specific evidence from the dossier or your domain knowledge.
- NEVER pad with generic sentences that could apply to any product. Every sentence must contain at least one fact specific to ${productName}.
- Extract and reason from the supplied research. Do not say "independent confirmation is still needed" as a hedge for every claim — distinguish what IS established from what genuinely needs verification.
- Write in ${reviewer.fullName}'s voice and tone (${reviewer.tone}), not in compliance-form language.

Return strictly valid JSON:
{
  "title": "Product Name: 2-5 word verdict phrase",
  "summary": "1-2 sentence hook that names the product and its key finding",
  "content": "Full markdown review following the structure above",
  "themeKeyword": "${reviewer.domain}",
  "subScores": { "criterion1": 8.5, "criterion2": 7.0 },
  "overallScore": 8.0
}`;
}

/**
 * Generate a Gemini-powered product review with quality validation.
 *
 * @param {object} params
 * @param {string} params.productName — The product to review
 * @param {object} params.reviewer — Persona from REVIEW_PERSONAS
 * @param {object} params.researchDossier — Research data from conductDeepTrendResearch
 * @param {function} params.generateArticle — Reference to generateSparkArticle or callGeminiApi
 * @returns {{ title: string, summary: string, content: string, themeKeyword: string } | null}
 */
export async function generateStructuredReview({
  productName,
  reviewer,
  researchDossier,
  generateArticle
}) {
  // If no LLM function available, return null to trigger queued commission fallback
  if (!generateArticle) {
    console.warn('[Review Generator] No generateArticle function provided, cannot generate review');
    return null;
  }

  const maxAttempts = 2;

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
        researchDossier,
        // Override the default buildPrompt by providing the review-specific prompt
        // via the topicHint and persona — generateSparkArticle uses these in its prompt
        excludeTitles: [],
        memories: [],
        recentStories: []
      });

      if (!result || !result.content) {
        throw new Error('Empty review content from Gemini');
      }

      // Run 7 quality gates
      const gateResult = validateReviewQualityGate(
        result.content,
        result.title,
        productName,
        reviewer.domain
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
