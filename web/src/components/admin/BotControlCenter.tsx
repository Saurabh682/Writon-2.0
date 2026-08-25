import React, { useState, useEffect, useRef } from 'react';
import {
  BotPersona,
  ReaderBotPersona,
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
  fetchSparkPromptTemplate,
  ingestSparkBatch,
  fetchSparkAutomationScript,
  fetchDelayedActions,
  cancelDelayedActionApi,
  processDelayedActionsNow,
  seedReaderBotsApi,
  fetchReaderBots,
  triggerReaderSwarmApi
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

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

export const BotControlCenter: React.FC<BotControlCenterProps> = ({
  isOpen,
  onClose,
  onStoryPublished
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'readers' | 'delayed_queue' | 'mcp_app' | 'spark_web' | 'personas' | 'settings' | 'trigger' | 'logs'>('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
      if (scriptTimeoutRef.current) clearTimeout(scriptTimeoutRef.current);
    };
  }, []);

  // State
  const [settings, setSettings] = useState<BotGlobalSettings | null>(null);
  const [stats, setStats] = useState<BotOverviewStats | null>(null);
  const [bots, setBots] = useState<BotPersona[]>([]);
  const [logs, setLogs] = useState<BotActivityLog[]>([]);
  const [delayedActions, setDelayedActions] = useState<any[]>([]);

  // Reader Swarm State (100 Readers)
  const [readersList, setReadersList] = useState<ReaderBotPersona[]>([]);
  const [readersTotal, setReadersTotal] = useState<number>(0);
  const [readersPage, setReadersPage] = useState<number>(1);
  const [selectedReaderCategory, setSelectedReaderCategory] = useState<string>('All');
  const [selectedSwarmPostId, setSelectedSwarmPostId] = useState<string>('latest');
  const [swarmIntensity, setSwarmIntensity] = useState<'conservative' | 'healthy' | 'viral'>('healthy');
  const [swarmCustomCount, setSwarmCustomCount] = useState<string>('');
  const [seedingReaders, setSeedingReaders] = useState<boolean>(false);
  const [triggeringSwarm, setTriggeringSwarm] = useState<boolean>(false);

  // Gemini Spark Web State
  const [sparkPromptText, setSparkPromptText] = useState<string>('');
  const [sparkPythonScript, setSparkPythonScript] = useState<string>('');
  const [sparkInputJson, setSparkInputJson] = useState<string>('');
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // MCP Tab States
  const [mcpUrl, setMcpUrl] = useState('http://localhost:3001/mcp');
  const [copiedMcpUrl, setCopiedMcpUrl] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<{ success: boolean, toolsCount?: number, message: string } | null>(null);
  const [mcpTesting, setMcpTesting] = useState(false);

  // Persona editor state
  const [editingBot, setEditingBot] = useState<BotPersona | null>(null);

  // Trigger Action state
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

  const loadReaderBots = async (page = 1, category = selectedReaderCategory) => {
    try {
      const cat = category === 'All' ? undefined : category;
      const data = await fetchReaderBots(page, 50, cat);
      setReadersList(data.readers);
      setReadersTotal(data.total);
      setReadersPage(page);
    } catch (err: unknown) {
      console.warn('Failed to fetch reader bots:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewData, botsData, promptData, scriptData, delayedData] = await Promise.all([
        fetchBotOverview(),
        fetchBots(),
        fetchSparkPromptTemplate().catch(() => ({ prompt: '' })),
        fetchSparkAutomationScript().catch(() => ({ script: '' })),
        fetchDelayedActions().catch(() => ({ actions: [] }))
      ]);
      setSettings(overviewData.settings);
      setStats(overviewData.stats);
      setLogs(overviewData.recentLogs);
      setBots(botsData.bots);
      setSettingsForm(overviewData.settings);
      setDelayedActions(delayedData.actions || []);
      if (promptData?.prompt) setSparkPromptText(promptData.prompt);
      if (scriptData?.script) setSparkPythonScript(scriptData.script);
      if (botsData.bots.length > 0 && !selectedBotId) {
        setSelectedBotId(botsData.bots[0].id);
      }
      loadReaderBots(1);
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    setStatusMessage({ type, text });
    statusTimeoutRef.current = setTimeout(() => {
      setStatusMessage(null);
      statusTimeoutRef.current = null;
    }, 4000);
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
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
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
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedReaders = async () => {
    try {
      setSeedingReaders(true);
      const res = await seedReaderBotsApi();
      showStatus(`🎉 ${res.message || `Successfully seeded ${res.count} reader personas!`}`);
      loadReaderBots(1);
      loadData();
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
    } finally {
      setSeedingReaders(false);
    }
  };

  const handleTriggerSwarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSwarmPostId) {
      showStatus('Please enter or select a post to applaud', 'error');
      return;
    }
    try {
      setTriggeringSwarm(true);
      const customNum = swarmCustomCount ? parseInt(swarmCustomCount, 10) : undefined;
      const res = await triggerReaderSwarmApi(selectedSwarmPostId, customNum, swarmIntensity);
      showStatus(`🚀 Reader swarm queued: ${res.count} authentic reader applauds dispatched!`);
      loadData();
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
    } finally {
      setTriggeringSwarm(false);
    }
  };

  const handleToggleBot = async (botId: string) => {
    try {
      const res = await toggleBotActive(botId);
      setBots(prev => prev.map(b => b.id === botId ? { ...b, isActive: res.isActive } : b));
      showStatus(`Bot ${res.isActive ? 'Activated' : 'Deactivated'}`);
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
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
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDelayedAction = async (actionId: string) => {
    try {
      setActionLoading(true);
      await cancelDelayedActionApi(actionId);
      setDelayedActions(prev => prev.filter(a => a.id !== actionId));
      showStatus('Delayed action cancelled');
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessDelayedNow = async () => {
    try {
      setActionLoading(true);
      const res = await processDelayedActionsNow();
      showStatus(`Executed ${res.count} scheduled action(s) immediately!`);
      loadData();
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBotId) {
      showStatus('Please select a bot first', 'error');
      return;
    }
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
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerInteract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBotId) {
      showStatus('Please select a bot first', 'error');
      return;
    }
    if (!targetPostId.trim()) {
      showStatus('Please enter a target post ID', 'error');
      return;
    }
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
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
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
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
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
    } catch (err: unknown) {
      showStatus(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopySparkPrompt = async () => {
    try {
      if (!sparkPromptText) {
        const res = await fetchSparkPromptTemplate();
        setSparkPromptText(res.prompt);
        await navigator.clipboard.writeText(res.prompt);
      } else {
        await navigator.clipboard.writeText(sparkPromptText);
      }
      setCopiedPrompt(true);
      showStatus('Copied task prompt! Now paste it into https://gemini.google.com/spark');
      if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
      promptTimeoutRef.current = setTimeout(() => {
        setCopiedPrompt(false);
        promptTimeoutRef.current = null;
      }, 3000);
    } catch (err: unknown) {
      showStatus(getErrorMessage(err) || 'Failed to copy to clipboard', 'error');
    }
  };

  const handleCopySparkScript = async () => {
    try {
      if (!sparkPythonScript) {
        const res = await fetchSparkAutomationScript();
        setSparkPythonScript(res.script);
        await navigator.clipboard.writeText(res.script);
      } else {
        await navigator.clipboard.writeText(sparkPythonScript);
      }
      setCopiedScript(true);
      showStatus('Copied Python automation script for Gemini Spark!');
      if (scriptTimeoutRef.current) clearTimeout(scriptTimeoutRef.current);
      scriptTimeoutRef.current = setTimeout(() => {
        setCopiedScript(false);
        scriptTimeoutRef.current = null;
      }, 3000);
    } catch (err: unknown) {
      showStatus(getErrorMessage(err) || 'Failed to copy Python script to clipboard', 'error');
    }
  };

  const handleIngestSparkBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sparkInputJson.trim()) {
      showStatus('Please paste the JSON output from Gemini Spark first', 'error');
      return;
    }
    try {
      setActionLoading(true);
      const res = await ingestSparkBatch(sparkInputJson.trim());
      showStatus(`Successfully published ${res.storiesCount} stories and ${res.commentsCount} comments from Gemini Spark!`);
      setSparkInputJson('');
      if (onStoryPublished) onStoryPublished();
      loadData();
    } catch (err: unknown) {
      showStatus(`Ingestion failed: ${getErrorMessage(err)}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyMcpUrl = async () => {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopiedMcpUrl(true);
      if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
      promptTimeoutRef.current = setTimeout(() => {
        setCopiedMcpUrl(false);
        promptTimeoutRef.current = null;
      }, 3000);
      showStatus('MCP endpoint URL copied!');
    } catch (err: unknown) {
      showStatus('Failed to copy URL', 'error');
    }
  };

  const handleTestMcp = async () => {
    setMcpTesting(true);
    setMcpTestResult(null);
    try {
      const initRes = await fetch(mcpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' })
      });
      if (!initRes.ok) throw new Error('Failed to initialize');

      const toolsRes = await fetch(mcpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
      });
      const toolsData = await toolsRes.json();

      if (toolsData.result && toolsData.result.tools) {
        setMcpTestResult({ success: true, toolsCount: toolsData.result.tools.length, message: 'Connected successfully!' });
      } else {
        throw new Error('Invalid tools list response');
      }
    } catch (err: any) {
      setMcpTestResult({ success: false, message: err.message || 'Connection failed' });
    } finally {
      setMcpTesting(false);
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
          <div
            role="status"
            aria-live="polite"
            className={`px-6 py-2 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-900'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-b border-rose-200 dark:border-rose-900'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Bot Network Navigation"
          className="flex items-center px-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 gap-1 overflow-x-auto"
        >
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'readers', label: `👏 Reader Swarm (${stats?.activeReadersCount ?? readersTotal ?? 100})` },
            { id: 'delayed_queue', label: `🕒 Human Queue ${delayedActions.length > 0 ? `(${delayedActions.length})` : ''}` },
            { id: 'mcp_app', label: '🔌 Custom Spark App (MCP)' },
            { id: 'spark_web', label: '✨ Gemini Spark Web (Batch Ingest)' },
            { id: 'personas', label: `👥 Writers (${bots.length})` },
            { id: 'settings', label: '⚙️ Spark Settings' },
            { id: 'trigger', label: '⚡ Instant Actions' },
            { id: 'logs', label: '📜 Activity Stream' }
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
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
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3.5 rounded-xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800">
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">✍️ Writers</p>
                      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{stats?.activeBotsCount ?? 6} / {bots.length}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800">
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">👏 Reader Swarm</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats?.activeReadersCount ?? readersTotal ?? 100} Bots</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800">
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">📝 Bot Articles</p>
                      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{stats?.totalBotPosts ?? 0}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800">
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">💬 Comments</p>
                      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{stats?.totalBotComments ?? 0}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800">
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">❤️ Applauds</p>
                      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{stats?.totalBotApplauds ?? 0}</p>
                    </div>
                  </div>

                  {/* Scheduled Queue Glance */}
                  {delayedActions.length > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🕒</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            {delayedActions.length} Action(s) Scheduled in Human-Cadence Queue
                          </h4>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            Actions execute organically with natural human delays.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('delayed_queue')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        View Queue &rarr;
                      </button>
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        ⚡ Quick Network Initialization
                      </h4>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                        Seed 6 curated writer personas and 100 dedicated reader personas across Tech, Poetry, Shayari, Fiction, Essays, and Humour.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleSeedBots}
                        disabled={actionLoading}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                      >
                        {actionLoading ? 'Seeding...' : '👥 Seed 6 Writers'}
                      </button>
                      <button
                        onClick={handleSeedReaders}
                        disabled={seedingReaders}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-700 dark:hover:bg-stone-600 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 justify-center"
                      >
                        {seedingReaders ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Seeding...</span>
                          </>
                        ) : (
                          <>
                            <span>👏</span>
                            <span>Seed 100 Readers</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleTriggerPulse}
                        disabled={actionLoading}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold transition-colors"
                      >
                        💓 Pulse Now
                      </button>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Recent Live Activity</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {logs.slice(0, 8).map(log => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900 dark:text-stone-100">{log.botName || 'Bot'}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.actionType === 'post' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              log.actionType === 'comment' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                              log.actionType === 'reply' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                              log.actionType === 'applaud' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                              'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            }`}>
                              {log.actionType}
                            </span>
                            {log.postTitle && <span className="text-stone-500 truncate max-w-xs">"{log.postTitle}"</span>}
                          </div>
                          <span className="text-[11px] text-stone-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: READER SWARM (100 Readers) */}
              {activeTab === 'readers' && (
                <div className="space-y-6">
                  {/* Swarm Banner & Controls */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 border border-amber-500/20">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">👏</span>
                          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                            Audience & Reader Swarm (100 Bots)
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Active ({readersTotal || 100} Readers)
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-2xl">
                          100 dedicated reader accounts with realistic portraits and genre affinities. 
                          They automatically discover published stories and distribute 15–35 authentic applauds staggered over 24 hours with zero LLM token costs.
                        </p>
                      </div>

                      <button
                        onClick={handleSeedReaders}
                        disabled={seedingReaders}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
                      >
                        {seedingReaders ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Seeding 100 Readers...</span>
                          </>
                        ) : (
                          <>
                            <span>🔄</span>
                            <span>Reseed 100 Reader Network</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* On-Demand Swarm Trigger Card */}
                  <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🚀</span>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Launch Instant Reader Applaud Wave
                      </h4>
                    </div>
                    <form onSubmit={handleTriggerSwarm} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Target Story UUID / Slug
                          </label>
                          <input
                            type="text"
                            value={selectedSwarmPostId}
                            onChange={e => setSelectedSwarmPostId(e.target.value)}
                            placeholder="e.g. latest, or post UUID"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <p className="text-[10px] text-stone-500 mt-1">Use "latest" to applaud the newest story.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Swarm Intensity
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {(['conservative', 'healthy', 'viral'] as const).map(mode => (
                              <button
                                type="button"
                                key={mode}
                                onClick={() => setSwarmIntensity(mode)}
                                className={`px-2 py-2 text-[11px] font-bold rounded-lg border transition-all capitalize ${
                                  swarmIntensity === mode
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                {mode === 'conservative' ? '🌱 6–12' : mode === 'healthy' ? '⚡ 15–30' : '🔥 40–75'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Custom Count (Optional)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={swarmCustomCount}
                            onChange={e => setSwarmCustomCount(e.target.value)}
                            placeholder="Auto from intensity"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={triggeringSwarm}
                          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-2"
                        >
                          {triggeringSwarm ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Scheduling Wave...</span>
                            </>
                          ) : (
                            <>
                              <span>👏</span>
                              <span>Dispatch Reader Swarm</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Reader Directory Filters */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Reader Directory ({readersTotal || 100})
                      </h4>
                      <div className="text-xs text-stone-500 dark:text-stone-400">
                        Page {readersPage} of {Math.ceil((readersTotal || 100) / 50)}
                      </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {['All', 'Tech', 'Poetry', 'Shayari', 'Short Stories', 'Essays', 'Philosophy', 'Humour', 'Culture'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedReaderCategory(cat);
                            loadReaderBots(1, cat);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                            selectedReaderCategory === cat
                              ? 'bg-amber-600 text-white font-bold'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Reader Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {readersList.map(reader => (
                        <div
                          key={reader.id}
                          className="p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900/60 shadow-xs hover:border-amber-500/40 transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={reader.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={reader.fullName}
                              className="w-10 h-10 rounded-full object-cover border border-stone-200 dark:border-stone-700"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                                {reader.fullName}
                              </div>
                              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono truncate">
                                @{reader.penName}
                              </div>
                            </div>
                          </div>

                          <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-2 line-clamp-2 leading-relaxed">
                            {reader.bio}
                          </p>

                          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px]">
                            <div className="flex flex-wrap gap-1">
                              {reader.categories?.slice(0, 2).map((c: string) => (
                                <span key={c} className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium">
                                  {c}
                                </span>
                              ))}
                            </div>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {Math.round((reader.likeProbability || 0.85) * 100)}% Clap Rate
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {readersTotal > 50 && (
                      <div className="flex justify-center gap-2 pt-2">
                        <button
                          disabled={readersPage <= 1}
                          onClick={() => loadReaderBots(readersPage - 1)}
                          className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-xs rounded-lg disabled:opacity-40"
                        >
                          &larr; Previous
                        </button>
                        <button
                          disabled={readersPage * 50 >= readersTotal}
                          onClick={() => loadReaderBots(readersPage + 1)}
                          className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-xs rounded-lg disabled:opacity-40"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: HUMAN-CADENCE QUEUE */}
              {activeTab === 'delayed_queue' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🕒</span>
                        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          Human-Cadence Delayed Actions Queue
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          {delayedActions.length} Pending
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        Actions are staggered across realistic human intervals (e.g. 15-45m reading, 30-90m comment replies) to simulate real users.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={loadData}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-lg text-xs font-semibold transition-colors"
                      >
                        ↻ Refresh
                      </button>
                      <button
                        onClick={handleProcessDelayedNow}
                        disabled={actionLoading || delayedActions.length === 0}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
                      >
                        ⚡ Process Due Now
                      </button>
                    </div>
                  </div>

                  {delayedActions.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/20">
                      <div className="text-4xl mb-2">☕</div>
                      <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                        Queue is Peaceful
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1">
                        When you or other writers publish stories or leave comments, bots will automatically schedule realistic delayed applauds, thoughtful reflections, and conversational replies here!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {delayedActions.map(action => {
                        const executeDate = new Date(action.executeAt);
                        const diffMins = Math.max(0, Math.round((executeDate.getTime() - Date.now()) / (1000 * 60)));
                        return (
                          <div
                            key={action.id}
                            className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3">
                              <img
                                src={action.bot?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt={action.bot?.fullName || 'Bot'}
                                className="w-10 h-10 rounded-full object-cover border border-stone-200 dark:border-stone-700 shrink-0"
                              />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                                    {action.bot?.fullName}
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-mono">
                                    @{action.bot?.penName}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    action.actionType === 'story' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                    action.actionType === 'comment' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                    action.actionType === 'reply' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                                    action.actionType === 'applaud' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                    'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                  }`}>
                                    {action.actionType === 'reply' ? '💬 Thread Reply' : action.actionType === 'applaud' ? '👏 Applaud' : action.actionType === 'comment' ? '📝 Comment' : action.actionType}
                                  </span>
                                </div>

                                {action.post && (
                                  <p className="text-xs text-stone-600 dark:text-stone-300 font-medium truncate max-w-md">
                                    On: <span className="font-semibold">"{action.post.title}"</span> ({action.post.category})
                                  </p>
                                )}

                                {action.payload?.customComment && (
                                  <p className="text-xs text-stone-500 italic truncate max-w-md">
                                    "{action.payload.customComment}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                                diffMins === 0
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 animate-pulse'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              }`}>
                                {diffMins === 0 ? '✓ Ready to execute' : `⏳ In ${diffMins} min`}
                              </span>

                              <button
                                onClick={() => handleCancelDelayedAction(action.id)}
                                disabled={actionLoading}
                                className="text-xs text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CUSTOM SPARK APP (MCP) */}
              {activeTab === 'mcp_app' && (
                <div className="space-y-6">
                  {/* Hero Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-900/20 via-emerald-900/20 to-cyan-900/20 border border-teal-500/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🔌</span>
                          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                            Gemini Spark Custom Connected App (MCP Protocol)
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                            MCP 2024-11-05
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-400 max-w-2xl">
                          WritOn exposes a native Model Context Protocol (MCP) server. Connect it directly in Google Gemini Spark's <b>"Set up a custom connected app"</b> to give Spark full control over publishing, browsing, applauds, and replies!
                        </p>
                      </div>

                      <a
                        href="https://gemini.google.com/spark"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all whitespace-nowrap"
                      >
                        <span>Open Gemini Spark</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>

                  {/* 2 Step Connection Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Endpoint Box */}
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30">
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-2">
                          1. Your MCP Endpoint URL
                        </h4>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={mcpUrl}
                            onChange={(e) => setMcpUrl(e.target.value)}
                            className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-800 dark:text-stone-200"
                          />
                          <button
                            onClick={handleCopyMcpUrl}
                            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                          >
                            {copiedMcpUrl ? '✓ Copied' : '📋 Copy URL'}
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <button
                            onClick={handleTestMcp}
                            disabled={mcpTesting}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            {mcpTesting ? 'Testing...' : 'Test Connection'}
                          </button>
                          {mcpTestResult && (
                            <span className={`text-[11px] font-bold px-2 py-1 rounded ${mcpTestResult.success ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                              {mcpTestResult.success ? `✓ ${mcpTestResult.message} (${mcpTestResult.toolsCount} tools)` : `✗ ${mcpTestResult.message}`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30">
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">
                          2. Connection Guide
                        </h4>
                        <ol className="list-decimal list-inside text-xs text-stone-600 dark:text-stone-400 space-y-2">
                          <li>Open <a href="https://gemini.google.com/spark" target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline font-semibold">gemini.google.com/spark</a></li>
                          <li>In Settings &rarr; Connected Apps, click "Add a custom app" (as in the screenshot).</li>
                          <li>Paste the MCP endpoint URL and click Next.</li>
                          <li>Spark will auto-discover all 12 tools (<code className="bg-stone-200 dark:bg-stone-700 px-1 rounded">writon_publish_story</code>, <code className="bg-stone-200 dark:bg-stone-700 px-1 rounded">writon_reply_to_comment</code>, <code className="bg-stone-200 dark:bg-stone-700 px-1 rounded">writon_browse_and_react</code>, <code className="bg-stone-200 dark:bg-stone-700 px-1 rounded">writon_schedule_action</code>, etc.)</li>
                        </ol>
                      </div>
                    </div>

                    {/* Decoupled Micro-Prompt Ideas */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 px-1">
                        Try these decoupled human-cadence prompts in Spark:
                      </h4>
                      {[
                        { title: "📝 Editorial Story Writer Loop", prompt: "Using the WritOn custom app, check if any writer bot is due to publish a story today and write 1 in-depth article." },
                        { title: "☕ Casual Reader & Applauder Loop", prompt: "Use writon_browse_and_react as @rohan_kapoor to browse recent stories and applaud 2 interesting pieces." },
                        { title: "💬 Conversation & Thread Replier", prompt: "Check the latest story on WritOn for reader comments, and have the author post a thoughtful in-character reply using writon_reply_to_comment." },
                        { title: "⏳ Human Delayed Comment", prompt: "Use writon_schedule_action to queue a thoughtful comment on the latest story by @sunita_banerjee in 25 minutes." }
                      ].map((item, idx) => (
                        <div key={idx} className="group p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-teal-500/50 hover:shadow-md transition-all cursor-pointer relative" onClick={() => { navigator.clipboard.writeText(item.prompt); showStatus('Prompt copied!'); }}>
                          <div className="font-bold text-[11px] text-teal-700 dark:text-teal-300 mb-1">{item.title}</div>
                          <p className="text-xs text-stone-700 dark:text-stone-300 pr-8">{item.prompt}</p>
                          <button className="absolute right-3 top-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Copy prompt">📋</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: GEMINI SPARK WEB (BATCH INGEST) */}
              {activeTab === 'spark_web' && (
                <div className="space-y-6">
                  {/* Hero Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 border border-indigo-500/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">✨</span>
                          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                            Put Gemini Spark Web to Work
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                            gemini.google.com/spark
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-400 max-w-2xl">
                          No developer API key or paid tokens required! Use Google's official Gemini Spark web automation interface at <code>gemini.google.com/spark</code> to generate rich stories, poems, and comments for your writer bots.
                        </p>
                      </div>

                      <a
                        href="https://gemini.google.com/spark"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all whitespace-nowrap"
                      >
                        <span>Open Gemini Spark</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>

                  {/* 2 Step Workflow Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Step 1: Copy Prompt */}
                    <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase">
                            Step 1: Get Task Prompt
                          </span>
                          <span className="text-[11px] text-stone-500 font-mono">6 Personas Included</span>
                        </div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          Copy Ready-to-Paste Prompt
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          Click below to copy the complete task instructions formatted specifically for <b>Gemini Spark</b>.
                        </p>

                        <div className="mt-3 p-3 bg-white dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 rounded-lg text-[11px] font-mono text-stone-600 dark:text-stone-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
                          {sparkPromptText || 'Loading prompt template...'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopySparkPrompt}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        {copiedPrompt ? (
                          <>
                            <span>✓</span>
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <span>📋</span>
                            <span>Copy Prompt for Gemini Spark</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Step 2: Paste & Publish */}
                    <form onSubmit={handleIngestSparkBatch} className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase">
                            Step 2: Instant Import
                          </span>
                          <span className="text-[11px] text-stone-500 font-mono">Auto-Parses JSON</span>
                        </div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          Paste Gemini Spark Output
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          Paste the response from Gemini Spark here. The engine will match personas, assign cover photos, and publish to the live feed.
                        </p>

                        <div className="mt-3">
                          <textarea
                            rows={6}
                            placeholder="Paste the JSON or Markdown response from gemini.google.com/spark here..."
                            value={sparkInputJson}
                            onChange={e => setSparkInputJson(e.target.value)}
                            className="w-full p-3 text-xs bg-white dark:bg-stone-900/80 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading || !sparkInputJson.trim()}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        {actionLoading ? (
                          <span>Publishing Batch...</span>
                        ) : (
                          <>
                            <span>🚀</span>
                            <span>Publish All Stories & Comments to Feed</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Webhook & Scheduled Automation Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <span>🤖</span>
                        <span>Recurring Automation in Gemini Spark</span>
                      </h4>
                      <span className="text-[11px] text-stone-500 font-mono">Python / HTTP Webhook</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Recurring Prompt Instruction */}
                      <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                            ⏰ Option A: Define a Recurring Spark Task
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold">
                            Natural Language
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          In Gemini Spark, you can tell it to execute a recurring schedule (e.g. <i>"Every day at 9 AM"</i> or <i>"Every 6 hours"</i>) and send the generated batch directly to your endpoint:
                        </p>
                        <div className="p-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded text-[11px] font-mono text-stone-700 dark:text-stone-300">
                          Schedule a recurring task every 6 hours:<br/>
                          1. Act as the WritOn Autonomous Editorial Bot Network.<br/>
                          2. Generate 1 new story and 2 comments across [aarav_tech, kavya_nair, devansh_roy, sunita_banerjee, rohan_kapoor, ishaq_qureshi].<br/>
                          3. HTTP POST the JSON batch to: <code className="text-amber-600 dark:text-amber-400">{typeof window !== 'undefined' ? `${window.location.origin}/api/v1/spark/ingest` : '/api/v1/spark/ingest'}</code>
                        </div>
                      </div>

                      {/* Executable Python Script */}
                      <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                              🐍 Option B: Python Execution Script
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold">
                              Zero-Dependency
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            Standard library script with built-in personas, payload schema, error handling, and batch dispatch:
                          </p>
                          <div className="mt-2 p-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded text-[10px] font-mono text-stone-600 dark:text-stone-400 max-h-28 overflow-y-auto whitespace-pre-wrap">
                            {sparkPythonScript || 'Loading Python automation script...'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleCopySparkScript}
                          className="mt-2 w-full py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                          {copiedScript ? (
                            <>
                              <span>✓</span>
                              <span>Copied Python Script!</span>
                            </>
                          ) : (
                            <>
                              <span>📋</span>
                              <span>Copy Python Script for Spark</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Supported Bot Capabilities */}
                    <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/30">
                      <h5 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">
                        ⚡ Supported Bot Actions in Batch JSON:
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                          <div className="font-bold text-amber-600 dark:text-amber-400">📝 Stories</div>
                          <div className="text-stone-500 text-[10px]">Title, summary, markdown content, genre</div>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                          <div className="font-bold text-blue-600 dark:text-blue-400">💬 Comments</div>
                          <div className="text-stone-500 text-[10px]">Target post ID, slug, or "latest"</div>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                          <div className="font-bold text-rose-600 dark:text-rose-400">👏 Applauds / Likes</div>
                          <div className="text-stone-500 text-[10px]">Increments claps & triggers notifications</div>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                          <div className="font-bold text-purple-600 dark:text-purple-400">👥 Follows</div>
                          <div className="text-stone-500 text-[10px]">Follow other writers or human users</div>
                        </div>
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
