/**
 * Editorial Significance Scorer
 *
 * Evaluates product changes against WritOn craft and philosophical pillars:
 * 1. productImpact (0 - 25): Extent of change to core reader/editor functionality
 * 2. philosophyAlignment (0 - 30): Quiet reading, anti-vanity, intentionality, dignity of pen name
 * 3. readerImpact (0 - 20): Cognitive load, focus, reading experience
 * 4. communityImpact (0 - 15): Comments, applause, author support
 * 5. editorialNovelty (0 - 10): Contrast against recent journal themes
 */

export function evaluateEditorialSignificance({
  changes = [],
  isMajor = false,
  recentJournalTopics = []
}) {
  const changeText = changes.join(' ').toLowerCase();

  let productImpact = isMajor ? 18 : 6;
  let philosophyAlignment = 0;
  let readerImpact = 0;
  let communityImpact = 0;
  let editorialNovelty = 5;
  const matchedReasons = [];

  // Philosophy alignment detection
  if (/remov|hid|quiet|distraction|unclutter|clean/i.test(changeText)) {
    philosophyAlignment += 12;
    matchedReasons.push('Subtractive design / quiet focus');
  }
  if (/popular|counter|metric|vanity|follower|like/i.test(changeText)) {
    philosophyAlignment += 16;
    matchedReasons.push('De-emphasizes vanity / popularity dynamics');
  }
  if (/offline|local|privacy|track|storage|draft/i.test(changeText)) {
    philosophyAlignment += 10;
    matchedReasons.push('Protects writer privacy / on-device durability');
  }

  // Reader experience impact
  if (/read|reader|typography|font|contrast|parchment|serif/i.test(changeText)) {
    readerImpact += 14;
    matchedReasons.push('Material impact on tactile reading');
  }

  // Community & engagement impact
  if (/applause|claps|comment|author|pen name/i.test(changeText)) {
    communityImpact += 10;
    matchedReasons.push('Alters community appreciation / author attribution');
  }

  // Cap each component
  productImpact = Math.min(25, productImpact);
  philosophyAlignment = Math.min(30, philosophyAlignment);
  readerImpact = Math.min(20, readerImpact);
  communityImpact = Math.min(15, communityImpact);
  editorialNovelty = Math.min(10, editorialNovelty);

  const totalScore = Math.min(100, productImpact + philosophyAlignment + readerImpact + communityImpact + editorialNovelty);

  return {
    score: totalScore,
    isSignificant: totalScore >= 60,
    components: {
      productImpact,
      philosophyAlignment,
      readerImpact,
      communityImpact,
      editorialNovelty
    },
    reason: matchedReasons.length > 0 ? matchedReasons.join('; ') : 'Standard platform refinement'
  };
}
