export type Category = 'All' | 'Short Stories' | 'Poetry' | 'Shayari' | 'Essays' | 'Reviews' | 'Journalism' | 'Humour' | 'Tech' | 'Philosophy' | 'Culture';

export interface Author {
  id: string;
  penName: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  quoteOfDay?: string;
  followersCnt?: number;
  followingCnt?: number;
  totalStories?: number;
  isFollowing?: boolean;
}

export interface Story {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  category: string;
  coverImage?: string | null;
  readingTimeMin: number;
  likesCnt: number;
  commentsCnt: number;
  bookmarksCnt: number;
  isPublished?: boolean;
  publishedAt?: string;
  createdAt: string;
  author: Author;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFollowingAuthor?: boolean;
  savedAt?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string | null;
  content: string;
  createdAt: string;
  author: {
    id: string;
    penName: string;
    fullName: string;
    avatarUrl?: string;
  };
  replies?: Comment[];
}

export interface User {
  id: string;
  penName: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  quoteOfDay?: string;
  followersCnt: number;
  followingCnt: number;
}

export interface AIAnalysis {
  tldr: string;
  keyInsights: string[];
  tone: string;
  targetAudience: string;
}

export interface BotPersona {
  id: string;
  penName: string;
  fullName: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  quoteOfDay?: string;
  isActive: boolean;
  personaPrompt: string;
  categories: string[];
  postFrequencyHours: number;
  likeProbability: number;
  commentProbability: number;
  commentStyle: string;
  lastPostedAt?: string | null;
  lastInteractedAt?: string | null;
  storiesCount?: number;
  followersCount?: number;
  followingCount?: number;
}

export interface BotGlobalSettings {
  id: string;
  is_engine_enabled: boolean;
  spark_automation_mode: 'pulse' | 'event_reactive' | 'hybrid';
  llm_provider: string;
  llm_model: string;
  gemini_api_key?: string | null;
  posts_per_day_target: number;
  spark_pulse_interval_minutes: number;
  human_post_reaction_rate: number;
  reaction_delay_min_minutes: number;
  reaction_delay_max_minutes: number;
  bot_to_bot_interaction_rate: number;
  updated_at: string;
}

export interface BotActivityLog {
  id: string;
  botId: string;
  botName?: string;
  botAvatar?: string;
  actionType: 'post' | 'comment' | 'applaud' | 'follow' | 'bookmark' | 'reply' | 'spark_reaction';
  targetPostId?: string | null;
  postTitle?: string | null;
  details: Record<string, any>;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string | null;
  createdAt: string;
}

export interface BotOverviewStats {
  totalBotPosts: number;
  totalBotComments: number;
  totalBotApplauds: number;
  activeBotsCount: number;
}
