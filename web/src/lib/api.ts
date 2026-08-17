import { Story, Comment, Author, User, Category } from '../types';

const API_BASE = '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('writon_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchStories(params: {
  category?: Category;
  tab?: 'latest' | 'trending' | 'following';
  q?: string;
  authorId?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ posts: Story[]; pagination: { page: number; limit: number; hasMore: boolean } }> {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'All') query.set('category', params.category);
  if (params.tab) query.set('tab', params.tab);
  if (params.q) query.set('q', params.q);
  if (params.authorId) query.set('authorId', params.authorId);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/posts?${query.toString()}`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch stories');
  return res.json();
}

export async function fetchStory(idOrSlug: string): Promise<Story> {
  const res = await fetch(`${API_BASE}/posts/${idOrSlug}`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Story not found');
  const data = await res.json();
  return data.post;
}

export async function createStory(data: {
  title: string;
  content: string;
  summary?: string;
  category: string;
  coverImage?: string;
  isPublished?: boolean;
}): Promise<Story> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to publish story');
  }
  const result = await res.json();
  return result.post;
}

export async function updateStory(id: string, data: Partial<Story>): Promise<Story> {
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update story');
  }
  const result = await res.json();
  return result.post;
}

export async function deleteStory(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to delete story');
}

export async function toggleLike(id: string): Promise<{ liked: boolean; likesCount: number }> {
  const res = await fetch(`${API_BASE}/posts/${id}/like`, {
    method: 'POST',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to toggle like');
  return res.json();
}

export async function toggleBookmark(id: string): Promise<{ bookmarked: boolean; bookmarksCount: number }> {
  const res = await fetch(`${API_BASE}/posts/${id}/bookmark`, {
    method: 'POST',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to toggle bookmark');
  return res.json();
}

export async function fetchComments(postId: string): Promise<{ comments: Comment[]; total: number }> {
  const res = await fetch(`${API_BASE}/comments/${postId}`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
}

export async function addComment(postId: string, content: string, parentId?: string): Promise<Comment> {
  const res = await fetch(`${API_BASE}/comments/${postId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ content, parentId })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add comment');
  }
  const result = await res.json();
  return result.comment;
}

export async function fetchAuthor(idOrPenName: string): Promise<Author> {
  const res = await fetch(`${API_BASE}/users/${idOrPenName}`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Author not found');
  const data = await res.json();
  return data.user;
}

export async function fetchAuthorStories(id: string): Promise<Story[]> {
  const res = await fetch(`${API_BASE}/users/${id}/posts`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch author stories');
  const data = await res.json();
  return data.posts;
}

export async function fetchAuthorBookmarks(id: string): Promise<Story[]> {
  const res = await fetch(`${API_BASE}/users/${id}/bookmarks`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch bookmarks');
  const data = await res.json();
  return data.bookmarks;
}

export async function toggleFollow(authorId: string): Promise<{ following: boolean; followersCount: number }> {
  const res = await fetch(`${API_BASE}/users/${authorId}/follow`, {
    method: 'POST',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to toggle follow');
  return res.json();
}

export async function updateProfile(data: { fullName?: string; bio?: string; quoteOfDay?: string; avatarUrl?: string }): Promise<User> {
  const res = await fetch(`${API_BASE}/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update profile');
  const result = await res.json();
  return result.user;
}

export async function uploadMedia(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/media/upload`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
    body: formData
  });

  if (!res.ok) throw new Error('Failed to upload image');
  const result = await res.json();
  return result.url;
}
