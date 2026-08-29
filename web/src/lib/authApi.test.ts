import { describe, expect, it, vi } from 'vitest';
import { fetchMyProfile, registerMyProfile } from './authApi';

describe('Firebase-backed WritOn session API', () => {
  it('exchanges a Firebase ID token with the supported current-profile route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ profile: { id: 'writer-id', penName: 'writer' } }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchMyProfile('firebase-id-token');

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/me', {
      headers: { Authorization: 'Bearer firebase-id-token' },
    });
  });

  it('registers profile fields through the authenticated current-profile route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ profile: { id: 'writer-id', penName: 'writer' } }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await registerMyProfile('firebase-id-token', {
      penName: 'writer',
      fullName: 'Writer Name',
      bio: 'A short bio',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/me', expect.objectContaining({
      method: 'PUT',
      headers: {
        Authorization: 'Bearer firebase-id-token',
        'Content-Type': 'application/json',
      },
    }));
  });
});
