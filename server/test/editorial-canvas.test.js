import { describe, expect, it } from 'vitest';
import { CanvasRevisionConflict, getEditorialCanvas, getEditorialCanvasHistory, saveEditorialCanvas } from '../src/bot-engine/editorial-ledger-service.js';

describe('durable editorial canvas', () => {
  it('saves the next revision and records who changed it', async () => {
    const calls = [];
    const client = {
      query: async (sql, params) => {
        calls.push({ sql, params });
        if (sql.includes('for update')) return { rows: [{ revision: 3 }] };
        if (sql.includes('returning document_id')) {
          return { rows: [{ documentId: 'sprint-2', revision: 4, state: params[2], updatedBy: 'owner', updatedAt: '2026-09-08T00:00:00Z' }] };
        }
        return { rows: [] };
      },
      release() {},
    };
    const pool = { connect: async () => client };

    const saved = await saveEditorialCanvas(pool, {
      documentId: 'sprint-2', expectedRevision: 3,
      state: { '3_0': { caption: 'Revised caption', status: 'approved' } },
      changedBy: 'owner',
    });

    expect(saved.revision).toBe(4);
    expect(calls.some(({ sql }) => sql.includes('pg_advisory_xact_lock'))).toBe(true);
    expect(calls.some(({ sql, params }) => sql.includes('editorial_canvas_revisions') && params[2] === 'owner')).toBe(true);
  });

  it('rejects a stale save instead of overwriting newer work', async () => {
    const client = {
      query: async (sql) => sql.includes('for update') ? { rows: [{ revision: 5 }] } : { rows: [] },
      release() {},
    };
    const pool = { connect: async () => client };

    await expect(saveEditorialCanvas(pool, {
      documentId: 'sprint-2', expectedRevision: 4, state: {}, changedBy: 'owner',
    })).rejects.toBeInstanceOf(CanvasRevisionConflict);
  });

  it('returns an empty revision zero document before its first save', async () => {
    const pool = { query: async () => ({ rows: [] }) };
    await expect(getEditorialCanvas(pool, 'sprint-2')).resolves.toEqual({
      documentId: 'sprint-2', revision: 0, state: {}, updatedBy: null, updatedAt: null,
    });
  });

  it('returns newest revisions first with a bounded history size', async () => {
    let queryParams;
    const pool = {
      query: async (_sql, params) => {
        queryParams = params;
        return { rows: [{ revision: 4, changedBy: 'owner', createdAt: '2026-09-08T00:00:00Z' }] };
      }
    };
    const history = await getEditorialCanvasHistory(pool, 'sprint-2', 999);
    expect(history).toHaveLength(1);
    expect(history[0].revision).toBe(4);
    expect(queryParams).toEqual(['sprint-2', 50]);
  });
});
