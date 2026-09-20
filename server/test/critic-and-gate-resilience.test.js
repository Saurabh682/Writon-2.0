import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  parseCriticVerdict,
  reviewDraftWithLmStudio,
  isCriticRequired
} from '../src/services/lm-studio-critic.js';
import {
  detectUnfinishedScaffolding,
  validateGateTransition
} from '../src/services/editorial/publication-gate.js';

describe('Critic Structured Verdict & Decision Resilience', () => {
  it('strictly rejects explicit REJECT even when score >= 80', () => {
    const critique = `Score: 92/100
VERDICT: REJECT
Commentary: The author exhibits impressive craft, but violates the factual constraint on market settlement.`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.score).toBe(92);
  });

  it('does not approve when words like "pass" or "approved" appear in critique prose', () => {
    const critique = `Score: 85/100
VERDICT: REJECT
Commentary: This draft will not pass our zero AI slop gate, and cannot be approved in its current state.`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.score).toBe(85);
  });

  it('rejects when score is below 80 despite an explicit APPROVE verdict', () => {
    const critique = `Score: 74/100
VERDICT: APPROVE
Commentary: A promising opening scene with authentic rhythm.`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.score).toBe(74);
    expect(result.reason).toContain('below minimum threshold (80)');
  });

  it('approves when score >= 80 and VERDICT is APPROVE', () => {
    const critique = `Score: 88/100
VERDICT: APPROVE
Commentary: Restrained, tactile prose with quiet emotional resonance.`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('APPROVE');
    expect(result.score).toBe(88);
  });

  it('fails closed when structured verdict is missing or malformed', () => {
    const critique = `The piece has good pacing and nice metaphors. Score is 88/100. Let's run it.`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.reason).toContain('Missing structured VERDICT');
  });

  it('rejects when VERDICT is APPROVE but score is missing', () => {
    const critique = `VERDICT: APPROVE
Commentary: Good piece, but no numerical score given.`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.score).toBeNull();
    expect(result.reason).toContain('Missing required numerical score');
  });

  it('rejects when score is out of range (e.g. 999/100) and does not clamp to 100', () => {
    const critique = `Score: 999/100
VERDICT: APPROVE
Commentary: Exaggerated rating.`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.score).toBe(999);
    expect(result.reason).toContain('out of valid range (0-100)');
  });

  it('rejects negative scores (e.g. Score: -95/100) and does not interpret as positive 95', () => {
    const critique = `Score: -95/100
VERDICT: APPROVE
Commentary: Malformed negative score.`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.score).toBe(-95);
    expect(result.reason).toContain('out of valid range (0-100)');
  });

  it('rejects decimal scores (e.g. Score: 0.95/100) and does not extract 95 from fractional part', () => {
    const critique = `Score: 0.95/100
VERDICT: APPROVE
Commentary: Fractional score.`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.reason).toContain('must be an integer');
  });

  it('rejects when duplicate score fields appear in the response', () => {
    const critique = `Score: 95/100\nScore: 10/100\nVERDICT: APPROVE`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.reason).toContain('Duplicate or conflicting Score fields');
  });

  it('rejects when VERDICT contains trailing conditions or ambiguity', () => {
    const critique = `Score: 95/100\nVERDICT: APPROVE only after corrections`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.reason).toContain('Ambiguous, conditional, or trailing text');
  });

  it('rejects when conflicting VERDICT statements appear in the response', () => {
    const critique = `Score: 95/100
VERDICT: APPROVE
VERDICT: REJECT
Commentary: Incoherent dual verdict.`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.reason).toMatch(/conflicting VERDICT/i);
  });

  it('parses valid strict JSON critic responses', () => {
    const critique = JSON.stringify({ score: 92, verdict: 'APPROVE' });
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('APPROVE');
    expect(result.score).toBe(92);
  });

  it('rejects JSON critic responses with failing score', () => {
    const critique = JSON.stringify({ score: 72, verdict: 'APPROVE' });
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.score).toBe(72);
    expect(result.reason).toContain('below minimum threshold');
  });

  it('rejects JSON critic responses with explicit REJECT', () => {
    const critique = JSON.stringify({ score: 95, verdict: 'REJECT' });
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.reason).toContain('Explicit REJECT verdict');
  });

  it('rejects JSON critic responses with simultaneous conflicting score and rating fields', () => {
    const critique = '{"score":95,"rating":10,"verdict":"APPROVE"}';
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.score).toBeNull();
    expect(result.reason).toContain('Conflicting simultaneous score and rating fields');
  });

  it('rejects malformed JSON without falling back to line-based parsing', () => {
    const critique = `{"score": 95, malformed
Score: 95/100
VERDICT: APPROVE`;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.score).toBeNull();
    expect(result.reason).toContain('Malformed JSON in critic response');
  });

  it('rejects code-fenced malformed JSON without falling back to line-based parsing', () => {
    const critique = `\`\`\`json
{ "score": 95, unclosed
Score: 95/100
VERDICT: APPROVE
\`\`\``;
    const result = parseCriticVerdict(critique);
    expect(result.verdict).toBe('REJECT');
    expect(result.score).toBeNull();
    expect(result.reason).toContain('Malformed JSON in critic response');
  });

  it('exercises real HTTP transport and parsing when mocked in tests', async () => {
    const originalFetch = global.fetch;
    const prevUrl = process.env.LM_STUDIO_URL;
    try {
      process.env.LM_STUDIO_URL = 'http://localhost:1234/v1';
      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `Score: 91/100\nVERDICT: APPROVE\nCommentary: Verified restraint.`
              }
            }
          ]
        })
      });

      const outcome = await reviewDraftWithLmStudio({
        title: 'Monsoon in Mayur Vihar',
        content: 'Rain gathers in the courtyard saucer.',
        category: 'Essays',
        author: 'Dr. Sunita Banerjee'
      });

      expect(outcome.available).toBe(true);
      expect(outcome.verdict).toBe('APPROVE');
      expect(outcome.score).toBe(91);
    } finally {
      global.fetch = originalFetch;
      process.env.LM_STUDIO_URL = prevUrl;
    }
  });

  it('enforces that missing critic configuration fails closed when critic is required', async () => {
    const prevUrl = process.env.LM_STUDIO_URL;
    const prevReq = process.env.CRITIC_REQUIRED;
    try {
      delete process.env.LM_STUDIO_URL;
      delete process.env.CRITIC_URL;
      delete process.env.CRITIC_ALTERNATIVE_URL;
      process.env.CRITIC_REQUIRED = 'true';

      const outcome = await reviewDraftWithLmStudio({
        title: 'Title',
        content: 'Content'
      });

      expect(outcome.available).toBe(false);
      expect(outcome.skipped).toBe(false);
      expect(outcome.error).toContain('Mandatory pre-publication critic check failed');
    } finally {
      process.env.LM_STUDIO_URL = prevUrl;
      process.env.CRITIC_REQUIRED = prevReq;
    }
  });

  it('allows graceful skip when critic is explicitly not required', async () => {
    const prevUrl = process.env.LM_STUDIO_URL;
    const prevReq = process.env.CRITIC_REQUIRED;
    try {
      delete process.env.LM_STUDIO_URL;
      delete process.env.CRITIC_URL;
      delete process.env.CRITIC_ALTERNATIVE_URL;
      process.env.CRITIC_REQUIRED = 'false';

      const outcome = await reviewDraftWithLmStudio({
        title: 'Title',
        content: 'Content'
      });

      expect(outcome.available).toBe(false);
      expect(outcome.skipped).toBe(true);
    } finally {
      process.env.LM_STUDIO_URL = prevUrl;
      process.env.CRITIC_REQUIRED = prevReq;
    }
  });
});

describe('Unfinished Scaffolding vs Legitimate Mentions', () => {
  it('allows legitimate technical articles explaining placeholder text', () => {
    const title = 'How Placeholder Text Influenced Modern Typography';
    const content = `In graphic design, placeholder text serves an important functional role.
Typesetters historically used Latin fragments to judge spacing and ink weight.
A designer must ensure the placeholder does not distract from typographic proportion.`;

    const result = detectUnfinishedScaffolding(content, title);
    expect(result.isScaffolding).toBe(false);
  });

  it('allows legitimate editorial commentary analyzing filler words', () => {
    const title = 'Pragmatic Editing: Removing Verbal Clutter';
    const content = `When authors eliminate filler words from prose, sentences gain momentum.
A common defect in early drafts is the reliance on conversational filler phrases.
By cutting every extraneous word, the narrative focus becomes crisp and unambiguous.`;

    const result = detectUnfinishedScaffolding(content, title);
    expect(result.isScaffolding).toBe(false);
  });

  it('rejects bracketed template markers [insert text here]', () => {
    const title = 'A Study of Grain';
    const content = `The field stretches east.\n\n[insert text here]\n\nThe silo door creaks.`;
    const result = detectUnfinishedScaffolding(content, title);
    expect(result.isScaffolding).toBe(true);
    expect(result.reason).toContain('explicit template scaffolding markers');
  });

  it('rejects standalone TODO directives', () => {
    const title = 'A Study of Grain';
    const content = `The field stretches east.\n\nTODO: write the harvest paragraph\n\nThe silo door creaks.`;
    const result = detectUnfinishedScaffolding(content, title);
    expect(result.isScaffolding).toBe(true);
    expect(result.reason).toContain('TODO drafting directives');
  });

  it('rejects dummy placeholder headings', () => {
    const title = 'A Study of Grain';
    const content = `The field stretches east.\n\n### TBD\n\nThe silo door creaks.`;
    const result = detectUnfinishedScaffolding(content, title);
    expect(result.isScaffolding).toBe(true);
    expect(result.reason).toContain('standalone placeholder headings');
  });

  it('rejects dummy titles like "Untitled Draft" or "Placeholder Title"', () => {
    expect(detectUnfinishedScaffolding('Prose content', 'Untitled Draft').isScaffolding).toBe(true);
    expect(detectUnfinishedScaffolding('Prose content', 'Placeholder Title').isScaffolding).toBe(true);
    expect(detectUnfinishedScaffolding('Prose content', 'TBD').isScaffolding).toBe(true);
  });

  it('rejects classic Lorem Ipsum dummy blocks', () => {
    const content = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.`;
    const result = detectUnfinishedScaffolding(content, 'A Real Title');
    expect(result.isScaffolding).toBe(true);
    expect(result.reason).toContain('Lorem Ipsum');
  });
});

describe('Publication Gate: Machine Approval vs Mandatory Human Review', () => {
  const baseApprovedPost = {
    id: 'post-1',
    title: 'The Bellandur Marshlands',
    type: 'note',
    status: 'approved',
    content_markdown: 'The quiet marshlands along the Bellandur basin reveal layers of urban hydrology silt and ancient drainage pathways across the plateau. '.repeat(15)
  };

  it('allows automated publication for eligible content passing automated quality gates', () => {
    const post = {
      ...baseApprovedPost,
      approval_mode: 'automatic_low_risk',
      requires_human_approval: false
    };

    const transition = validateGateTransition({
      post,
      targetStatus: 'published',
      isAutomated: true
    });

    expect(transition.allowed).toBe(true);
  });

  it('allows automated publication for release update posts', () => {
    const post = {
      ...baseApprovedPost,
      type: 'update',
      title: 'WritOn Android 2.0.24 Notes',
      requires_human_approval: false
    };

    const transition = validateGateTransition({
      post,
      targetStatus: 'published',
      isAutomated: true
    });

    expect(transition.allowed).toBe(true);
  });

  it('blocks automated publication when post requires mandatory human approval', () => {
    const post = {
      ...baseApprovedPost,
      requires_human_approval: true
    };

    const transition = validateGateTransition({
      post,
      targetStatus: 'published',
      isAutomated: true
    });

    expect(transition.allowed).toBe(false);
    expect(transition.reason).toContain('requires mandatory human approval');
  });

  it('blocks automated publication when approval_mode is human_required', () => {
    const post = {
      ...baseApprovedPost,
      approval_mode: 'human_required'
    };

    const transition = validateGateTransition({
      post,
      targetStatus: 'published',
      isAutomated: true
    });

    expect(transition.allowed).toBe(false);
    expect(transition.reason).toContain('requires mandatory human approval');
  });

  it('blocks automated publication if automated quality gate fails (e.g. anti-slop)', () => {
    const post = {
      ...baseApprovedPost,
      approval_mode: 'automatic_low_risk',
      requires_human_approval: false,
      content_markdown: 'In today\'s fast-paced digital world, we must revolutionize how we write. '.repeat(10)
    };

    const transition = validateGateTransition({
      post,
      targetStatus: 'published',
      isAutomated: true
    });

    expect(transition.allowed).toBe(false);
    expect(transition.reason).toContain('Automated quality gate rejected');
  });
});
