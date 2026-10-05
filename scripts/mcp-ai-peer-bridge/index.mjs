#!/usr/bin/env node
/**
 * AI Peer Bridge MCP Server
 * Enables bidirectional cross-model peer review and conversation sharing between
 * Antigravity (Gemini), Claude (Anthropic), and ChatGPT (OpenAI) / Codex.
 * 
 * Supports:
 * 1. Chat Picker: List active conversations and pick/switch which chat context to connect.
 * 2. Inbound Query: External model -> Antigravity (with chosen chat history + codebase context).
 * 3. Outbound Review: Antigravity -> Claude / ChatGPT / Codex.
 * 
 * Implements standard Model Context Protocol (MCP) JSON-RPC 2.0 over Stdio and HTTP.
 * Zero external dependencies: pure Node.js stdlib (child_process, http, fs, path).
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const HTTP_BRIDGE_PORT = parseInt(process.env.PEER_BRIDGE_PORT || '4567', 10);
const APP_DATA_DIR = process.env.ANTIGRAVITY_APP_DATA_DIR || path.join(process.env.USERPROFILE || '', '.gemini', 'antigravity');
const BRAIN_DIR = path.join(APP_DATA_DIR, 'brain');

// Active conversation state (can be switched dynamically via tool or API)
let activeConversationId = process.env.ANTIGRAVITY_CONVERSATION_ID || '9a1397ff-7052-4d63-a768-31cc2d3670d2';
const PROJECT_ID = process.env.ANTIGRAVITY_PROJECT_ID || 'a3dfb788-cfbd-4c3e-b551-5bb121a9155c';
const WORKSPACE_DIR = 'd:\\VibeCode\\WritOn-PowerUp';
const AGY_PATH = path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'agy', 'bin', 'agy.exe');

function getQueueDir(convId = activeConversationId) {
  const dir = path.join(BRAIN_DIR, convId, 'peer_inbox');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  return dir;
}

/**
 * List all available conversations across Antigravity brain
 */
function listAvailableConversations(limit = 15) {
  try {
    if (!fs.existsSync(BRAIN_DIR)) return [];
    const entries = fs.readdirSync(BRAIN_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'tempmediaStorage')
      .map(d => {
        const fullPath = path.join(BRAIN_DIR, d.name);
        const stat = fs.statSync(fullPath);
        let preview = '';
        let messageCount = 0;
        const transcriptFile = path.join(fullPath, '.system_generated', 'logs', 'transcript.jsonl');

        if (fs.existsSync(transcriptFile)) {
          try {
            const content = fs.readFileSync(transcriptFile, 'utf-8').trim();
            const lines = content.split('\n');
            messageCount = lines.length;
            for (const line of lines.slice(0, 5)) {
              if (!line.trim()) continue;
              const parsed = JSON.parse(line);
              if (parsed.type === 'USER_INPUT' && parsed.content) {
                preview = parsed.content.slice(0, 80).replace(/\n/g, ' ');
                break;
              }
            }
          } catch (e) {}
        }

        return {
          id: d.name,
          isActive: d.name === activeConversationId,
          lastModified: stat.mtime.toISOString(),
          mtimeMs: stat.mtimeMs,
          messageCount,
          preview: preview || '(Untitled Conversation)'
        };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, limit);

    return entries;
  } catch (err) {
    return [{ error: err.message }];
  }
}

/**
 * Set active conversation ID
 */
function selectActiveConversation(conversationId) {
  if (!conversationId) return { success: false, error: 'Conversation ID required' };
  const targetDir = path.join(BRAIN_DIR, conversationId);
  if (!fs.existsSync(targetDir)) {
    return { success: false, error: `Conversation ID not found: ${conversationId}` };
  }
  activeConversationId = conversationId;
  getQueueDir(conversationId);
  return {
    success: true,
    activeConversationId,
    note: `Active conversation successfully set to ${conversationId}`
  };
}

/**
 * Extract recent transcript context for any conversation
 */
function getConversationTranscript(conversationId = activeConversationId, maxTurns = 6) {
  try {
    const transcriptPath = path.join(BRAIN_DIR, conversationId, '.system_generated', 'logs', 'transcript.jsonl');
    if (!fs.existsSync(transcriptPath)) {
      return `No transcript found for conversation: ${conversationId}`;
    }
    const lines = fs.readFileSync(transcriptPath, 'utf-8').trim().split('\n');
    const turns = [];
    for (let i = lines.length - 1; i >= 0 && turns.length < maxTurns; i--) {
      try {
        const item = JSON.parse(lines[i]);
        if (item.type === 'USER_INPUT' || item.type === 'PLANNER_RESPONSE') {
          turns.unshift({
            role: item.type === 'USER_INPUT' ? 'User' : 'Antigravity',
            content: (item.content || '').slice(0, 1200)
          });
        }
      } catch (e) {}
    }
    return turns.map(t => `[${t.role}]: ${t.content}`).join('\n\n');
  } catch (err) {
    return `Error reading transcript: ${err.message}`;
  }
}

/**
 * Execute prompt against Antigravity engine (agy CLI).
 *
 * Mode A (default): injects into the live running conversation via --conversation <id>.
 *   - Message lands in the SAME agent with full context, tools, rules, and memory.
 *   - No manual history prepending needed — the live conversation has it all.
 *
 * Mode B (new session): omit conversationId or pass useNewSession:true.
 *   - Spawns a fresh headless agy session. Useful for isolated one-shot tasks.
 *
 * @param {number} [timeoutMs=180000] - Kill agy after this many ms (default 3 min).
 */
async function callAntigravity({ prompt, conversationId = activeConversationId, includeChatHistory = true, model, effort, dangerouslySkipPermissions = true, timeoutMs = 180000, useNewSession = false }) {
  // When injecting into a live conversation, the agent already has full context.
  // Manual history prepending is only needed for new (headless) sessions.
  let enrichedPrompt = prompt;
  if (useNewSession && includeChatHistory) {
    const history = getConversationTranscript(conversationId, 5);
    if (history && !history.startsWith('No transcript') && !history.startsWith('Error')) {
      enrichedPrompt = `[Context from Antigravity Chat (${conversationId})]:\n${history}\n\n[Instruction / Query to Process]:\n${prompt}`;
    }
  }

  return new Promise((resolve) => {
    const exe = fs.existsSync(AGY_PATH) ? AGY_PATH : 'agy';
    const cliArgs = ['--project', PROJECT_ID];

    // Inject into the live conversation unless caller explicitly wants a new session
    if (!useNewSession && conversationId) {
      cliArgs.push('--conversation', conversationId);
    }

    if (dangerouslySkipPermissions) cliArgs.push('--dangerously-skip-permissions');
    if (model) cliArgs.push('--model', model);
    if (effort) cliArgs.push('--effort', effort);
    cliArgs.push('-p', enrichedPrompt);

    const proc = spawn(exe, cliArgs, {
      cwd: WORKSPACE_DIR,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    // Kill agy and resolve with timeout error if it runs too long
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { proc.kill('SIGTERM'); } catch (e) {}
      resolve({
        success: false,
        conversationId,
        timedOut: true,
        error: `agy timed out after ${Math.round(timeoutMs / 1000)}s. For long tasks (image gen, publishing), use POST /message for async fire-and-forget instead.`,
        partialOutput: stdout.slice(-2000) // last 2KB of partial output for debugging
      });
    }, timeoutMs);

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const cleanStdout = stdout.replace(/Unable to create process using '.*?conda-script\.py shell\.powershell hook'/g, '').trim();
      const cleanStderr = stderr.replace(/Unable to create process using '.*?conda-script\.py shell\.powershell hook'/g, '').trim();

      if (code === 0) {
        resolve({
          success: true,
          conversationId,
          injectedIntoLiveConversation: !useNewSession,
          text: cleanStdout,
          raw: stdout
        });
      } else {
        resolve({
          success: false,
          conversationId,
          error: cleanStderr || cleanStdout || `Process exited with code ${code}`,
          code
        });
      }
    });

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ success: false, conversationId, error: err.message });
    });
  });
}

/**
 * Execute Claude Code CLI command
 */
async function callClaudeCLI({ prompt, systemPrompt, model = 'sonnet', printMode = true }) {
  return new Promise((resolve) => {
    const claudePath = path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe');
    const exe = fs.existsSync(claudePath) ? claudePath : 'claude';

    const args = [];
    if (printMode) args.push('-p', prompt);
    if (systemPrompt) args.push('--system-prompt', systemPrompt);
    if (model) args.push('--model', model);

    const proc = spawn(exe, args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const cleanStdout = stdout.replace(/Unable to create process using '.*?conda-script\.py shell\.powershell hook'/g, '').trim();
      const cleanStderr = stderr.replace(/Unable to create process using '.*?conda-script\.py shell\.powershell hook'/g, '').trim();

      if (code === 0) {
        resolve({ success: true, text: cleanStdout, raw: stdout });
      } else {
        resolve({
          success: false,
          error: cleanStderr || cleanStdout || `Process exited with code ${code}`,
          code
        });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Direct Anthropic API call if key is set
 */
async function callClaudeAPI({ prompt, systemPrompt, model = 'claude-3-7-sonnet-20250219', apiKey }) {
  const payload = {
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  };
  if (systemPrompt) payload.system = systemPrompt;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    return { success: false, error: `Anthropic API Error (${res.status}): ${errText}` };
  }

  const data = await res.json();
  const text = data.content?.map(c => c.text).join('\n') || '';
  return { success: true, text };
}

/**
 * Direct OpenAI API call if key is set
 */
async function callOpenAIAPI({ prompt, systemPrompt, model = 'gpt-4o', apiKey }) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    return { success: false, error: `OpenAI API Error (${res.status}): ${errText}` };
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { success: true, text };
}

/**
 * Start Background HTTP Webhook Listener for Inbound Messages & Web UI Picker
 */
function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://localhost:${HTTP_BRIDGE_PORT}`);

    // GET /conversations -> List all conversations so user/Codex/ChatGPT can pick one
    if (req.method === 'GET' && parsedUrl.pathname === '/conversations') {
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '15', 10);
      const list = listAvailableConversations(limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ activeConversationId, conversations: list }));
      return;
    }

    // POST /select-conversation -> Change active conversation target
    if (req.method === 'POST' && parsedUrl.pathname === '/select-conversation') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const result = selectActiveConversation(payload.conversationId);
          res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // GET /context -> return recent chat context from specified or active conversation
    if (req.method === 'GET' && parsedUrl.pathname === '/context') {
      const targetId = parsedUrl.searchParams.get('conversationId') || activeConversationId;
      const turns = parseInt(parsedUrl.searchParams.get('turns') || '5', 10);
      const context = getConversationTranscript(targetId, turns);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ conversationId: targetId, context }));
      return;
    }

    // POST /process -> Process query directly via Antigravity with selected conversation context
    if (req.method === 'POST' && (parsedUrl.pathname === '/process' || parsedUrl.pathname === '/query')) {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const prompt = payload.prompt || payload.query || payload.content || '';
          if (!prompt) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing prompt/query in request body' }));
            return;
          }

          const targetConversationId = payload.conversationId || activeConversationId;
          const includeChatHistory = payload.includeChatHistory !== false;
          const model = payload.model;
          const effort = payload.effort;
          const timeoutMs = payload.timeoutMs || 180000;
          const useNewSession = payload.useNewSession === true;

          const result = await callAntigravity({
            prompt,
            conversationId: targetConversationId,
            includeChatHistory,
            model,
            effort,
            timeoutMs,
            useNewSession
          });

          res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // POST /message -> enqueue inbound review or prompt into target conversation inbox
    if (req.method === 'POST' && parsedUrl.pathname === '/message') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const targetId = payload.conversationId || activeConversationId;
          const sender = payload.sender || 'External Peer';
          const content = payload.content || payload.message || '';
          const meta = payload.meta || {};

          const qDir = getQueueDir(targetId);
          const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const msgFile = path.join(qDir, `${messageId}.json`);

          fs.writeFileSync(msgFile, JSON.stringify({
            id: messageId,
            conversationId: targetId,
            sender,
            content,
            meta,
            timestamp: new Date().toISOString()
          }, null, 2));

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'queued',
            conversationId: targetId,
            messageId,
            inboxPath: msgFile,
            note: `Message delivered to conversation ${targetId} inbox.`
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Default status & interactive dashboard info
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'Antigravity AI Peer Bridge',
      status: 'active',
      activeConversationId,
      endpoints: {
        'GET /conversations': 'List available Antigravity conversations to pick from',
        'POST /select-conversation': 'Select/switch active conversation: { "conversationId": "..." }',
        'POST /process': 'Process query via Antigravity with conversation context and return answer: { "prompt": "...", "conversationId": "..." }',
        'GET /context': 'Retrieve chat context: /context?conversationId=...&turns=5',
        'POST /message': 'Push async message to conversation inbox: { "conversationId": "...", "sender": "...", "content": "..." }'
      }
    }));
  });

  server.listen(HTTP_BRIDGE_PORT, '127.0.0.1', () => {});
  server.on('error', () => {});
}

startHttpServer();

/**
 * MCP Stdio Server Protocol Implementation
 */
const TOOLS = [
  {
    name: 'list_conversations',
    description: 'List all available Antigravity chats/conversations with timestamps and previews so you or the user can pick which chat to connect.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max number of conversations to return (default: 10).'
        }
      }
    }
  },
  {
    name: 'select_conversation',
    description: 'Set which Antigravity chat session to connect for cross-model querying, context sharing, and reviews.',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: {
          type: 'string',
          description: 'The conversation ID to select as active.'
        }
      },
      required: ['conversationId']
    }
  },
  {
    name: 'ask_antigravity',
    description: 'Execute a prompt against the Antigravity engine (with context from the selected or active chat) and return the response. Perfect for Codex, ChatGPT, or Claude querying Antigravity.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt or instruction for Antigravity to process.'
        },
        conversationId: {
          type: 'string',
          description: 'Optional conversation ID to draw chat history from (defaults to active conversation).'
        },
        includeChatHistory: {
          type: 'boolean',
          description: 'Whether to prepend recent chat history from the conversation (default: true).'
        },
        model: {
          type: 'string',
          description: 'Optional model to use.'
        },
        effort: {
          type: 'string',
          description: 'Reasoning effort: low, medium, high, max.'
        },
        timeoutMs: {
          type: 'number',
          description: 'Timeout in milliseconds before killing agy and returning a timeout error. Default: 180000 (3 min). Use 300000 (5 min) for heavy image-generation or publishing tasks.'
        },
        useNewSession: {
          type: 'boolean',
          description: 'If true, spawns a new headless agy session instead of injecting into the live conversation. Default: false (inject into live conversation for full context).'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'ask_claude',
    description: 'Send a prompt or text to Claude (using local Claude Code CLI or Anthropic API) and receive its direct response.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt or content to send to Claude.'
        },
        systemPrompt: {
          type: 'string',
          description: 'Optional system instructions for Claude.'
        },
        model: {
          type: 'string',
          description: "Model to use, e.g. 'sonnet' or 'opus' (CLI) or 'claude-3-7-sonnet-20250219' (API). Defaults to 'sonnet'."
        },
        apiKey: {
          type: 'string',
          description: 'Optional Anthropic API key override.'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'review_with_claude',
    description: 'Send a draft post, story, or code to Claude for adversarial critique, peer review, and refinement suggestions.',
    inputSchema: {
      type: 'object',
      properties: {
        draft: {
          type: 'string',
          description: 'The draft content (post, story, or code) to review.'
        },
        reviewCriteria: {
          type: 'string',
          description: 'Specific angles to critique: e.g. "Human Voice & authenticity", "Engineering rigor & edge cases", "Hook strength & clarity".'
        },
        role: {
          type: 'string',
          description: 'Reviewer persona, e.g. "Senior Staff Reviewer", "Literary Editor", "Adversarial Code Auditor".'
        },
        apiKey: {
          type: 'string',
          description: 'Optional Anthropic API key override.'
        }
      },
      required: ['draft']
    }
  },
  {
    name: 'ask_chatgpt',
    description: 'Send a prompt or draft to ChatGPT (OpenAI GPT-4o / o3-mini) for second-opinion review or reasoning.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt or draft to send to ChatGPT.'
        },
        systemPrompt: {
          type: 'string',
          description: 'Optional system prompt.'
        },
        model: {
          type: 'string',
          description: "OpenAI model name, e.g. 'gpt-4o' or 'o3-mini'. Defaults to 'gpt-4o'."
        },
        apiKey: {
          type: 'string',
          description: 'OpenAI API key override.'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'get_chat_transcript',
    description: 'Retrieve recent conversation history from any chosen Antigravity session to share with Claude or ChatGPT.',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: {
          type: 'string',
          description: 'Conversation ID to extract transcript from (defaults to active conversation).'
        },
        turns: {
          type: 'number',
          description: 'Number of recent turns to retrieve (default: 5).'
        }
      }
    }
  },
  {
    name: 'check_peer_inbox',
    description: 'Check for incoming messages, reviews, or responses delivered via the local HTTP webhook bridge (localhost:4567).',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: {
          type: 'string',
          description: 'Conversation ID inbox to inspect (defaults to active conversation).'
        },
        clearAfterRead: {
          type: 'boolean',
          description: 'Whether to archive/delete messages after reading (default: false).'
        }
      }
    }
  }
];

// Handle JSON-RPC requests via stdio
let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const request = JSON.parse(line.trim());
      await handleRpcMessage(request);
    } catch (err) {
      sendRpcError(null, -32700, `Parse error: ${err.message}`);
    }
  }
});

function sendRpcResponse(id, result) {
  const payload = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write(payload + '\n');
}

function sendRpcError(id, code, message) {
  const payload = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
  process.stdout.write(payload + '\n');
}

async function handleRpcMessage(req) {
  const { id, method, params } = req;

  if (method === 'initialize') {
    sendRpcResponse(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'ai-peer-bridge', version: '1.2.0' }
    });
    return;
  }

  if (method === 'notifications/initialized') return;

  if (method === 'tools/list') {
    sendRpcResponse(id, { tools: TOOLS });
    return;
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    try {
      const result = await executeTool(name, args || {});
      sendRpcResponse(id, {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      });
    } catch (err) {
      sendRpcResponse(id, {
        isError: true,
        content: [{ type: 'text', text: `Tool execution failed: ${err.message}` }]
      });
    }
    return;
  }

  sendRpcError(id, -32601, `Method not found: ${method}`);
}

async function executeTool(name, args) {
  if (name === 'list_conversations') {
    return listAvailableConversations(args.limit || 10);
  }

  if (name === 'select_conversation') {
    return selectActiveConversation(args.conversationId);
  }

  if (name === 'ask_antigravity') {
    const res = await callAntigravity({
      prompt: args.prompt,
      conversationId: args.conversationId || activeConversationId,
      includeChatHistory: args.includeChatHistory !== false,
      model: args.model,
      effort: args.effort,
      timeoutMs: args.timeoutMs || 180000,
      useNewSession: args.useNewSession === true
    });
    if (res.success) return res.text;
    return `Antigravity error: ${res.error}${res.timedOut ? '\n\nTip: Pass timeoutMs=300000 for heavy tasks, or use POST /message for fire-and-forget.' : ''}`;
  }

  if (name === 'ask_claude') {
    const apiKey = args.apiKey || process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      const res = await callClaudeAPI({
        prompt: args.prompt,
        systemPrompt: args.systemPrompt,
        model: args.model || 'claude-3-7-sonnet-20250219',
        apiKey
      });
      if (res.success) return res.text;
      return `Claude API error: ${res.error}`;
    }

    const cliRes = await callClaudeCLI({
      prompt: args.prompt,
      systemPrompt: args.systemPrompt,
      model: args.model || 'sonnet'
    });
    if (cliRes.success) return cliRes.text;
    return `Claude CLI error: ${cliRes.error}\n\nTip: You can provide an Anthropic API Key via ANTHROPIC_API_KEY environment variable or the apiKey argument.`;
  }

  if (name === 'review_with_claude') {
    const criteria = args.reviewCriteria || 'Authenticity, direct statement rule, clarity, technical accuracy, and lack of AI cliches.';
    const role = args.role || 'Senior Editorial & Technical Reviewer';

    const systemPrompt = `You are a ${role}. Your task is to provide an objective, adversarial peer review of the provided draft. Critique based on:
1. ${criteria}
2. Concrete suggestions: what to delete, what to rephrase, and what to keep.
3. Be direct, concise, and constructive.`;

    const prompt = `Please review this draft according to your criteria:\n\n---\n${args.draft}\n---`;

    const apiKey = args.apiKey || process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      const res = await callClaudeAPI({ prompt, systemPrompt, apiKey });
      if (res.success) return res.text;
    }

    const cliRes = await callClaudeCLI({ prompt, systemPrompt });
    if (cliRes.success) return cliRes.text;
    return `Claude Review error: ${cliRes.error}`;
  }

  if (name === 'ask_chatgpt') {
    const apiKey = args.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return 'Error: OPENAI_API_KEY is not configured. Please supply apiKey in tool arguments or set OPENAI_API_KEY in your environment.';
    }
    const res = await callOpenAIAPI({
      prompt: args.prompt,
      systemPrompt: args.systemPrompt,
      model: args.model || 'gpt-4o',
      apiKey
    });
    if (res.success) return res.text;
    return `ChatGPT error: ${res.error}`;
  }

  if (name === 'get_chat_transcript') {
    const targetId = args.conversationId || activeConversationId;
    return getConversationTranscript(targetId, args.turns || 5);
  }

  if (name === 'check_peer_inbox') {
    const targetId = args.conversationId || activeConversationId;
    const qDir = getQueueDir(targetId);
    if (!fs.existsSync(qDir)) return { conversationId: targetId, messages: [] };
    const files = fs.readdirSync(qDir).filter(f => f.endsWith('.json'));
    const messages = [];

    for (const file of files) {
      const fp = path.join(qDir, file);
      try {
        const raw = fs.readFileSync(fp, 'utf-8');
        messages.push(JSON.parse(raw));
        if (args.clearAfterRead) fs.unlinkSync(fp);
      } catch (e) {}
    }
    return { conversationId: targetId, count: messages.length, messages };
  }

  throw new Error(`Unknown tool: ${name}`);
}
