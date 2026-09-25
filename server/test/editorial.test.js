import { describe, expect, it } from 'vitest';
import {
  calculateReadingTime,
  validateAntiSlop,
  validateLengthClass,
  ingestReleaseEvent,
  runWeeklyEditorial,
} from '../src/services/editorial/index.js';

describe('Editorial Service - Pure Unit Tests', () => {
  it('calculates reading time accurately', () => {
    expect(calculateReadingTime('')).toBe(1);
    expect(calculateReadingTime('One two three')).toBe(1);
    const words400 = new Array(400).fill('word').join(' ');
    expect(calculateReadingTime(words400)).toBe(3); // 400 / 140 = 2.86 -> 3 min
    const words1000 = new Array(1000).fill('word').join(' ');
    expect(calculateReadingTime(words1000)).toBe(7); // 1000 / 140 = 7.14 -> 7 min

  });

  it('detects and blocks forbidden marketing/AI cliches', () => {
    expect(validateAntiSlop('A quiet room for thought.').valid).toBe(true);
    expect(validateAntiSlop('In today\'s fast-paced digital world, writing matters.').valid).toBe(false);
    expect(validateAntiSlop('In an era where attention is scarce...').valid).toBe(false);
    expect(validateAntiSlop('This will revolutionize how we read.').valid).toBe(false);
    expect(validateAntiSlop('A truly game-changing release.').valid).toBe(false);
    expect(validateAntiSlop('Unlock your creativity with new tools.').valid).toBe(false);
    expect(validateAntiSlop('We delve into the nature of prose.').valid).toBe(false);
  });

  it('validates length class bounds strictly', () => {
    // note: 150 - 350 words
    const note100 = new Array(100).fill('word').join(' ');
    expect(validateLengthClass('note', note100).valid).toBe(false);

    const note200 = new Array(200).fill('word').join(' ');
    expect(validateLengthClass('note', note200).valid).toBe(true);

    const note400 = new Array(400).fill('word').join(' ');
    expect(validateLengthClass('note', note400).valid).toBe(false);

    // essay: 1200 - 2500 words
    const essay500 = new Array(500).fill('word').join(' ');
    expect(validateLengthClass('essay', essay500).valid).toBe(false);

    const essay1500 = new Array(1500).fill('word').join(' ');
    expect(validateLengthClass('essay', essay1500).valid).toBe(true);
  });
});

describe('Editorial Service - Idempotency & Release Ingestion', () => {
  it('enforces idempotency on release ingestion', async () => {
    const executedQueries = [];
    const mockRows = [];

    const mockPool = {
      query: async (sql, params) => {
        executedQueries.push({ sql, params });
        if (sql.includes('from public.editorial_releases where idempotency_key = ')) {
          const match = mockRows.find(r => r.idempotency_key === params[0]);
          return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
        }
        if (sql.includes('insert into public.editorial_releases')) {
          const newRel = {
            id: 'rel-1',
            idempotency_key: params[0],
            platform: params[1],
            version_code: params[2],
            version_name: params[3],
          };
          mockRows.push(newRel);
          return { rows: [newRel], rowCount: 1 };
        }
        if (sql.toLowerCase().includes('update public.editorial_posts')) {
          return { rows: [{ id: 'post-1', slug: 'update-1', title: 'Update 1', status: 'published', type: 'update', content_markdown: 'hello' }], rowCount: 1 };
        }
        if (sql.toLowerCase().includes('select coalesce(max(revision_number), 0) + 1 as next_rev')) {
          return { rows: [{ next_rev: 1 }], rowCount: 1 };
        }
        if (sql.toLowerCase().includes('select * from public.editorial_posts where id =')) {
          return { rows: [{ id: 'post-1', slug: 'update-1', title: 'Update 1', status: 'approved', type: 'update', content_markdown: 'hello' }], rowCount: 1 };
        }
        if (sql.toLowerCase().includes('insert into public.editorial_posts')) {
          return { rows: [{ id: 'post-1', slug: params[0], title: params[1] }], rowCount: 1 };
        }
        if (sql.includes('INSERT INTO public.editorial_releases')) {
          if (mockRows.some(r => r.idempotency_key === params[0])) {
            return { rows: [], rowCount: 0 };
          }
          const newRel = { id: 'rel-1', platform: params[1], version_code: params[2], version_name: params[3], idempotency_key: params[0] };
          mockRows.push(newRel);
          return { rows: [newRel], rowCount: 1 };
        }
        if (sql.includes('FROM public.editorial_source_bundles') || sql.includes('UPDATE public.editorial_source_bundles') || sql.includes('insert into public.editorial_source_bundles') || sql.includes('INSERT INTO public.editorial_source_bundles')) {
          return { rows: [{ id: 'src_release_android_117', verified: true }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      connect: async () => mockPool
    };
    mockPool.release = () => {};

    // First ingestion: succeeds and creates release + update post
    const result1 = await ingestReleaseEvent(mockPool, {
      idempotencyKey: 'android:117',
      platform: 'android',
      versionCode: 117,
      versionName: '2.0.15',
      userVisibleChanges: ['In-App Review', 'Quiet Reader Telemetry']
    });

    expect(result1.success).toBe(true);
    expect(result1.alreadyProcessed).toBe(false);
    expect(result1.updatePost).toBeDefined();

    // Second ingestion with same idempotencyKey: returns alreadyProcessed = true
    const result2 = await ingestReleaseEvent(mockPool, {
      idempotencyKey: 'android:117',
      platform: 'android',
      versionCode: 117,
      versionName: '2.0.15',
      userVisibleChanges: ['In-App Review', 'Quiet Reader Telemetry']
    });

    expect(result2.success).toBe(true);
    expect(result2.alreadyProcessed).toBe(true);
    expect(result2.message).toBe('Release event already ingested');
  });

  it('weekly editorial runner returns zero candidates when no major releases exist', async () => {
    const mockPool = {
      query: async (sql) => {
        if (sql.includes('FROM public.editorial_releases')) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes('FROM public.editorial_posts')) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      }
    };

    const outcome = await runWeeklyEditorial(mockPool, { force: false });
    expect(outcome.success).toBe(true);
    expect(outcome.candidatesGenerated).toBe(0);
    expect(outcome.candidates).toEqual([]);
    expect(outcome.log.some(l => l.includes('DO NOTHING: No releases met significance threshold'))).toBe(true);
  });
});
