import { describe, it, expect } from 'vitest';
import {
  InstagramBrainValidator,
  computeSha256,
  computeAssetManifestHash,
  computeGovernanceBundleHash,
  REPETITION_ENGINE_VERSION
} from '../src/services/instagram-brain-validator.js';

describe('InstagramBrainValidator Unit Tests (17 Channel Gates & Invariants)', () => {
  const mockBrain = {
    insights: [{ id: 'insight_01', proposition_archetype: 'craft_philosophy' }],
  };
  const EXPECTED_GOV_HASH = 'gov_hash_12345';
  const validator = new InstagramBrainValidator({ brain: mockBrain, authoritativeGovernanceHash: EXPECTED_GOV_HASH });

  const sampleCandidateVersion = {
    caption: '“Platform 8 smelled of wet jute, diesel exhaust, and cold mustard oil.” 📖\n\nStart writing your next scene on WritOn today: writon.cc/go/test',
    format: 'FEED_CAROUSEL',
    governance_bundle_hash: 'gov_hash_12345',
    visual_spec: {
      quoteAuthor: 'Devansh Roy',
      slides: [
        { sequenceOrder: 1, role: 'hook', headline: 'Platform 8 at 2:15 AM', body: 'Cold mustard oil under fluorescent lights.' },
        { sequenceOrder: 2, role: 'tension', headline: 'The Unfinished Line', body: 'Words left in notebooks.' },
        { sequenceOrder: 3, role: 'proof', headline: 'Tactile Grounding', body: 'The tea that went cold at 5:55 PM.' },
        { sequenceOrder: 4, role: 'cta', headline: 'Download WritOn', body: 'Read on Android.' }
      ]
    }
  };

  const sampleAssets = [
    { id: 'a1', sequenceOrder: 1, editorialRole: 'hook', kind: 'IMAGE', aspectRatio: '4:5', fileSizeBytes: 1024 * 1024, sha256: 'sha_1', urlExpiresAt: new Date(Date.now() + 3600000).toISOString() },
    { id: 'a2', sequenceOrder: 2, editorialRole: 'tension', kind: 'IMAGE', aspectRatio: '4:5', fileSizeBytes: 1024 * 1024, sha256: 'sha_2', urlExpiresAt: new Date(Date.now() + 3600000).toISOString() },
    { id: 'a3', sequenceOrder: 3, editorialRole: 'proof', kind: 'IMAGE', aspectRatio: '4:5', fileSizeBytes: 1024 * 1024, sha256: 'sha_3', urlExpiresAt: new Date(Date.now() + 3600000).toISOString() },
    { id: 'a4', sequenceOrder: 4, editorialRole: 'cta', kind: 'IMAGE', aspectRatio: '4:5', fileSizeBytes: 1024 * 1024, sha256: 'sha_4', urlExpiresAt: new Date(Date.now() + 3600000).toISOString() },
  ];

  it('passes all 17 Instagram Channel Gates on compliant candidate and assets', async () => {
    const outcome = await validator.validateCandidate({
      candidateVersion: sampleCandidateVersion,
      assets: sampleAssets,
      recentPublications: [],
    });

    expect(outcome.passed).toBe(true);
    expect(outcome.results.length).toBe(17);
    const failed = outcome.results.filter(r => r.status === 'FAIL');
    expect(failed).toEqual([]);
  });

  it('fails IG01 if caption exceeds 2,200 characters', async () => {
    const longCaption = 'A'.repeat(2201);
    const outcome = await validator.validateCandidate({
      candidateVersion: { ...sampleCandidateVersion, caption: longCaption },
      assets: sampleAssets,
    });
    expect(outcome.passed).toBe(false);
    const ig01 = outcome.results.find(r => r.gateCode === 'IG01_CAPTION_LIMIT');
    expect(ig01.status).toBe('FAIL');
  });

  it('fails IG02 if Slide 1 contains a generic title hook', async () => {
    const badCandidate = {
      ...sampleCandidateVersion,
      visual_spec: {
        ...sampleCandidateVersion.visual_spec,
        slides: [
          { sequenceOrder: 1, role: 'hook', headline: 'Welcome to our weekly newsletter update', body: '...' },
          ...sampleCandidateVersion.visual_spec.slides.slice(1)
        ]
      }
    };
    const outcome = await validator.validateCandidate({
      candidateVersion: badCandidate,
      assets: sampleAssets,
    });
    expect(outcome.passed).toBe(false);
    const ig02 = outcome.results.find(r => r.gateCode === 'IG02_EMPTY_HOOK');
    expect(ig02.status).toBe('FAIL');
  });

  it('records versioned repetition engine metadata in IG09', async () => {
    const outcome = await validator.validateCandidate({
      candidateVersion: sampleCandidateVersion,
      assets: sampleAssets,
      recentPublications: [{ id: 'pub_999', brain_insight_id: 'other_insight' }]
    });

    const ig09 = outcome.results.find(r => r.gateCode === 'IG09_MULTIDIMENSIONAL_REPETITION');
    expect(ig09.details.engine_version).toBe(REPETITION_ENGINE_VERSION);
    expect(ig09.status).toBe('PASS');
  });

  it('computes asset manifest hash deterministically from ordered asset identity', () => {
    const hash1 = computeAssetManifestHash(sampleAssets);
    const reorderedAssets = [sampleAssets[1], sampleAssets[0], sampleAssets[3], sampleAssets[2]];
    const hash2 = computeAssetManifestHash(reorderedAssets);
    expect(hash1).toBe(hash2);

    const modifiedAssets = sampleAssets.map(a => a.id === 'a1' ? { ...a, sha256: 'tampered_sha' } : a);
    const hash3 = computeAssetManifestHash(modifiedAssets);
    expect(hash1).not.toBe(hash3);
  });
});
