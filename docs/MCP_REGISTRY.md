# Master Model Context Protocol (MCP) Directory & Registry

> **System Configuration Source**: `C:\Users\Kumar\.gemini\config\mcp_config.json`  
> **Host Environment**: Windows 11 | Node.js v22.15.1 | Google Antigravity IDE & Agentic Engine  
> **Last Updated**: 2026-09-27  

---

## 📑 Quick Navigation
1. [AI Peer Bridge (Cross-Model & Chat Selector)](#1-ai-peer-bridge-cross-model-antigravity--claude--chatgpt--codex)
2. [Graft Code Context Graph](#2-graft-codebase-context-graph)
3. [Graphify Knowledge Graph](#3-graphify-knowledge-graph)
4. [Context7 (Official Live Docs)](#4-context7-upstash-live-docs)
5. [Playwright (Browser Automation)](#5-playwright-browser-automation)
6. [UI-Layouts & UI-UX-Pro (Design Systems)](#6-ui-layouts--ui-ux-pro)
7. [Cloud Run & Google Cloud Suite](#7-google-cloud-platform-suite)
8. [Firebase MCP Server](#8-firebase-mcp-server)
9. [Supabase & Microsoft Learn](#9-supabase--microsoft-learn)
10. [Parallel Search & GitHub MCP](#10-parallel-search--github-mcp)
11. [Master MCP Server Config Matrix](#11-master-configuration-matrix-mcp_configjson)

---

## 1. AI Peer Bridge (Cross-Model: Antigravity ⇄ Claude ⇄ ChatGPT ⇄ Codex)

- **Identifier**: `ai-peer-bridge`
- **Location**: `d:\VibeCode\WritOn-PowerUp\scripts\mcp-ai-peer-bridge\index.mjs`
- **Type**: Local Stdio + HTTP Daemon (`http://127.0.0.1:4567`)
- **Dependencies**: Pure Node.js standard library (Zero bloat).

### Purpose:
Enables bidirectional handoffs and live peer-review loops between Antigravity, Claude, ChatGPT, and Codex. It allows external models to select an Antigravity conversation, send questions or code, and receive processed responses directly.

### Exposed Tools:
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `list_conversations` | `limit` (number, default: 10) | Lists past/active Antigravity chat sessions with message previews, timestamps, and message counts. |
| `select_conversation`| `conversationId` (string, required) | Dynamically sets which Antigravity chat session to connect. |
| `ask_antigravity` | `prompt` (req), `conversationId` (opt), `includeChatHistory` (opt), `model` (opt), `effort` (opt) | Executes a prompt against Antigravity with full codebase and chat context, returning the answer back. |
| `review_with_claude` | `draft` (req), `reviewCriteria` (opt), `role` (opt), `apiKey` (opt) | Sends text/code to Claude for adversarial critique, style checks, and review. |
| `ask_claude` | `prompt` (req), `systemPrompt` (opt), `model` (opt), `apiKey` (opt) | Direct execution via Claude Code CLI (`claude -p`) or Anthropic API. |
| `ask_chatgpt` | `prompt` (req), `systemPrompt` (opt), `model` (opt), `apiKey` (opt) | Direct query to OpenAI models (`gpt-4o`, `o3-mini`). |
| `get_chat_transcript`| `conversationId` (opt), `turns` (number, default: 5) | Retrieves raw recent transcript turns from any Antigravity conversation. |
| `check_peer_inbox` | `conversationId` (opt), `clearAfterRead` (boolean) | Checks for async incoming messages dropped into the conversation queue. |

### HTTP Endpoints (`http://127.0.0.1:4567`):
- `GET /conversations`: Lists available Antigravity conversations.
- `POST /select-conversation`: Sets default active conversation: `{"conversationId": "..."}`.
- `POST /process` (or `/query`): Executes query against Antigravity synchronously: `{"prompt": "...", "conversationId": "..."}`.
- `GET /context`: Reads chat turns: `/context?conversationId=...&turns=5`.
- `POST /message`: Pushes an asynchronous message/critique into the inbox.

---

## 2. Graft (Codebase Context Graph)

- **Identifier**: `graft`
- **Command**: `npx -y @nanonets/graft mcp`
- **Scope**: Local repository indexing (`graft/`)

### Purpose:
Primary codebase context graph. Provides ranked nodes with exact `file:line` spans, callers/callees edges, and structural skeletons. Token-efficient, deterministic ($0 cost).

### Available Features:
- `graft ask "<query>" --source`: Ranked definitions with inlined crux lines.
- `graft callers <symbol>`: Exact precomputed caller edges.
- `graft skeleton <file>`: Definition signatures and line spans without loading full files.
- `graft map`: Token-budgeted orientation of directory clusters, hubs, and hotspots.
- `graft grep "<literal>"`: Exhaustive indexed symbol search.

---

## 3. Graphify (Knowledge Graph)

- **Identifier**: `graphify`
- **Command**: `uv run --with graphifyy --with mcp -m graphify.serve <graph_path>`
- **Database**: Graph representation with god-nodes, clusters, and communities.

### Exposed Tools:
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `query_graph` | `query` (string) | Natural language queries over code relationships. |
| `get_node` | `node_id` (string) | Retrieves node attributes, documentation, and dependencies. |
| `get_neighbors` | `node_id`, `direction`, `max_depth` | Traverses callers, callees, imports, and exports. |
| `get_community` | `community_id` | Examines clustered functional modules. |
| `god_nodes` | `limit`, `metric` | Identifies central architectural hubs and blast radius risks. |
| `shortest_path` | `source`, `target` | Traces dependency paths between disparate modules. |

---

## 4. Context7 (Upstash Live Docs)

- **Identifier**: `context7`
- **Command**: `npx -y @upstash/context7-mcp@latest`

### Purpose:
Fetches up-to-date, version-accurate documentation for third-party libraries and SDKs directly from source before coding.

### Exposed Tools:
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `resolve-library-id` | `query`, `libraryName` | Matches package name to Context7 canonical library identifier. |
| `query-docs` | `libraryId`, `query` | Retrieves official docs, code patterns, and API signatures. |

---

## 5. Playwright (Browser Automation)

- **Identifier**: `playwright`
- **Command**: `npx -y @playwright/mcp@latest`

### Purpose:
Full browser automation engine for E2E testing, visual validation, screenshots, web scraping, and DOM actuation.

### Key Tools:
- `browser_navigate`: Opens URLs in Chromium/WebKit.
- `browser_take_screenshot`: Captures full-page or element screenshots.
- `browser_click`, `browser_type`, `browser_fill_form`: User interactions.
- `browser_snapshot`: Captures the accessibility and DOM tree for inspection.
- `browser_network_requests`: Monitors XHR/Fetch network traffic and responses.

---

## 6. UI-Layouts & UI-UX-Pro

- **UI-Layouts**: `npx -y @ui-layouts/mcp`
  - `search_components`: Search pre-built, production React/Tailwind components.
  - `get_source_code`: Pull raw TSX/Tailwind code for UI patterns.
- **UI-UX-Pro**: `npx -y ui-ux-pro-mcp`
  - `get_design_system`: Design tokens, color palettes, and typography tokens.
  - `search_styles`: Archetype styling (Linear, Vercel, Stripe, Claude).
  - `search_patterns`: Layout structures, hero sections, cards, and data tables.

---

## 7. Google Cloud Platform Suite

| Server ID | Transport | Auth Type | Key Capabilities |
| :--- | :--- | :--- | :--- |
| `cloudrun` | `npx -y @google-cloud/cloud-run-mcp` | ADC | Deploy services, inspect revisions, read container logs. |
| `google-cloud-resource-manager` | `https://cloudresourcemanager.googleapis.com/mcp` | `google_credentials` | List and manage GCP projects and IAM bindings. |
| `google-cloud-apikeys` | `https://apikeys.googleapis.com/mcp` | `google_credentials` | Inspect, create, restrict, and rotate Google Cloud API keys. |
| `google-cloud-monitoring` | `https://monitoring.googleapis.com/mcp` | `google_credentials` | Query Cloud Monitoring time-series metrics, alert policies, and dashboards. |

---

## 8. Firebase MCP Server

- **Identifier**: `firebase-mcp-server`
- **Command**: `npx -y firebase-tools@latest mcp`

### Capabilities:
- `firebase_deploy`: Deploy Hosting, Cloud Functions, Firestore Rules, and Remote Config.
- `firebase_list_apps` & `firebase_get_sdk_config`: Retrieve web/Android app configurations.
- `developerknowledge_answer_query`: Firebase documentation & architecture reference.

---

## 9. Supabase & Microsoft Learn

- **Supabase**: `https://mcp.supabase.com/mcp` (Remote SSE)
  - Database schema inspection, SQL execution, RLS policy audits, storage buckets, and auth config.
- **Microsoft Learn**: `https://learn.microsoft.com/api/mcp` (Remote SSE)
  - `microsoft_docs_search` & `microsoft_code_sample_search`: Official .NET, C#, Azure, and TypeScript docs.

---

## 10. Parallel Search & GitHub MCP

- **Parallel Search**: `npx -y mcp-remote https://search.parallel.ai/mcp`
  - High-performance, fast web search and deep content fetching (`web_search`, `web_fetch`).
- **GitHub MCP Server**: `docker run -i --rm ghcr.io/github/github-mcp-server`
  - Direct repository management, issue creation, pull request reviews, and commit searching.

---

## 11. Master Configuration Matrix (`mcp_config.json`)

To use these in external applications (Cursor, Claude Desktop, Codex, Windsurf), here is the exact copy-paste configuration block:

```json
{
  "mcpServers": {
    "ai-peer-bridge": {
      "command": "node",
      "args": [
        "d:\\VibeCode\\WritOn-PowerUp\\scripts\\mcp-ai-peer-bridge\\index.mjs"
      ]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "graft": {
      "command": "npx",
      "args": ["-y", "@nanonets/graft", "mcp"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "ui-layouts": {
      "command": "npx",
      "args": ["-y", "@ui-layouts/mcp"]
    },
    "ui-ux-pro": {
      "command": "npx",
      "args": ["-y", "ui-ux-pro-mcp"]
    },
    "firebase-mcp-server": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp"]
    },
    "cloudrun": {
      "command": "npx",
      "args": ["-y", "@google-cloud/cloud-run-mcp"]
    },
    "supabase": {
      "serverUrl": "https://mcp.supabase.com/mcp"
    },
    "microsoft-learn": {
      "serverUrl": "https://learn.microsoft.com/api/mcp"
    },
    "parallel-search": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://search.parallel.ai/mcp"]
    }
  }
}
```
