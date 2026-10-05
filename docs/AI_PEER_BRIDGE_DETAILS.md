# AI Peer Bridge (`ai-peer-bridge`) — Complete Technical Reference & Specification

> **System Name**: `ai-peer-bridge`  
> **Source File**: `d:\VibeCode\WritOn-PowerUp\scripts\mcp-ai-peer-bridge\index.mjs`  
> **Registration**: `C:\Users\Kumar\.gemini\config\mcp_config.json`  
> **Active Port**: `http://127.0.0.1:4567` (Background Node.js Daemon)  
> **Protocol**: Model Context Protocol (MCP) JSON-RPC 2.0 (Stdio) + Synchronous HTTP REST API  
> **Dependencies**: 0 External npm dependencies (Pure Node.js standard library: `child_process`, `http`, `fs`, `path`)  
> **Last Updated**: 2026-09-27  

---

## 1. System Overview & Architecture

`ai-peer-bridge` is a bidirectional communication plane between **Google Antigravity** (this IDE/engine), **Claude** (Anthropic), and **ChatGPT / Codex** (OpenAI).

It enables:
1. **Chat Session Discovery & Switching**: External models or users can dynamically list all past/active Antigravity conversations and pick which chat to interact with.
2. **Inbound Processing (ChatGPT/Codex/Claude $\rightarrow$ Antigravity)**: External models can send prompts/tasks into Antigravity. Antigravity runs them against the local codebase using the native `agy` CLI engine with full workspace context and returns the answer directly back to the caller.
3. **Outbound Review Loop (Antigravity $\rightarrow$ Claude/ChatGPT)**: Antigravity can submit drafts, code, or stories to Claude or ChatGPT for peer review, adversarial critique, and sanity checks.
4. **Asynchronous Inbox**: A persistent queue (`peer_inbox/`) where models can deposit async notes, critiques, and task updates.

```
 +-----------------------------------------------------------------------------------------+
 |                                  ANTIGRAVITY ENGINE                                     |
 |               Language Server + Workspace Context + Native agy CLI Engine               |
 +-----------------------------------------------------------------------------------------+
        ^                                                                  |
        | 2. Synchronous Execution                                         | 1. Outbound Review / Prompt
        |    (agy -p "<query>" --project <id>)                            |    (MCP Stdio Tools)
        |                                                                  v
 +-----------------------------------------------------------------------------------------+
 |                              AI PEER BRIDGE (`ai-peer-bridge`)                          |
 |                         scripts/mcp-ai-peer-bridge/index.mjs                            |
 |                         Active on Localhost Port: 4567                                  |
 +-----------------------------------------------------------------------------------------+
        ^                                                                  |
        | 3. Inbound MCP Tool / HTTP API                                   | 4. Outbound Tool / API
        |    - ask_antigravity({ prompt, conversationId })                 |    - ask_claude
        |    - select_conversation({ conversationId })                     |    - ask_chatgpt
        |    - POST http://127.0.0.1:4567/process                         |
        |                                                                  v
 +---------------------------------------------------+     +-------------------------------+
 |              Codex / ChatGPT / Claude             |     |   OpenAI / Anthropic APIs     |
 |   - Can pick which Antigravity chat to connect    |     |   - Direct API Keys           |
 |   - Or call localhost:4567/process via HTTP       |     |   - Local Claude Code CLI     |
 +---------------------------------------------------+     +-------------------------------+
```

---

## 2. All Exposed MCP Tools (Full Schema Reference)

These tools are registered in Antigravity and can also be exposed to external MCP clients (Claude Desktop, Cursor, Codex).

### 2.1 `list_conversations`
Lists past and active Antigravity conversations with previews, timestamps, and message counts.
- **Parameters**:
  - `limit` *(number, optional, default: 10)*: Number of conversations to return.
- **Returns**: Array of conversation objects:
  ```json
  [
    {
      "id": "9a1397ff-7052-4d63-a768-31cc2d3670d2",
      "isActive": true,
      "lastModified": "2026-09-27T08:49:04.605Z",
      "mtimeMs": 1790498944605.4958,
      "messageCount": 7771,
      "preview": "<USER_REQUEST> read these links for global affect on Antigravity </USER_REQUEST>"
    }
  ]
  ```

### 2.2 `select_conversation`
Switches the active default Antigravity conversation context used for subsequent queries.
- **Parameters**:
  - `conversationId` *(string, required)*: The target conversation UUID (e.g. `81b3a1d6-559a-4645-9f6f-5175cacb5248`).
- **Returns**: Confirmation object with the newly selected conversation ID.

### 2.3 `ask_antigravity`
Executes a prompt against the Antigravity engine with full workspace context and returns the processed response.
- **Parameters**:
  - `prompt` *(string, required)*: The instruction, code question, or task to run.
  - `conversationId` *(string, optional)*: Specific conversation UUID to draw chat history from (defaults to active chat).
  - `includeChatHistory` *(boolean, optional, default: true)*: Prepend recent chat turns from the specified conversation.
  - `model` *(string, optional)*: Specific model to run under `agy` (e.g. `gemini-3.8-flash`).
  - `effort` *(string, optional)*: Reasoning effort (`low`, `medium`, `high`, `max`).
- **Returns**: Text output produced by Antigravity.

### 2.4 `review_with_claude`
Sends a draft story, social post, or code block to Claude for adversarial peer review.
- **Parameters**:
  - `draft` *(string, required)*: The content to review.
  - `reviewCriteria` *(string, optional)*: Criteria to evaluate against (e.g. *Anti-AI Clichés*, *Direct Statement Rule*, *Edge Cases*).
  - `role` *(string, optional, default: "Senior Editorial & Technical Reviewer")*: Reviewer persona.
  - `apiKey` *(string, optional)*: Override Anthropic API key.
- **Returns**: Claude's critique, identifying deletions, rephrasings, and strengths.

### 2.5 `ask_claude`
Direct query to Claude via the local `claude.exe` CLI or the Anthropic Messages API.
- **Parameters**:
  - `prompt` *(string, required)*: Prompt text.
  - `systemPrompt` *(string, optional)*: System instructions.
  - `model` *(string, optional, default: "sonnet")*: Model identifier (`sonnet`, `opus`, `claude-3-7-sonnet-20250219`).
  - `apiKey` *(string, optional)*: Anthropic API key override.

### 2.6 `ask_chatgpt`
Direct query to OpenAI models.
- **Parameters**:
  - `prompt` *(string, required)*: Prompt text.
  - `systemPrompt` *(string, optional)*: System instructions.
  - `model` *(string, optional, default: "gpt-4o")*: OpenAI model (`gpt-4o`, `o3-mini`).
  - `apiKey` *(string, optional)*: OpenAI API key (reads `OPENAI_API_KEY` from env if omitted).

### 2.7 `get_chat_transcript`
Extracts raw recent turns from any Antigravity conversation transcript.
- **Parameters**:
  - `conversationId` *(string, optional)*: Target conversation UUID (defaults to active chat).
  - `turns` *(number, optional, default: 5)*: Number of recent turns to retrieve.

### 2.8 `check_peer_inbox`
Checks for asynchronous messages, reviews, or responses delivered to the conversation inbox (`peer_inbox/`).
- **Parameters**:
  - `conversationId` *(string, optional)*: Target conversation UUID.
  - `clearAfterRead` *(boolean, optional, default: false)*: Automatically delete read messages.

---

## 3. Local HTTP Bridge Endpoints (`http://127.0.0.1:4567`)

The server runs an internal HTTP daemon on port `4567` for scripts, cURL, webhooks, or browser automation.

| Endpoint | Method | Request Body / Query Params | Description |
| :--- | :---: | :--- | :--- |
| `/` | `GET` | None | Returns daemon status, active conversation ID, and route map. |
| `/conversations` | `GET` | `?limit=15` | Lists all Antigravity conversations with previews and timestamps. |
| `/select-conversation` | `POST` | `{"conversationId": "..."}` | Changes the active conversation target. |
| `/process` (or `/query`) | `POST` | `{"prompt": "...", "conversationId": "...", "includeChatHistory": true}` | **Core execution endpoint**: Runs prompt through Antigravity engine and returns answer. |
| `/context` | `GET` | `?conversationId=...&turns=5` | Retrieves recent chat transcript turns in plain text format. |
| `/message` | `POST` | `{"conversationId": "...", "sender": "Claude", "content": "..."}` | Pushes an asynchronous message into the queue file on disk. |

---

## 4. End-to-End Usage Examples

### Example A: ChatGPT / Codex Queries Antigravity via cURL / HTTP
```bash
curl -X POST http://127.0.0.1:4567/process \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Verify if social media automation scripts are currently in dry-run mode in server/src/routes/admin-linkedin.js",
    "conversationId": "9a1397ff-7052-4d63-a768-31cc2d3670d2"
  }'
```
**Response from Antigravity**:
```json
{
  "success": true,
  "conversationId": "9a1397ff-7052-4d63-a768-31cc2d3670d2",
  "text": "Confirmed: In server/src/routes/admin-linkedin.js, all LinkedIn publishing scripts strictly enforce --dry-run invariants.",
  "raw": "..."
}
```

---

### Example B: Switching Conversations
```bash
# 1. Check all available conversations
curl http://127.0.0.1:4567/conversations

# 2. Select the WhatsApp bot conversation
curl -X POST http://127.0.0.1:4567/select-conversation \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "81b3a1d6-559a-4645-9f6f-5175cacb5248"}'
```

---

### Example C: Using `ai-peer-bridge` in External MCP Clients
To use this inside **Claude Desktop**, **Cursor**, or **Codex**, add this block to their MCP configuration file:

```json
{
  "mcpServers": {
    "antigravity-peer-bridge": {
      "command": "node",
      "args": [
        "d:\\VibeCode\\WritOn-PowerUp\\scripts\\mcp-ai-peer-bridge\\index.mjs"
      ]
    }
  }
}
```

---

## 5. Storage & File System Paths

- **MCP Server Script**: `d:\VibeCode\WritOn-PowerUp\scripts\mcp-ai-peer-bridge\index.mjs`
- **Global Config**: `C:\Users\Kumar\.gemini\config\mcp_config.json`
- **Brain Directory (All Conversations)**: `C:\Users\Kumar\.gemini\antigravity\brain\`
- **Transcripts**: `C:\Users\Kumar\.gemini\antigravity\brain\<conversationId>\.system_generated\logs\transcript.jsonl`
- **Inboxes**: `C:\Users\Kumar\.gemini\antigravity\brain\<conversationId>\peer_inbox\`
- **Antigravity CLI Binary (`agy`)**: `C:\Users\Kumar\AppData\Local\agy\bin\agy.exe`
- **Claude Code CLI Binary**: `C:\Users\Kumar\.local\bin\claude.exe`
