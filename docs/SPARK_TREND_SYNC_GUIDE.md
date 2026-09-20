# Gemini Spark Daily Trend Research & WritOn Sync Protocol

## Purpose & Operating Model
Gemini Spark serves as WritOn's **external research radar**. Spark gathers real-time cultural and search queries, cross-platform conversations, and breaking domain developments, structuring them into a ranked, evidence-backed intelligence package.

**Core Invariant**:
- **Spark discovers; WritOn verifies, remembers, qualifies, and controls publication.**
- Spark **never** directly generates or publishes stories.
- All trends flow through WritOn's **Editorial Gate & Airlock** (`public.trend_opportunities`) before anything reaches the creative ideas backlog.

---

## Daily Workflow & Command

### Production Ingestion Bridge & Command

Gemini Spark saves its Schema 1.0.0 output (e.g. `report.json`) and pipes it through the production bridge:

```bash
# File input
node server/src/scripts/sync-spark-trend-report.mjs --input=report.json --target=https://writon.cc

# Or via stdin
cat report.json | node server/src/scripts/sync-spark-trend-report.mjs --target=https://writon.cc

# Dry run verification without transmission
node server/src/scripts/sync-spark-trend-report.mjs --input=report.json --dry-run
```

### Destination Endpoints
- Primary: `https://writon.cc/api/v1/trends/ingest`
- Backward-Compatible Alias: `https://writon.cc/api/trends/ingest`

### Authentication
Require the dedicated ingest secret via standard Bearer token:
```http
Authorization: Bearer <TREND_INGEST_SECRET>
```
*(Fails immediately if `TREND_INGEST_SECRET` is missing; no hardcoded fallbacks).*

---

## JSON Payload Specification (Schema Version 1.0.0)

```json
{
  "schemaVersion": "1.0.0",
  "externalRunId": "spark-daily-2026-09-18-01",
  "observedAt": "2026-09-18T08:30:00+05:30",
  "date": "2026-09-18",
  "region": "India",
  "source": "gemini-trend-research",
  "runType": "daily",
  "trends": [
    {
      "rank": 1,
      "topic": "AI agents for writers",
      "category": "tech",
      "priorityScore": 88,
      "sourceStatus": "BREAKOUT",
      "momentum": "VERY_HIGH",
      "sourceConfidence": 0.92,
      "urgency": "ACT_NOW",
      "platforms": ["Google", "X", "Reddit"],
      "keywords": ["ai agents", "fiction writing", "autonomous research", "longform prose"],
      "longTailKeywords": ["how writers use autonomous agents", "ai editor vs writing assistant"],
      "whyTrending": "Open-source release of author-focused agent frameworks sparked broad debates on craft and tooling.",
      "contentOpportunity": "An essay on the difference between delegation and abdication in the writing craft.",
      "recommendedAngles": [
        "Why the blank page still matters when agents can draft",
        "The architecture of human-directed creative orchestration",
        "How Indian essayists are quietly integrating research agents"
      ],
      "sources": [
        {
          "platform": "Google Trends",
          "url": "https://trends.google.com/trends/explore?q=ai+agents+writing",
          "title": "Google Trends: AI Agents Writing (Breakout +450%)",
          "observedAt": "2026-09-18T08:15:00+05:30",
          "signalType": "OBSERVED"
        },
        {
          "platform": "X",
          "url": "https://x.com/search?q=ai%20writing%20agents",
          "title": "Discussion thread on author workflow automation",
          "observedAt": "2026-09-18T08:20:00+05:30",
          "signalType": "OBSERVED"
        },
        {
          "platform": "The Verge",
          "url": "https://theverge.com/tech/writing-agents-creative-tools",
          "title": "The New Generation of Creative Agents",
          "observedAt": "2026-09-18T07:45:00+05:30",
          "signalType": "OBSERVED"
        }
      ],
      "urgency": "ACT_NOW"
    }
  ]
}
```

---

## Response Contract & Status Codes

### Successful Ingestion (`200 OK`)
```json
{
  "success": true,
  "reportId": "8f3b145a-67a8-4c12-9c12-32ba0b1a0391",
  "runId": "4c9429e2-63b1-4195-a26b-f41e97d1952a",
  "ingestion": {
    "received": 18,
    "normalized": 16,
    "merged": 2
  },
  "editorialGate": {
    "qualified": 6,
    "watchlisted": 8,
    "rejected": 4
  },
  "backlog": {
    "ideasCreated": 4,
    "duplicatesPrevented": 1,
    "cooldownBlocked": 1
  }
}
```

### In-Flight Processing (`202 Accepted`)
Returned if an identical run is currently being processed by another worker:
```json
{
  "success": true,
  "reportId": "8f3b145a-67a8-4c12-9c12-32ba0b1a0391",
  "runId": "4c9429e2-63b1-4195-a26b-f41e97d1952a",
  "message": "Trend report is currently being processed.",
  "processingStatus": "processing"
}
```

### Run Conflict (`409 Conflict`)
Returned if `externalRunId` was already received with a *different* payload hash:
```json
{
  "error": "Conflict: external_run_id 'spark-daily-2026-09-18-01' already exists with a different payload."
}
```
