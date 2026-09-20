/**
 * Production Sync Client: Gemini Spark Trend Research -> WritOn Airlock
 *
 * Responsibilities:
 * - Read Schema 1.0.0 JSON payload from --input=<file> or stdin
 * - Parse and validate payload with sparkPayloadSchema
 * - Support --dry-run (validates payload without network transmission)
 * - Require process.env.TREND_INGEST_SECRET (fails immediately if absent)
 * - Transmit via Authorization: Bearer <TREND_INGEST_SECRET> to /api/v1/trends/ingest
 * - Accurately handle HTTP 200, 202, 400, 401, 409
 * - Output structured WritOn processing summary
 *
 * Usage:
 *   node server/src/scripts/sync-spark-trend-report.mjs --input=path/to/report.json [--target=https://writon.cc] [--dry-run]
 *   cat path/to/report.json | node server/src/scripts/sync-spark-trend-report.mjs [--target=https://writon.cc] [--dry-run]
 */

import { readFile } from 'node:fs/promises';
import { sparkPayloadSchema } from '../services/trend-intelligence-service.js';

async function readAllStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function loadPayloadText(inputArg) {
  let content = null;
  if (inputArg) {
    const filePath = inputArg.split('=')[1];
    if (!filePath) {
      throw new Error('Invalid --input argument. Expected: --input=<file-path>');
    }
    content = await readFile(filePath, 'utf8');
  } else if (!process.stdin.isTTY) {
    const stdinContent = await readAllStdin();
    if (stdinContent && stdinContent.trim().length > 0) {
      content = stdinContent;
    }
  }

  if (!content) {
    throw new Error('No input provided. Supply --input=<file-path> or pipe JSON into stdin.');
  }

  // Strip UTF-8 byte order mark if present
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const inputArg = args.find(a => a.startsWith('--input='));
  const targetArg = args.find(a => a.startsWith('--target='));
  const baseUrl = targetArg ? targetArg.split('=')[1] : (process.env.TREND_INGEST_URL || 'http://localhost:3001');

  // 1. Read input
  let rawText;
  try {
    rawText = await loadPayloadText(inputArg);
  } catch (err) {
    console.error(`[Input Error] ${err.message}`);
    process.exit(1);
  }

  // 2. Parse JSON
  let rawJson;
  try {
    rawJson = JSON.parse(rawText);
  } catch (err) {
    console.error(`[JSON Parse Error] Invalid JSON payload: ${err.message}`);
    process.exit(1);
  }

  // 3. Validate against sparkPayloadSchema (Schema 1.0.0)
  const parseResult = sparkPayloadSchema.safeParse(rawJson);
  if (!parseResult.success) {
    console.error('[Validation Error] Payload does not conform to Schema 1.0.0 contract:');
    for (const issue of parseResult.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const validatedPayload = parseResult.data;
  console.log(`[Validation PASSED] Schema 1.0.0 valid (${validatedPayload.trends.length} trends, date: ${validatedPayload.date}, runId: ${validatedPayload.externalRunId || 'auto'})`);

  // 4. Handle --dry-run
  if (dryRun) {
    console.log('[DRY-RUN] Validation successful. Transmission skipped (--dry-run flag active).');
    process.exit(0);
  }

  // 5. Require TREND_INGEST_SECRET (no hardcoded fallback, no ADMIN_SECRET_KEY fallback)
  const secret = process.env.TREND_INGEST_SECRET;
  if (!secret || secret.trim().length === 0) {
    console.error('[Authentication Error] TREND_INGEST_SECRET environment variable is required.');
    process.exit(1);
  }

  // 6. Validate target URL to prevent secret exfiltration
  let parsedTargetUrl;
  try {
    parsedTargetUrl = new URL(baseUrl);
  } catch (err) {
    console.error(`[Target Error] Invalid --target URL '${baseUrl}': ${err.message}`);
    process.exit(1);
  }

  const productionHosts = new Set(['writon.cc', 'www.writon.cc', 'api.writon.cc']);
  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

  if (process.env.NODE_ENV === 'production') {
    if (parsedTargetUrl.protocol !== 'https:' || !productionHosts.has(parsedTargetUrl.hostname)) {
      console.error(`[Security Error] Refusing to send TREND_INGEST_SECRET to untrusted target in production: ${parsedTargetUrl.hostname}`);
      process.exit(1);
    }
  } else {
    // Non-production allows local hosts or production hosts (over https)
    const isLocal = localHosts.has(parsedTargetUrl.hostname);
    const isProdSecure = parsedTargetUrl.protocol === 'https:' && productionHosts.has(parsedTargetUrl.hostname);
    if (!isLocal && !isProdSecure) {
      console.error(`[Security Error] Refusing to send TREND_INGEST_SECRET to untrusted target: ${parsedTargetUrl.hostname}`);
      process.exit(1);
    }
  }

  // 7. Transmit canonical validated payload to /api/v1/trends/ingest
  const ingestUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/trends/ingest`;
  console.log(`[Sync] POSTing canonical validated payload to: ${ingestUrl}`);

  try {
    const res = await fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret.trim()}`
      },
      body: JSON.stringify(validatedPayload)
    });

    const responseBody = await res.json().catch(() => null);

    // 8. Accurately handle HTTP status codes
    switch (res.status) {
      case 200:
        console.log('\n[HTTP 200 OK] Trend report ingested successfully:');
        console.log(JSON.stringify(responseBody, null, 2));
        break;

      case 202:
        console.log('\n[HTTP 202 Accepted] Trend report is currently being processed by another worker:');
        console.log(`Retry-After: ${res.headers.get('retry-after') || 'unspecified'}`);
        console.log(JSON.stringify(responseBody, null, 2));
        break;

      case 400:
        console.error('\n[HTTP 400 Bad Request] Server rejected payload validation:');
        console.error(JSON.stringify(responseBody, null, 2));
        process.exit(1);

      case 401:
        console.error('\n[HTTP 401 Unauthorized] Invalid or missing TREND_INGEST_SECRET.');
        process.exit(1);

      case 409:
        console.error('\n[HTTP 409 Conflict] Run ID conflict detected on server:');
        console.error(JSON.stringify(responseBody, null, 2));
        process.exit(1);

      default:
        console.error(`\n[HTTP ${res.status} Unexpected] Ingestion failed:`);
        console.error(JSON.stringify(responseBody, null, 2));
        process.exit(1);
    }
  } catch (err) {
    console.error(`[Network Error] Failed to connect to WritOn server at ${ingestUrl}: ${err.message}`);
    process.exit(1);
  }
}

main();
