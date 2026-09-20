const THRESHOLDS = Object.freeze({
  minimumSessions: 100,
  minimumReaders: 25,
  maximumLanguageShareLoss: 0.10,
  maximumAverageAuthorShare: 0.25,
  maximumAverageCategoryShare: 0.40,
  minimumTop20Overlap: 12,
});

export function assessFeedShadowReadiness({ coverage, structuralComparison, distributions, concentration }) {
  const checks = {};
  checks.representative_human_sample = coverage.shadow_sessions >= THRESHOLDS.minimumSessions
    && coverage.shadow_readers >= THRESHOLDS.minimumReaders;
  checks.no_feed_starvation = coverage.shadow_empty_sessions === 0
    && coverage.average_shadow_first_page_items >= Math.max(1, coverage.average_visible_first_page_items - 1);
  checks.stable_top_20 = structuralComparison.average_top_20_overlap >= THRESHOLDS.minimumTop20Overlap;
  checks.author_concentration = concentration.shadow?.author?.averageMaximumShare <= THRESHOLDS.maximumAverageAuthorShare;
  checks.category_concentration = concentration.shadow?.category?.averageMaximumShare <= THRESHOLDS.maximumAverageCategoryShare;

  const visibleLanguages = distributions.visible?.language ?? {};
  const shadowLanguages = distributions.shadow?.language ?? {};
  const languageShareChanges = Object.fromEntries(Object.keys(visibleLanguages).map((language) => [
    language,
    Number(((shadowLanguages[language]?.share ?? 0) - visibleLanguages[language].share).toFixed(4)),
  ]));
  checks.language_preservation = Object.values(languageShareChanges)
    .every((change) => change >= -THRESHOLDS.maximumLanguageShareLoss);

  const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  return {
    decision: failedChecks.length === 0 ? 'ready_for_human_review' : 'hold',
    checks,
    failedChecks,
    languageShareChanges,
    thresholds: THRESHOLDS,
    note: 'Passing permits a human rollout review; it never enables R4 automatically.',
  };
}
