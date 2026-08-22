import React, { useState } from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  Check,
  ArrowLeft,
  Upload,
  BookOpen,
  Wand2,
  ListOrdered,
  FileText,
  Mic,
  MicOff
} from 'lucide-react';
import { createStory, uploadMedia } from '../lib/api';
import { ClientAIEngine, VoiceDictationEngine } from '../lib/ai-engine';
import { Category, Story } from '../types';

interface StoryEditorProps {
  onBack: () => void;
  onStoryPublished: (story: Story) => void;
}

const CATEGORIES: Category[] = [
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

export const StoryEditor: React.FC<StoryEditorProps> = ({ onBack, onStoryPublished }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Essays');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Copilot state
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiActionName, setAiActionName] = useState<string | null>(null);


  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const url = await uploadMedia(file);
      setCoverImage(url);
    } catch (err: any) {
      setError(err.message || 'Image upload failed');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRunAICopilot = (action: 'polish' | 'enrich' | 'headlines' | 'summary' | 'bullets') => {
    const result = ClientAIEngine.assistWriting(action, content, title);
    if (!result) return;

    const actionLabels: Record<string, string> = {
      polish: 'Polished Text',
      enrich: 'Literary Tone Suggestions',
      headlines: 'Editorial Headline Ideas',
      summary: 'Generated Teaser Summary',
      bullets: 'Distilled Takeaway Bullets'
    };

    setAiActionName(actionLabels[action]);
    setAiSuggestion(result);

    if (action === 'summary' && !summary) {
      setSummary(result);
    }
  };

  const handleApplyAISuggestion = () => {
    if (!aiSuggestion) return;
    if (aiActionName === 'Polished Text' || aiActionName === 'Literary Tone Suggestions') {
      setContent(aiSuggestion);
    } else if (aiActionName === 'Generated Teaser Summary') {
      setSummary(aiSuggestion);
    }
    setAiSuggestion(null);
  };

  const handleToggleDictation = () => {
    if (isDictating) {
      VoiceDictationEngine.stopDictation();
      setIsDictating(false);
    } else {
      if (!VoiceDictationEngine.isSupported()) {
        setError('Voice dictation is not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
      }
      const started = VoiceDictationEngine.startDictation({
        onResult: (text, isFinal) => {
          if (isFinal) {
            setContent(prev => (prev ? `${prev} ${text}` : text));
          }
        },
        onError: (err) => {
          console.error('Dictation error:', err);
          setIsDictating(false);
        },
        onEnd: () => {
          setIsDictating(false);
        }
      });
      if (started) {
        setIsDictating(true);
      }
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Please provide both a title and story content.');
      return;
    }

    try {
      setIsPublishing(true);
      setError(null);

      const newStory = await createStory({
        title,
        content,
        summary: summary.trim() || undefined,
        category,
        coverImage: coverImage.trim() || undefined,
        isPublished: true
      });

      onStoryPublished(newStory);
    } catch (err: any) {
      setError(err.message || 'Failed to publish story.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between border-b border-editorial-border dark:border-darkEditorial-border pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Editor</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Word Count & Read Time */}
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-gray-400">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{estimatedReadTime} min read</span>
          </div>

          {/* Voice Dictation Button */}
          <button
            onClick={handleToggleDictation}
            title={isDictating ? 'Stop Voice Dictation' : 'Start Voice Dictation'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
              isDictating
                ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-500/30'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 border border-editorial-border dark:border-darkEditorial-border'
            }`}
          >
            {isDictating ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{isDictating ? 'Recording...' : 'Voice Dictate'}</span>
          </button>

          {/* Toggle Live Preview */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
              showPreview
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPreview ? 'Edit Mode' : 'Preview'}</span>
          </button>

          {/* Publish CTA */}
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-editorial-accent hover:bg-editorial-accentHover dark:bg-darkEditorial-accent dark:hover:bg-darkEditorial-accentHover text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
          >
            {isPublishing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Publish Story</span>
              </>
            )}
          </button>
        </div>
      </div>


      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* AI Writing Copilot Floating / Docked Bar */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/10 via-amber-900/5 to-transparent border border-purple-200 dark:border-purple-800/40 shadow-soft flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <span className="text-xs font-mono font-semibold text-purple-900 dark:text-purple-300">
            Client-Side AI Copilot:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleRunAICopilot('polish')}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 transition-colors"
          >
            <Wand2 className="w-3 h-3" />
            Tighten Syntax
          </button>

          <button
            onClick={() => handleRunAICopilot('enrich')}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            Enrich Tone
          </button>

          <button
            onClick={() => handleRunAICopilot('headlines')}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 transition-colors"
          >
            <ListOrdered className="w-3 h-3" />
            Headline Ideas
          </button>

          <button
            onClick={() => handleRunAICopilot('summary')}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 transition-colors"
          >
            <FileText className="w-3 h-3" />
            Auto-Teaser
          </button>
        </div>
      </div>

      {/* AI Suggestion Box */}
      {aiSuggestion && (
        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-sm space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase">
              {aiActionName}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyAISuggestion}
                className="px-3 py-1 rounded-full text-xs font-medium bg-purple-600 text-white hover:bg-purple-700"
              >
                Apply to Document
              </button>
              <button
                onClick={() => setAiSuggestion(null)}
                className="px-2 py-1 rounded-full text-xs text-gray-500 hover:text-gray-700"
              >
                Dismiss
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200 bg-white/60 dark:bg-black/30 p-3 rounded-xl">
            {aiSuggestion}
          </pre>
        </div>
      )}

      {/* Category Pills */}
      <div className="space-y-2">
        <label className="block text-xs font-mono font-medium text-gray-500 uppercase tracking-wider">
          Genre / Category
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                category === cat
                  ? 'bg-editorial-accent text-white font-semibold shadow-sm'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cover Image Input */}
      <div className="space-y-2">
        <label className="block text-xs font-mono font-medium text-gray-500 uppercase tracking-wider">
          Cover Image (URL or Upload)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
            className="flex-1 px-4 py-2 rounded-xl border border-editorial-border dark:border-darkEditorial-border bg-white dark:bg-[#1A1C20] text-sm focus:outline-none focus:ring-2 focus:ring-editorial-accent/30"
          />
          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-xs font-mono text-gray-700 dark:text-gray-300 border border-editorial-border dark:border-darkEditorial-border">
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploadingImage ? 'Uploading...' : 'Upload'}</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Title Input */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title of your story or essay..."
          className="w-full font-serif text-3xl sm:text-5xl font-bold bg-transparent border-none placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none text-gray-900 dark:text-gray-50"
        />
      </div>

      {/* Summary / Subtitle Input */}
      <div>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="A short subtitle or teaser summary for discovery feeds..."
          className="w-full font-serif text-lg sm:text-xl text-gray-600 dark:text-gray-400 bg-transparent border-none italic placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none"
        />
      </div>

      {/* Content Editor vs Preview */}
      {showPreview ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-[#1A1C20] border border-editorial-border dark:border-darkEditorial-border shadow-soft min-h-[400px]">
          <h2 className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-6">Story Preview</h2>
          <div
            className="prose-editorial text-lg leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: content
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
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            rows={18}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tell your story... Use Markdown formatting (# Heading, **bold**, *italic*, > quotes, ```code```)"
            className="w-full p-6 rounded-3xl bg-white dark:bg-[#1A1C20] border border-editorial-border dark:border-darkEditorial-border shadow-soft focus:outline-none focus:ring-2 focus:ring-editorial-accent/30 dark:focus:ring-darkEditorial-accent/30 font-serif text-lg leading-relaxed resize-y text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600"
          />
        </div>
      )}
    </div>
  );
};
