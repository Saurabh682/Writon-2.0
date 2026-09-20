/**
 * Factual Claims Validator
 *
 * Classifies claims into:
 * - FACT: Must be backed by a verified source bundle.
 * - INTERPRETATION: Must be traceable to linked sources, but allows editorial framing.
 * - OPINION_PHILOSOPHY: Does not require structured verification, but cannot contradict verified evidence.
 * - FUTURE_INTENT: Requires explicit roadmap/founder record source.
 */

export function validateFactualClaims({
  contentMarkdown,
  linkedSources = [],
  assertions = []
}) {
  const issues = [];
  const text = contentMarkdown || '';

  // 1. Verify that all assertions marked as FACT have a verified source bundle
  for (const assertion of assertions) {
    if (assertion.type === 'fact') {
      const matchingSource = linkedSources.find(s => s.id === assertion.sourceBundleId);
      if (!matchingSource) {
        issues.push({
          assertion: assertion.claim,
          reason: `Fact assertion is missing a linked source bundle (${assertion.sourceBundleId})`
        });
      } else if (!matchingSource.verified_at) {
        issues.push({
          assertion: assertion.claim,
          reason: `Source bundle ${assertion.sourceBundleId} is not yet verified`
        });
      }
    } else if (assertion.type === 'future_intent') {
      const matchingSource = linkedSources.find(s => s.id === assertion.sourceBundleId);
      if (!matchingSource || matchingSource.source_type !== 'founder_record') {
        issues.push({
          assertion: assertion.claim,
          reason: 'Future intent claim requires an approved founder_record source bundle'
        });
      }
    }
  }

  // 2. Automated sanity regex checks for concrete facts in text:
  // Check build / version numbers mentioned in text (e.g. Build 117 or v2.0.15)
  const buildMatches = text.matchAll(/build\s+(\d+)/gi);
  for (const match of buildMatches) {
    const buildNum = parseInt(match[1], 10);
    const hasSource = linkedSources.some(s => {
      const p = s.payload || {};
      return p.versionCode === buildNum || p.version_code === buildNum;
    });
    if (!hasSource && linkedSources.length > 0) {
      issues.push({
        assertion: `Mention of Build ${buildNum}`,
        reason: `Build ${buildNum} mentioned in text but not found in any linked release source bundle`
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
