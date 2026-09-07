import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { runFollowedWriterNotifications } from '../src/jobs/followed-writer-notifications.js';

describe('followed-writer publication notifications', () => {
  it('records only first public transitions of verified-human stories', async () => {
    const migration = await readFile(
      new URL('../migrations/20260906_followed_writer_publication_events.sql', import.meta.url),
      'utf8',
    );

    expect(migration).toContain("new.provenance = 'human_verified'");
    expect(migration).toContain("old.status is distinct from 'published'");
    expect(migration).toContain('old.is_public is distinct from true');
    expect(migration).toContain('on conflict (post_id) do nothing');
    expect(migration).toContain('after insert or update of status, is_public');
    expect(migration).not.toContain('security definer');
    expect(migration).toContain('revoke all on function public.enqueue_human_publication_notification_event()');
  });

  it('fans out after claiming and commits a deduplicated human-only batch', async () => {
    const queries = [];
    const transactionQueries = [];
    const database = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        return {
          rows: [{ id: 'event-1', postId: 'post-1', authorId: 'author-1', attempts: 1 }],
          rowCount: 1,
        };
      },
      connect: async () => ({
        query: async (sql, params) => {
          transactionQueries.push({ sql, params });
          return { rows: [], rowCount: 1 };
        },
        release: () => {},
      }),
    };

    await expect(runFollowedWriterNotifications(database)).resolves.toEqual({ processed: 1 });

    expect(queries[0].sql).toContain('for update skip locked');
    const fanout = transactionQueries.find(({ sql }) => sql.includes('with eligible as'));
    expect(fanout.sql).toContain("post.provenance = 'human_verified'");
    expect(fanout.sql).toContain("author.account_type = 'human'");
    expect(fanout.sql).toContain("reader.account_type = 'human'");
    expect(fanout.sql).toContain('coalesce(preference.followed_writer_published_enabled,');
    expect(fanout.sql).toContain('preference.publishing_enabled, true) = true');
    expect(fanout.sql).toContain("'followed_writer_published'");
    expect(fanout.sql).toContain("'followed_writer_published:'");
    expect(fanout.sql).toContain('on conflict (deduplication_key)');
    expect(fanout.sql).toContain('notification_delivery_outbox');
    expect(transactionQueries.map(({ sql }) => sql.trim())).toEqual(expect.arrayContaining(['begin', 'commit']));
  });

  it('rolls back and returns the durable event to pending after a transient failure', async () => {
    const updates = [];
    const database = {
      query: async (sql, params) => {
        if (sql.includes('with candidates')) {
          return { rows: [{ id: 'event-1', attempts: 1 }], rowCount: 1 };
        }
        updates.push({ sql, params });
        return { rows: [], rowCount: 1 };
      },
      connect: async () => ({
        query: async (sql) => {
          if (sql.includes('with eligible as')) throw new Error('temporary failure');
          return { rows: [], rowCount: 1 };
        },
        release: () => {},
      }),
    };

    await expect(runFollowedWriterNotifications(database)).resolves.toEqual({ processed: 1 });
    expect(updates).toHaveLength(1);
    expect(updates[0].params).toEqual(['event-1', 'pending', 'temporary failure']);
  });
});
