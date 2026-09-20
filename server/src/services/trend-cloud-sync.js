/**
 * WritOn Trend Intelligence — Postgres -> GCP Durable Replication Service
 */
import { pool } from '../db/pool.js';
import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';

export const PROJECT_ID = 'writon-app-2020';
export const LOCATION = 'asia-south1';
export const BUCKET = 'writon-app-2020-media-staging';
export const DATASET = 'trend_intelligence';
export const STAGE_DATASET = 'trend_intelligence_stage';

const bigquery = new BigQuery({ projectId: PROJECT_ID });
const storage = new Storage({ projectId: PROJECT_ID });

export const TABLES = ['trend_reports', 'trend_signals', 'trend_signal_snapshots', 'trend_opportunities'];
export const BACKOFF_SCHEDULE_MS = [0, 60000, 300000, 900000, 3600000, 21600000];
export const MAX_ATTEMPTS_BEFORE_FAILED = 10;

export const MERGE_KEYS = {
  trend_reports: ['report_id'],
  trend_signals: ['signal_id'],
  trend_signal_snapshots: ['signal_id', 'report_id'],
  trend_opportunities: ['opportunity_id'],
};

export const TABLE_COLUMNS = {
  trend_reports: ['report_id', 'external_run_id', 'observed_at', 'report_date', 'region', 'source', 'run_type', 'schema_version', 'payload_hash', 'total_trends', 'processing_status', 'gcs_uri', 'processed_at', 'created_at'],
  trend_signals: ['signal_id', 'slug', 'canonical_topic', 'category', 'aliases', 'normalized_keywords', 'platforms', 'source_status', 'computed_status', 'momentum', 'latest_score', 'peak_score', 'score_delta', 'velocity_per_day', 'writon_relevance', 'novelty_score', 'source_confidence', 'computed_evidence_confidence', 'sensitivity_class', 'detection_count', 'first_detected_at', 'last_detected_at'],
  trend_signal_snapshots: ['snapshot_id', 'signal_id', 'report_id', 'snapshot_date', 'observed_at', 'rank', 'score', 'source_status', 'computed_status', 'momentum', 'score_delta', 'elapsed_hours', 'velocity_per_day', 'source_confidence', 'computed_evidence_confidence', 'why_trending', 'content_opportunity', 'recommended_angles', 'keywords', 'sources', 'urgency', 'created_at'],
  trend_opportunities: ['opportunity_id', 'signal_id', 'report_id', 'opportunity_score', 'priority_score', 'writon_relevance', 'novelty_score', 'source_confidence', 'computed_evidence_confidence', 'sensitivity_class', 'qualification_status', 'rejection_reason', 'candidate_personas', 'recommended_angles', 'sources', 'evaluated_at', 'created_at']
};

export function needsTable(row, table) {
  const dirty = row.dirty_tables ?? [];
  if (dirty.length > 0) return dirty.includes(table);
  return row.bigquery_status !== 'synced';
}

export function updateSetClause(table) {
  const nonKeyColumns = TABLE_COLUMNS[table].filter(col => !MERGE_KEYS[table].includes(col));
  return nonKeyColumns.map(col => 'T.' + col + ' = S.' + col).join(', ');
}

export async function runSyncTick({ limit = 25 } = {}) {
  await resetStaleProcessingRows();
  const claimed = await claimPendingRows(limit);
  if (claimed.length === 0) return { processed: 0 };
  const outcome = await processBatch(claimed);
  await finalizeOutboxRows(claimed, outcome.perReportResult);
  return { processed: claimed.length, tableErrors: outcome.tableErrors };
}

export async function resetStaleProcessingRows() {
  await pool.query(
    `UPDATE public.trend_cloud_sync_outbox SET status = 'pending', locked_at = NULL, locked_by = NULL WHERE status = 'processing' AND locked_at < NOW() - INTERVAL '30 minutes'`
  );
}

export async function claimPendingRows(limit) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM public.trend_cloud_sync_outbox WHERE status IN ('pending', 'partial') AND next_attempt_at <= NOW() ORDER BY next_attempt_at ASC LIMIT $1 FOR UPDATE SKIP LOCKED`,
      [limit]
    );
    if (rows.length > 0) {
      await client.query(
        `UPDATE public.trend_cloud_sync_outbox SET status = 'processing', locked_at = NOW(), locked_by = $1 WHERE report_id = ANY($2::uuid[])`,
        [process.env.WORKER_ID ?? process.env.HOSTNAME ?? 'worker', rows.map(r => r.report_id)]
      );
    }
    await client.query('COMMIT');
    return rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function processBatch(outboxRows) {
  const batchId = randomUUID().replace(/[^a-zA-Z0-9]/g, '_');
  const perReportResult = new Map(
    outboxRows.map(r => [r.report_id, { claimedRevision: r.sync_revision, bigqueryTables: {} }])
  );
  const reportIds = outboxRows.map(r => r.report_id);
  const { rows: reports } = await pool.query(
    `SELECT * FROM public.trend_reports WHERE id = ANY($1::uuid[])`,
    [reportIds]
  );
  const reportMap = new Map(reports.map(r => [r.id, r]));
  await Promise.all(
    outboxRows.map(async (row) => {
      if (row.gcs_status === 'synced') {
        perReportResult.get(row.report_id).gcs = 'synced';
        return;
      }
      const reportRecord = reportMap.get(row.report_id);
      if (!reportRecord) {
        perReportResult.get(row.report_id).gcs = 'failed';
        perReportResult.get(row.report_id).gcsError = 'Report record not found in DB: ' + row.report_id;
        return;
      }
      try {
        await archiveReportToGCS(reportRecord);
        perReportResult.get(row.report_id).gcs = 'synced';
      } catch (err) {
        perReportResult.get(row.report_id).gcs = 'failed';
        perReportResult.get(row.report_id).gcsError = err.message;
      }
    })
  );
  const tableErrors = {};
  for (const table of TABLES) {
    const reportsNeedingTable = outboxRows.filter(row => needsTable(row, table));
    if (reportsNeedingTable.length === 0) continue;
    const stagingTableName = table + '__' + batchId;
    let gcsUri = null;
    try {
      const neededReportIds = reportsNeedingTable.map(r => r.report_id);
      let rowsForTable = await fetchRowsForTable(table, neededReportIds);
      rowsForTable = deduplicateRows(table, rowsForTable);
      if (rowsForTable.length === 0) {
        for (const row of reportsNeedingTable) perReportResult.get(row.report_id).bigqueryTables[table] = 'synced';
        continue;
      }
      gcsUri = await writeNdjsonBatch(batchId, table, rowsForTable);
      await loadIntoStaging(table, stagingTableName, gcsUri);
      await mergeStagingIntoAnalytics(table, stagingTableName);
      for (const row of reportsNeedingTable) perReportResult.get(row.report_id).bigqueryTables[table] = 'synced';
    } catch (err) {
      tableErrors[table] = err.message;
      for (const row of reportsNeedingTable) {
        perReportResult.get(row.report_id).bigqueryTables[table] = 'failed';
        perReportResult.get(row.report_id).bigqueryError = err.message;
      }
    } finally {
      if (gcsUri) await cleanupBatchFile(gcsUri).catch(() => {});
      await dropStagingTable(stagingTableName).catch(() => {});
    }
  }
  return { perReportResult, tableErrors };
}

export function deduplicateRows(table, rows) {
  const keys = MERGE_KEYS[table];
  const map = new Map();
  for (const row of rows) {
    const compositeKey = keys.map(k => String(row[k])).join('::');
    if (!map.has(compositeKey)) {
      map.set(compositeKey, row);
    } else {
      const existing = map.get(compositeKey);
      const existingTime = new Date(existing.last_detected_at || existing.observed_at || existing.created_at || 0).getTime();
      const rowTime = new Date(row.last_detected_at || row.observed_at || row.created_at || 0).getTime();
      if (rowTime >= existingTime) map.set(compositeKey, row);
    }
  }
  return Array.from(map.values());
}

export async function finalizeOutboxRows(outboxRows, perReportResult) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of outboxRows) {
      const result = perReportResult.get(row.report_id) ?? { bigqueryTables: {} };
      const bqTableResults = result.bigqueryTables || {};
      const requiredTables = row.dirty_tables?.length > 0 ? row.dirty_tables : TABLES;
      const anyBqFailed = requiredTables.some(t => bqTableResults[t] === 'failed');
      const allBqSynced = requiredTables.every(t => bqTableResults[t] === 'synced') || (row.bigquery_status === 'synced' && !anyBqFailed);
      const gcsStatus = result.gcs ?? row.gcs_status;
      const bqStatus = allBqSynced ? 'synced' : (anyBqFailed ? 'failed' : (row.bigquery_status || 'pending'));
      const bothSynced = gcsStatus === 'synced' && bqStatus === 'synced';
      const eitherFailed = gcsStatus === 'failed' || bqStatus === 'failed';
      const attemptCount = row.attempt_count + 1;
      const backoffMs = BACKOFF_SCHEDULE_MS[Math.min(attemptCount, BACKOFF_SCHEDULE_MS.length - 1)];
      const lastError = result.gcsError ?? result.bigqueryError ?? null;
      const { rows: currentRows } = await client.query(
        `SELECT sync_revision, dirty_tables FROM public.trend_cloud_sync_outbox WHERE report_id = $1`,
        [row.report_id]
      );
      const currentRev = currentRows.length > 0 ? Number(currentRows[0].sync_revision) : Number(row.sync_revision);
      const claimedRev = Number(result.claimedRevision ?? row.sync_revision);
      let overallStatus;
      let nextDirtyTables = currentRows[0]?.dirty_tables ?? row.dirty_tables ?? [];
      if (currentRev > claimedRev) {
        overallStatus = 'pending';
      } else if (bothSynced) {
        overallStatus = 'synced';
        nextDirtyTables = [];
      } else if (eitherFailed) {
        overallStatus = attemptCount >= MAX_ATTEMPTS_BEFORE_FAILED ? 'failed' : 'partial';
        // Only keep tables that actually failed or are still pending as dirty
        nextDirtyTables = requiredTables.filter(t => bqTableResults[t] !== 'synced');
      } else {
        overallStatus = 'processing';
      }
      await client.query(
        `UPDATE public.trend_cloud_sync_outbox
         SET status = $1,
             gcs_status = $2,
             bigquery_status = $3,
             attempt_count = $4,
             next_attempt_at = NOW() + ($5 || ' milliseconds')::interval,
             locked_at = NULL,
             locked_by = NULL,
             last_error = $6,
             gcs_synced_at = CASE WHEN $2 = 'synced' AND gcs_synced_at IS NULL THEN NOW() ELSE gcs_synced_at END,
             bigquery_synced_at = CASE WHEN $3 = 'synced' THEN NOW() ELSE bigquery_synced_at END,
             synced_at = CASE WHEN $1 = 'synced' THEN NOW() ELSE synced_at END,
             dirty_tables = $7
         WHERE report_id = $8`,
        [overallStatus, gcsStatus, bqStatus, attemptCount, backoffMs, lastError, nextDirtyTables, row.report_id]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function archiveReportToGCS(reportRecord) {
  const payload = await fetchReportPayload(reportRecord.id);
  const dateStr = reportRecord.report_date ? new Date(reportRecord.report_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const datePath = dateStr.replaceAll('-', '/');
  const objectPath = `spark-trends/${datePath}/${reportRecord.id}.json`;
  const file = storage.bucket(BUCKET).file(objectPath);
  try {
    await file.save(JSON.stringify(payload, null, 2), {
      resumable: false,
      contentType: 'application/json',
      metadata: { metadata: { payloadHash: reportRecord.payload_hash, externalRunId: reportRecord.external_run_id || '', reportId: reportRecord.id } },
      preconditionOpts: { ifGenerationMatch: 0 }
    });
  } catch (err) {
    if (err.code === 412) {
      const [metadata] = await file.getMetadata();
      const storedHash = metadata.metadata?.payloadHash;
      if (storedHash && storedHash !== reportRecord.payload_hash) {
        throw new Error(`GCS Replication Integrity Error: Object ${objectPath} exists with payloadHash ${storedHash}, expected ${reportRecord.payload_hash}`);
      }
      return;
    }
    throw err;
  }
}

export async function writeNdjsonBatch(batchId, table, rows) {
  const ndjson = rows.map(r => JSON.stringify(r)).join('\n');
  const objectPath = `spark-trends/_bq_batches/${batchId}/${table}.ndjson`;
  const file = storage.bucket(BUCKET).file(objectPath);
  await file.save(ndjson, { resumable: false, contentType: 'application/x-ndjson' });
  return `gs://${BUCKET}/${objectPath}`;
}

export async function loadIntoStaging(table, stagingTableName, gcsUri) {
  // Fetch destination table metadata so staging table inherits the exact schema, types, and nullability
  const [destMeta] = await bigquery
    .dataset(DATASET, { location: LOCATION })
    .table(table)
    .getMetadata();

  const objectPath = gcsUri.replace(`gs://${BUCKET}/`, '');
  const storageFile = storage.bucket(BUCKET).file(objectPath);

  const [jobOrMetadata] = await bigquery
    .dataset(STAGE_DATASET, { location: LOCATION })
    .table(stagingTableName)
    .load(storageFile, {
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      writeDisposition: 'WRITE_TRUNCATE',
      schema: destMeta.schema,
      ignoreUnknownValues: true
    });
  const metadata = typeof jobOrMetadata?.getMetadata === 'function'
    ? (await jobOrMetadata.getMetadata())[0]
    : jobOrMetadata;
  if (metadata?.status?.errorResult) {
    throw new Error(`BigQuery load failed for ${stagingTableName}: ${metadata.status.errorResult.message}`);
  }
}

export async function mergeStagingIntoAnalytics(table, stagingTableName) {
  const keys = MERGE_KEYS[table];
  const onClause = keys.map(k => `T.${k} = S.${k}`).join(' AND ');
  const updateClause = updateSetClause(table);
  const query = `MERGE \`${PROJECT_ID}.${DATASET}.${table}\` T USING \`${PROJECT_ID}.${STAGE_DATASET}.${stagingTableName}\` S ON ${onClause} WHEN MATCHED THEN UPDATE SET ${updateClause} WHEN NOT MATCHED THEN INSERT ROW;`;
  await bigquery.query({ query, location: LOCATION });
}

export async function dropStagingTable(stagingTableName) {
  await bigquery.dataset(STAGE_DATASET, { location: LOCATION }).table(stagingTableName).delete({ ignoreNotFound: true });
}

export async function cleanupBatchFile(gcsUri) {
  const path = gcsUri.replace(`gs://${BUCKET}/`, '');
  await storage.bucket(BUCKET).file(path).delete({ ignoreNotFound: true }).catch(() => {});
}

export async function fetchReportPayload(reportId) {
  const { rows: reportRows } = await pool.query(
    `SELECT * FROM public.trend_reports WHERE id = $1`,
    [reportId]
  );
  if (reportRows.length === 0) throw new Error(`Trend report not found: ${reportId}`);
  const { rows: snapshots } = await pool.query(
    `SELECT * FROM public.trend_signal_snapshots WHERE report_id = $1 ORDER BY rank ASC`,
    [reportId]
  );
  const signalIds = snapshots.map(s => s.signal_id);
  const { rows: signals } = signalIds.length > 0
    ? await pool.query(`SELECT * FROM public.trend_signals WHERE id = ANY($1::uuid[])`, [signalIds])
    : { rows: [] };
  const { rows: opportunities } = await pool.query(
    `SELECT * FROM public.trend_opportunities WHERE report_id = $1`,
    [reportId]
  );
  return {
    archiveVersion: '1.0.0',
    report: reportRows[0],
    rawPayload: reportRows[0].raw_payload,
    signals,
    snapshots,
    opportunities
  };
}

export async function fetchRowsForTable(table, reportIds) {
  if (reportIds.length === 0) return [];
  switch (table) {
    case 'trend_reports': {
      const { rows } = await pool.query(
        `SELECT id as report_id, external_run_id, observed_at::text, report_date::text, region, source, run_type, schema_version, payload_hash, total_trends, processing_status, ('gs://${BUCKET}/spark-trends/' || to_char(report_date, 'YYYY/MM/DD') || '/' || id || '.json') as gcs_uri, processed_at::text, created_at::text FROM public.trend_reports WHERE id = ANY($1::uuid[])`,
        [reportIds]
      );
      return rows;
    }
    case 'trend_signals': {
      const { rows } = await pool.query(
        `SELECT DISTINCT s.id as signal_id, s.slug, s.canonical_topic, s.category, s.aliases, s.normalized_keywords, s.platforms, s.source_status, s.computed_status, s.momentum, s.latest_score, s.peak_score, s.score_delta, s.velocity_per_day::float8 as velocity_per_day, s.writon_relevance, s.novelty_score, s.source_confidence::float8 as source_confidence, s.computed_evidence_confidence::float8 as computed_evidence_confidence, s.sensitivity_class, s.detection_count, s.first_detected_at::text, s.last_detected_at::text FROM public.trend_signals s JOIN public.trend_signal_snapshots ss ON ss.signal_id = s.id WHERE ss.report_id = ANY($1::uuid[])`,
        [reportIds]
      );
      return rows;
    }
    case 'trend_signal_snapshots': {
      const { rows } = await pool.query(
        `SELECT id as snapshot_id, signal_id, report_id, snapshot_date::text, observed_at::text, rank, score, source_status, computed_status, momentum, score_delta, elapsed_hours::float8 as elapsed_hours, velocity_per_day::float8 as velocity_per_day, source_confidence::float8 as source_confidence, computed_evidence_confidence::float8 as computed_evidence_confidence, why_trending, content_opportunity, recommended_angles::text, keywords, sources::text, urgency, created_at::text FROM public.trend_signal_snapshots WHERE report_id = ANY($1::uuid[])`,
        [reportIds]
      );
      return rows;
    }
    case 'trend_opportunities': {
      const { rows } = await pool.query(
        `SELECT id as opportunity_id, signal_id, report_id, opportunity_score, priority_score, writon_relevance, novelty_score, source_confidence::float8 as source_confidence, computed_evidence_confidence::float8 as computed_evidence_confidence, sensitivity_class, qualification_status, rejection_reason, candidate_personas::text, recommended_angles::text, sources::text, evaluated_at::text, created_at::text FROM public.trend_opportunities WHERE report_id = ANY($1::uuid[])`,
        [reportIds]
      );
      return rows;
    }
    default:
      throw new Error(`Unknown table: ${table}`);
  }
}

