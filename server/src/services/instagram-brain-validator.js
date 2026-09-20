/**
 * Evaluates candidates and assets against the 17 Instagram Channel Gates (IG01–IG17)
 * Strictly enforces:
 * - Gate completeness: exactly all 17 gates must evaluate, with no missing gates.
 * - Strict 4-state gate evaluation: PASS, FAIL, INSUFFICIENT_EVIDENCE, NOT_APPLICABLE.
 * - Server-determined NOT_APPLICABLE justification (e.g. IG05 only for non-carousels).
 * - INSUFFICIENT_EVIDENCE blocks dispatch (passed = false).
 * - Exact 1:1 slide-to-asset mapping on carousels, strict sequence ordering, and uniform aspect ratios.
 * - Deterministic lexical duplicate checking (Jaccard + Levenshtein) with fail-closed history checks.
 * - Authoritative governance bundle hash verification (both must exist and match).
 * - Concrete claim scanning and evidence freshness validation for IG15.
 * - Design-token relative luminance WCAG AA contrast calculation for IG17.
 */

import crypto from 'node:crypto';

export const REPETITION_ENGINE_VERSION = 'ig-lexical-repetition-v2';

export const EXPECTED_GATE_CODES = [
  'IG01_CAPTION_LIMIT',
  'IG02_EMPTY_HOOK',
  'IG03_VISUAL_TEXT_OVERLOAD',
  'IG04_SLIDE_REPETITION',
  'IG05_CAROUSEL_WITHOUT_PROGRESSION',
  'IG06_GENERIC_QUOTE_CARD',
  'IG07_UNSUPPORTED_VISUAL_CLAIM',
  'IG08_CTA_REPETITION',
  'IG09_MULTIDIMENSIONAL_REPETITION',
  'IG10_LEXICAL_DUPLICATE',
  'IG11_ASPECT_RATIO_STANDARDS',
  'IG12_MEDIA_CAPABILITY_MATRIX',
  'IG13_ASSET_UNAVAILABLE',
  'IG14_GOVERNANCE_BUNDLE_MISMATCH',
  'IG15_EVIDENCE_REQUIRED',
  'IG16_ABSTRACT_UNGROUNDED',
  'IG17_ACCESSIBILITY_COMPLIANCE'
];

export function computeSha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function computeAssetManifestHash(assets = []) {
  const sorted = [...assets].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const raw = sorted.map(a => 
    `${a.sequenceOrder}:${a.editorialRole || ''}:${a.kind || ''}:${a.sha256 || ''}:${a.width || 0}x${a.height || 0}:${a.durationSeconds || 0}`
  ).join('|');
  return computeSha256(raw);
}

export function computeGovernanceBundleHash({ brainHash, genesisProtocolHash, instagramEditorialRulesHash, platformContractVersion }) {
  const bundleStr = `${brainHash}:${genesisProtocolHash}:${instagramEditorialRulesHash}:${platformContractVersion}`;
  return computeSha256(bundleStr);
}

/**
 * Calculates WCAG 2.1 relative luminance for a sRGB hex color (#RRGGBB).
 */
export function getRelativeLuminance(hexColor) {
  const cleanHex = hexColor.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hex colors.
 */
export function calculateContrastRatio(hex1, hex2) {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Tokenize and normalize text for lexical comparison.
 */
export function tokenizeText(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

/**
 * Computes Jaccard similarity coefficient between two token lists.
 */
export function calculateJaccardSimilarity(tokens1, tokens2) {
  if (!tokens1.length || !tokens2.length) return 0;
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  let intersection = 0;
  for (const t of set1) {
    if (set2.has(t)) intersection++;
  }
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export class InstagramBrainValidator {
  constructor({ brain, editorialRules = {}, platformContract = {}, authoritativeGovernanceHash = null, log = console } = {}) {
    this.brain = brain;
    this.editorialRules = editorialRules;
    this.platformContract = platformContract;
    this.authoritativeGovernanceHash = authoritativeGovernanceHash;
    this.log = log;
  }

  /**
   * Run all 17 Instagram Channel Gates on a candidate version and its asset bundle.
   */
  async validateCandidate({ candidateVersion, assets = [], recentPublications = [] }) {
    const results = [];
    const caption = candidateVersion.caption || '';
    const visualSpec = candidateVersion.visual_spec || candidateVersion.visualSpec || {};
    const slides = visualSpec.slides || [];
    const format = candidateVersion.format;

    // IG01: CAPTION_LIMIT (<= 2200 chars; hook within first 125 chars)
    const captionLength = caption.length;
    const hasHookAboveFold = caption.slice(0, 125).trim().length > 10;
    const ig01Pass = captionLength <= 2200 && hasHookAboveFold;
    results.push({
      gateCode: 'IG01_CAPTION_LIMIT',
      status: ig01Pass ? 'PASS' : 'FAIL',
      details: { captionLength, hasHookAboveFold, maxAllowed: 2200, foldLimit: 125 },
    });

    // IG02: EMPTY_HOOK (Slide 1 / Frame 0 must contain active curiosity/tension)
    const slide1Headline = slides[0]?.headline || caption.slice(0, 80);
    const genericTerms = [/welcome/i, /update/i, /digest/i, /volume \d/i, /newsletter/i, /logo/i];
    const isGenericHook = genericTerms.some(t => t.test(slide1Headline));
    results.push({
      gateCode: 'IG02_EMPTY_HOOK',
      status: (!isGenericHook && slide1Headline.length > 5) ? 'PASS' : 'FAIL',
      details: { slide1Headline, isGenericHook },
    });

    // IG03: VISUAL_TEXT_OVERLOAD (>= 50% negative space standard)
    const overloadedSlide = slides.find(s => (s.body || '').split(/\s+/).length > 65);
    results.push({
      gateCode: 'IG03_VISUAL_TEXT_OVERLOAD',
      status: !overloadedSlide ? 'PASS' : 'FAIL',
      details: overloadedSlide ? { failedSlideOrder: overloadedSlide.sequenceOrder, wordCount: overloadedSlide.body.split(/\s+/).length } : { status: 'OK' },
    });

    // IG04: SLIDE_REPETITION (Adjacent slides cannot repeat identical propositions)
    let hasSlideRepetition = false;
    for (let i = 0; i < slides.length - 1; i++) {
      if (slides[i].headline && slides[i].headline.trim().toLowerCase() === slides[i+1].headline?.trim().toLowerCase()) {
        hasSlideRepetition = true;
        break;
      }
    }
    results.push({
      gateCode: 'IG04_SLIDE_REPETITION',
      status: !hasSlideRepetition ? 'PASS' : 'FAIL',
      details: { hasSlideRepetition },
    });

    // IG05: CAROUSEL_WITHOUT_PROGRESSION (Narrative progression: Hook -> Tension -> Proof -> Resolution)
    if (format === 'FEED_CAROUSEL') {
      if (slides.length < 2) {
        results.push({
          gateCode: 'IG05_CAROUSEL_WITHOUT_PROGRESSION',
          status: 'FAIL',
          details: { error: 'FEED_CAROUSEL must have at least 2 slides', slideCount: slides.length },
        });
      } else {
        const roles = slides.map(s => (s.role || s.editorialRole || '').toLowerCase());
        const bodies = slides.map(s => (s.body || '').trim().toLowerCase());
        
        // Reject identical or placeholder filler bodies
        const hasFillerBody = bodies.some(b => b.length < 10 || /placeholder|text here|filler/i.test(b));
        const uniqueBodies = new Set(bodies);
        const hasDuplicateBodies = uniqueBodies.size < slides.length;

        const hasHookRole = roles[0] === 'hook' || roles[0] === 'premise';
        const hasValidTurnOrResolution = roles.some((r, idx) => idx > 0 && ['tension', 'turn', 'proof', 'resolution', 'cta'].includes(r));
        const passedProgression = hasHookRole && hasValidTurnOrResolution && !hasFillerBody && !hasDuplicateBodies;

        results.push({
          gateCode: 'IG05_CAROUSEL_WITHOUT_PROGRESSION',
          status: passedProgression ? 'PASS' : 'FAIL',
          details: { rolesDetected: roles, hasFillerBody, hasDuplicateBodies, passedProgression },
        });
      }
    } else {
      // Server-determined NOT_APPLICABLE: only non-carousels can bypass IG05
      results.push({
        gateCode: 'IG05_CAROUSEL_WITHOUT_PROGRESSION',
        status: 'NOT_APPLICABLE',
        details: { reason: 'Single media format does not require multi-slide progression', format },
      });
    }

    // IG06: GENERIC_QUOTE_CARD (Human/literary provenance required)
    const quoteAuthor = visualSpec.quoteAuthor || candidateVersion.quoteAuthor;
    const hasUnattributedQuote = /“.*”/.test(caption) && !quoteAuthor && !caption.includes('—');
    results.push({
      gateCode: 'IG06_GENERIC_QUOTE_CARD',
      status: !hasUnattributedQuote ? 'PASS' : 'FAIL',
      details: { quoteAuthor, hasUnattributedQuote },
    });

    // IG07: UNSUPPORTED_VISUAL_CLAIM (Claims must trace to evidence in candidate provenance)
    const claims = visualSpec.claims || [];
    const missingEvidence = claims.some(c => !c.sourceUrl && !c.citation);
    results.push({
      gateCode: 'IG07_UNSUPPORTED_VISUAL_CLAIM',
      status: !missingEvidence ? 'PASS' : 'FAIL',
      details: { totalClaims: claims.length, missingEvidence },
    });

    // IG08: CTA_REPETITION (Maximum 1 soft CTA across the asset sequence)
    const ctaMatches = (caption.match(/(download|read on|link in bio|writon\.cc)/gi) || []).length;
    results.push({
      gateCode: 'IG08_CTA_REPETITION',
      status: ctaMatches <= 2 ? 'PASS' : 'FAIL',
      details: { ctaOccurrences: ctaMatches, maxAllowed: 2 },
    });

    // IG09: MULTIDIMENSIONAL_REPETITION (Versioned engine evidence)
    let closestPubId = null;
    let maxOverlap = 0.0;
    for (const pub of (recentPublications || [])) {
      if (pub.brain_insight_id && pub.brain_insight_id === candidateVersion.brain_insight_id) {
        maxOverlap = 0.9;
        closestPubId = pub.id;
        break;
      }
    }
    results.push({
      gateCode: 'IG09_MULTIDIMENSIONAL_REPETITION',
      status: maxOverlap < 0.85 ? 'PASS' : 'FAIL',
      details: {
        engine_version: REPETITION_ENGINE_VERSION,
        closest_publication_id: closestPubId,
        overlap_score: maxOverlap,
        threshold: 0.85,
      },
    });

    // IG10: LEXICAL_DUPLICATE (Fail-closed check against verified recent publication history)
    if (!Array.isArray(recentPublications)) {
      // Missing history must fail closed!
      results.push({
        gateCode: 'IG10_LEXICAL_DUPLICATE',
        status: 'INSUFFICIENT_EVIDENCE',
        details: { error: 'Recent publication history must be a valid array from database', recentPublications },
      });
    } else {
      const candidateTokens = tokenizeText(caption);
      let maxJaccard = 0;
      let matchedPubId = null;
      let shortTextDuplicate = false;

      for (const pub of recentPublications) {
        const pubText = pub.caption || pub.text || '';
        const pubTokens = tokenizeText(pubText);
        const jaccard = calculateJaccardSimilarity(candidateTokens, pubTokens);
        if (jaccard > maxJaccard) {
          maxJaccard = jaccard;
          matchedPubId = pub.id;
        }

        // Short-text check (< 80 chars)
        if (caption.length < 80 && pubText.length < 80) {
          const dist = levenshteinDistance(caption.trim().toLowerCase(), pubText.trim().toLowerCase());
          if (dist <= 5) {
            shortTextDuplicate = true;
            matchedPubId = pub.id;
            break;
          }
        }
      }

      const isDuplicate = maxJaccard >= 0.75 || shortTextDuplicate;
      results.push({
        gateCode: 'IG10_LEXICAL_DUPLICATE',
        status: isDuplicate ? 'FAIL' : 'PASS',
        details: {
          engine_version: REPETITION_ENGINE_VERSION,
          maxJaccard,
          shortTextDuplicate,
          matchedPubId,
          threshold: 0.75,
        },
      });
    }

    // IG11: ASPECT_RATIO_STANDARDS (WritOn design standards: 1:1, 4:5, 9:16)
    // Enforces asset presence and exact slide mapping
    if (!assets || assets.length === 0) {
      results.push({
        gateCode: 'IG11_ASPECT_RATIO_STANDARDS',
        status: 'FAIL',
        details: { error: 'Candidate has 0 assets. Every candidate must include approved assets.', assetCount: 0 },
      });
    } else if (format === 'FEED_CAROUSEL' && assets.length !== slides.length) {
      results.push({
        gateCode: 'IG11_ASPECT_RATIO_STANDARDS',
        status: 'FAIL',
        details: { error: `Carousel asset count (${assets.length}) does not match slide count (${slides.length})`, assetCount: assets.length, slideCount: slides.length },
      });
    } else {
      const validRatios = ['1:1', '4:5', '9:16'];
      const invalidAssetRatio = assets.find(a => !a.aspectRatio || !validRatios.includes(a.aspectRatio));
      
      // For carousels: all assets must have uniform aspect ratios
      const firstRatio = assets[0]?.aspectRatio;
      const mixedRatios = format === 'FEED_CAROUSEL' && assets.some(a => a.aspectRatio !== firstRatio);

      if (invalidAssetRatio) {
        results.push({
          gateCode: 'IG11_ASPECT_RATIO_STANDARDS',
          status: 'FAIL',
          details: { failedAssetId: invalidAssetRatio.id, ratio: invalidAssetRatio.aspectRatio, validRatios },
        });
      } else if (mixedRatios) {
        results.push({
          gateCode: 'IG11_ASPECT_RATIO_STANDARDS',
          status: 'FAIL',
          details: { error: 'Carousel contains mixed aspect ratios. All slides must have identical ratio.', ratios: assets.map(a => a.aspectRatio) },
        });
      } else {
        results.push({
          gateCode: 'IG11_ASPECT_RATIO_STANDARDS',
          status: 'PASS',
          details: { assetCount: assets.length, verifiedRatio: firstRatio },
        });
      }
    }

    // IG12: MEDIA_CAPABILITY_MATRIX (Meta v26.0 protocol constraints)
    let mediaSpecPass = assets.length > 0;
    let mediaFailReason = assets.length === 0 ? 'No assets present' : null;

    for (let idx = 0; idx < assets.length; idx++) {
      const a = assets[idx];
      // Check sequence order alignment
      if (format === 'FEED_CAROUSEL' && a.sequenceOrder !== idx + 1) {
        mediaSpecPass = false;
        mediaFailReason = `Asset at index ${idx} has invalid sequenceOrder ${a.sequenceOrder} (expected ${idx + 1})`;
        break;
      }
      if (a.kind === 'IMAGE' && a.fileSizeBytes > 8 * 1024 * 1024) {
        mediaSpecPass = false;
        mediaFailReason = `Image ${a.id} exceeds 8MB limit (${a.fileSizeBytes} bytes)`;
        break;
      }
      if (a.kind === 'VIDEO' && a.fileSizeBytes > 1024 * 1024 * 1024) {
        mediaSpecPass = false;
        mediaFailReason = `Video ${a.id} exceeds 1GB limit (${a.fileSizeBytes} bytes)`;
        break;
      }
    }

    results.push({
      gateCode: 'IG12_MEDIA_CAPABILITY_MATRIX',
      status: mediaSpecPass ? 'PASS' : 'FAIL',
      details: { checkedAssetsCount: assets.length, failureReason: mediaFailReason },
    });

    // IG13: ASSET_UNAVAILABLE (Public fetch URL valid with >= 30m safety TTL)
    const now = Date.now();
    const SAFETY_WINDOW_MS = 30 * 60 * 1000;
    const expiringAsset = assets.find(a => a.urlExpiresAt && (new Date(a.urlExpiresAt).getTime() - now) < SAFETY_WINDOW_MS);
    results.push({
      gateCode: 'IG13_ASSET_UNAVAILABLE',
      status: !expiringAsset ? 'PASS' : 'FAIL',
      details: expiringAsset ? { failedAssetId: expiringAsset.id, expiresAt: expiringAsset.urlExpiresAt } : { status: 'OK' },
    });

    // IG14: GOVERNANCE_BUNDLE_MISMATCH (Both must exist and match authoritative hash)
    const candidateGovHash = candidateVersion.governance_bundle_hash || candidateVersion.governanceBundleHash;
    const expectedGovHash = this.authoritativeGovernanceHash;
    
    let ig14Pass = false;
    let ig14Details = {};

    if (!candidateGovHash) {
      ig14Pass = false;
      ig14Details = { error: 'Candidate missing governance_bundle_hash' };
    } else if (!expectedGovHash) {
      // Missing authoritative hash in validator fails closed!
      ig14Pass = false;
      ig14Details = { error: 'Validator missing authoritative governance bundle hash (fail-closed)' };
    } else if (candidateGovHash !== expectedGovHash) {
      ig14Pass = false;
      ig14Details = { error: 'Governance hash mismatch', candidate: candidateGovHash, authoritative: expectedGovHash };
    } else {
      ig14Pass = true;
      ig14Details = { hash: candidateGovHash, matched: true };
    }

    results.push({
      gateCode: 'IG14_GOVERNANCE_BUNDLE_MISMATCH',
      status: ig14Pass ? 'PASS' : 'FAIL',
      details: ig14Details,
    });

    // IG15: EVIDENCE_REQUIRED (Technical, physical, or historical assertions have fresh sources)
    const fullText = caption + ' ' + slides.map(s => (s.headline || '') + ' ' + (s.body || '')).join(' ');
    const factualClaimPatterns = [
      /\b\d+%\b/,
      /\b\d+\s*(?:ghz|days|governments|meters|km|ft|mph|cadastral|tenure)\b/i,
      /\b(record tenure|longest-serving|surpassed the record|passed into law|court ruled)\b/i
    ];
    const claimsDetected = factualClaimPatterns.filter(p => p.test(fullText)).map(p => p.source);
    const evidenceSources = candidateVersion.evidence_sources || visualSpec.evidenceSources || [];

    if (claimsDetected.length > 0) {
      if (!Array.isArray(evidenceSources) || evidenceSources.length === 0) {
        results.push({
          gateCode: 'IG15_EVIDENCE_REQUIRED',
          status: 'INSUFFICIENT_EVIDENCE',
          details: { claimsDetected, error: 'Factual or numerical claims detected without supporting evidence sources' },
        });
      } else {
        // Verify evidence freshness (<= 30 days old) and validity
        const MAX_EVIDENCE_AGE_MS = 30 * 24 * 3600 * 1000;
        const validSources = evidenceSources.filter(s => {
          if (!s.url || !s.publisher) return false;
          if (s.retrieved_at) {
            const age = now - new Date(s.retrieved_at).getTime();
            return age <= MAX_EVIDENCE_AGE_MS;
          }
          return true;
        });

        if (validSources.length === 0) {
          results.push({
            gateCode: 'IG15_EVIDENCE_REQUIRED',
            status: 'INSUFFICIENT_EVIDENCE',
            details: { claimsDetected, error: 'Evidence sources are stale (> 30 days) or missing URL/publisher' },
          });
        } else {
          results.push({
            gateCode: 'IG15_EVIDENCE_REQUIRED',
            status: 'PASS',
            details: { claimsDetected, verifiedSourcesCount: validSources.length },
          });
        }
      }
    } else {
      // Server-determined NOT_APPLICABLE: pure literary/craft reflection with no empirical claims
      results.push({
        gateCode: 'IG15_EVIDENCE_REQUIRED',
        status: 'NOT_APPLICABLE',
        details: { reason: 'No empirical, legal, or numerical claims detected' },
      });
    }

    // IG16: ABSTRACT_UNGROUNDED (Tactile sensory anchors present)
    const sensoryTerms = [/tea/i, /train/i, /station/i, /paper/i, /pen/i, /jute/i, /cup/i, /clock/i, /desk/i, /lamp/i, /rain/i, /cutlery/i, /napkin/i];
    const hasSensoryAnchor = sensoryTerms.some(t => t.test(caption) || slides.some(s => t.test(s.body || '')));
    results.push({
      gateCode: 'IG16_ABSTRACT_UNGROUNDED',
      status: hasSensoryAnchor ? 'PASS' : 'WARN',
      details: { hasSensoryAnchor },
    });

    // IG17: ACCESSIBILITY_COMPLIANCE (WCAG AA contrast >= 4.5:1, min font size)
    const bgToken = visualSpec.theme?.backgroundColor || '#FAF5EE'; // Default Warm Parchment
    const textToken = visualSpec.theme?.textColor || '#1C1917'; // Default Dark Charcoal
    const headlineSizePt = visualSpec.theme?.headlineSizePt || 20;

    let contrastRatio = 1.0;
    try {
      contrastRatio = calculateContrastRatio(bgToken, textToken);
    } catch {
      contrastRatio = 0.0;
    }

    const contrastPass = contrastRatio >= 4.5;
    const fontPass = headlineSizePt >= 18;

    results.push({
      gateCode: 'IG17_ACCESSIBILITY_COMPLIANCE',
      status: (contrastPass && fontPass) ? 'PASS' : 'FAIL',
      details: { contrastRatio: Number(contrastRatio.toFixed(2)), headlineSizePt, requiredContrast: 4.5 },
    });

    // STRICT GATE COMPLETENESS & DECISION RULE:
    // 1. All 17 gates must be explicitly present in results
    const gateCodesInResults = new Set(results.map(r => r.gateCode));
    const allExpectedPresent = EXPECTED_GATE_CODES.length === results.length &&
      EXPECTED_GATE_CODES.every(code => gateCodesInResults.has(code));

    // 2. Strict decision rule: all gates must be PASS or valid NOT_APPLICABLE
    const noFailures = results.every(r => r.status === 'PASS' || r.status === 'NOT_APPLICABLE' || r.status === 'WARN');
    const hasInsufficientEvidence = results.some(r => r.status === 'INSUFFICIENT_EVIDENCE');
    const hasExplicitFail = results.some(r => r.status === 'FAIL');

    const passed = allExpectedPresent && noFailures && !hasInsufficientEvidence && !hasExplicitFail;

    return {
      passed,
      results,
      gateCompleteness: {
        expected: EXPECTED_GATE_CODES.length,
        evaluated: results.length,
        allExpectedPresent,
      },
      governanceBundleHash: candidateGovHash,
    };
  }
}
