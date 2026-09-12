import { readCsv } from './csv_util.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const csvPath = path.resolve('campaign/antigravity-2026-09-06-19/metrics.csv');
  const rows = await readCsv(csvPath);
  const jsonPath = path.resolve('campaign/antigravity-2026-09-06-19/metrics.json');
  await fs.writeFile(jsonPath, JSON.stringify(rows, null, 2));
  console.log('✅ Metrics JSON written to', jsonPath);
}

main().catch((err) => {
  console.error('❌ Error generating metrics JSON:', err);
  process.exit(1);
});
