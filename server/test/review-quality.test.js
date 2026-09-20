import { describe, it, expect } from 'vitest';
import { validateReviewQualityGate } from '../src/bot-engine/review-generator.js';
import { evaluateReviewDraft, getReviewCraftStandards } from '../src/services/editorial-brain.js';

describe('Review Quality Standards & Editorial Brain Integrity', () => {
  it('loads review craft architecture from editorial brain', () => {
    const standards = getReviewCraftStandards();
    expect(standards).toBeDefined();
    expect(standards.golden_rules).toBeInstanceOf(Array);
    expect(standards.golden_rules.length).toBeGreaterThanOrEqual(5);
    expect(standards.required_structure).toContain('Question -> Relevant Hardware');
  });

  it('triggers SOURCE_PRODUCT_MISMATCH when sibling model headline is cited as primary evidence', () => {
    const content = 'This review covers the Vivo X100 Pro camera performance. The telephoto lens is tested thoroughly across multiple real-world lighting environments.';
    const title = 'Vivo X100 Pro vs Xiaomi 14 Ultra: Telephoto Comparison';
    const productName = 'Vivo X100 Pro';
    const dossier = {
      newsReports: [
        { headline: 'Vivo X100 Ultra long-term review: The best camera package of 2024', source: 'Android Central' }
      ]
    };

    const result = validateReviewQualityGate(content, title, productName, 'Flagship Smartphones', dossier);
    expect(result.passed).toBe(false);
    expect(result.failures.some(f => f.includes('SOURCE_PRODUCT_MISMATCH'))).toBe(true);
  });

  it('rejects query leakage and template boilerplates', () => {
    const content = 'For the Vivo X100 Pro vs Xiaomi 14 Ultra Periscope Telephoto Compression, published positioning: the available material outlines the intended feature set.';
    const title = 'Vivo X100 Pro vs Xiaomi 14 Ultra';
    const productName = 'Vivo X100 Pro';

    const result = validateReviewQualityGate(content, title, productName, 'Flagship Smartphones');
    expect(result.passed).toBe(false);
    expect(result.failures.some(f => f.includes('Template Leakage'))).toBe(true);
  });

  it('rejects unearned decimal scores without visible weighted tables', () => {
    const content = 'Vivo X100 Pro review. Research assessment: 8.7 / 10. The phone is good.';
    const title = 'Vivo X100 Pro Review';
    const productName = 'Vivo X100 Pro';

    const result = validateReviewQualityGate(content, title, productName, 'Flagship Smartphones');
    expect(result.passed).toBe(false);
    expect(result.failures.some(f => f.includes('Unearned Decimal Score'))).toBe(true);
  });

  it('passes a fully grounded, structured comparison review with table and divergent verdict', () => {
    const title = 'Vivo X100 Pro vs Xiaomi 14 Ultra: Telephoto & Perspective Compression Compared';
    const productName = 'Vivo X100 Pro vs Xiaomi 14 Ultra';
    const content = `### ${title}
For equal subject framing, how do the Vivo X100 Pro and Xiaomi 14 Ultra alter working distance and perspective?
The Vivo X100 Pro features a 100mm periscope while Xiaomi 14 Ultra features dual 75mm and 120mm telephotos.

| Dimension | Vivo X100 Pro | Xiaomi 14 Ultra |
| :--- | :--- | :--- |
| Long telephoto | 100mm f/2.5 | 120mm f/2.5 |
| Short telephoto | In-sensor crop | 75mm f/1.8 |

Perspective compression is governed by camera-to-subject distance, not lens magic.
Testing shows Vivo excels in portrait rendering, whereas Xiaomi offers focal versatility.

| Criterion | Weight | Vivo | Xiaomi |
| :--- | :--- | :--- | :--- |
| Native detail | 25% | 9.2 | 9.0 |

Choose the Vivo X100 Pro if: you prioritize dedicated 100mm portrait framing and ZEISS APO color accuracy.
Choose the Xiaomi 14 Ultra if: you demand dual optical stages across 75mm and 120mm ranges.`;

    const validation = evaluateReviewDraft({
      title,
      content,
      productName,
      sources: ['Android Central', 'Xiaomi Official Specs'],
      domain: 'Flagship Smartphones'
    });

    expect(validation.passed).toBe(true);
    expect(validation.failures).toHaveLength(0);
  });
});
