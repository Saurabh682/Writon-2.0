# AI Peer Bridge MCP: Bidirectional Cross-Model Workflow

This system connects Antigravity directly to Claude, ChatGPT, and Codex for automated review loops, collaborative iteration, and bidirectional conversation sharing.

---

## 1. Architecture Overview

```
 +-----------------------------------------------------------------------------------------+
 |                                  ANTIGRAVITY ENGINE                                     |
 |                   Language Server + Workspace Context + Native CLI (agy)                |
 +-----------------------------------------------------------------------------------------+
        ^                                                                  |
        | 2. Synchronous Execution                                         | 1. Outbound Review / Prompt
        |    (agy -p "<query>" --project <id>)                            |    (MCP Stdio Tools)
        |                                                                  v
 +-----------------------------------------------------------------------------------------+
 |                              AI PEER BRIDGE (`ai-peer-bridge`)                          |
 |                         Scripts: scripts/mcp-ai-peer-bridge/index.mjs                   |
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

## 2. Dynamic Chat Picker: Pick Which Chat to Connect

You and external models (Codex, ChatGPT, Claude) can see and switch between any of your past or current Antigravity conversations.

### A. View Available Chats
- **Via MCP**: Call `list_conversations({ limit: 10 })`
- **Via HTTP**:
  ```bash
  curl http://127.0.0.1:4567/conversations
  ```
  Returns:
  ```json
  {
    "activeConversationId": "9a1397ff-7052-4d63-a768-31cc2d3670d2",
    "conversations": [
      {
        "id": "9a1397ff-7052-4d63-a768-31cc2d3670d2",
        "isActive": true,
        "preview": "MCP server development & peer review loops...",
        "messageCount": 7740,
        "lastModified": "2026-09-27T09:05:00.000Z"
      },
      {
        "id": "81b3a1d6-559a-4645-9f6f-5175cacb5248",
        "isActive": false,
        "preview": "Alpha - Whats App Bot development...",
        "messageCount": 216
      }
    ]
  }
  ```

### B. Switch Active Chat Target
- **Via MCP**: Call `select_conversation({ conversationId: "81b3a1d6-559a-4645-9f6f-5175cacb5248" })`
- **Via HTTP**:
  ```bash
  curl -X POST http://127.0.0.1:4567/select-conversation \
    -H "Content-Type: application/json" \
    -d '{"conversationId": "81b3a1d6-559a-4645-9f6f-5175cacb5248"}'
  ```

---

## 3. Inbound Processing: Codex / ChatGPT $\rightarrow$ Antigravity $\rightarrow$ Return Response

When Codex or ChatGPT queries Antigravity, it can either:
1. Target the **globally selected active chat**, OR
2. Specify an exact `conversationId` per call!

### Option A: Via MCP Tool (`ask_antigravity`)
In Codex or Claude Desktop:
```json
{
  "name": "ask_antigravity",
  "arguments": {
    "prompt": "Summarize what was decided regarding WhatsApp bot templates.",
    "conversationId": "81b3a1d6-559a-4645-9f6f-5175cacb5248",
    "includeChatHistory": true
  }
}
```
Antigravity injects the specified conversation's history, processes the query against the codebase via `agy`, and returns the processed answer back to Codex.

### Option B: Via HTTP Bridge (`POST http://localhost:4567/process`)
```bash
curl -X POST http://127.0.0.1:4567/process \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Verify if the WhatsApp bot scripts are dry-run only.",
    "conversationId": "81b3a1d6-559a-4645-9f6f-5175cacb5248"
  }'
```

---

## 4. Summary of MCP Tools

| Tool Name | Purpose |
| :--- | :--- |
| `list_conversations` | Lists past and active Antigravity conversations with previews & timestamps. |
| `select_conversation` | Sets the default active conversation ID for context sharing. |
| `ask_antigravity` | Executes a prompt against Antigravity with selected conversation context. |
| `get_chat_transcript` | Extracts conversation history from any chosen chat (`turns: 5`). |
| `review_with_claude` | Outbound editorial or technical critique from Claude. |
| `ask_claude` | Direct query to Claude (CLI or API). |
| `ask_chatgpt` | Direct query to OpenAI models (`gpt-4o`, `o3-mini`). |
| `check_peer_inbox` | Checks async inbox for responses delivered by external bots. |
