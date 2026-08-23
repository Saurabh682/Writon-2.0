import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { FeedView } from './components/FeedView';
import { StoryReader } from './components/StoryReader';
import { StoryEditor } from './components/StoryEditor';
import { AuthorProfile } from './components/AuthorProfile';
import { AuthModal } from './components/AuthModal';
import { BotControlCenter } from './components/admin/BotControlCenter';
import { Story, Category } from './types';
import { fetchStories, toggleLike, toggleBookmark } from './lib/api';

const CATEGORIES: Category[] = [
  'All',
  'Short Stories',
  'Poetry',
  'Shayari',
  'Essays',
  'Reviews',
  'Journalism',
  'Humour',
  'Philosophy',
  'Tech',
  'Culture'
];

function MainApp() {
  const { isAuthenticated } = useAuth();
  
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('writon_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('writon_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('writon_theme', 'light');
    }
  }, [darkMode]);

  // Routing / View state
  const [currentView, setCurrentView] = useState<'feed' | 'reader' | 'editor' | 'profile'>('feed');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedAuthorPenName, setSelectedAuthorPenName] = useState<string | null>(null);

  // Feed state
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [activeTab, setActiveTab] = useState<'latest' | 'trending' | 'following'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Bot Control Center modal
  const [isBotControlOpen, setIsBotControlOpen] = useState(false);

  // Load feed stories
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFeed();
    }, searchQuery ? 400 : 0); // Immediate on clear, debounced on typing
    return () => clearTimeout(timer);
  }, [selectedCategory, activeTab, searchQuery]);

  const loadFeed = async () => {
    try {
      setIsLoadingFeed(true);
      const res = await fetchStories({
        category: selectedCategory,
        tab: activeTab,
        q: searchQuery || undefined,
        limit: 20
      });
      setStories(res.posts);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const handleSelectStory = (story: Story) => {
    setSelectedStory(story);
    setCurrentView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAuthor = (penName: string) => {
    setSelectedAuthorPenName(penName);
    setCurrentView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleLike = async (e: React.MouseEvent, storyId: string) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const res = await toggleLike(storyId);
      setStories(prev =>
        prev.map(s => (s.id === storyId ? { ...s, isLiked: res.liked, likesCnt: res.likesCount } : s))
      );
      if (selectedStory && selectedStory.id === storyId) {
        setSelectedStory(prev => prev ? { ...prev, isLiked: res.liked, likesCnt: res.likesCount } : null);
      }
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent, storyId: string) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const res = await toggleBookmark(storyId);
      setStories(prev =>
        prev.map(s => (s.id === storyId ? { ...s, isBookmarked: res.bookmarked, bookmarksCnt: res.bookmarksCount } : s))
      );
      if (selectedStory && selectedStory.id === storyId) {
        setSelectedStory(prev => prev ? { ...prev, isBookmarked: res.bookmarked, bookmarksCnt: res.bookmarksCount } : null);
      }
    } catch (err) {
      console.error('Bookmark failed:', err);
    }
  };

  const handleStoryPublished = (newStory: Story) => {
    setStories(prev => [newStory, ...prev]);
    setSelectedStory(newStory);
    setCurrentView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-editorial-bg dark:bg-darkEditorial-bg text-editorial-text dark:text-darkEditorial-text transition-colors duration-200">
      
      {/* Global Header */}
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenBotControlCenter={() => setIsBotControlOpen(true)}
        onNavigateHome={() => {
          setCurrentView('feed');
          setSelectedStory(null);
          setSelectedAuthorPenName(null);
        }}
        onNavigateWrite={() => setCurrentView('editor')}
        onNavigateProfile={(penName) => handleSelectAuthor(penName)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content Router */}
      <main>
        {currentView === 'feed' && (
          <FeedView
            stories={stories}
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSelectStory={handleSelectStory}
            onSelectAuthor={handleSelectAuthor}
            onToggleLike={handleToggleLike}
            onToggleBookmark={handleToggleBookmark}
            isLoading={isLoadingFeed}
          />
        )}

        {currentView === 'reader' && selectedStory && (
          <StoryReader
            story={selectedStory}
            onBack={() => setCurrentView('feed')}
            onSelectAuthor={handleSelectAuthor}
            onToggleLike={handleToggleLike}
            onToggleBookmark={handleToggleBookmark}
          />
        )}

        {currentView === 'editor' && (
          <StoryEditor
            onBack={() => setCurrentView('feed')}
            onStoryPublished={handleStoryPublished}
          />
        )}

        {currentView === 'profile' && selectedAuthorPenName && (
          <AuthorProfile
            penName={selectedAuthorPenName}
            onBack={() => setCurrentView('feed')}
            onSelectStory={handleSelectStory}
            onToggleLike={handleToggleLike}
            onToggleBookmark={handleToggleBookmark}
          />
        )}
      </main>

      {/* Bot Control Center Modal */}
      <BotControlCenter
        isOpen={isBotControlOpen}
        onClose={() => setIsBotControlOpen(false)}
        onStoryPublished={loadFeed}
      />

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
