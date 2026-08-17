import React, { useState, useEffect } from 'react';
import { Author, Story } from '../types';
import {
  fetchAuthor,
  fetchAuthorStories,
  fetchAuthorBookmarks,
  toggleFollow,
  updateProfile
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  UserPlus,
  UserCheck,
  BookOpen,
  Bookmark,
  Quote,
  Edit3,
  Check,
  Clock,
  Heart
} from 'lucide-react';

interface AuthorProfileProps {
  penName: string;
  onBack: () => void;
  onSelectStory: (story: Story) => void;
  onToggleLike: (e: React.MouseEvent, storyId: string) => void;
  onToggleBookmark: (e: React.MouseEvent, storyId: string) => void;
}

export const AuthorProfile: React.FC<AuthorProfileProps> = ({
  penName,
  onBack,
  onSelectStory,
  onToggleLike,
  onToggleBookmark
}) => {
  const { user: currentUser, isAuthenticated, updateCurrentUser } = useAuth();
  const [author, setAuthor] = useState<Author | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [bookmarks, setBookmarks] = useState<Story[]>([]);
  const [activeTab, setActiveTab] = useState<'stories' | 'bookmarks'>('stories');
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // Edit mode for current user
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editQuote, setEditQuote] = useState('');

  const isOwner = currentUser?.penName.toLowerCase() === penName.toLowerCase();

  useEffect(() => {
    loadProfileData();
  }, [penName]);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const authorData = await fetchAuthor(penName);
      setAuthor(authorData);
      setIsFollowing(authorData.isFollowing || false);
      setEditFullName(authorData.fullName);
      setEditBio(authorData.bio || '');
      setEditQuote(authorData.quoteOfDay || '');

      const authorStories = await fetchAuthorStories(authorData.id);
      setStories(authorStories);

      if (isOwner || currentUser?.id === authorData.id) {
        const authorBookmarks = await fetchAuthorBookmarks(authorData.id);
        setBookmarks(authorBookmarks);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!author || !isAuthenticated) return;
    try {
      const res = await toggleFollow(author.id);
      setIsFollowing(res.following);
      setAuthor({
        ...author,
        followersCnt: res.followersCount
      });
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!author) return;
    try {
      const updated = await updateProfile({
        fullName: editFullName,
        bio: editBio,
        quoteOfDay: editQuote
      });
      setAuthor({
        ...author,
        fullName: updated.fullName,
        bio: updated.bio,
        quoteOfDay: updated.quoteOfDay
      });
      updateCurrentUser(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  if (isLoading || !author) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-2 border-editorial-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      
      {/* Top Back Nav */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Discovery</span>
      </button>

      {/* Author Card Hero */}
      <div className="rounded-3xl bg-white dark:bg-[#1A1C20] border border-editorial-border dark:border-darkEditorial-border p-6 sm:p-8 shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={author.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${author.penName}`}
              alt={author.fullName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-editorial-border dark:border-darkEditorial-border shadow-md"
            />
            <div className="space-y-1">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
                {author.fullName}
              </h1>
              <p className="text-sm text-gray-500 font-mono">@{author.penName}</p>
              
              <div className="flex items-center gap-4 text-xs font-mono text-gray-500 pt-1">
                <span>{author.followersCnt || 0} Followers</span>
                <span>•</span>
                <span>{author.followingCnt || 0} Following</span>
                <span>•</span>
                <span>{stories.length} Published Pieces</span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div>
            {isOwner ? (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
              </button>
            ) : (
              <button
                onClick={handleToggleFollow}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-medium transition-all ${
                  isFollowing
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    : 'bg-editorial-accent dark:bg-darkEditorial-accent text-white shadow-sm hover:shadow'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow Author</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Bio & Quote */}
        {isEditing ? (
          <div className="space-y-4 pt-4 border-t border-editorial-border dark:border-darkEditorial-border">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Full Display Name</label>
              <input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-editorial-border dark:border-darkEditorial-border bg-gray-50 dark:bg-white/5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Author Bio</label>
              <textarea
                rows={2}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-editorial-border dark:border-darkEditorial-border bg-gray-50 dark:bg-white/5 text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Quote of the Day / Motto</label>
              <input
                type="text"
                value={editQuote}
                onChange={(e) => setEditQuote(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-editorial-border dark:border-darkEditorial-border bg-gray-50 dark:bg-white/5 text-sm"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-editorial-accent text-white text-xs font-medium shadow"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-2 border-t border-editorial-border dark:border-darkEditorial-border">
            {author.bio && (
              <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                {author.bio}
              </p>
            )}

            {author.quoteOfDay && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 text-xs sm:text-sm italic">
                <Quote className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>"{author.quoteOfDay}"</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-editorial-border dark:border-darkEditorial-border pb-3">
        <button
          onClick={() => setActiveTab('stories')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all ${
            activeTab === 'stories'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Stories ({stories.length})</span>
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all ${
              activeTab === 'bookmarks'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Saved Bookmarks ({bookmarks.length})</span>
          </button>
        )}
      </div>

      {/* Stories / Bookmarks List */}
      <div className="space-y-4">
        {activeTab === 'stories' ? (
          stories.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#1A1C20] rounded-3xl border border-editorial-border dark:border-darkEditorial-border text-gray-400 text-sm">
              No stories published yet.
            </div>
          ) : (
            stories.map((story) => (
              <article
                key={story.id}
                onClick={() => onSelectStory(story)}
                className="cursor-pointer p-6 rounded-3xl bg-white dark:bg-[#1A1C20] border border-editorial-border dark:border-darkEditorial-border shadow-soft hover:shadow-lift transition-all flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                    <span className="px-2.5 py-0.5 rounded-full bg-editorial-accent/10 dark:bg-darkEditorial-accent/20 text-editorial-accent dark:text-darkEditorial-accent font-medium">
                      {story.category}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {story.readingTimeMin} min read
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-editorial-accent transition-colors">
                    {story.title}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {story.summary}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between text-gray-400 gap-2">
                  <span className="text-xs font-mono">
                    {new Date(story.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => onToggleLike(e, story.id)}
                      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                      <Heart className={`w-4 h-4 ${story.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => onToggleBookmark(e, story.id)}
                      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                      <Bookmark className={`w-4 h-4 ${story.isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )
        ) : (
          bookmarks.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#1A1C20] rounded-3xl border border-editorial-border dark:border-darkEditorial-border text-gray-400 text-sm">
              No saved bookmarks yet.
            </div>
          ) : (
            bookmarks.map((story) => (
              <article
                key={story.id}
                onClick={() => onSelectStory(story)}
                className="cursor-pointer p-6 rounded-3xl bg-white dark:bg-[#1A1C20] border border-editorial-border dark:border-darkEditorial-border shadow-soft hover:shadow-lift transition-all flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                    <span className="px-2.5 py-0.5 rounded-full bg-editorial-accent/10 text-editorial-accent font-medium">
                      {story.category}
                    </span>
                    <span>by {story.author.fullName}</span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-gray-900 dark:text-gray-100">
                    {story.title}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {story.summary}
                  </p>
                </div>
              </article>
            ))
          )
        )}
      </div>
    </div>
  );
};
