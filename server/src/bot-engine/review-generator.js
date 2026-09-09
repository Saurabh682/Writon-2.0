/**
 * WritOn Specialist Review Generator
 *
 * Generates clearly labelled, research-based product assessments with scores,
 * source context, tradeoffs, and isolated domain tags.
 */

import { attachReviewHashtagsAndWatermark } from './watermark-service.js';

export function generateStructuredReview({
  productName,
  reviewer,
  researchDossier,
  score = '8.7',
  whoItsFor = '',
  dealbreaker = '',
  pros = [],
  cons = [],
  rivalProduct = '',
  finalCall = '',
  evidence = {}
}) {
  const topNews = researchDossier?.newsReports?.[0];
  const newsContext = topNews ? `*(Referenced reporting: "${topNews.headline}" via ${topNews.source})*` : '';
  const domain = reviewer.domain;
  const handsOnEvidence = evidence.handsOnTesting === true;
  const evidenceLabel = handsOnEvidence
    ? `Hands-on observations are included from: ${evidence.testingNotes || 'the supplied testing record'}.`
    : 'No hands-on testing is claimed; this assessment synthesizes the supplied published sources and product information.';

  const reviewBody = `### ${productName}: Research-Based Assessment
  *By ${reviewer.fullName} (@${reviewer.penName}) • Specialist: ${domain}*

  #### The 30-Second Verdict
  > **Research assessment: ${score} / 10**
  > **Who it's for:** ${whoItsFor || `Readers comparing options in ${domain.toLowerCase()}.`}
  > **Watch before buying:** ${dealbreaker || 'Confirm current pricing, regional specifications, warranty terms, and independent long-term test results.'}

**Evidence basis:** ${evidenceLabel}

${newsContext}

---

#### 1. What the Available Evidence Shows

This assessment separates manufacturer specifications and reported information from direct observation. For the **${productName}**, the current evidence supports a preliminary comparison, but durability, sustained performance, and ergonomics require independent testing before they should be treated as established facts.

---

#### 2. Key Strengths vs. Hidden Annoyances

**Where it excels:**
${pros.map(p => `* **${p.title || 'Reported strength'}:** ${p.desc || p}`).join('\n') || '* **Published positioning:** The available material outlines the intended feature set; independent confirmation is still needed.'}

**Where it cuts corners:**
${cons.map(c => `* **${c.title || 'Open question'}:** ${c.desc || c}`).join('\n') || '* **Evidence limits:** Long-term reliability, support quality, and regional differences are not established by the supplied material.'}

---

#### 3. How It Compares to the Main Rival: ${rivalProduct || 'The Category Benchmark'}

Compare the published specifications, price, warranty, and independently measured results for the ${productName} against ${rivalProduct || 'the leading alternatives'}. The available research is useful for shortlisting, not a substitute for current comparative testing.

---

#### 4. Evidence Checklist Before a Decision

Before treating any score as final, verify the exact regional model, current retail price, included accessories, warranty coverage, repair availability, and return policy. Manufacturer specifications can establish advertised capabilities, but they cannot establish comfort, sustained performance, battery ageing, reliability, or support quality on their own.

Look for independent measurements that explain their method and test conditions. Give more weight to repeatable results than isolated impressions, and check whether apparently different articles rely on the same original announcement. Where evidence remains incomplete, the uncertainty is part of the assessment rather than a reason to fill the gap with confident language.

---

#### 5. The Final Call

${finalCall || `The ${productName} may deserve a place on a ${domain.toLowerCase()} shortlist, subject to current price and independent testing. Treat this as a research starting point rather than a purchase guarantee.`}
`;

  const finalContent = attachReviewHashtagsAndWatermark(reviewBody, reviewer.domain, productName);

  return {
    title: `${productName}: Research-Based Assessment`,
    summary: `A research-based ${reviewer.domain.toLowerCase()} assessment of ${productName} by ${reviewer.fullName}, with evidence limits and tradeoffs stated explicitly.`,
    content: finalContent,
    themeKeyword: reviewer.domain
  };
}
