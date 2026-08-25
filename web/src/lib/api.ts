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

// Bot Control Center API
export async function fetchBotOverview(): Promise<{
  settings: import('../types').BotGlobalSettings;
  stats: import('../types').BotOverviewStats;
  botsCount: number;
  recentLogs: import('../types').BotActivityLog[];
}> {
  const res = await fetch(`${API_BASE}/admin/bots/overview`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch bot network overview');
  return res.json();
}

export async function fetchBots(): Promise<{ bots: import('../types').BotPersona[] }> {
  const res = await fetch(`${API_BASE}/admin/bots`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch bots');
  return res.json();
}

export async function updateBotPersona(id: string, data: Partial<import('../types').BotPersona>): Promise<{ bot: import('../types').BotPersona }> {
  const res = await fetch(`${API_BASE}/admin/bots/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update bot persona');
  return res.json();
}

export async function toggleBotActive(id: string): Promise<{ id: string; isActive: boolean }> {
  const res = await fetch(`${API_BASE}/admin/bots/${id}/toggle`, {
    method: 'POST',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to toggle bot status');
  return res.json();
}

export async function updateBotSettings(data: Record<string, any>): Promise<{ settings: import('../types').BotGlobalSettings }> {
  const res = await fetch(`${API_BASE}/admin/bots/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update bot settings');
  return res.json();
}

export async function seedBots(): Promise<{ success: boolean; count: number; bots: import('../types').BotPersona[] }> {
  const res = await fetch(`${API_BASE}/admin/bots/seed`, {
    method: 'POST',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to seed bot network');
  return res.json();
}

export async function triggerBotPost(data: {
  botId: string;
  category?: string;
  topicHint?: string;
  customTitle?: string;
  customContent?: string;
}): Promise<{ post: any }> {
  const res = await fetch(`${API_BASE}/admin/bots/trigger-post`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to trigger post generation');
  return res.json();
}

export async function triggerBotInteract(data: {
  botId: string;
  postId: string;
  actionType: 'applaud' | 'like' | 'comment' | 'follow';
  customComment?: string;
}): Promise<{ outcome: any }> {
  const res = await fetch(`${API_BASE}/admin/bots/trigger-interact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to trigger bot interaction');
  return res.json();
}

export async function triggerBotPulse(): Promise<{ pulse: any }> {
  const res = await fetch(`${API_BASE}/admin/bots/trigger-pulse`, {
    method: 'POST',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to trigger pulse');
  return res.json();
}

export async function fetchBotLogs(page = 1, limit = 30): Promise<{ logs: import('../types').BotActivityLog[]; pagination: any }> {
  const res = await fetch(`${API_BASE}/admin/bots/logs?page=${page}&limit=${limit}`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch bot logs');
  return res.json();
}

export async function fetchSparkPromptTemplate(): Promise<{ prompt: string; instructions: string }> {
  const res = await fetch(`${API_BASE}/spark/prompt-template`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch Spark prompt template');
  return res.json();
}

export async function ingestSparkBatch(payload: any): Promise<{
  success: boolean;
  storiesCount: number;
  commentsCount: number;
  stories: any[];
  comments: any[];
}> {
  let bodyToSend = payload;
  if (typeof payload === 'string') {
    let text = payload.trim();
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      text = match[1];
    }
    try {
      bodyToSend = JSON.parse(text.trim());
    } catch {
      bodyToSend = { rawText: payload };
    }
  }

  const res = await fetch(`${API_BASE}/spark/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(bodyToSend)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Server error during ingestion' }));
    throw new Error(err.error || 'Failed to ingest Gemini Spark payload');
  }
  return res.json();
}

export async function fetchSparkAutomationScript(): Promise<{ script: string; webhookUrl: string; instructions: string }> {
  const res = await fetch(`${API_BASE}/spark/automation-script`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch Spark automation script');
  return res.json();
}

export async function fetchDelayedActions(limit = 25): Promise<{ actions: any[] }> {
  const res = await fetch(`${API_BASE}/admin/bots/delayed-actions?limit=${limit}`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch delayed actions');
  return res.json();
}

export async function cancelDelayedActionApi(actionId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/bots/delayed-actions/${actionId}/cancel`, {
    method: 'POST',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to cancel delayed action');
  return res.json();
}

export async function processDelayedActionsNow(): Promise<{ success: boolean; count: number; executed: any[] }> {
  const res = await fetch(`${API_BASE}/admin/bots/delayed-actions/process-now`, {
    method: 'POST',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to process delayed actions');
  return res.json();
}

export async function seedReaderBotsApi(): Promise<{ success: boolean; message: string; count: number }> {
  const res = await fetch(`${API_BASE}/admin/bots/seed-readers`, {
    method: 'POST',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to seed reader bots network');
  return res.json();
}

export async function fetchReaderBots(page = 1, limit = 50, category?: string): Promise<{ readers: any[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category) params.set('category', category);
  const res = await fetch(`${API_BASE}/admin/bots/readers?${params.toString()}`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch reader bots');
  return res.json();
}

export async function triggerReaderSwarmApi(postId: string, count?: number, intensity = 'healthy'): Promise<{ success: boolean; count: number; targetPostId: string; intensity: string }> {
  const res = await fetch(`${API_BASE}/admin/bots/trigger-swarm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ postId, count, intensity })
  });
  if (!res.ok) throw new Error('Failed to trigger reader applaud swarm');
  return res.json();
}


