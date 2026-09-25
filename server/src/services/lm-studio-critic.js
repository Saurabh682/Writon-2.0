/**
 * LM Studio Editorial Reviewer
 * Connects directly to local LM Studio server (http://localhost:1234/v1)
 * to perform pre-publication review against the WritOn Zero AI Slop Standard.
 */

const DEFAULT_MODEL = 'dirty-muse-writer-v01-uncensored-erotica-nsfw-i1';

export function isCriticRequired() {
  if (process.env.CRITIC_REQUIRED === 'false') return false;
  if (process.env.CRITIC_REQUIRED === 'true') return true;
  return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
}

export function parseCriticVerdict(critiqueText = '') {
  const text = String(critiqueText || '').trim();

  // Support strict JSON response if provided
  const isJson = text.startsWith('{') || text.startsWith('```json') || /^```\s*\{/i.test(text);
  if (isJson) {
    try {
      const cleanJson = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {
          score: null,
          verdict: 'REJECT',
          reason: 'Critic JSON response must be a valid JSON object'
        };
      }

      // Require one canonical score field: reject simultaneous score and rating
      if (parsed.score !== undefined && parsed.rating !== undefined) {
        return {
          score: null,
          verdict: 'REJECT',
          reason: 'Conflicting simultaneous score and rating fields in critic JSON response'
        };
      }

      const rawScore = parsed.score !== undefined ? parsed.score : parsed.rating;
      const rawVerdict = typeof parsed.verdict === 'string' ? parsed.verdict.trim().toUpperCase() : null;

      if (rawScore === undefined || rawScore === null) {
        return { score: null, verdict: 'REJECT', reason: 'Missing required score in critic JSON response' };
      }
      if (typeof rawScore !== 'number' || !Number.isInteger(rawScore) || rawScore < 0 || rawScore > 100) {
        return { score: typeof rawScore === 'number' ? rawScore : null, verdict: 'REJECT', reason: `Invalid score in critic JSON: ${rawScore}` };
      }
      if (rawVerdict !== 'APPROVE' && rawVerdict !== 'REJECT') {
        return { score: rawScore, verdict: 'REJECT', reason: `Invalid verdict in critic JSON: ${parsed.verdict}` };
      }
      if (rawVerdict === 'REJECT') {
        return { score: rawScore, verdict: 'REJECT', reason: 'Explicit REJECT verdict from critic' };
      }
      if (rawScore < 80) {
        return { score: rawScore, verdict: 'REJECT', reason: `Critic score ${rawScore}/100 is below minimum threshold (80)` };
      }
      return { score: rawScore, verdict: 'APPROVE', reason: 'Critic approved' };
    } catch (err) {
      return {
        score: null,
        verdict: 'REJECT',
        reason: `Malformed JSON in critic response: ${err.message}`
      };
    }
  }

  // Strict line-based structured parsing:
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Score field: must have EXACTLY ONE score/rating line
  const scoreLines = lines.filter(l => /^(?:score|rating)\s*:/i.test(l));
  if (scoreLines.length > 1) {
    return {
      score: null,
      verdict: 'REJECT',
      reason: `Duplicate or conflicting Score fields in critic response (${scoreLines.length} found)`
    };
  }

  let rawScore = null;
  let scoreMalformed = false;
  let malformedReason = null;

  if (scoreLines.length === 1) {
    const scoreLine = scoreLines[0];
    const match = scoreLine.match(/^(?:score|rating)\s*:\s*([+-]?[0-9]+(?:\.[0-9]+)?)\s*\/\s*100$/i);
    if (!match) {
      scoreMalformed = true;
      malformedReason = `Malformed score field or trailing text: "${scoreLine}"`;
    } else {
      const numStr = match[1];
      const numVal = Number(numStr);
      if (numStr.includes('.')) {
        scoreMalformed = true;
        malformedReason = `Critic score must be an integer, received: "${numStr}"`;
      } else if (numVal < 0 || numStr.startsWith('-')) {
        scoreMalformed = true;
        malformedReason = `Critic score ${numVal}/100 is out of valid range (0-100)`;
        rawScore = numVal;
      } else if (numVal > 100) {
        scoreMalformed = true;
        malformedReason = `Critic score ${numVal}/100 is out of valid range (0-100)`;
        rawScore = numVal;
      } else {
        rawScore = numVal;
      }
    }
  }

  // 2. Verdict field: must have EXACTLY ONE verdict line
  const verdictLines = lines.filter(l => /^VERDICT\s*:/i.test(l));
  if (verdictLines.length === 0) {
    return {
      score: scoreMalformed ? null : rawScore,
      verdict: 'REJECT',
      reason: scoreMalformed
        ? malformedReason
        : 'Missing structured VERDICT in critic response'
    };
  }

  if (verdictLines.length > 1) {
    return {
      score: scoreMalformed ? null : rawScore,
      verdict: 'REJECT',
      reason: `Duplicate or conflicting VERDICT fields in critic response (${verdictLines.length} found)`
    };
  }

  const verdictLine = verdictLines[0];
  const verdictMatch = verdictLine.match(/^VERDICT\s*:\s*([A-Za-z]+)$/i);
  if (!verdictMatch) {
    return {
      score: scoreMalformed ? null : rawScore,
      verdict: 'REJECT',
      reason: `Ambiguous, conditional, or trailing text in VERDICT statement: "${verdictLine}"`
    };
  }

  const verdict = verdictMatch[1].toUpperCase();
  if (verdict !== 'APPROVE' && verdict !== 'REJECT') {
    return {
      score: scoreMalformed ? null : rawScore,
      verdict: 'REJECT',
      reason: `Unknown verdict value: "${verdictMatch[1]}" (expected APPROVE or REJECT)`
    };
  }

  if (verdict === 'REJECT') {
    return {
      score: scoreMalformed ? null : rawScore,
      verdict: 'REJECT',
      reason: 'Explicit REJECT verdict from critic'
    };
  }

  // verdict === 'APPROVE'
  if (scoreMalformed) {
    return {
      score: rawScore,
      verdict: 'REJECT',
      reason: malformedReason || 'Malformed score in critic response'
    };
  }

  if (rawScore === null) {
    return {
      score: null,
      verdict: 'REJECT',
      reason: 'Missing required numerical score with APPROVE verdict'
    };
  }

  if (rawScore < 80) {
    return {
      score: rawScore,
      verdict: 'REJECT',
      reason: `Critic score ${rawScore}/100 is below minimum threshold (80)`
    };
  }

  return {
    score: rawScore,
    verdict: 'APPROVE',
    reason: 'Critic approved'
  };
}

export async function isLmStudioAvailable() {
  const endpoint = process.env.LM_STUDIO_URL || process.env.CRITIC_URL || process.env.CRITIC_ALTERNATIVE_URL;
  if (!endpoint) return false;
  try {
    const res = await fetch(`${endpoint}/models`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function reviewDraftWithLmStudio({
  title,
  content,
  category = 'Essays',
  author = '',
  model = DEFAULT_MODEL
}) {
  const endpoint = process.env.LM_STUDIO_URL || process.env.CRITIC_URL || process.env.CRITIC_ALTERNATIVE_URL;
  if (!endpoint) {
    if (isCriticRequired()) {
      return {
        available: false,
        skipped: false,
        error: 'Mandatory pre-publication critic check failed: critic is required, but no critic endpoint (LM_STUDIO_URL / CRITIC_URL) is configured'
      };
    }
    return {
      available: false,
      skipped: true,
      error: 'Critic endpoint not configured and critic is not marked mandatory'
    };
  }

  const prompt = `CRITIQUE INSTRUCTION:
You are an uncompromising literary editor evaluating a prospective article against the WritOn Zero AI Slop Standard.

ARTICLE DETAILS:
Title: ${title}
Category: ${category}
Author: ${author}

CONTENT TO EVALUATE:
${content}

EVALUATION PROTOCOL:
1. Tone & Persona Integrity: Does the author maintain an authentic human voice without melodrama or corporate buzzwords? Does the piece match the author's established biographical lens and beat?
2. Factual Accuracy & Procedural Realism: Are all stated facts, scores, or procedural details accurate and uninvented?
3. Zero Exploitation / No Invented Dialogue: Are real human figures treated with ethical dignity without melodramatic staging?
4. Concrete Observation vs Abstraction Density (Rule 148): Does the piece ground assertions in physical human behavior and specific settings rather than floating in unanchored conceptual jargon?
5. Detail Provenance & False Specificity (Rules 151 & 152): Does the piece avoid counterfeit reportage? Reject unverified, hallucinated exact counts or transit schedules.
6. Summary Evidentiary Alignment & Claim Magnitude (Rules 150 & 153): Does the body text substantiate all claims? Are conclusions modest and proportional?
7. Argumentative Complication & Restraint (Rule 155): Does the essay follow natural complication rather than tidy moralizing or false closure?
8. Comedy Quotable Density & Breathing Room (Rule 160): In satire/humour, reject drafts where every sentence auditions for a quote card. Require natural pacing and dead space between punchlines.
9. Humour Behavior First (Rule 161): Prioritize observed micro-rituals (cables, OTP nods, calendar holds) over abstract satire slogans. Let the system behave absurdly on its own.
10. Narrator Omniscience Discipline (Rule 162): In first-person observational humour, reject unearned mind-reading. Internal states must be framed as observable inference.

OUTPUT FORMAT:
Score: <0-100>/100
VERDICT: <APPROVE or REJECT>
Craft Commentary`;

  try {
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1024
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!res.ok) {
      return {
        available: false,
        skipped: false,
        error: `Critic returned status ${res.status}`
      };
    }

    const data = await res.json();
    const critiqueText = data?.choices?.[0]?.message?.content || '';
    const parsed = parseCriticVerdict(critiqueText);

    return {
      available: true,
      score: parsed.score,
      verdict: parsed.verdict,
      critique: critiqueText,
      reason: parsed.reason
    };
  } catch (err) {
    return {
      available: false,
      skipped: false,
      error: err.message
    };
  }
}
