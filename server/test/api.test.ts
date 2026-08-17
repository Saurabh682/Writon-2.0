import { describe, it, expect, beforeAll } from 'vitest';
import app from '../src/index.js';

describe('WritOn 2.0 API Endpoints', () => {
  let authToken = '';
  let createdPostId = '';

  it('GET /health - should return healthy status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('WritOn REST API');
  });

  it('POST /api/v1/auth/login - should login existing seed user', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'mayalin',
        password: 'password123'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.user.penName).toBe('mayalin');
    authToken = body.token;
  });

  it('GET /api/v1/auth/me - should return authenticated user profile', async () => {
    const res = await app.request('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.penName).toBe('mayalin');
  });

  it('GET /api/v1/posts - should fetch paginated stories feed', async () => {
    const res = await app.request('/api/v1/posts?limit=10');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.posts)).toBe(true);
    expect(body.posts.length).toBeGreaterThan(0);
    expect(body.posts[0].author).toBeDefined();
  });

  it('GET /api/v1/posts?category=Essays - should filter by category', async () => {
    const res = await app.request('/api/v1/posts?category=Essays');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts.every((p: any) => p.category === 'Essays')).toBe(true);
  });

  it('POST /api/v1/posts - should create a new story with auth', async () => {
    const res = await app.request('/api/v1/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: 'The Art of Minimalist CodeCraft',
        summary: 'Writing less, thinking more, and crafting durable software systems.',
        content: '# The Minimalist Developer\n\nSimplicity is a prerequisite for reliability.',
        category: 'Tech'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.post.id).toBeDefined();
    expect(body.post.title).toBe('The Art of Minimalist CodeCraft');
    createdPostId = body.post.id;
  });

  it('POST /api/v1/posts/:id/like - should toggle like on story', async () => {
    const res = await app.request(`/api/v1/posts/${createdPostId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.liked).toBe(true);
    expect(body.likesCount).toBe(1);
  });

  it('POST /api/v1/posts/:id/bookmark - should toggle bookmark on story', async () => {
    const res = await app.request(`/api/v1/posts/${createdPostId}/bookmark`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookmarked).toBe(true);
    expect(body.bookmarksCount).toBe(1);
  });

  it('POST /api/v1/comments/:postId - should add comment to story', async () => {
    const res = await app.request(`/api/v1/comments/${createdPostId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        content: 'Insightful thoughts on code minimalism!'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.comment.content).toBe('Insightful thoughts on code minimalism!');
  });

  it('GET /api/v1/comments/:postId - should return comment list for story', async () => {
    const res = await app.request(`/api/v1/comments/${createdPostId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.comments[0].content).toBe('Insightful thoughts on code minimalism!');
  });

  it('GET /api/v1/users/:id_or_penName - should get author profile', async () => {
    const res = await app.request('/api/v1/users/mayalin');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.penName).toBe('mayalin');
    expect(body.user.totalStories).toBeGreaterThan(0);
  });
});
