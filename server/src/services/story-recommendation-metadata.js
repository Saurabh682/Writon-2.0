const CONTENT_FORM_BY_CATEGORY = new Map([
  ['poetry', 'poetry'],
  ['shayari', 'poetry'],
  ['short stories', 'short_story'],
  ['essays', 'essay'],
  ['journalism', 'journalism'],
  ['reviews', 'review'],
]);

const TRACKED_SCRIPTS = [
  ['Latn', /\p{Script=Latin}/u],
  ['Deva', /\p{Script=Devanagari}/u],
  ['Beng', /\p{Script=Bengali}/u],
  ['Arab', /\p{Script=Arabic}/u],
];

const EXPECTED_SECONDS_FLOOR_BY_FORM = Object.freeze({
  poetry: 8,
  flash: 20,
  essay: 45,
});

export const EXPECTED_READING_SECONDS_SQL = `(case
  when p.word_count > 0 and p.content_form = 'poetry'
    then greatest(8, ceil(p.word_count * 60.0 / 200.0))
  when p.word_count > 0 and p.content_form = 'flash'
    then greatest(20, ceil(p.word_count * 60.0 / 200.0))
  when p.word_count > 0 and p.content_form = 'essay'
    then greatest(45, ceil(p.word_count * 60.0 / 200.0))
  else greatest(30, p.reading_time_min * 30)
end)`;

function roundedConfidence(value) {
  return Math.round(value * 1_000) / 1_000;
}

export function measureWordCount(content, languageCode = 'und') {
  const text = String(content ?? '').normalize('NFKC').trim();
  if (!text) return 0;

  try {
    const locale = languageCode === 'und' ? undefined : languageCode;
    return [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(text)]
      .filter((segment) => segment.isWordLike)
      .length;
  } catch {
    return text.split(/\s+/u).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
  }
}

export function inferContentForm(category) {
  const contentForm = CONTENT_FORM_BY_CATEGORY.get(String(category ?? '').trim().toLowerCase()) ?? null;
  return contentForm
    ? { value: contentForm, source: 'category_mapping_v1', confidence: 0.95 }
    : { value: null, source: null, confidence: null };
}

export function inferDominantScript(content) {
  const counts = new Map(TRACKED_SCRIPTS.map(([code]) => [code, 0]));
  for (const character of String(content ?? '').normalize('NFKC')) {
    const match = TRACKED_SCRIPTS.find(([, pattern]) => pattern.test(character));
    if (match) counts.set(match[0], counts.get(match[0]) + 1);
  }

  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  const trackedCharacters = ranked.reduce((sum, [, count]) => sum + count, 0);
  if (trackedCharacters === 0) return { value: null, source: null, confidence: null };

  return {
    value: ranked[0][0],
    source: 'unicode_script_ratio_v1',
    confidence: roundedConfidence(ranked[0][1] / trackedCharacters),
  };
}

export function estimateExpectedReadingSeconds({ wordCount, contentForm, readingTimeMinutes }) {
  const count = Number(wordCount);
  const floor = EXPECTED_SECONDS_FLOOR_BY_FORM[contentForm];
  if (Number.isFinite(count) && count > 0 && floor) {
    return Math.max(floor, Math.ceil((count * 60) / 200));
  }

  const legacyMinutes = Number(readingTimeMinutes);
  return Math.max(30, Number.isFinite(legacyMinutes) ? legacyMinutes * 30 : 30);
}

export function deriveStoryRecommendationMetadata({ category, content, languageCode }) {
  const form = inferContentForm(category);
  const script = inferDominantScript(content);
  return {
    contentForm: form.value,
    contentFormSource: form.source,
    contentFormConfidence: form.confidence,
    wordCount: measureWordCount(content, languageCode),
    wordCountSource: 'intl_segmenter_v1',
    scriptCode: script.value,
    scriptSource: script.source,
    scriptConfidence: script.confidence,
  };
}
