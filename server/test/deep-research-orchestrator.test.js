import { describe, it, expect } from 'vitest';
import {
  decomposeEditorialPremise,
  synthesizeResearchDossier,
  MAX_RESEARCH_DEPTH
} from '../src/bot-engine/deep-research-orchestrator.js';

describe('ADK 2 Pillar 3: Deep Research Orchestrator', () => {
  it('enforces maximum research depth bound to prevent runaway loops', () => {
    expect(MAX_RESEARCH_DEPTH).toBe(2);
  });

  it('decomposes tech topics into architectural, benchmark, and failure mode sub-queries', () => {
    const subQueries = decomposeEditorialPremise('PostgreSQL WAL Replication', 'Tech');
    expect(subQueries).toHaveLength(3);
    expect(subQueries[0]).toContain('architecture benchmarks');
    expect(subQueries[1]).toContain('failure modes latency');
    expect(subQueries[2]).toContain('open source implementation');
  });

  it('decomposes review topics into teardown, durability, and benchmark sub-queries', () => {
    const subQueries = decomposeEditorialPremise('Ather 450X Apex', 'Reviews');
    expect(subQueries).toHaveLength(3);
    expect(subQueries[0]).toContain('teardown specifications');
    expect(subQueries[1]).toContain('durability test');
    expect(subQueries[2]).toContain('benchmark');
  });

  it('decomposes cultural topics into historical origin and craftsmanship sub-queries', () => {
    const subQueries = decomposeEditorialPremise('Terracotta Pottery of Kumartuli', 'Culture');
    expect(subQueries).toHaveLength(3);
    expect(subQueries[0]).toContain('historical origins');
    expect(subQueries[2]).toContain('craftsmanship');
  });

  it('synthesizes worker results into a typed ResearchDossier with sensory anchors and claims', () => {
    const mockWorkerResults = [
      {
        subQuery: 'Mechanical Keyboards Acoustics',
        newsReports: [
          { headline: 'Aluminum Chassis Gasket Mount Sound Test', source: 'Desk Lab', pubDate: 'Sep 10' }
        ],
        wikiSummary: {
          title: 'Mechanical keyboard',
          extract: 'A computer keyboard using individual physical switches beneath each key.'
        },
        success: true
      },
      {
        subQuery: 'Soldering and brass plate durability',
        newsReports: [
          { headline: 'Brass and copper switch plates tested for acoustic resonance', source: 'Sound Lab', pubDate: 'Sep 11' }
        ],
        wikiSummary: {
          title: 'Soldering',
          extract: 'A process in which two or more items are joined together by melting filler metal.'
        },
        success: true
      }
    ];

    const dossier = synthesizeResearchDossier({
      topic: 'Custom Mechanical Keyboards Acoustics',
      category: 'Reviews',
      depth: 1,
      workerResults: mockWorkerResults
    });

    expect(dossier.topic).toBe('Custom Mechanical Keyboards Acoustics');
    expect(dossier.factualClaims).toContain('Aluminum Chassis Gasket Mount Sound Test');
    expect(dossier.factualClaims).toContain('Brass and copper switch plates tested for acoustic resonance');
    // Check that physical material words (brass, copper, gasket, chassis, soldering) were detected
    expect(dossier.sensoryAnchors).toEqual(expect.arrayContaining(['brass', 'copper', 'gasket', 'chassis']));
    expect(dossier.synthesizedContext).toContain('Verified Real-World Context:');
    expect(dossier.synthesizedContext).toContain('Historical & Structural Foundations:');
  });
});
