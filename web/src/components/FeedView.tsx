import React from 'react';
import { Story, Category } from '../types';
import { Sparkles, Heart, Bookmark, Clock, Flame, BookOpen, Compass, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface FeedViewProps {
  stories: Story[];
  categories: Category[];
  selectedCategory: Category;
  setSelectedCategory: (cat: Category) => void;
  activeTab: 'latest' | 'trending' | 'following';
  setActiveTab: (tab: 'latest' | 'trending' | 'following') => void;
  onSelectStory: (story: Story) => void;
  onSelectAuthor: (penName: string) => void;
  onToggleLike: (e: React.MouseEvent, storyId: string) => void;
  onToggleBookmark: (e: React.MouseEvent, storyId: string) => void;
  isLoading: boolean;
}

export const FeedView: React.FC<FeedViewProps> = ({
  stories,
  categories,
  selectedCategory,
  setSelectedCategory,
  activeTab,
  setActiveTab,
  onSelectStory,
  onSelectAuthor,
  onToggleLike,
  onToggleBookmark,
  isLoading
}) => {
  const { isAuthenticated } = useAuth();
  const featuredStory = stories.length > 0 ? stories[0] : null;
  const feedStories = stories.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Hero Featured Story */}
      {featuredStory && !isLoading && (
        <section
          onClick={() => onSelectStory(featuredStory)}
          className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white dark:bg-[#1A1C20] border border-editorial-border dark:border-darkEditorial-border shadow-lift hover:shadow-2xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8"
        >
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 text-xs font-mono font-medium rounded-full bg-editorial-accent/10 dark:bg-darkEditorial-accent/20 text-editorial-accent dark:text-darkEditorial-accent">
                  {featuredStory.category}
                </span>
                <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {featuredStory.readingTimeMin} min read
                </span>
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Featured Piece
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-50 leading-tight group-hover:text-editorial-accent dark:group-hover:text-darkEditorial-accent transition-colors">
                {featuredStory.title}
              </h1>

              <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg leading-relaxed line-clamp-3">
                {featuredStory.summary}
              </p>
            </div>

            {/* Author Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-editorial-border dark:border-darkEditorial-border">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAuthor(featuredStory.author.penName);
                }}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <img
                  src={featuredStory.author.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${featuredStory.author.penName}`}
                  alt={featuredStory.author.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-editorial-border dark:border-darkEditorial-border"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {featuredStory.author.fullName}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">@{featuredStory.author.penName}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-gray-500">
                <button
                  onClick={(e) => onToggleLike(e, featuredStory.id)}
                  className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border transition-all ${
                    featuredStory.isLiked
                      ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                      : 'hover:bg-gray-100 dark:hover:bg-white/5 border-transparent'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${featuredStory.isLiked ? 'fill-current' : ''}`} />
                  <span>{featuredStory.likesCnt}</span>
                </button>

                <button
                  onClick={(e) => onToggleBookmark(e, featuredStory.id)}
                  className={`p-2 rounded-full transition-all ${
                    featuredStory.isBookmarked
                      ? 'text-editorial-accent dark:text-darkEditorial-accent bg-amber-50 dark:bg-amber-950/30'
                      : 'hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${featuredStory.isBookmarked ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Hero Cover Image */}
          {featuredStory.coverImage && (
            <div className="lg:col-span-5 relative h-64 lg:h-auto rounded-2xl overflow-hidden shadow-inner">
              <img
                src={featuredStory.coverImage}
                alt={featuredStory.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
          )}
        </section>
      )}

      {/* Discovery Header & Category Pills */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-editorial-border dark:border-darkEditorial-border pb-4">
          
          {/* Feed Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setActiveTab('latest')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                activeTab === 'latest'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <Compass className="w-4 h-4" />
              Latest Stories
            </button>

            <button
              onClick={() => setActiveTab('trending')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                activeTab === 'trending'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500" />
              Trending & Clapped
            </button>

            {isAuthenticated && (
              <button
                onClick={() => setActiveTab('following')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                  activeTab === 'following'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <Users className="w-4 h-4" />
                Following
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-editorial-accent text-white font-medium shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Story Stream */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-80 rounded-3xl bg-white dark:bg-[#1A1C20] border border-editorial-border dark:border-darkEditorial-border p-6 animate-pulse space-y-4"
            >
              <div className="w-20 h-4 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="w-full h-6 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="w-3/4 h-6 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="w-full h-20 bg-gray-100 dark:bg-gray-800/50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : feedStories.length === 0 && !featuredStory ? (
        <div className="text-center py-16 bg-white dark:bg-[#1A1C20] rounded-3xl border border-editorial-border dark:border-darkEditorial-border p-8">
          <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h3 className="font-serif text-xl font-bold">No stories found in this section</h3>
          <p className="text-sm text-gray-500 mt-1">
            Try choosing a different category or search term to discover published writings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedStories.map((story) => (
            <article
              key={story.id}
              onClick={() => onSelectStory(story)}
              className="group cursor-pointer flex flex-col justify-between rounded-3xl bg-white dark:bg-[#1A1C20] border border-editorial-border dark:border-darkEditorial-border shadow-soft hover:shadow-lift p-6 transition-all duration-200 hover:-translate-y-1"
            >
              <div className="space-y-4">
                {/* Cover Image */}
                {story.coverImage && (
                  <div className="h-44 w-full rounded-2xl overflow-hidden relative">
                    <img
                      src={story.coverImage}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Category & Read Time */}
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span className="px-2.5 py-0.5 rounded-full bg-editorial-accent/10 dark:bg-darkEditorial-accent/20 text-editorial-accent dark:text-darkEditorial-accent font-medium">
                    {story.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {story.readingTimeMin} min read
                  </span>
                </div>

                {/* Title & Summary */}
                <div>
                  <h2 className="font-serif text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-editorial-accent dark:group-hover:text-darkEditorial-accent transition-colors leading-snug line-clamp-2">
                    {story.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-3 leading-relaxed">
                    {story.summary}
                  </p>
                </div>
              </div>

              {/* Author & Interactions Footer */}
              <div className="pt-5 mt-4 border-t border-editorial-border dark:border-darkEditorial-border flex items-center justify-between">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAuthor(story.author.penName);
                  }}
                  className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                >
                  <img
                    src={story.author.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${story.author.penName}`}
                    alt={story.author.fullName}
                    className="w-7 h-7 rounded-full object-cover border border-editorial-border dark:border-darkEditorial-border"
                  />
                  <div className="text-left">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                      {story.author.fullName}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">@{story.author.penName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-500">
                  <button
                    onClick={(e) => onToggleLike(e, story.id)}
                    className={`flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full border transition-all ${
                      story.isLiked
                        ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                        : 'hover:bg-gray-100 dark:hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${story.isLiked ? 'fill-current' : ''}`} />
                    <span>{story.likesCnt}</span>
                  </button>

                  <button
                    onClick={(e) => onToggleBookmark(e, story.id)}
                    className={`p-1.5 rounded-full transition-all ${
                      story.isBookmarked
                        ? 'text-editorial-accent dark:text-darkEditorial-accent bg-amber-50 dark:bg-amber-950/30'
                        : 'hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${story.isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
