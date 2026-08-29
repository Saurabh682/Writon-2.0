import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStory,
  fetchAuthorBookmarks,
  fetchAuthorStories,
  fetchStories,
  updateProfile,
} from './api';

describe('web API compatibility', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('writon_token', 'firebase-id-token');
  });

  it('maps the Trending label to the server popular feed while preserving Following', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ posts: [], pagination: { page: 1, limit: 20, hasMore: false } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ posts: [], pagination: { page: 1, limit: 20, hasMore: false } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchStories({ tab: 'trending' });
    await fetchStories({ tab: 'following' });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/posts?tab=popular');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/posts?tab=following');
  });

  it('uses supported post and private-bookmark collection routes for profiles', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ posts: [], pagination: { page: 1, limit: 50, hasMore: false } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ posts: [], pagination: { page: 1, limit: 50, hasMore: false } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchAuthorStories('writer-id');
    await fetchAuthorBookmarks('writer-id');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/posts?authorId=writer-id&limit=50');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/me/bookmarks?limit=50');
  });

  it('patches the authenticated profile and reads the profile response shape', async () => {
    const profile = {
      id: 'writer-id',
      penName: 'writer',
      fullName: 'Updated Writer',
      email: 'writer@example.com',
      followersCount: 2,
      followingCount: 3,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ profile }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const updated = await updateProfile({ fullName: 'Updated Writer' });

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/me', expect.objectContaining({ method: 'PATCH' }));
    expect(updated).toMatchObject({ fullName: 'Updated Writer', followersCnt: 2, followingCnt: 3 });
  });

  it('gives every new story a stable client draft UUID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ post: { id: 'post-id' } }), { status: 201 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await createStory({
      title: 'Retry-safe story',
      content: 'A story body.',
      category: 'Essays',
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.clientDraftId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
