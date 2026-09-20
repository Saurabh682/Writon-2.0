---
name: human-voice-linter
description: >
  Evaluates and audits any candidate writing (social media posts, stories, essays, craft truths, prompts, notifications) against WritOn's empirical database of 152,348 human words (623 human posts, 797 comments).
  Calculates a Humanity Score (0-100), detects 35+ forbidden synthetic AI clichés (delve, tapestry, beacon, testament, realm), enforces burstiness and sentence variance (> 7.0 stdDev), and flags throat-clearing preambles and summary endings.
  Use whenever writing or reviewing text for WritOn, evaluating copy, generating social posts, or whenever the user asks to "check voice", "is this human", "lint voice", "humanity score", "human-voice-linter", or "/human-voice".
argument-hint: "[--text=\"...\" | --file=\"...\"]"
license: MIT
---

# WritOn Human Voice Linter & Craft Engine

This skill evaluates candidate prose against the empirical benchmarks derived from WritOn's database of genuine human writing (`data-exports/analysis/live_db_empirical_craft_report.json`).

## Quick CLI Usage

### 1. Evaluate candidate text directly
```bash
node scripts/human_voice_linter.mjs --text="Your candidate post or essay here"
```

### 2. Evaluate a markdown draft file
```bash
node scripts/human_voice_linter.mjs --file="path/to/draft.md"
```

### 3. Machine-readable JSON output for automated pipelines
```bash
node scripts/human_voice_linter.mjs --text="Candidate text" --json
```

### 4. Re-run empirical corpus analysis on live DB
```bash
node scripts/study_human_corpus.mjs --live
```

---

## Core Benchmark Standards

| Metric | Target / Benchmark | Failure Trigger |
| :--- | :--- | :--- |
| **Humanity Score** | **≥ 80 / 100** | Score < 50 indicates robotic machine prose |
| **Burstiness Index** | **StdDev > 7.0** | StdDev < 5.0 indicates monotonous, uniform sentence lengths |
| **Median Sentence Length** | **10 – 12 words** | Sentences averaging 18+ words without variation |
| **AI Clichés** | **0 permitted** | Any occurrence of *delve, tapestry, beacon, testament, realm, crucial, landscape, unwavering, bustling, multifaceted, ever-evolving, embark, unfurl* |
| **Opening Hook** | *In media res* | Generic preambles (*"In today's fast-paced world..."*, *"Throughout history..."*) |
| **Ending Hook** | Quiet sensory detail or action | Artificial summaries (*"In conclusion..."*, *"Remember that..."*) |

---

## Reusable Service Imports

To inject the human voice rules into any generator or agent prompt:

```javascript
import { 
  getCraftVoicePrompt, 
  VOICE_ARCHETYPES, 
  detectAiTropes, 
  calculateBurstiness 
} from '../server/src/services/human-voice-prompt.js';

// Get system prompt for any of the 4 archetypes:
// SPARE, VULNERABLE, LYRICAL, ANALYTICAL
const systemPromptDirective = getCraftVoicePrompt(VOICE_ARCHETYPES.SPARE);
```

---

## Cloud & Remote Access (Accessible Anywhere)

The linter is available on the cloud and can be called from anywhere via standard HTTP or MCP:

### 1. Cloud HTTP REST API Endpoint
Send a `POST` request to WritOn's cloud API:
```bash
curl -X POST https://api.writon.cc/api/v1/spark/lint-voice \
  -H "Content-Type: application/json" \
  -d '{"text": "The tea was cold. She stood near the window with a brass cup in hand."}'
```
**JSON Response:**
```json
{
  "success": true,
  "humanityScore": 100,
  "passed": true,
  "status": "PASS",
  "stats": {
    "sentenceCount": 2,
    "meanSentenceLength": 8.0,
    "burstinessIndex": 4.0,
    "wordCount": 16,
    "tropeHits": 0
  },
  "issues": []
}
```

### 2. Gemini Spark & Claude Custom Connected App (MCP)
If you are chatting with Gemini Spark, Claude, or any MCP client:
- **MCP Tool Name:** `writon_lint_human_voice`
- **Arguments:** `{ "text": "Draft text..." }`

---

## Reference Manuals
- **The Complete Human Voice Codex**: [`campaign/HUMAN_VOICE_CODEX.md`](file:///d:/VibeCode/WritOn-PowerUp/campaign/HUMAN_VOICE_CODEX.md)
- **Live Empirical Database Report**: [`data-exports/analysis/live_db_empirical_craft_report.json`](file:///d:/VibeCode/WritOn-PowerUp/data-exports/analysis/live_db_empirical_craft_report.json)
- **Unit Tests**: `server/test/human-voice.test.js` (`npx vitest run test/human-voice.test.js`)
