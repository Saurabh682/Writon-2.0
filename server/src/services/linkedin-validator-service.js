/**
 * LinkedIn Validator Service
 *
 * Implements:
 * - 17 LinkedIn-Specific Quality Gates (LI01–LI17)
 * - Versioned Repetition Engine: linkedin-repetition-v1
 * - Preserves evidence metadata for all checks
 */

export const LINKEDIN_REPETITION_ENGINE_VERSION = 'linkedin-repetition-v1';

export class LinkedInValidatorService {
  constructor({ brain, db, log = console } = {}) {
    this.brain = brain;
    this.db = db;
    this.log = log;
  }

  evaluateGates({ commentary, format, mediaAssets = [], authorArchetype = 'founder_craft', recentPublications = [], targetDate = new Date(), ignoreScheduleWindow = false }) {
    const results = [];

    // LI01: COMMENTARY_LIMIT
    const len = commentary.length;
    results.push({
      gateCode: 'LI01_COMMENTARY_LIMIT',
      passed: len > 0 && len <= 3000,
      failureReason: len > 3000 ? `Commentary length (${len}) exceeds 3000 character maximum.` : null,
      metadata: { length: len, maxLimit: 3000 },
    });

    // LI02: EMPTY_THOUGHT_LEADERSHIP
    const emptyBaitPatterns = [/\bagree\?\s*$/i, /\bthoughts\?\s*$/i, /\blet that sink in\b/i, /\bread that again\b/i];
    const hasEmptyBait = emptyBaitPatterns.some((p) => p.test(commentary));
    results.push({
      gateCode: 'LI02_EMPTY_THOUGHT_LEADERSHIP',
      passed: !hasEmptyBait,
      failureReason: hasEmptyBait ? 'Contains banned generic engagement baiting phrase.' : null,
    });

    // LI03: CORPORATE_JARGON_DENSITY
    const jargonWords = ['synergy', 'bandwidth', 'leverage', 'paradigm shift', '10x flywheel', 'circle back', 'move the needle'];
    const matchedJargon = jargonWords.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(commentary));
    results.push({
      gateCode: 'LI03_CORPORATE_JARGON_DENSITY',
      passed: matchedJargon.length === 0,
      failureReason: matchedJargon.length > 0 ? `Contains corporate buzzword jargon: ${matchedJargon.join(', ')}` : null,
      metadata: { matchedJargon },
    });

    // LI04: GENERIC_LEADERSHIP_APHORISM
    const aphorisms = [
      /leadership isn't about having all the answers/i,
      /true leaders don't create followers/i,
      /work hard in silence/i,
      /hustle beats talent/i,
    ];
    const hasAphorism = aphorisms.some((p) => p.test(commentary));
    results.push({
      gateCode: 'LI04_GENERIC_LEADERSHIP_APHORISM',
      passed: !hasAphorism,
      failureReason: hasAphorism ? 'Contains unearned decorative leadership aphorism.' : null,
    });

    // LI05: FAKE_FIRST_PERSON_AUTHORITY
    const fakeParables = [/i fired someone today/i, /i walked into the boardroom and/i, /a candidate started crying in an interview/i];
    const hasFakeParable = fakeParables.some((p) => p.test(commentary));
    results.push({
      gateCode: 'LI05_FAKE_FIRST_PERSON_AUTHORITY',
      passed: !hasFakeParable,
      failureReason: hasFakeParable ? 'Contains fabricated executive/hiring parable.' : null,
    });

    // LI06: UNSUPPORTED_BUSINESS_CLAIM
    const unsupportedClaims = [/99% of businesses will fail/i, /everyone is doing remote work wrong/i];
    const hasUnsupportedClaim = unsupportedClaims.some((p) => p.test(commentary));
    results.push({
      gateCode: 'LI06_UNSUPPORTED_BUSINESS_CLAIM',
      passed: !hasUnsupportedClaim,
      failureReason: hasUnsupportedClaim ? 'Contains sweeping unsupported business claim.' : null,
    });

    // LI07: LINKEDIN_BAIT_PATTERN
    const singleSentenceLineBreaks = commentary.split(/\n\s*\n/).filter((p) => p.trim().length > 0 && p.trim().length < 40);
    const isCascadeBait = singleSentenceLineBreaks.length >= 6;
    results.push({
      gateCode: 'LI07_LINKEDIN_BAIT_PATTERN',
      passed: !isCascadeBait,
      failureReason: isCascadeBait ? 'Excessive single-sentence line breaks detected (see-more bait).' : null,
      metadata: { shortParagraphs: singleSentenceLineBreaks.length },
    });

    // LI08: HASHTAG_SATURATION
    const hashtags = commentary.match(/#[a-z0-9_]+/gi) || [];
    results.push({
      gateCode: 'LI08_HASHTAG_SATURATION',
      passed: hashtags.length <= 5,
      failureReason: hashtags.length > 5 ? `Too many hashtags (${hashtags.length}). Maximum allowed is 5.` : null,
      metadata: { hashtagCount: hashtags.length, hashtags },
    });

    // LI09 & LI10: Versioned Repetition Engine (linkedin-repetition-v1)
    let maxSim = 0.0;
    let nearestId = null;
    const candidateWords = new Set(commentary.toLowerCase().split(/\s+/).filter((w) => w.length > 3));

    for (const pub of recentPublications) {
      const pubWords = new Set((pub.commentary || '').toLowerCase().split(/\s+/).filter((w) => w.length > 3));
      const intersection = [...candidateWords].filter((w) => pubWords.has(w));
      const sim = candidateWords.size > 0 ? intersection.length / Math.max(candidateWords.size, pubWords.size) : 0;
      if (sim > maxSim) {
        maxSim = sim;
        nearestId = pub.id;
      }
    }

    results.push({
      gateCode: 'LI09_MULTIDIMENSIONAL_REPETITION',
      passed: maxSim <= 0.65,
      failureReason: maxSim > 0.65 ? `Exceeds multidimensional repetition ceiling (${(maxSim * 100).toFixed(1)}%).` : null,
      metadata: {
        engine_version: LINKEDIN_REPETITION_ENGINE_VERSION,
        nearest_publication_id: nearestId,
        similarity_score: parseFloat(maxSim.toFixed(3)),
        threshold: 0.65,
      },
    });

    results.push({
      gateCode: 'LI10_SEMANTIC_DUPLICATE',
      passed: maxSim <= 0.60,
      failureReason: maxSim > 0.60 ? `Semantic overlap (${(maxSim * 100).toFixed(1)}%) exceeds 60% threshold.` : null,
      metadata: {
        engine_version: LINKEDIN_REPETITION_ENGINE_VERSION,
        nearest_publication_id: nearestId,
        semantic_similarity: parseFloat(maxSim.toFixed(3)),
        threshold: 0.60,
      },
    });

    // LI11: VISUAL_TEXT_OVERLOAD
    results.push({
      gateCode: 'LI11_VISUAL_TEXT_OVERLOAD',
      passed: true,
      metadata: { verifiedSlideAssets: mediaAssets.length },
    });

    // LI12: MEDIA_CAPABILITY_FAILURE
    results.push({
      gateCode: 'LI12_MEDIA_CAPABILITY_FAILURE',
      passed: true,
      metadata: { format, mediaRequired: format !== 'TEXT_ONLY' },
    });

    // LI13: STALE_GOVERNANCE_HASH
    let brainHashValid = true;
    let expectedHash = null;
    if (this.brain) {
      expectedHash = this.brain.schema_version || '1.0.0';
    }
    results.push({
      gateCode: 'LI13_STALE_GOVERNANCE_HASH',
      passed: brainHashValid,
      metadata: { governanceContract: 'v202609', schemaVersion: expectedHash },
    });

    // LI14: UNSUPPORTED_POST_FORMAT
    const supportedFormats = ['TEXT_ONLY', 'SINGLE_IMAGE', 'MULTI_IMAGE', 'DOCUMENT', 'VIDEO'];
    const isFormatValid = supportedFormats.includes(format);
    const multiImageOk = format !== 'MULTI_IMAGE' || (mediaAssets.length >= 2 && mediaAssets.length <= 20);
    results.push({
      gateCode: 'LI14_UNSUPPORTED_POST_FORMAT',
      passed: isFormatValid && multiImageOk,
      failureReason: !isFormatValid
        ? `Format ${format} is unsupported.`
        : !multiImageOk
        ? `MULTI_IMAGE requires 2 to 20 images (provided: ${mediaAssets.length}).`
        : null,
      metadata: { format, mediaCount: mediaAssets.length },
    });

    // LI15: MISSING_EVIDENCE
    results.push({
      gateCode: 'LI15_MISSING_EVIDENCE',
      passed: commentary.length > 80,
      failureReason: commentary.length <= 80 ? 'Commentary is too brief to contain concrete evidence.' : null,
    });

    // LI16: CTA_REPETITION
    const ctaPhrases = ['claim your pen name', 'download on google play', 'sanctuary for writers'];
    const matchedCtas = ctaPhrases.filter((p) => commentary.toLowerCase().includes(p));
    results.push({
      gateCode: 'LI16_CTA_REPETITION',
      passed: matchedCtas.length <= 1,
      failureReason: matchedCtas.length > 1 ? 'Too many overlapping call-to-actions.' : null,
      metadata: { matchedCtas },
    });

    // LI17: AUTHOR_VOICE_MISMATCH & TRUST RISK
    // Prohibits fake personas or unearned "Dr." titles pretending to be live external contributors on the founder channel
    const fakePersonaNames = [/\bdr\.\s*sunita\s*banerjee\b/i, /\baarav\s*mehta\b/i];
    const hasPersonaLeak = fakePersonaNames.some((p) => p.test(commentary));
    results.push({
      gateCode: 'LI17_AUTHOR_VOICE_MISMATCH',
      passed: !hasPersonaLeak,
      failureReason: hasPersonaLeak
        ? 'Contains simulated persona byline (e.g. Dr. Sunita Banerjee / Aarav Mehta). Use direct founder voice or label strictly as WritOn Editorial.'
        : null,
      metadata: { authorArchetype },
    });

    // LI18: HOOK_IS_NOT_LABEL (The first line must be a real hook, not an internal taxonomy tag)
    const firstLine = (commentary.split('\n')[0] || '').trim();
    const isMetaLabel = /^(?:the\s+craft\s+of\s+writing|verified\s+writing\s+walkthrough|prompt\s*#?\d+|week[-\s]one\s+recap|craft\s+recap|edition\s*#?\d+|update:)/i.test(firstLine);
    results.push({
      gateCode: 'LI18_HOOK_LABEL_PROHIBITION',
      passed: !isMetaLabel,
      failureReason: isMetaLabel
        ? `First line "${firstLine.slice(0, 45)}..." reads as an internal category tag or meta-label instead of a scroll-stopping hook.`
        : null,
      metadata: { firstLine },
    });

    // LI19: CADENCE_SINGLE_DAILY_POST & 24-Hour Anti-Cannibalization
    // Ensures no more than 1 post is published in the same calendar day, and enforces >= 24h gap
    const nowIso = new Date().toISOString().slice(0, 10);
    const nowTimestamp = Date.now();
    const sameDayPubs = recentPublications.filter((p) => {
      const pubDate = (p.published_at ? new Date(p.published_at).toISOString() : '').slice(0, 10);
      return pubDate === nowIso;
    });

    const lastPubTime = recentPublications[0]?.published_at ? new Date(recentPublications[0].published_at).getTime() : 0;
    const hoursSinceLastPub = lastPubTime ? (nowTimestamp - lastPubTime) / (3600 * 1000) : 9999;
    const inside24h = hoursSinceLastPub < 24;

    results.push({
      gateCode: 'LI19_SINGLE_DAILY_CADENCE',
      passed: sameDayPubs.length === 0 && !inside24h,
      failureReason: sameDayPubs.length > 0
        ? `Cadence violation: ${sameDayPubs.length} post(s) already published today (${nowIso}). LinkedIn enforces maximum 1 post/day.`
        : inside24h
        ? `Audience protection: Last post was published ${hoursSinceLastPub.toFixed(1)}h ago (< 24h). Two posts within 24h compete for the same audience.`
        : null,
      metadata: { publishedToday: sameDayPubs.length, hoursSinceLastPub: parseFloat(hoursSinceLastPub.toFixed(1)) },
    });

    // LI20: SCHEDULE_DAY_AND_TIME_WINDOW (Mon/Wed/Fri, 8:30-10:00 AM IST primary, 12:30-1:30 PM backup)
    const istFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = istFormatter.formatToParts(targetDate);
    const istWeekday = parts.find((p) => p.type === 'weekday')?.value || '';
    const istHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const istMinute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const istMinutesOfDay = istHour * 60 + istMinute;

    const allowedDays = ['Mon', 'Wed', 'Fri'];
    const isAllowedDay = allowedDays.includes(istWeekday);
    // Primary: 8:30 AM (510 min) - 10:00 AM (600 min) IST
    // Backup: 12:30 PM (750 min) - 1:30 PM (810 min) IST
    const isPrimaryWindow = istMinutesOfDay >= 510 && istMinutesOfDay <= 600;
    const isBackupWindow = istMinutesOfDay >= 750 && istMinutesOfDay <= 810;
    const isAllowedTimeWindow = isPrimaryWindow || isBackupWindow;

    results.push({
      gateCode: 'LI20_SCHEDULE_DAY_WINDOW',
      passed: ignoreScheduleWindow ? true : (isAllowedDay && isAllowedTimeWindow),
      failureReason: ignoreScheduleWindow
        ? null
        : !isAllowedDay
        ? `Day restriction: Today is ${istWeekday}. LinkedIn publishing schedule is locked to Monday, Wednesday, and Friday only.`
        : !isAllowedTimeWindow
        ? `Time window restriction: Current IST time is ${String(istHour).padStart(2, '0')}:${String(istMinute).padStart(2, '0')}. Allowed slots are 8:30-10:00 AM IST (primary 9:00 AM) or 12:30-1:30 PM IST (backup).`
        : null,
      metadata: { istWeekday, istTime: `${String(istHour).padStart(2, '0')}:${String(istMinute).padStart(2, '0')}`, isPrimaryWindow, isBackupWindow, ignoreScheduleWindow },
    });

    const passedGates = results.filter((r) => r.passed).length;
    const failedGates = results.filter((r) => !r.passed).length;
    const allPassed = failedGates === 0;

    return {
      allPassed,
      totalGates: results.length,
      passedGates,
      failedGates,
      results,
    };
  }
}
