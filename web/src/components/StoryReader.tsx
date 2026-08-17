import React, { useState, useEffect } from 'react';
import { Story, Comment, AIAnalysis } from '../types';
import {
  ArrowLeft,
  Sparkles,
  Heart,
  Bookmark,
  Volume2,
  VolumeX,
  Clock,
  Share2,
  MessageSquare,
  Send,
  UserPlus,
  UserCheck,
  Check
} from 'lucide-react';
import { ClientAIEngine, AudioNarrator } from '../lib/ai-engine';
import { fetchComments, addComment, toggleFollow } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface StoryReaderProps {
  story: Story;
  onBack: () => void;
  onSelectAuthor: (penName: string) => void;
  onToggleLike: (e: React.MouseEvent, storyId: string) => void;
  onToggleBookmark: (e: React.MouseEvent, storyId: string) => void;
}

export const StoryReader: React.FC<StoryReaderProps> = ({
  story,
  onBack,
  onSelectAuthor,
  onToggleLike,
  onToggleBookmark
}) => {
  const { user, isAuthenticated } = useAuth();

  // Reading progress
  const [scrollProgress, setScrollProgress] = useState(0);

  // Typography state
  const [fontSize, setFontSize] = useState<'base' | 'lg' | 'xl'>('lg');

  // AI Drawer state
  const [showAIDrawer, setShowAIDrawer] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  // Audio narration state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1.0);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(story.isFollowingAuthor || false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight > 0) {
        setScrollProgress((totalScroll / windowHeight) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Run Zero-Cost AI Analysis
  useEffect(() => {
    const analysis = ClientAIEngine.analyzeStory(story.title, story.content);
    setAiAnalysis(analysis);
  }, [story]);

  // Load comments
  useEffect(() => {
    loadComments();
  }, [story.id]);

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const res = await fetchComments(story.id);
      setComments(res.comments);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated) return;

    try {
      await addComment(story.id, commentText, replyParentId || undefined);
      setCommentText('');
      setReplyParentId(null);
      await loadComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      AudioNarrator.stop();
      setIsPlayingAudio(false);
    } else {
      AudioNarrator.speak(story.content, {
        rate: audioSpeed,
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false)
      });
      setIsPlayingAudio(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setAudioSpeed(speed);
    if (isPlayingAudio) {
      AudioNarrator.speak(story.content, {
        rate: speed,
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => setIsPlayingAudio(false)
      });
    }
  };

  const handleToggleFollow = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await toggleFollow(story.author.id);
      setIsFollowing(res.following);
    } catch (err) {
      console.error('Failed to follow author:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="relative min-h-screen pb-24">
      
      {/* Fixed Scroll Progress Bar */}
      <div className="fixed top-16 left-0 w-full h-1 bg-transparent z-50">
        <div
          className="h-full bg-gradient-to-r from-[#B83A24] to-amber-500 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Floating Reader Actions Bar */}
      <div className="sticky top-20 z-30 max-w-4xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-between p-2.5 rounded-full bg-white/90 dark:bg-[#1A1C20]/90 backdrop-blur-md border border-editorial-border dark:border-darkEditorial-border shadow-soft">
          
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Center Tools */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            
            {/* Font Sizing */}
            <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-full p-0.5">
              <button
                onClick={() => setFontSize('base')}
                className={`px-2 py-1 rounded-full text-xs font-serif ${fontSize === 'base' ? 'bg-white dark:bg-gray-800 text-editorial-accent dark:text-darkEditorial-accent font-bold shadow-xs' : 'text-gray-500'}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-1 rounded-full text-sm font-serif ${fontSize === 'lg' ? 'bg-white dark:bg-gray-800 text-editorial-accent dark:text-darkEditorial-accent font-bold shadow-xs' : 'text-gray-500'}`}
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('xl')}
                className={`px-2 py-1 rounded-full text-base font-serif ${fontSize === 'xl' ? 'bg-white dark:bg-gray-800 text-editorial-accent dark:text-darkEditorial-accent font-bold shadow-xs' : 'text-gray-500'}`}
              >
                A++
              </button>
            </div>

            {/* Audio Narrator Button */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleAudio}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                  isPlayingAudio
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
                title="Listen to story audio narration"
              >
                {isPlayingAudio ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isPlayingAudio ? 'Stop Audio' : 'Listen'}</span>
              </button>

              {isPlayingAudio && (
                <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-full p-0.5 text-[10px] font-mono">
                  <button
                    onClick={() => handleSpeedChange(1.0)}
                    className={`px-1.5 py-0.5 rounded-full ${audioSpeed === 1.0 ? 'bg-white dark:bg-gray-800 font-bold' : 'text-gray-500'}`}
                  >
                    1.0x
                  </button>
                  <button
                    onClick={() => handleSpeedChange(1.25)}
                    className={`px-1.5 py-0.5 rounded-full ${audioSpeed === 1.25 ? 'bg-white dark:bg-gray-800 font-bold' : 'text-gray-500'}`}
                  >
                    1.25x
                  </button>
                  <button
                    onClick={() => handleSpeedChange(1.5)}
                    className={`px-1.5 py-0.5 rounded-full ${audioSpeed === 1.5 ? 'bg-white dark:bg-gray-800 font-bold' : 'text-gray-500'}`}
                  >
                    1.5x
                  </button>
                </div>
              )}
            </div>

            {/* AI Summary Trigger */}
            <button
              onClick={() => setShowAIDrawer(!showAIDrawer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all ${
                showAIDrawer
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Insights</span>
            </button>
          </div>

          {/* Right Actions: Like & Bookmark */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => onToggleLike(e, story.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                story.isLiked
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${story.isLiked ? 'fill-current' : ''}`} />
              <span>{story.likesCnt}</span>
            </button>

            <button
              onClick={(e) => onToggleBookmark(e, story.id)}
              className={`p-2 rounded-full transition-all ${
                story.isBookmarked
                  ? 'text-editorial-accent dark:text-darkEditorial-accent bg-amber-50 dark:bg-amber-950/40'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${story.isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              title="Copy Story Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* AI Summary Drawer / Panel */}
      {showAIDrawer && aiAnalysis && (
        <div className="max-w-3xl mx-auto px-4 mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="rounded-3xl bg-gradient-to-br from-purple-900/10 via-amber-900/5 to-transparent border border-purple-200 dark:border-purple-800/40 p-6 shadow-lift text-gray-900 dark:text-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold">Client-Side AI Insights</h3>
                  <p className="text-xs font-mono text-purple-600 dark:text-purple-400">Zero Cloud API Cost • 100% On-Device Analysis</p>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                {aiAnalysis.tone}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Core Premise & TL;DR
                </p>
                <p className="text-gray-800 dark:text-gray-200 mt-1 leading-relaxed">
                  {aiAnalysis.tldr}
                </p>
              </div>

              <div>
                <p className="font-semibold text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Key Takeaways
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {aiAnalysis.keyInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Article Container */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Article Meta */}
        <div className="space-y-4 mb-8 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <span className="px-3 py-1 text-xs font-mono font-medium rounded-full bg-editorial-accent/10 dark:bg-darkEditorial-accent/20 text-editorial-accent dark:text-darkEditorial-accent">
              {story.category}
            </span>
            <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {story.readingTimeMin} min read
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {new Date(story.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-50 leading-[1.15]">
            {story.title}
          </h1>

          {story.summary && (
            <p className="font-serif text-xl sm:text-2xl text-gray-600 dark:text-gray-300 italic leading-relaxed pt-2">
              "{story.summary}"
            </p>
          )}
        </div>

        {/* Author Header Card */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#1A1C20] border border-editorial-border dark:border-darkEditorial-border mb-10 shadow-soft">
          <div
            onClick={() => onSelectAuthor(story.author.penName)}
            className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
          >
            <img
              src={story.author.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${story.author.penName}`}
              alt={story.author.fullName}
              className="w-12 h-12 rounded-full object-cover border-2 border-editorial-border dark:border-darkEditorial-border"
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 text-base">
                {story.author.fullName}
              </p>
              <p className="text-xs text-gray-500 font-mono">@{story.author.penName} • {story.author.followersCnt || 0} followers</p>
              {story.author.quoteOfDay && (
                <p className="text-xs text-amber-700 dark:text-amber-400 italic mt-0.5 line-clamp-1">
                  "{story.author.quoteOfDay}"
                </p>
              )}
            </div>
          </div>

          {user?.id !== story.author.id && (
            <button
              onClick={handleToggleFollow}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                isFollowing
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  : 'bg-editorial-accent dark:bg-darkEditorial-accent text-white shadow-sm hover:shadow'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Follow Author</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Cover Image */}
        {story.coverImage && (
          <div className="mb-10 rounded-3xl overflow-hidden shadow-lift max-h-[460px]">
            <img
              src={story.coverImage}
              alt={story.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Story Prose Body */}
        <div
          className={`prose-editorial ${
            fontSize === 'base' ? 'text-base' : fontSize === 'xl' ? 'text-2xl leading-[2]' : 'text-lg leading-[1.85]'
          }`}
          dangerouslySetInnerHTML={{
            __html: story.content
              .replace(/^## (.*$)/gim, '<h2>$1</h2>')
              .replace(/^### (.*$)/gim, '<h3>$1</h3>')
              .replace(/^# (.*$)/gim, '<h1>$1</h1>')
              .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
              .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/gim, '<em>$1</em>')
              .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
              .replace(/`([^`]+)`/gim, '<code>$1</code>')
              .replace(/\n\n/gim, '</p><p>')
          }}
        />

        {/* Story Clapping Footer */}
        <div className="mt-14 pt-8 border-t border-editorial-border dark:border-darkEditorial-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => onToggleLike(e, story.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:scale-105 transition-all shadow-sm"
            >
              <Heart className={`w-5 h-5 ${story.isLiked ? 'fill-current' : ''}`} />
              <span className="font-mono text-sm font-semibold">{story.likesCnt} Applauds</span>
            </button>

            <button
              onClick={(e) => onToggleBookmark(e, story.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <Bookmark className={`w-4 h-4 ${story.isBookmarked ? 'fill-current text-editorial-accent' : ''}`} />
              <span className="text-xs font-mono">{story.isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
          </div>

          <div className="text-xs text-gray-400 font-mono">
            WritOn Clean Reader Mode
          </div>
        </div>

        {/* Discussion & Threaded Comments */}
        <section className="mt-16 pt-10 border-t border-editorial-border dark:border-darkEditorial-border space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-editorial-accent dark:text-darkEditorial-accent" />
              Responses ({comments.length})
            </h2>
          </div>

          {/* New Comment Input */}
          {isAuthenticated ? (
            <form onSubmit={handleAddComment} className="space-y-3">
              <textarea
                rows={3}
                required
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughtful reflection on this piece..."
                className="w-full p-4 rounded-2xl border border-editorial-border dark:border-darkEditorial-border bg-white dark:bg-[#1A1C20] text-sm focus:outline-none focus:ring-2 focus:ring-editorial-accent/30 dark:focus:ring-darkEditorial-accent/30 transition-all resize-none shadow-soft"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-editorial-accent hover:bg-editorial-accentHover dark:bg-darkEditorial-accent dark:hover:bg-darkEditorial-accentHover text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Response</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-editorial-border dark:border-darkEditorial-border text-center text-sm text-gray-500">
              Please sign in to join the conversation.
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4 pt-4">
            {loadingComments ? (
              <div className="text-center py-6 text-sm text-gray-400">Loading discussion...</div>
            ) : comments.length === 0 ? (
              <p className="text-center py-6 text-sm text-gray-400 italic">No responses yet. Be the first to reflect.</p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#1A1C20] border border-editorial-border dark:border-darkEditorial-border shadow-soft space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => onSelectAuthor(comment.author.penName)}
                      className="flex items-center gap-2.5 cursor-pointer"
                    >
                      <img
                        src={comment.author.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.author.penName}`}
                        alt={comment.author.fullName}
                        className="w-7 h-7 rounded-full object-cover border border-editorial-border dark:border-darkEditorial-border"
                      />
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {comment.author.fullName}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">@{comment.author.penName}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-9">
                    {comment.content}
                  </p>

                  {/* Nested Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="pl-9 pt-3 space-y-3 border-l-2 border-editorial-border dark:border-darkEditorial-border ml-3 mt-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                              {reply.author.fullName}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              @{reply.author.penName}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

      </article>
    </div>
  );
};
