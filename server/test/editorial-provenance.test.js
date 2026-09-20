import { describe, expect, it } from 'vitest';
import {
  computeSourceHash,
  createSourceBundle,
  verifySourceBundle,
  linkPostSource,
  getSourcesForPost,
  evaluateEditorialSignificance,
  validateGateTransition,
  formatContentToHtml,
  validateFactualClaims,
  calculateReadingTime,
  validateAntiSlop,
  validateLengthClass
} from '../src/services/editorial/index.js';

describe('Editorial Phase 2 — Provenance, Hashing & Source Immutability', () => {
  it('computes deterministic SHA-256 source hash regardless of key order', () => {
    const payloadA = { version: '2.0.15', build: 117, notes: ['A', 'B'] };
    const payloadB = { notes: ['A', 'B'], build: 117, version: '2.0.15' };

    const hashA = computeSourceHash(payloadA);
    const hashB = computeSourceHash(payloadB);

    expect(hashA).toHaveLength(64);
    expect(hashA).toBe(hashB);
  });

  it('prevents mutation of verified source bundle', async () => {
    const bundles = new Map();

    const mockPool = {
      query: async (sql, params) => {
        if (sql.includes('SELECT * FROM public.editorial_source_bundles WHERE id =')) {
          const b = bundles.get(params[0]);
          return { rows: b ? [b] : [], rowCount: b ? 1 : 0 };
        }
        if (sql.includes('INSERT INTO public.editorial_source_bundles')) {
          const bundle = {
            id: params[0],
            source_type: params[1],
            source_ref: params[2],
            title: params[3],
            payload: JSON.parse(params[4]),
            source_hash: params[5],
            verified_by: params[6],
            verified_at: params[7],
            supersedes_source_bundle_id: params[8]
          };
          bundles.set(bundle.id, bundle);
          return { rows: [bundle], rowCount: 1 };
        }
        if (/UPDATE\s+public\.editorial_source_bundles[\s\S]+verified_by\s*=/i.test(sql)) {
          const b = bundles.get(params[1]);
          if (b && !b.verified_at) {
            b.verified_by = params[0];
            b.verified_at = new Date().toISOString();
            return { rows: [b], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      }
    };

    const initial = await createSourceBundle(mockPool, {
      id: 'src_test_1',
      sourceType: 'release',
      sourceRef: 'android:117',
      title: 'Android 117 Release',
      payload: { versionCode: 117 }
    });
    expect(initial.id).toBe('src_test_1');

    await verifySourceBundle(mockPool, 'src_test_1', 'lead_editor');

    // Attempt to mutate verified bundle with different payload must fail
    await expect(
      createSourceBundle(mockPool, {
        id: 'src_test_1',
        sourceType: 'release',
        sourceRef: 'android:117',
        title: 'Android 117 Tampered',
        payload: { versionCode: 117, tampered: true }
      })
    ).rejects.toThrow(/Cannot mutate verified source bundle/);
  });
});

describe('Editorial Phase 2 — Publication Gate & Permission Boundaries', () => {
  it('allows automated publication for eligible content and enforces mandatory human review when required', () => {
    const updatePost = {
      id: 'post-1',
      type: 'update',
      status: 'approved',
      content_markdown: '### Updates\n\n- Fix 1\n- Fix 2'
    };

    const allowed = validateGateTransition({
      post: updatePost,
      targetStatus: 'published',
      isAutomated: true
    });
    expect(allowed.allowed).toBe(true);

    const humanRequiredPost = {
      id: 'post-2',
      type: 'journal',
      status: 'approved',
      requires_human_approval: true,
      content_markdown: 'A full essay on quiet literature. '.repeat(50)
    };

    const blocked = validateGateTransition({
      post: humanRequiredPost,
      targetStatus: 'published',
      isAutomated: true
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain('requires mandatory human approval');
  });

  it('blocks publication without markdown content', () => {
    const emptyPost = {
      id: 'post-3',
      type: 'journal',
      status: 'approved',
      content_markdown: null
    };

    const result = validateGateTransition({
      post: emptyPost,
      targetStatus: 'published',
      isAutomated: false
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('requires non-empty content_markdown');
  });
});

describe('Editorial Phase 2 — Significance Scoring', () => {
  it('scores major philosophical / subtraction releases >= 60', () => {
    const sig = evaluateEditorialSignificance({
      changes: [
        'Removed vanity follower counters to protect quiet reading',
        'Added offline local storage for drafts'
      ],
      isMajor: true
    });

    expect(sig.score).toBeGreaterThanOrEqual(60);
    expect(sig.isSignificant).toBe(true);
    expect(sig.reason).toContain('vanity');
  });

  it('scores minor maintenance / telemetry fixes < 60', () => {
    const sig = evaluateEditorialSignificance({
      changes: ['Minor dependency bumps and internal refactor'],
      isMajor: false
    });

    expect(sig.score).toBeLessThan(60);
    expect(sig.isSignificant).toBe(false);
  });
});

describe('Editorial Phase 2 — Markdown Rendering & Sanitization', () => {
  it('escapes raw HTML scripts and produces clean semantic tags', () => {
    const md = '## Header\n\nThis is a paragraph with <script>alert("hack")</script> and **bold** text.\n\n> A quiet quote';
    const html = formatContentToHtml(md);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<h2>Header</h2>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<blockquote>');
  });
});

describe('Editorial Phase 2 — Factual Claims Validation', () => {
  it('detects unverified source bundle references', () => {
    const res = validateFactualClaims({
      contentMarkdown: 'Build 118 was released on Monday.',
      linkedSources: [
        {
          id: 'bundle-1',
          verified_at: null,
          payload: { versionCode: 118 }
        }
      ],
      assertions: [
        {
          type: 'fact',
          claim: 'Build 118 released',
          sourceBundleId: 'bundle-1'
        }
      ]
    });

    expect(res.valid).toBe(false);
    expect(res.issues[0].reason).toContain('is not yet verified');
  });
});
