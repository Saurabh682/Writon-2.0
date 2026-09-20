import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest push registration migration', () => {
  const sql = fs.readFileSync(
    path.resolve('migrations/20260908_guest_push_registrations.sql'),
    'utf8'
  ).toLowerCase();

  it('keeps guest installations isolated from public data API roles', () => {
    expect(sql).toContain('alter table public.guest_device_push_tokens enable row level security');
    expect(sql).toContain('revoke all privileges on public.guest_device_push_tokens from anon, authenticated');
    expect(sql).toContain('grant select, insert, update, delete on public.guest_device_push_tokens to service_role');
  });

  it('deduplicates installation and token identities and indexes active registrations', () => {
    expect(sql).toContain('installation_id uuid not null unique');
    expect(sql).toContain('token text not null unique');
    expect(sql).toContain('where revoked_at is null and notification_permission = \'granted\'');
  });
});
