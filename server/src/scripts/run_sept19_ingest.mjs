import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { pool } from '../db/pool.js';
import { ingestTrendReport, sparkPayloadSchema } from '../services/trend-intelligence-service.js';

async function main() {
  try {
    const rawText = await readFile('./server/staging/trend_report_20260919.json', 'utf8');
    const raw = JSON.parse(rawText);
    console.log('[1/3] Parsing & validating Spark payload...');
    const validated = sparkPayloadSchema.parse(raw);
    console.log(`[Validation PASSED] ${validated.trends.length} trends validated.`);

    console.log('[2/3] Ingesting into production database...');
    const result = await ingestTrendReport(pool, validated);
    console.log('[Ingestion Result]');
    console.log(JSON.stringify(result, null, 2));

    console.log('[3/3] Inspecting newly created editorial ideas...');
    const { rows: ideas } = await pool.query(`
      SELECT id, proposed_title, genre, target_author_pen_name, trend_score, status
      FROM public.editorial_ideas_backlog 
      ORDER BY created_at DESC 
      LIMIT 4
    `);
    console.table(ideas);
  } catch (err) {
    console.error('[Ingest Error]:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
