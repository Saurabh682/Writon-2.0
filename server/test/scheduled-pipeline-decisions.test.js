import { describe, it, expect, vi } from 'vitest';
import {
  evaluateEditorialAngleDistinctiveness,
  routeTopicToEditorialSlot
} from '../src/bot-engine/trend-orchestrator.js';
import { classifyTrendCategory } from '../src/bot-engine/trend-scout-service.js';
import { resolveReviewCategory, resolvePublicationCategory } from '../src/bot-engine/content-relevance-service.js';
import { executeScheduledSlot, runMasterSchedulerTick } from '../src/bot-engine/master-scheduler.js';
import { executePostAction, runSparkPulse } from '../src/bot-engine/spark-runner.js';
import { ensureContextualComment } from '../src/bot-engine/content-relevance-service.js';

describe('Scheduled Bot Publishing Pipeline Decisions', () => {

  describe('Decision Point 1: Research Verification Gate (Weak / Unsupported -> SKIP)', () => {
    it('skips the slot when discovered trend candidates lack corroborated research (fewer than 3 sources or stale)', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
      };
      const slot = {
        id: 'morning_tech',
        time: '10:30',
        type: 'editorial',
        description: 'Tech & Journalism Slot'
      };

      const result = await executeScheduledSlot(mockPool, slot, {
        getApprovedBrief: vi.fn().mockResolvedValue(null),
        discoverTrends: vi.fn().mockResolvedValue({
          curatedStoryAngles: [
            {
              authorPenName: 'karthik_subramanian',
              editorialAngle: 'Analyze systems architecture and latency bottlenecks behind distributed stream processing.',
              researchBrief: {
                topic: 'Single Source Speculation',
                trend_score: 80,
                research_dossier: {
                  newsReports: [
                    { headline: 'Rumor circulating on forum', url: 'https://news.example.com/1', source: 'BlogA' }
                  ] // only 1 source (< 3 required)
                }
              }
            }
          ]
        }),
        queueBrief: vi.fn(),
        runPulse: vi.fn()
      });

      expect(result.action).toBe('slot_skipped');
      expect(result.decision).toBe('SKIP');
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('UNSUPPORTED_RESEARCH_OR_NO_DISTINCT_ANGLE');
    });
  });

  describe('Decision Point 2: Distinct Angle Evaluation Gate (No Distinct Angle -> SKIP)', () => {
    it('rejects angles that merely repeat or summarize headlines without craft tension', () => {
      const evaluation = evaluateEditorialAngleDistinctiveness({
        topic: 'New GPU Architecture Announced',
        headline: 'New GPU Architecture Announced Today by Vendor',
        editorialAngle: 'News update on New GPU Architecture Announced Today by Vendor',
        category: 'Tech'
      });

      expect(evaluation.distinct).toBe(false);
      expect(evaluation.decision).toBe('SKIP');
      expect(evaluation.reason).toContain('NO_DISTINCT_WRITON_ANGLE');
    });

    it('rejects trivial or short angles', () => {
      const evaluation = evaluateEditorialAngleDistinctiveness({
        topic: 'AI Benchmark',
        headline: 'AI Benchmark Released',
        editorialAngle: 'A look at AI',
        category: 'Tech'
      });

      expect(evaluation.distinct).toBe(false);
      expect(evaluation.decision).toBe('SKIP');
    });

    it('approves angles that provide craft depth, systems trade-offs, or institutional tension', () => {
      const evaluation = evaluateEditorialAngleDistinctiveness({
        topic: 'Memory Allocators',
        headline: 'Rust Engine Adopts New Memory Allocator',
        editorialAngle: 'Analyze systems architecture, memory boundary latency bottlenecks, and zero-copy trade-offs in low-level runtimes.',
        category: 'Tech'
      });

      expect(evaluation.distinct).toBe(true);
      expect(evaluation.decision).toBe('PROCEED');
    });

    it('rejects generic keyword-stuffed angles without a substantive inquiry or reader benefit', () => {
      const evaluation = evaluateEditorialAngleDistinctiveness({
        topic: 'Distributed Systems',
        headline: 'Distributed Systems in Modern Clouds',
        editorialAngle: 'This is a generic story with latency.',
        category: 'Tech'
      });

      expect(evaluation.distinct).toBe(false);
      expect(evaluation.decision).toBe('SKIP');
      expect(evaluation.reason).toContain('NO_DISTINCT_WRITON_ANGLE');
    });

    it('rejects formulaic filler angles like "Explain the details of..." without concrete tension', () => {
      const evaluation = evaluateEditorialAngleDistinctiveness({
        topic: 'Bose Headphones',
        headline: 'Bose Releases New Headphones',
        editorialAngle: 'Explain the details of Bose headphones in modern music.',
        category: 'Reviews'
      });

      expect(evaluation.distinct).toBe(false);
      expect(evaluation.decision).toBe('SKIP');
      expect(evaluation.reason).toContain('NO_DISTINCT_WRITON_ANGLE');
    });

    it('rejects placeholder overview angles like "A complete guide to everything you need to know..."', () => {
      const evaluation = evaluateEditorialAngleDistinctiveness({
        topic: 'Sony Speakers',
        headline: 'Sony Introduces New Speaker Line',
        editorialAngle: 'A complete guide to everything you need to know about Sony speakers.',
        category: 'Reviews'
      });

      expect(evaluation.distinct).toBe(false);
      expect(evaluation.decision).toBe('SKIP');
      expect(evaluation.reason).toContain('NO_DISTINCT_WRITON_ANGLE');
    });

    it('approves concrete reader-benefit inquiry angle without requiring arbitrary keywords', () => {
      const evaluation = evaluateEditorialAngleDistinctiveness({
        topic: 'Silent Book Club',
        headline: 'Silent Book Clubs Expand Globally',
        editorialAngle: 'Explain how bringing different books removes the pressure to finish an assigned novel.',
        category: 'Culture'
      });

      expect(evaluation.distinct).toBe(true);
      expect(evaluation.decision).toBe('PROCEED');
    });

    it('approves inquiry examining technical trade-offs or systems overhead', () => {
      const evaluation = evaluateEditorialAngleDistinctiveness({
        topic: 'PostgreSQL MVCC',
        headline: 'PostgreSQL MVCC Concurrency Update',
        editorialAngle: 'Examine whether multi-version concurrency control introduces hidden vacuum overhead during sustained bulk updates.',
        category: 'Tech'
      });

      expect(evaluation.distinct).toBe(true);
      expect(evaluation.decision).toBe('PROCEED');
    });
  });

  describe('Decision Point 3: Category & Format Lock (Tech Reviews -> Tech or Reviews, NOT Culture)', () => {
    it('routes hardware and gadget reviews strictly to Reviews or Tech, never Culture', () => {
      const route1 = routeTopicToEditorialSlot('Sony A7 IV Hands-On Camera Test', 'Comparative lens benchmark and dynamic range review');
      expect(route1.category).toBe('Reviews');
      expect(route1.category).not.toBe('Culture');

      const route2 = routeTopicToEditorialSlot('Nvidia RTX 5090 Architecture', 'GPU memory bus bandwidth and tensor core scaling');
      expect(route2.category).toBe('Tech');
      expect(route2.category).not.toBe('Culture');

      const route3 = routeTopicToEditorialSlot('Pixel 9 Pro Fold Teardown', 'Hinge mechanics and display durability assessment');
      expect(['Reviews', 'Tech']).toContain(route3.category);
      expect(route3.category).not.toBe('Culture');
    });

    it('routes audio products like Bose headphones and Sony speakers to Reviews, never Culture', () => {
      const route1 = routeTopicToEditorialSlot('Bose headphones music listening guide', 'Active noise cancellation and soundstage evaluation');
      expect(route1.category).toBe('Reviews');
      expect(route1.category).not.toBe('Culture');

      const route2 = routeTopicToEditorialSlot('Sony speaker music quality', 'Bass response, mid-clarity, and room acoustics test');
      expect(route2.category).toBe('Reviews');
      expect(route2.category).not.toBe('Culture');

      expect(classifyTrendCategory('Bose headphones music listening guide')).toBe('Reviews');
      expect(classifyTrendCategory('Sony speaker music quality')).toBe('Reviews');
    });

    it('routes turntables, microphones, and soundbars strictly to Reviews, never Culture', () => {
      const route1 = routeTopicToEditorialSlot('Audio-Technica turntable vinyl listening guide', 'Tonearm tracking force and stylus cartridge comparison');
      expect(route1.category).toBe('Reviews');
      expect(route1.category).not.toBe('Culture');

      const route2 = routeTopicToEditorialSlot('Shure microphone vocal recording test', 'Polar pattern frequency response and preamp gain benchmark');
      expect(route2.category).toBe('Reviews');
      expect(route2.category).not.toBe('Culture');

      const route3 = routeTopicToEditorialSlot('Sonos soundbar home theater setup guide', 'Dolby Atmos acoustic dispersion and room tuning test');
      expect(route3.category).toBe('Reviews');
      expect(route3.category).not.toBe('Culture');
    });

    it('ensures classifyTrendCategory routes tech benchmarks and reviews to Reviews or Tech', () => {
      expect(classifyTrendCategory('EV Battery Range Test', 'Highway range and charging curve benchmark')).toBe('Reviews');
      expect(classifyTrendCategory('iPhone 16 Pro Camera Specs', 'Sensor size and telephoto optics comparison')).toBe('Reviews');
      expect(classifyTrendCategory('Linux 6.12 Kernel Release', 'Realtime PREEMPT_RT merge and scheduler throughput')).toBe('Tech');
      expect(classifyTrendCategory('Kolkata Durga Puja Heritage', 'Traditional clay idol sculpting at Kumartuli')).toBe('Culture');
    });

    it('ensures resolveReviewCategory defaults to Reviews rather than Culture', () => {
      expect(resolveReviewCategory('', 'Culture')).toBe('Reviews');
      expect(resolveReviewCategory('EVs & Battery Tech')).toBe('Reviews');
    });

    it('ensures resolvePublicationCategory prevents hardware reviews from falling into Culture', () => {
      const cat = resolvePublicationCategory({
        declaredCategory: 'Culture',
        title: 'Sony speaker music quality',
        summary: 'Testing acoustic room response and bass definition'
      });
      expect(cat).toBe('Reviews');
      expect(cat).not.toBe('Culture');
    });
  });

  describe('Decision Point 4: Quality Gate Failure Handling (Failed Gate -> SKIP, Never Force a Slot)', () => {
    it('returns a clean structured SKIP when zero-AI-slop integrity check detects canned templates', async () => {
      const mockPool = {
        query: vi.fn().mockImplementation((sql) => {
          if (sql.includes('bot_configs')) {
            return Promise.resolve({
              rows: [{ id: 'bot-1', pen_name: 'karthik_subramanian', full_name: 'Karthik Subramanian', categories: ['Tech'], persona_prompt: 'Tech writer' }]
            });
          }
          if (sql.includes('bot_global_settings')) {
            return Promise.resolve({ rows: [{ is_engine_enabled: true }] });
          }
          if (sql.includes('posts')) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn()
        })
      };

      // Pass custom title containing a canned slop formula suffix
      const result = await executePostAction(mockPool, {
        botId: 'bot-1',
        category: 'Tech',
        customTitle: 'Distributed Systems: reflections on a changing world',
        customContent: 'A technical analysis of database consistency models without code blocks.',
        topicHint: 'Distributed systems'
      });

      expect(result.skipped).toBe(true);
      expect(result.decision).toBe('SKIP');
      expect(result.gate).toBe('ZERO_AI_SLOP_INTEGRITY');
      expect(result.reason).toContain('TRENDING_KEYWORD_AS_TITLE_FAIL');
    });

    it('returns a clean structured SKIP when anti-repetition governance check detects banned cliché patterns', async () => {
      const mockPool = {
        query: vi.fn().mockImplementation((sql) => {
          if (sql.includes('bot_configs')) {
            return Promise.resolve({
              rows: [{ id: 'bot-1', pen_name: 'karthik_subramanian', full_name: 'Karthik Subramanian', categories: ['Tech'], persona_prompt: 'Tech writer' }]
            });
          }
          if (sql.includes('bot_global_settings')) {
            return Promise.resolve({ rows: [{ is_engine_enabled: true }] });
          }
          if (sql.includes('editorial_anti_repetition')) {
            return Promise.resolve({
              rows: [
                { pattern_type: 'cliche_phrase', patternType: 'cliche_phrase', pattern: 'delve into the tapestry', reason: 'banned AI cliché' }
              ]
            });
          }
          return Promise.resolve({ rows: [] });
        }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn()
        })
      };

      const validLengthContent = `
        The storage engine writes pages directly to non-volatile memory through an operating system buffer cache.
        When transactions commit, the write-ahead log records the changes sequentially before any dirty pages
        are flushed to the underlying tablespace. This ensures durability across unexpected power interrupts.
        The checkpoint process periodically scans the buffer pool to identify pages modified since the previous
        checkpoint cycle, writing them out to storage in batches to bound the required crash recovery duration.
        In this essay we delve into the tapestry of database internals and write-ahead logging across modern systems.
        Modern solid-state drives introduce unique considerations for database designers, because flash memory
        cannot be rewritten in place without first erasing an entire block. This fundamental hardware asymmetry
        leads to write amplification, where a modest logical update causes multiple physical writes to the NAND flash.
        Consequently, database architectures increasingly decouple the transaction journal from the data pages,
        allowing high-throughput sequential operations while minimizing random writes to persistent storage blocks.
        Engineers must balance write throughput against checkpoint latency, tuning background flusher threads
        to ensure steady performance without starving concurrent transactional readers during heavy ingest workloads.
        The trade-off between write amplification and recovery point objectives remains a primary design constraint
        for any distributed consensus protocol operating on commercial flash storage arrays in production environments.
        By understanding the physical gates through which electrons pass, we gain a practical appreciation for storage.
        Observing these physical constraints allows systems architects to optimize latency distributions effectively.
        Modern solid-state memory controllers deploy complex garbage collection routines and wear-leveling algorithms
        in the background to evenly distribute writes across flash cells and avoid premature device exhaustion.
        When transactional write pressure exceeds the controller flusher bandwidth, write latency rises exponentially,
        producing tail latency degradation across dependent services. System architects must measure both average
        and 99th-percentile commit latency to understand how physical drive controllers manage dirty page spikes.
        By instrumenting asynchronous flushing threads and aligning filesystem block boundaries with disk page sizes,
        engineering teams can dramatically reduce write amplification factors and ensure dependable durability guarantees.
      `.trim();

      const result = await executePostAction(mockPool, {
        botId: 'bot-1',
        category: 'Tech',
        customTitle: 'The Storage Layer Engine',
        customContent: validLengthContent,
        topicHint: 'Database storage'
      });

      expect(result.skipped).toBe(true);
      expect(result.decision).toBe('SKIP');
      expect(result.gate).toBe('ANTI_REPETITION');
      expect(result.reason).toContain('delve into the tapestry');
    });

    it('retains an explicit technical failure when pre-publication critic encounters a service outage', async () => {
      vi.stubEnv('CRITIC_REQUIRED', 'true');
      vi.stubEnv('LM_STUDIO_URL', 'http://127.0.0.1:9999');

      const mockPool = {
        query: vi.fn().mockImplementation((sql) => {
          if (sql.includes('bot_configs')) {
            return Promise.resolve({
              rows: [{ id: 'bot-1', pen_name: 'karthik_subramanian', full_name: 'Karthik Subramanian', categories: ['Tech'], persona_prompt: 'Tech writer' }]
            });
          }
          if (sql.includes('bot_global_settings')) {
            return Promise.resolve({ rows: [{ is_engine_enabled: true }] });
          }
          if (sql.includes('editorial_anti_repetition')) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn()
        })
      };

      const validContent = `
        The storage engine writes pages directly to non-volatile memory through an operating system buffer cache.
        When transactions commit, the write-ahead log records the changes sequentially before any dirty pages
        are flushed to the underlying tablespace. This ensures durability across unexpected power interrupts.
        The checkpoint process periodically scans the buffer pool to identify pages modified since the previous
        checkpoint cycle, writing them out to storage in batches to bound the required crash recovery duration.
        Modern solid-state drives introduce unique considerations for database designers, because flash memory
        cannot be rewritten in place without first erasing an entire block. This fundamental hardware asymmetry
        leads to write amplification, where a modest logical update causes multiple physical writes to the NAND flash.
        Consequently, database architectures increasingly decouple the transaction journal from the data pages,
        allowing high-throughput sequential operations while minimizing random writes to persistent storage blocks.
        Engineers must balance write throughput against checkpoint latency, tuning background flusher threads
        to ensure steady performance without starving concurrent transactional readers during heavy ingest workloads.
        The trade-off between write amplification and recovery point objectives remains a primary design constraint
        for any distributed consensus protocol operating on commercial flash storage arrays in production environments.
        By understanding the physical gates through which electrons pass, we gain a practical appreciation for storage.
        Observing these physical constraints allows systems architects to optimize latency distributions effectively.
        Modern solid-state memory controllers deploy complex garbage collection routines and wear-leveling algorithms
        in the background to evenly distribute writes across flash cells and avoid premature device exhaustion.
        When transactional write pressure exceeds the controller flusher bandwidth, write latency rises exponentially,
        producing tail latency degradation across dependent services. System architects must measure both average
        and 99th-percentile commit latency to understand how physical drive controllers manage dirty page spikes.
        By instrumenting asynchronous flushing threads and aligning filesystem block boundaries with disk page sizes,
        engineering teams can dramatically reduce write amplification factors and ensure dependable durability guarantees.
      `.trim();

      // Critic is required but unreachable -> MUST throw technical failure, NOT return { skipped: true, decision: 'SKIP' }
      await expect(executePostAction(mockPool, {
        botId: 'bot-1',
        category: 'Tech',
        customTitle: 'The Storage Layer Engine Internals',
        customContent: validContent,
        topicHint: 'Database storage'
      })).rejects.toThrow(/Critic service failure|Critic service unavailable/i);

      vi.unstubAllEnvs();
    });
  });

  describe('Decision Point 5: Unattended Automatic Publishing for Low-Risk Stories', () => {
    it('automatically publishes eligible low-risk brief without requiring routine human review', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
      };
      const slot = {
        id: 'dawn_digest',
        time: '07:00',
        type: 'editorial',
        description: 'Morning Longform Essay'
      };

      const mockPulse = vi.fn().mockResolvedValue({
        postId: 'auto-published-post-777',
        title: 'The Weight of the Ledger',
        category: 'Essays'
      });

      const result = await executeScheduledSlot(mockPool, slot, {
        getApprovedBrief: vi.fn().mockResolvedValue({
          id: 'brief-low-risk-1',
          topic: 'Handmade Metal Casting',
          topic_category: 'Culture',
          suggested_author_pen_name: 'kelly_miracle_art',
          approval_mode: 'automatic_low_risk',
          trend_score: 75,
          research_dossier: {
            topic: 'Handmade Metal Casting',
            newsReports: [
              { headline: 'Dhamrai metal craft documented', url: 'https://news.example.com/1', source: 'National News', publishedAt: new Date().toISOString() },
              { headline: 'Lost wax casting tradition active', url: 'https://news.example.com/2', source: 'Craft Review', publishedAt: new Date().toISOString() },
              { headline: 'Artisan workshop apprenticeships continue', url: 'https://news.example.com/3', source: 'Heritage Daily', publishedAt: new Date().toISOString() }
            ]
          }
        }),
        claimBrief: vi.fn().mockResolvedValue({
          id: 'brief-low-risk-1',
          topic: 'Handmade Metal Casting',
          topic_category: 'Culture',
          suggested_author_pen_name: 'kelly_miracle_art',
          approval_mode: 'automatic_low_risk',
          trend_score: 75,
          research_dossier: {
            topic: 'Handmade Metal Casting',
            newsReports: [
              { headline: 'Dhamrai metal craft documented', url: 'https://news.example.com/1', source: 'National News', publishedAt: new Date().toISOString() },
              { headline: 'Lost wax casting tradition active', url: 'https://news.example.com/2', source: 'Craft Review', publishedAt: new Date().toISOString() },
              { headline: 'Artisan workshop apprenticeships continue', url: 'https://news.example.com/3', source: 'Heritage Daily', publishedAt: new Date().toISOString() }
            ]
          }
        }),
        runPulse: mockPulse
      });

      expect(result.action).toBe('published_story');
      expect(result.postId).toBe('auto-published-post-777');
      expect(mockPulse).toHaveBeenCalledWith(mockPool, expect.objectContaining({
        automaticPublication: true,
        forcePublication: true
      }));
    });
  });

  describe('Decision Point 6: Contextual Comments', () => {
    it('ensures contextual comments are anchored to specific story details rather than generic praise', () => {
      const comment = ensureContextualComment('Great post, loved reading this!', {
        postTitle: 'PostgreSQL WAL Checkpoint Hydraulics',
        category: 'Tech',
        snippet: 'The background writer flushes dirty pages to NVMe storage during high checkpoint spikes.'
      });

      expect(comment).not.toBe('Great post, loved reading this!');
      expect(comment.toLowerCase()).toMatch(/checkpoint|nvme|background writer|storage|postgres|wal/i);
    });
  });

  describe('Decision Point 7: Outcome Recording & Ledger Classification', () => {
    it('classifies skipped slots into outcome.skipped in runMasterSchedulerTick', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [{ slot_id: 'dawn_digest' }], rowCount: 1 })
      };

      const mockExecuteSlot = vi.fn().mockResolvedValue({
        action: 'slot_skipped',
        decision: 'SKIP',
        skipped: true,
        slotId: 'dawn_digest',
        reason: 'UNSUPPORTED_RESEARCH_OR_NO_DISTINCT_ANGLE'
      });

      // Target a specific due time e.g. 07:00 IST
      const mockDate = new Date('2026-10-05T01:30:00Z'); // 07:00 IST
      const outcome = await runMasterSchedulerTick(mockPool, {
        now: mockDate,
        executeSlot: mockExecuteSlot
      });

      expect(outcome.completed).toContain('dawn_digest');
      expect(outcome.skipped).toContain('dawn_digest');
      expect(outcome.published).toHaveLength(0);
      expect(outcome.failed).toHaveLength(0);
    });

    it('handles technical failure in executeScheduledSlot by returning slot_failed and releasing brief claim', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
      };
      const slot = {
        id: 'dawn_digest',
        time: '07:00',
        type: 'editorial',
        description: 'Morning Longform Essay'
      };

      const releaseBriefClaimMock = vi.fn().mockResolvedValue(true);

      const result = await executeScheduledSlot(mockPool, slot, {
        getApprovedBrief: vi.fn().mockResolvedValue({
          id: 'brief-err-1',
          topic: 'Handmade Metal Casting',
          topic_category: 'Culture',
          suggested_author_pen_name: 'kelly_miracle_art',
          approval_mode: 'automatic_low_risk',
          trend_score: 75,
          research_dossier: {
            topic: 'Handmade Metal Casting',
            newsReports: [
              { headline: 'Report 1', url: 'https://news.example.com/1', source: 'Source 1', publishedAt: new Date().toISOString() },
              { headline: 'Report 2', url: 'https://news.example.com/2', source: 'Source 2', publishedAt: new Date().toISOString() },
              { headline: 'Report 3', url: 'https://news.example.com/3', source: 'Source 3', publishedAt: new Date().toISOString() }
            ]
          }
        }),
        claimBrief: vi.fn().mockResolvedValue({
          id: 'brief-err-1',
          topic: 'Handmade Metal Casting',
          topic_category: 'Culture',
          suggested_author_pen_name: 'kelly_miracle_art',
          approval_mode: 'automatic_low_risk',
          trend_score: 75,
          research_dossier: {
            topic: 'Handmade Metal Casting',
            newsReports: [
              { headline: 'Report 1', url: 'https://news.example.com/1', source: 'Source 1', publishedAt: new Date().toISOString() },
              { headline: 'Report 2', url: 'https://news.example.com/2', source: 'Source 2', publishedAt: new Date().toISOString() },
              { headline: 'Report 3', url: 'https://news.example.com/3', source: 'Source 3', publishedAt: new Date().toISOString() }
            ]
          }
        }),
        releaseBriefClaim: releaseBriefClaimMock,
        runPulse: vi.fn().mockResolvedValue({
          error: 'Critic service connection refused',
          action: 'pulse_failed'
        })
      });

      expect(result.action).toBe('slot_failed');
      expect(result.error).toContain('Critic service connection refused');
      expect(result.isTechnicalFailure).toBe(true);
      expect(result.retryable).toBe(true);
      expect(releaseBriefClaimMock).toHaveBeenCalled();
    });

    it('records technical slot failure in outcome.failed in runMasterSchedulerTick', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [{ slot_id: 'dawn_digest' }], rowCount: 1 })
      };

      const mockExecuteSlot = vi.fn().mockResolvedValue({
        action: 'slot_failed',
        error: 'Database connection timeout',
        isTechnicalFailure: true,
        retryable: true
      });

      const mockDate = new Date('2026-10-05T01:30:00Z'); // 07:00 IST
      const outcome = await runMasterSchedulerTick(mockPool, {
        now: mockDate,
        executeSlot: mockExecuteSlot
      });

      expect(outcome.failed).toContain('dawn_digest');
      expect(outcome.completed).toHaveLength(0);
      expect(outcome.skipped).toHaveLength(0);
    });

    it('records exactly one enriched ledger entry with research provenance on publication', async () => {
      const insertedLedgerEntries = [];
      const mockPool = {
        query: vi.fn().mockImplementation((sql, params) => {
          if (sql.includes('bot_configs')) {
            return Promise.resolve({
              rows: [{ id: 'bot-1', pen_name: 'karthik_subramanian', full_name: 'Karthik Subramanian', categories: ['Tech'], persona_prompt: 'Tech writer' }]
            });
          }
          if (sql.includes('bot_global_settings')) {
            return Promise.resolve({ rows: [{ is_engine_enabled: true }] });
          }
          if (sql.includes('editorial_ledger_entries')) {
            insertedLedgerEntries.push(params);
            return Promise.resolve({ rows: [{ id: 'ledger-entry-1' }] });
          }
          if (sql.includes('posts') && sql.includes('insert into')) {
            return Promise.resolve({
              rows: [{
                id: 'post-new-1',
                title: 'The Storage Layer Engine Internals',
                slug: 'the-storage-layer-engine-internals',
                reading_time_min: 4,
                created_at: new Date()
              }]
            });
          }
          return Promise.resolve({ rows: [] });
        }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockImplementation((sql, params) => {
            if (sql.includes('posts') && sql.includes('insert into')) {
              return Promise.resolve({
                rows: [{
                  id: 'post-new-1',
                  title: 'The Storage Layer Engine Internals',
                  slug: 'the-storage-layer-engine-internals',
                  reading_time_min: 4,
                  created_at: new Date()
                }]
              });
            }
            if (sql.includes('editorial_ledger_entries')) {
              insertedLedgerEntries.push(params);
              return Promise.resolve({ rows: [{ id: 'ledger-entry-1' }] });
            }
            return Promise.resolve({ rows: [] });
          }),
          release: vi.fn()
        })
      };

      const validContent = `
        The storage engine writes pages directly to non-volatile memory through an operating system buffer cache.
        When transactions commit, the write-ahead log records the changes sequentially before any dirty pages
        are flushed to the underlying tablespace. This ensures durability across unexpected power interrupts.
        The checkpoint process periodically scans the buffer pool to identify pages modified since the previous
        checkpoint cycle, writing them out to storage in batches to bound the required crash recovery duration.
        Modern solid-state drives introduce unique considerations for database designers, because flash memory
        cannot be rewritten in place without first erasing an entire block. This fundamental hardware asymmetry
        leads to write amplification, where a modest logical update causes multiple physical writes to the NAND flash.
        Consequently, database architectures increasingly decouple the transaction journal from the data pages,
        allowing high-throughput sequential operations while minimizing random writes to persistent storage blocks.
        Engineers must balance write throughput against checkpoint latency, tuning background flusher threads
        to ensure steady performance without starving concurrent transactional readers during heavy ingest workloads.
        The trade-off between write amplification and recovery point objectives remains a primary design constraint
        for any distributed consensus protocol operating on commercial flash storage arrays in production environments.
        By understanding the physical gates through which electrons pass, we gain a practical appreciation for storage.
        Observing these physical constraints allows systems architects to optimize latency distributions effectively.
        Modern solid-state memory controllers deploy complex garbage collection routines and wear-leveling algorithms
        in the background to evenly distribute writes across flash cells and avoid premature device exhaustion.
        When transactional write pressure exceeds the controller flusher bandwidth, write latency rises exponentially,
        producing tail latency degradation across dependent services. System architects must measure both average
        and 99th-percentile commit latency to understand how physical drive controllers manage dirty page spikes.
        By instrumenting asynchronous flushing threads and aligning filesystem block boundaries with disk page sizes,
        engineering teams can dramatically reduce write amplification factors and ensure dependable durability guarantees.
      `.trim();

      const researchDossier = {
        topic: 'Database Storage Internals',
        newsReports: [
          { headline: 'Report 1', source: 'Tech Review', url: 'https://news.example.com/1', publishedAt: new Date().toISOString() },
          { headline: 'Report 2', source: 'Systems Journal', url: 'https://news.example.com/2', publishedAt: new Date().toISOString() },
          { headline: 'Report 3', source: 'Storage Benchmark', url: 'https://news.example.com/3', publishedAt: new Date().toISOString() }
        ]
      };

      await executePostAction(mockPool, {
        botId: 'bot-1',
        category: 'Tech',
        customTitle: 'The Storage Layer Engine Internals',
        customContent: validContent,
        topicHint: 'Database storage',
        researchBriefId: 'brief-prov-1',
        researchDossier
      });

      // Assert exactly ONE ledger entry was created for this published story
      expect(insertedLedgerEntries.length).toBe(1);
      const entryParams = insertedLedgerEntries[0];
      // Param 11 ($11, index 10) is details JSON
      const details = JSON.parse(entryParams[10]);
      expect(details.decision).toBe('PUBLISHED');
      expect(details.researchBriefId).toBe('brief-prov-1');
      expect(details.sourceCount).toBe(3);
      expect(details.sources).toHaveLength(3);
    });
  });
});
