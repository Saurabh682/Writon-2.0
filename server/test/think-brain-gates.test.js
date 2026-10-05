import { describe, it, expect } from 'vitest';
import {
  validateOldVsNewFalseBinaryGate,
  validateInformationLossGate,
  validateDomainTermRelevanceGate
} from '../src/bot-engine/gemini-spark-client.js';

describe('Think Brain Quality Gates — Old vs New, Information Loss & Domain Term Relevance', () => {
  it('OLD_VS_NEW_FALSE_BINARY: flags debate-card aphorisms and simplistic amnesia claims', () => {
    const badDraft = `The old ledger was paper. Baba said, "Efficiency is the brother of indifference."
A broken connection, and the harvest of 1992 is gone forever. His eyes held things that cannot be digitized.`;
    const res = validateOldVsNewFalseBinaryGate(badDraft, 'Short Stories', 'The Weight of Oolong');
    expect(res.isValid).toBe(false);
    expect(res.violations[0].rule).toBe('old_vs_new_false_binary');
  });

  it('OLD_VS_NEW_FALSE_BINARY: passes grounded bilateral trade-offs', () => {
    const goodDraft = `The database prevented duplicate invoice codes across Hamburg shipments.
Baba pointed to the violet margin note: "A broken connection doesn't erase your database. It only makes you discover what you forgot to record."`;
    const res = validateOldVsNewFalseBinaryGate(goodDraft, 'Short Stories', 'The Grade in Violet Ink');
    expect(res.isValid).toBe(true);
    expect(res.violations).toHaveLength(0);
  });

  it('INFORMATION_LOSS_TEST: flags exhausted cloud mist metaphors', () => {
    const badDraft = `To him, the cloud was just the gray mist that clung to the tea estates in Darjeeling, not a place to store data.`;
    const res = validateInformationLossGate(badDraft, 'Short Stories', 'The Weight of Oolong');
    expect(res.isValid).toBe(false);
    expect(res.violations[0].rule).toBe('exhausted_cloud_metaphor_fail');
  });

  it('INFORMATION_LOSS_TEST: passes schema omission framing', () => {
    const goodDraft = `The machine had not failed. I had simply built a schema that decided those things did not count as data.`;
    const res = validateInformationLossGate(goodDraft, 'Short Stories', 'The Grade in Violet Ink');
    expect(res.isValid).toBe(true);
  });

  it('DOMAIN_TERM_RELEVANCE: flags title-to-body mismatch (Oolong title with orthodox FTGFOP body)', () => {
    const mismatched = `He looked at the late monsoon batch. Grade FTGFOP. Tell your machine to catch that.`;
    const res = validateDomainTermRelevanceGate(mismatched, 'Short Stories', 'The Weight of Oolong');
    expect(res.isValid).toBe(false);
    expect(res.violations[0].rule).toBe('domain_term_mismatch_oolong_ftgfop');
  });

  it('DOMAIN_TERM_RELEVANCE: passes aligned title and material plot integration', () => {
    const aligned = `He looked at the late monsoon batch. Grade FTGFOP. Tell your machine to catch that.`;
    const res = validateDomainTermRelevanceGate(aligned, 'Short Stories', 'The Grade in Violet Ink');
    expect(res.isValid).toBe(true);
  });
});
