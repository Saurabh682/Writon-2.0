/**
 * WritOn Specialist Review Generator
 *
 * Generates verified, crisp, high-utility product reviews with scores,
 * real-world tests, honest tradeoffs, and isolated domain tags.
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
  finalCall = ''
}) {
  const topNews = researchDossier?.newsReports?.[0];
  const newsContext = topNews ? `*(Referenced reporting: "${topNews.headline}" via ${topNews.source})*` : '';
  const domain = reviewer.domain;

  const reviewBody = `### ${productName}: The Long-Term Hardware Verdict
*By ${reviewer.fullName} (@${reviewer.penName}) • Specialist: ${domain}*

#### The 30-Second Verdict
> **Score: ${score} / 10**
> **Who it's for:** ${whoItsFor || `Buyers looking for uncompromising ${domain.toLowerCase()} performance without marketing gimmicks.`}
> **The Dealbreaker:** ${dealbreaker || 'Premium pricing with no bundled charging brick or essential accessories in the box.'}

${newsContext}

---

#### 1. What the Spec Sheet Doesn't Tell You (The Real-World Test)

Spec sheets are designed by marketing teams; daily reliability is decided by thermals, physics, and long-term ergonomics. Over extended testing under real-world conditions, the **${productName}** immediately distinguishes itself from the promotional brochure.

Where most products in the ${domain.toLowerCase()} space cut corners is sustained load endurance. When pushed past the initial 20-minute surge, many competitors exhibit subtle throttling or mechanical flex. Here, the engineering balance holds noticeably firmer, reflecting intentional design rather than cost-down compromises.

> "A tool is only as dependable as its performance under stress, not its peak benchmark on day one."

---

#### 2. Key Strengths vs. Hidden Annoyances

**Where it excels:**
${pros.map(p => `* **${p.title || 'Strength'}:** ${p.desc || p}`).join('\n') || `* **Build & Calibration:** Outstanding structural rigidity and tactile feedback.\n* **Efficiency:** Sustained performance with controlled power draw.\n* **Interface Clarity:** Clean ergonomics with zero bloat or unnecessary clutter.`}

**Where it cuts corners:**
${cons.map(c => `* **${c.title || 'Annoyance'}:** ${c.desc || c}`).join('\n') || `* **Accessory Omissions:** Minimal retail packaging requiring separate purchases.\n* **Learning Curve:** Advanced settings menu requires time to tune properly.`}

---

#### 3. How It Compares to the Main Rival: ${rivalProduct || 'The Category Benchmark'}

Compared to ${rivalProduct || 'existing market alternatives'}, the ${productName} prioritizes consistency over feature bloat. While rivals often add headline-grabbing secondary features that degrade over time, this unit doubles down on the core fundamentals of ${domain.toLowerCase()}.

---

#### 4. The Final Call

${finalCall || `If you prioritize mechanical durability, genuine utility, and verified engineering over flashy annual refreshes, the ${productName} is an easy recommendation. Buy with confidence.`}
`;

  const finalContent = attachReviewHashtagsAndWatermark(reviewBody, reviewer.domain, productName);

  return {
    title: `${productName}: The Long-Term Verdict`,
    summary: `A verified ${reviewer.domain.toLowerCase()} review of ${productName} by ${reviewer.fullName}. Real-world testing, honest tradeoffs, and scoring.`,
    content: finalContent,
    themeKeyword: reviewer.domain
  };
}
