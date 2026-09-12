import fs from 'node:fs/promises';

/**
 * Read a CSV file and return an array of objects.
 * Simple parser – assumes no commas inside quoted fields.
 */
export async function readCsv(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    const values = line.split(',');
    const record = {};
    headers.forEach((h, i) => {
      record[h] = values[i] !== undefined ? values[i].trim() : '';
    });
    return record;
  });
}

/**
 * Write an array of objects to a CSV file.
 * The first object's keys define the header order.
 */
export async function writeCsv(filePath, rows) {
  if (!rows || rows.length === 0) {
    await fs.writeFile(filePath, '');
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [];
  lines.push(headers.join(','));
  rows.forEach(row => {
    const line = headers.map(h => (row[h] !== undefined ? row[h] : '')).join(',');
    lines.push(line);
  });
  await fs.writeFile(filePath, lines.join('\n'));
}

/**
 * Upsert a row in an array based on a key field.
 * Mutates the provided rows array.
 */
export function upsertRow(rows, key, newRow) {
  const idx = rows.findIndex(r => r[key] === newRow[key]);
  if (idx >= 0) {
    rows[idx] = newRow;
  } else {
    rows.push(newRow);
  }
}
