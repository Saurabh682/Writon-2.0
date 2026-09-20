import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runDiscoveryNotifications } from '../src/jobs/discovery-notifications.js';

describe('discovery notification scheduler', () => {
  const guest = { installationId: '11111111-1111-4111-8111-111111111111',
    recipientKey: 'installation:11111111-1111-4111-8111-111111111111',
    tokenId: 'guest-token-row', token: 'guest-token', kind: 'reading_nudge',
    targetPostId: 'story-1', preferredLanguage: 'en' };
  const liveOptions = { dryRun: false, runId: 'guest-run', now: new Date('2026-09-09T12:00:00Z') };

  it('claims an installation budget and routes an accepted guest push to its story', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] })
      .mockResolvedValueOnce({ rows: [guest] }).mockResolvedValueOnce({ rows: [{ claimed: true }] }) };
    const messaging = { send: vi.fn().mockResolvedValue('message-id') };
    expect(await runDiscoveryNotifications(pool, messaging, {}, liveOptions)).toMatchObject({ sent: 1, failed: 0 });
    expect(pool.query.mock.calls[1][1]).toEqual([guest.recipientKey, null, guest.installationId,
      'reading_nudge', 'story-1', '2026-09-09', 'guest-run']);
    expect(messaging.send).toHaveBeenCalledWith(expect.objectContaining({ token: guest.token,
      data: { kind: 'reading_nudge', targetRoute: 'reader/story-1', storyId: 'story-1' } }));
  });

  it('revokes only the guest token when Firebase rejects it as unregistered', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] })
      .mockResolvedValueOnce({ rows: [guest] }).mockResolvedValueOnce({ rows: [{ claimed: true }] }) };
    const messaging = { send: vi.fn().mockRejectedValue({ code: 'messaging/registration-token-not-registered' }) };
    expect(await runDiscoveryNotifications(pool, messaging, {}, liveOptions)).toMatchObject({ sent: 0, failed: 1 });
    expect(pool.query.mock.calls[3][0]).toContain('update public.guest_device_push_tokens');
    expect(pool.query.mock.calls[3][1]).toEqual([guest.tokenId]);
  });

  it('keeps an accepted send reserved when its ledger update fails', async () => {
    const pool = { query: vi.fn().mockResolvedValueOnce({ rows: [guest] })
      .mockResolvedValueOnce({ rows: [{ claimed: true }] })
      .mockRejectedValueOnce(new Error('ledger unavailable')) };
    const messaging = { send: vi.fn().mockResolvedValue('message-id') };
    await expect(runDiscoveryNotifications(pool, messaging, {}, liveOptions)).rejects.toThrow('ledger unavailable');
    expect(messaging.send).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledTimes(3);
    expect(pool.query.mock.calls.some(([sql]) => sql.includes("status = 'failed'"))).toBe(false);
  });
  it('ships an atomic server-only shared budget', () => {
    const sql = readFileSync(new URL('../migrations/20260909_discovery_notification_budget.sql', import.meta.url), 'utf8');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("interval '7 days'");
    expect(sql).toContain('unique (recipient_key, local_date)');
    expect(sql).toContain('revoke all privileges');
  });
  it('dry-run does not claim or send', async () => {
    const pool = { query: vi.fn().mockResolvedValueOnce({ rows: [
      { profileId: 'one', kind: 'draft_nudge' }, { profileId: 'two', kind: 'reading_nudge' },
    ] }) };
    const messaging = { send: vi.fn() };
    expect(await runDiscoveryNotifications(pool, messaging, {}, { dryRun: true, runId: 'dry-1' }))
      .toEqual({ dryRun: true, eligible: 2, counts: { draft_nudge: 1, reading_nudge: 1 } });
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(messaging.send).not.toHaveBeenCalled();
  });
  it('prioritizes drafts and admits only eligible human reading content', async () => {
    const pool = { query: vi.fn().mockResolvedValueOnce({ rows: [] }) };
    await runDiscoveryNotifications(pool, { send: vi.fn() }, {}, { dryRun: true });
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toContain("updated_at <= now() - interval '5 days'");
    expect(sql).toContain("device.last_seen_at <= now() - interval '3 days'");
    expect(sql).toContain("post.provenance = 'human_verified'");
    expect(sql).toContain("author.account_type = 'human'");
    expect(sql).toContain('from public.guest_device_push_tokens');
    expect(sql).toContain('order by recipient_key, priority');
  });
  it('suppresses delivery when the shared budget refuses the claim', async () => {
    const pool = { query: vi.fn().mockResolvedValueOnce({ rows: [{ profileId: 'one', tokenId: 'row', token: 'token', preferredLanguage: 'en', kind: 'draft_nudge' }] }).mockResolvedValueOnce({ rows: [{ claimed: false }] }) };
    const messaging = { send: vi.fn() };
    expect(await runDiscoveryNotifications(pool, messaging, {}, { dryRun: false, runId: 'run-1', now: new Date('2026-09-09T12:00:00Z') }))
      .toMatchObject({ sent: 0, suppressed: 1, failed: 0 });
    expect(messaging.send).not.toHaveBeenCalled();
  });
  it('does no database work during India quiet hours', async () => {
    const pool = { query: vi.fn() };
    const messaging = { send: vi.fn() };
    expect(await runDiscoveryNotifications(pool, messaging, {}, {
      dryRun: false, now: new Date('2026-09-09T20:00:00Z'), runId: 'quiet-1',
    })).toEqual({ dryRun: false, skipped: true, reason: 'quiet_hours' });
    expect(pool.query).not.toHaveBeenCalled();
    expect(messaging.send).not.toHaveBeenCalled();
  });
});
