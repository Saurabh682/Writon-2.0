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
