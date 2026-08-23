import React, { useState, useEffect } from 'react';
import {
  BotPersona,
  BotGlobalSettings,
  BotActivityLog,
  BotOverviewStats,
  Category
} from '../../types';
import {
  fetchBotOverview,
  fetchBots,
  updateBotPersona,
  toggleBotActive,
  updateBotSettings,
  seedBots,
  triggerBotPost,
  triggerBotInteract,
  triggerBotPulse,
  fetchBotLogs
} from '../../lib/api';

interface BotControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryPublished?: () => void;
}

const CATEGORIES_LIST: Category[] = [
  'Short Stories',
  'Poetry',
  'Shayari',
  'Essays',
  'Reviews',
  'Journalism',
  'Humour',
  'Tech',
  'Philosophy',
  'Culture'
];

export const BotControlCenter: React.FC<BotControlCenterProps> = ({
  isOpen,
  onClose,
  onStoryPublished
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'personas' | 'settings' | 'trigger' | 'logs'>('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State
  const [settings, setSettings] = useState<BotGlobalSettings | null>(null);
  const [stats, setStats] = useState<BotOverviewStats | null>(null);
  const [bots, setBots] = useState<BotPersona[]>([]);
  const [logs, setLogs] = useState<BotActivityLog[]>([]);

  // Edit persona modal
  const [editingBot, setEditingBot] = useState<BotPersona | null>(null);

  // Manual Trigger state
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [triggerCategory, setTriggerCategory] = useState<string>('Tech');
  const [triggerTopic, setTriggerTopic] = useState<string>('');
  const [targetPostId, setTargetPostId] = useState<string>('');
  const [interactAction, setInteractAction] = useState<'applaud' | 'comment' | 'follow'>('applaud');
  const [customComment, setCustomComment] = useState<string>('');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<Partial<BotGlobalSettings>>({});

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewData, botsData] = await Promise.all([
        fetchBotOverview(),
        fetchBots()
      ]);
      setSettings(overviewData.settings);
      setStats(overviewData.stats);
      setLogs(overviewData.recentLogs);
      setBots(botsData.bots);
      setSettingsForm(overviewData.settings);
      if (botsData.bots.length > 0 && !selectedBotId) {
        setSelectedBotId(botsData.bots[0].id);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load bot data' });
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleToggleEngine = async () => {
    if (!settings) return;
    try {
      setActionLoading(true);
      const newEnabled = !settings.is_engine_enabled;
      const res = await updateBotSettings({ isEngineEnabled: newEnabled });
      setSettings(res.settings);
      setSettingsForm(res.settings);
      showStatus(`Gemini Spark Engine ${newEnabled ? 'Resumed' : 'Paused'}`);
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedBots = async () => {
    try {
      setActionLoading(true);
      const res = await seedBots();
      setBots(res.bots);
      showStatus(`Successfully seeded ${res.count} curated writer bots!`);
      loadData();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBot = async (botId: string) => {
    try {
      const res = await toggleBotActive(botId);
      setBots(prev => prev.map(b => b.id === botId ? { ...b, isActive: res.isActive } : b));
      showStatus(`Bot ${res.isActive ? 'Activated' : 'Deactivated'}`);
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await updateBotSettings({
        isEngineEnabled: settingsForm.is_engine_enabled,
        sparkAutomationMode: settingsForm.spark_automation_mode,
        llmModel: settingsForm.llm_model,
        geminiApiKey: settingsForm.gemini_api_key,
        postsPerDayTarget: settingsForm.posts_per_day_target,
        sparkPulseIntervalMinutes: settingsForm.spark_pulse_interval_minutes,
        humanPostReactionRate: settingsForm.human_post_reaction_rate,
        reactionDelayMinMinutes: settingsForm.reaction_delay_min_minutes,
        reactionDelayMaxMinutes: settingsForm.reaction_delay_max_minutes,
        botToBotInteractionRate: settingsForm.bot_to_bot_interaction_rate
      });
      setSettings(res.settings);
      showStatus('Settings updated successfully!');
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBotId) return;
    try {
      setActionLoading(true);
      const res = await triggerBotPost({
        botId: selectedBotId,
        category: triggerCategory,
        topicHint: triggerTopic || undefined
      });
      showStatus(`Article published: "${res.post.title}"`);
      setTriggerTopic('');
      if (onStoryPublished) onStoryPublished();
      loadData();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerInteract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBotId || !targetPostId) return;
    try {
      setActionLoading(true);
      await triggerBotInteract({
        botId: selectedBotId,
        postId: targetPostId.trim(),
        actionType: interactAction,
        customComment: customComment || undefined
      });
      showStatus(`Interaction (${interactAction}) successfully executed!`);
      setCustomComment('');
      loadData();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerPulse = async () => {
    try {
      setActionLoading(true);
      const res = await triggerBotPulse();
      showStatus(`Pulse executed: ${res.pulse?.action || 'Heartbeat checked'}`);
      if (onStoryPublished) onStoryPublished();
      loadData();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveBotPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBot) return;
    try {
      setActionLoading(true);
      const res = await updateBotPersona(editingBot.id, editingBot);
      setBots(prev => prev.map(b => b.id === editingBot.id ? res.bot : b));
      setEditingBot(null);
      showStatus(`Updated persona for ${res.bot.fullName}`);
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xl">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  Gemini Spark Automation Center
                </h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  settings?.is_engine_enabled
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-400'
                }`}>
                  {settings?.is_engine_enabled ? '● Spark Active' : '○ Paused'}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Manage autonomous bot network, publishing cadences & real-user engagement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleEngine}
              disabled={actionLoading || loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                settings?.is_engine_enabled
                  ? 'bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {settings?.is_engine_enabled ? 'Pause Engine' : 'Resume Engine'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className={`px-6 py-2 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-900'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-b border-rose-200 dark:border-rose-900'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'personas', label: `👥 Personas (${bots.length})` },
            { id: 'settings', label: '⚙️ Spark Settings' },
            { id: 'trigger', label: '⚡ Instant Actions' },
            { id: 'logs', label: '📜 Activity Stream' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-semibold'
                  : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-400">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm">Connecting to Gemini Spark Engine...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800">
                      <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">Active Bots</p>
                      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{stats?.activeBotsCount ?? 0} / {bots.length}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800">
                      <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">Bot Articles</p>
                      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{stats?.totalBotPosts ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800">
                      <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">Bot Comments</p>
                      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{stats?.totalBotComments ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800">
                      <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">Applauds Given</p>
                      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{stats?.totalBotApplauds ?? 0}</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        ⚡ Quick Network Initialization
                      </h4>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                        Seed 6 curated writer personas across Tech, Poetry, Shayari, Fiction, Essays, and Humour with pre-configured styles.
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleSeedBots}
                        disabled={actionLoading}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                      >
                        {actionLoading ? 'Seeding...' : '👥 Seed Starter Bots'}
                      </button>
                      <button
                        onClick={handleTriggerPulse}
                        disabled={actionLoading}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold transition-colors"
                      >
                        💓 Pulse Now
                      </button>
                    </div>
                  </div>

                  {/* Summary of active configuration */}
                  <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400">Current Spark Parameters</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-stone-500">LLM Model:</span>{' '}
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{settings?.llm_model}</span>
                      </div>
                      <div>
                        <span className="text-stone-500">Mode:</span>{' '}
                        <span className="font-semibold text-stone-900 dark:text-stone-100 capitalize">{settings?.spark_automation_mode}</span>
                      </div>
                      <div>
                        <span className="text-stone-500">Real Post Reaction:</span>{' '}
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{Math.round((settings?.human_post_reaction_rate || 0) * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-stone-500">Daily Stories Target:</span>{' '}
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{settings?.posts_per_day_target} articles/day</span>
                      </div>
                      <div>
                        <span className="text-stone-500">Pulse Interval:</span>{' '}
                        <span className="font-semibold text-stone-900 dark:text-stone-100">Every {settings?.spark_pulse_interval_minutes}m</span>
                      </div>
                      <div>
                        <span className="text-stone-500">Gemini Key:</span>{' '}
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{settings?.gemini_api_key ? '••••••••' : 'Env Key / Standby'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PERSONAS */}
              {activeTab === 'personas' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Writer Personas ({bots.length})</h3>
                    <button
                      onClick={handleSeedBots}
                      disabled={actionLoading}
                      className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                    >
                      Reset to Default 6 Personas
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bots.map(bot => (
                      <div
                        key={bot.id}
                        className={`p-4 rounded-xl border transition-all ${
                          bot.isActive
                            ? 'bg-white dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 shadow-sm'
                            : 'bg-stone-50 dark:bg-stone-900/40 border-stone-200/50 dark:border-stone-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={bot.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={bot.fullName}
                            className="w-12 h-12 rounded-full object-cover border border-stone-200 dark:border-stone-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                                {bot.fullName}
                              </h4>
                              <button
                                onClick={() => handleToggleBot(bot.id)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  bot.isActive
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                                }`}
                              >
                                {bot.isActive ? 'Active' : 'Disabled'}
                              </button>
                            </div>
                            <p className="text-xs text-stone-500 dark:text-stone-400">@{bot.penName}</p>
                            <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 line-clamp-2">{bot.bio}</p>

                            <div className="flex flex-wrap gap-1 mt-2">
                              {bot.categories?.map(cat => (
                                <span
                                  key={cat}
                                  className="px-2 py-0.5 text-[10px] rounded-md bg-stone-100 dark:bg-stone-700/60 text-stone-700 dark:text-stone-300 font-medium"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500">
                              <span>Published: <b>{bot.storiesCount || 0}</b> stories</span>
                              <button
                                onClick={() => setEditingBot(bot)}
                                className="text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                              >
                                ✏️ Edit Persona
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: SPARK SETTINGS */}
              {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="space-y-5 max-w-2xl">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                      Gemini LLM Model
                    </label>
                    <select
                      value={settingsForm.llm_model || 'gemini-2.0-flash'}
                      onChange={e => setSettingsForm({ ...settingsForm, llm_model: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended - Fastest & High Quality)</option>
                      <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (Ultra-Low Latency)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                      Automation Mode
                    </label>
                    <select
                      value={settingsForm.spark_automation_mode || 'hybrid'}
                      onChange={e => setSettingsForm({ ...settingsForm, spark_automation_mode: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="hybrid">Hybrid (Pulse Publishing + Real User Event Reactions)</option>
                      <option value="event_reactive">Event-Reactive Only (Only react when real users post)</option>
                      <option value="pulse">Pulse Scheduler Only (Periodic publishing on schedule)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                      Google Gemini API Key
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy... (Leave empty to use GEMINI_API_KEY from server .env)"
                      value={settingsForm.gemini_api_key || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, gemini_api_key: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      If left blank or omitted, the server uses GEMINI_API_KEY or falls back to standard editorial synthesis.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                        Daily Stories Target ({settingsForm.posts_per_day_target ?? 4}/day)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={settingsForm.posts_per_day_target ?? 4}
                        onChange={e => setSettingsForm({ ...settingsForm, posts_per_day_target: parseInt(e.target.value, 10) })}
                        className="w-full accent-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                        Real Post Reaction Rate ({Math.round((settingsForm.human_post_reaction_rate ?? 0.9) * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settingsForm.human_post_reaction_rate ?? 0.9}
                        onChange={e => setSettingsForm({ ...settingsForm, human_post_reaction_rate: parseFloat(e.target.value) })}
                        className="w-full accent-amber-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                        Pulse Interval ({settingsForm.spark_pulse_interval_minutes ?? 15} mins)
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="120"
                        step="5"
                        value={settingsForm.spark_pulse_interval_minutes ?? 15}
                        onChange={e => setSettingsForm({ ...settingsForm, spark_pulse_interval_minutes: parseInt(e.target.value, 10) })}
                        className="w-full accent-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                        Bot-to-Bot Interaction ({Math.round((settingsForm.bot_to_bot_interaction_rate ?? 0.4) * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settingsForm.bot_to_bot_interaction_rate ?? 0.4}
                        onChange={e => setSettingsForm({ ...settingsForm, bot_to_bot_interaction_rate: parseFloat(e.target.value) })}
                        className="w-full accent-amber-600"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                    >
                      {actionLoading ? 'Saving...' : '💾 Save Spark Configuration'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: INSTANT ACTIONS */}
              {activeTab === 'trigger' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Article Generator */}
                  <form onSubmit={handleTriggerPost} className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-3">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>✍️</span> Generate & Publish Story
                    </h3>
                    <p className="text-xs text-stone-500">Pick a bot author and category to publish a fresh editorial piece immediately.</p>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Author Bot</label>
                      <select
                        value={selectedBotId}
                        onChange={e => setSelectedBotId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                      >
                        {bots.map(b => (
                          <option key={b.id} value={b.id}>{b.fullName} (@{b.penName})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Category</label>
                      <select
                        value={triggerCategory}
                        onChange={e => setTriggerCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                      >
                        {CATEGORIES_LIST.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Topic / Hint (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Memory, old cafes, code simplicity..."
                        value={triggerTopic}
                        onChange={e => setTriggerTopic(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading || !selectedBotId}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors mt-2"
                    >
                      {actionLoading ? 'Generating with Gemini...' : '⚡ Generate Story Now'}
                    </button>
                  </form>

                  {/* Interaction Dispatcher */}
                  <form onSubmit={handleTriggerInteract} className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-3">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>💬</span> Dispatch Bot Interaction
                    </h3>
                    <p className="text-xs text-stone-500">Trigger a bot to applaud, follow, or leave an AI comment on a specific post.</p>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Bot Actor</label>
                      <select
                        value={selectedBotId}
                        onChange={e => setSelectedBotId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                      >
                        {bots.map(b => (
                          <option key={b.id} value={b.id}>{b.fullName} (@{b.penName})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Target Story UUID</label>
                      <input
                        type="text"
                        placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                        value={targetPostId}
                        onChange={e => setTargetPostId(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(['applaud', 'comment', 'follow'] as const).map(action => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => setInteractAction(action)}
                          className={`py-1.5 text-xs font-semibold rounded-lg capitalize border ${
                            interactAction === action
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {action}
                        </button>
                      ))}
                    </div>

                    {interactAction === 'comment' && (
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Custom Comment (Optional)</label>
                        <input
                          type="text"
                          placeholder="Leave empty for Gemini AI generation"
                          value={customComment}
                          onChange={e => setCustomComment(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={actionLoading || !targetPostId}
                      className="w-full py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-lg text-xs font-bold transition-colors mt-2"
                    >
                      {actionLoading ? 'Executing...' : `Execute ${interactAction.toUpperCase()}`}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 5: LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Live Activity Logs</h3>
                    <button
                      onClick={loadData}
                      className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                    >
                      🔄 Refresh Logs
                    </button>
                  </div>

                  {logs.length === 0 ? (
                    <p className="text-xs text-stone-500 py-8 text-center">No bot activity logs recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                      {logs.map(log => (
                        <div key={log.id} className="p-3 bg-white dark:bg-stone-900/60 flex items-start justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.actionType === 'post' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              log.actionType === 'comment' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                              log.actionType === 'applaud' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                              'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            }`}>
                              {log.actionType}
                            </span>
                            <span className="font-semibold text-stone-900 dark:text-stone-100">{log.botName || log.botId}</span>
                            <span className="text-stone-500">
                              {log.postTitle ? `on "${log.postTitle}"` : (log.details?.title ? `"${log.details.title}"` : '')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-stone-400 text-[11px] whitespace-nowrap">
                            <span className={log.status === 'success' ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                              {log.status}
                            </span>
                            <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Persona Edit Modal */}
      {editingBot && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Edit Persona: {editingBot.fullName}
              </h3>
              <button onClick={() => setEditingBot(null)} className="text-stone-400 hover:text-stone-200">✕</button>
            </div>

            <form onSubmit={handleSaveBotPersona} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingBot.fullName}
                  onChange={e => setEditingBot({ ...editingBot, fullName: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Bio</label>
                <textarea
                  rows={2}
                  value={editingBot.bio || ''}
                  onChange={e => setEditingBot({ ...editingBot, bio: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Persona Prompt (Writing Voice)</label>
                <textarea
                  rows={4}
                  value={editingBot.personaPrompt}
                  onChange={e => setEditingBot({ ...editingBot, personaPrompt: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBot(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Save Persona
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
