import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { adminFoundingWriterRoutes } from '../src/routes/admin-founding-writers.js';

describe('founding writer administration', () => {
  let app;
  let database;
  let client;

  beforeEach(async () => {
    app = Fastify();
    client = {
      query: vi.fn(async (sql) => {
        if (sql.includes('from public.profiles') && sql.includes('for update')) {
          return {
            rowCount: 1,
            rows: [{ id: '11111111-1111-4111-8111-111111111111', username: 'real_writer', display_name: 'Real Writer', account_type: 'human', founding_writer_number: null }],
          };
        }
        if (sql.includes('insert into public.founding_writer_assignments')) {
          return { rowCount: 1, rows: [{ assigned_at: '2026-09-20T10:00:00.000Z' }] };
        }
        if (sql.includes('update public.profiles')) return { rowCount: 1 };
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    };
    database = {
      connect: vi.fn().mockResolvedValue(client),
      query: vi.fn(async (sql) => {
        if (sql.includes('count(*) over')) {
          return {
            rowCount: 1,
            rows: [{ id: '11111111-1111-4111-8111-111111111111', username: 'real_writer', display_name: 'Real Writer', founding_writer_number: 7, assigned_at: '2026-09-20T10:00:00.000Z', assigned_by: 'owner', assignment_reason: 'Early contributor', total_count: 1 }],
          };
        }
        return { rows: [], rowCount: 0 };
      }),
    };

    await app.register(adminFoundingWriterRoutes, {
      database,
      config: { adminSecretKey: 'correct-secret' },
    });
  });

  it('rejects requests without the admin secret', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/founding-writers' });
    expect(response.statusCode).toBe(403);
    expect(database.query).not.toHaveBeenCalled();
  });

  it('lists manually assigned founders without exposing email addresses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/founding-writers',
      headers: { 'x-admin-key': 'correct-secret' },
    });
    expect(response.statusCode).toBe(200);
    expect(database.query).toHaveBeenCalledWith(expect.stringContaining('profile.id = assignment.profile_id::text'));
    expect(response.json()).toEqual({
      founders: [{
        profileId: '11111111-1111-4111-8111-111111111111',
        penName: 'real_writer',
        displayName: 'Real Writer',
        foundingWriterNumber: 7,
        assignedAt: '2026-09-20T10:00:00.000Z',
        assignedBy: 'owner',
        assignmentReason: 'Early contributor',
      }],
      total: 1,
    });
  });

  it('requires an operator label and reason for every assignment', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/founding-writers/assign',
      headers: { 'x-admin-key': 'correct-secret' },
      payload: { profileId: '11111111-1111-4111-8111-111111111111', foundingWriterNumber: 7 },
    });
    expect(response.statusCode).toBe(400);
    expect(database.connect).not.toHaveBeenCalled();
  });

  it('assigns a human profile transactionally and appends the immutable audit row', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/founding-writers/assign',
      headers: { 'x-admin-key': 'correct-secret', 'x-admin-actor': 'owner' },
      payload: {
        profileId: '11111111-1111-4111-8111-111111111111',
        foundingWriterNumber: 7,
        reason: 'Early contributor',
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ foundingWriterNumber: 7, assignedBy: 'owner' });
    expect(client.query).toHaveBeenCalledWith('begin');
    expect(client.query).toHaveBeenCalledWith('commit');
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('insert into public.founding_writer_assignments'),
      expect.arrayContaining(['11111111-1111-4111-8111-111111111111', 7, 'owner', 'Early contributor']),
    );
  });

  it('never assigns bot profiles', async () => {
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('from public.profiles') && sql.includes('for update')) {
        return { rowCount: 1, rows: [{ id: '11111111-1111-4111-8111-111111111111', account_type: 'bot', founding_writer_number: null }] };
      }
      return { rows: [], rowCount: 0 };
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/founding-writers/assign',
      headers: { 'x-admin-key': 'correct-secret', 'x-admin-actor': 'owner' },
      payload: { profileId: '11111111-1111-4111-8111-111111111111', foundingWriterNumber: 7, reason: 'Early contributor' },
    });
    expect(response.statusCode).toBe(409);
    expect(client.query).toHaveBeenCalledWith('rollback');
  });

  it('accepts a Firebase UID and preserves the operator audit contract', async () => {
    const profileId = 'QZL8vpt4HGOhUVkXhGj201bGXmw1';
    client.query.mockImplementation(async sql => {
      if (sql.includes('from public.profiles')) return { rows: [{ id: profileId, username: 'writer', display_name: 'Writer', account_type: 'human', founding_writer_number: null }] };
      if (sql.includes('insert into public.founding_writer_assignments')) return { rows: [{ assigned_at: '2026-10-01T00:00:00Z' }] };
      return { rows: [], rowCount: 1 };
    });
    const response = await app.inject({ method: 'POST', url: '/api/v1/admin/founding-writers/assign', headers: { 'x-admin-key': 'correct-secret', 'x-admin-actor': 'owner' }, payload: { profileId, foundingWriterNumber: 8, reason: 'Operator-selected new cohort' } });
    expect(response.statusCode).toBe(201);
    expect(response.json().profileId).toBe(profileId);
    expect(client.query).toHaveBeenCalledWith('commit');
  });
});
