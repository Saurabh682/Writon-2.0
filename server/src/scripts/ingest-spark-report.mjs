/**
 * Companion Ingest Client for Gemini Spark v2
 *
 * Takes Schema 1.0.0 Part 2 JSON from Gemini Spark and posts it to
 * WritOn Airlock (/api/v1/trends/ingest) with proper Bearer authentication.
 *
 * Credentials live here in environment variables, NEVER in model system prompts.
 */

import 'dotenv/config';

const INGEST_URL = process.env.WRITON_INGEST_URL || process.env.TREND_INGEST_URL || 'https://writon.cc/api/v1/trends/ingest';
const TOKEN = process.env.WRITON_INGEST_TOKEN || process.env.TREND_INGEST_SECRET;

export async function ingestSparkReport(part2Json, { runId } = {}) {
  if (!TOKEN) {
    throw new Error('WRITON_INGEST_TOKEN / TREND_INGEST_SECRET is not set — refusing to send an unauthenticated request.');
  }

  const resolvedRunId = runId ?? part2Json.externalRunId;
  if (!resolvedRunId) {
    throw new Error('No run ID available — the orchestrator must assign one; Spark should not invent it.');
  }

  const payload = { ...part2Json, externalRunId: resolvedRunId };

  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ingest failed: ${res.status} ${res.statusText} — ${body}`);
  }

  return res.json();
}
