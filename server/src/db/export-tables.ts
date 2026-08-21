import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'writon.db');
const outputDir = path.resolve(process.cwd(), '..', 'data-exports');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const jsonDir = path.join(outputDir, 'json');
const csvDir = path.join(outputDir, 'csv');
fs.mkdirSync(jsonDir, { recursive: true });
fs.mkdirSync(csvDir, { recursive: true });

console.log(`Connecting to SQLite database at: ${dbPath}`);
const db = new Database(dbPath, { readonly: true });

// Get list of all tables (excluding sqlite internal tables)
const tables = db.prepare(`
  SELECT name, sql FROM sqlite_master
  WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%'
  ORDER BY name ASC
`).all() as { name: string; sql: string }[];

console.log(`Found ${tables.length} tables:`, tables.map(t => t.name));

function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const summary: Record<string, any> = {
  database: 'WritOn 2.0 SQLite Database',
  exportedAt: new Date().toISOString(),
  tableCount: tables.length,
  tables: {}
};

let fullSqlDump = `-- ========================================================\n-- WritOn 2.0 Database Schema & Data Dump\n-- Generated on: ${new Date().toISOString()}\n-- ========================================================\n\nPRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n\n`;

for (const table of tables) {
  const tableName = table.name;
  console.log(`Exporting table: ${tableName}...`);

  // Table info (columns)
  const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all() as any[];

  // Table rows
  const rows = db.prepare(`SELECT * FROM "${tableName}"`).all() as Record<string, any>[];

  summary.tables[tableName] = {
    rowCount: rows.length,
    columns: columns.map(c => ({
      name: c.name,
      type: c.type,
      notNull: Boolean(c.notnull),
      defaultValue: c.dflt_value,
      isPrimaryKey: Boolean(c.pk)
    })),
    createSql: table.sql
  };

  // 1. Export JSON
  const jsonFilePath = path.join(jsonDir, `${tableName}.json`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(rows, null, 2), 'utf-8');

  // 2. Export CSV
  const colNames = columns.map(c => c.name);
  let csvContent = colNames.join(',') + '\n';
  for (const row of rows) {
    const rowValues = colNames.map(col => escapeCsvValue(row[col]));
    csvContent += rowValues.join(',') + '\n';
  }
  const csvFilePath = path.join(csvDir, `${tableName}.csv`);
  fs.writeFileSync(csvFilePath, csvContent, 'utf-8');

  // 3. Append to SQL Dump
  fullSqlDump += `\n-- Table: ${tableName}\n`;
  fullSqlDump += `${table.sql};\n\n`;
  for (const row of rows) {
    const vals = colNames.map(col => {
      const v = row[col];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return v;
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    fullSqlDump += `INSERT INTO "${tableName}" (${colNames.map(c => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});\n`;
  }
}

fullSqlDump += `\nCOMMIT;\nPRAGMA foreign_keys = ON;\n`;

// Write full SQL dump
fs.writeFileSync(path.join(outputDir, 'dump.sql'), fullSqlDump, 'utf-8');

// Write Schema SQL
const schemaSql = tables.map(t => `${t.sql};`).join('\n\n');
fs.writeFileSync(path.join(outputDir, 'schema.sql'), schemaSql, 'utf-8');

// Write Summary JSON
fs.writeFileSync(path.join(outputDir, 'tables_summary.json'), JSON.stringify(summary, null, 2), 'utf-8');

// Generate Codex Markdown Documentation
let mdContent = `# WritOn Data Tables Reference for Codex

This document describes all data tables, schemas, relations, and sample data for the **WritOn 2.0** application database.

- **Export Timestamp**: \`${new Date().toISOString()}\`
- **Total Tables**: \`${tables.length}\`
- **Formats Available**:
  - \`json/<tableName>.json\` - Raw data in JSON array
  - \`csv/<tableName>.csv\` - Comma-separated values
  - \`schema.sql\` - DDL statements for all tables
  - \`dump.sql\` - Complete SQLite dump with schema + all insert statements
  - \`tables_summary.json\` - Machine-readable metadata schema

---

## 1. Table Summary

| Table | Columns | Row Count | Description |
| :--- | :--- | :--- | :--- |
`;

for (const tableName of Object.keys(summary.tables)) {
  const t = summary.tables[tableName];
  mdContent += `| \`${tableName}\` | ${t.columns.length} | ${t.rowCount} | Core ${tableName} data entity |\n`;
}

mdContent += `\n---\n\n## 2. Table Specifications\n\n`;

for (const table of tables) {
  const t = summary.tables[table.name];
  mdContent += `### \`${table.name}\`\n\n`;
  mdContent += `**Row Count**: ${t.rowCount}\n\n`;
  mdContent += `#### Columns\n\n`;
  mdContent += `| Column | Type | Nullable | Primary Key | Default |\n`;
  mdContent += `| :--- | :--- | :--- | :--- | :--- |\n`;
  for (const c of t.columns) {
    mdContent += `| \`${c.name}\` | \`${c.type}\` | ${c.notNull ? 'NO' : 'YES'} | ${c.isPrimaryKey ? 'YES' : 'NO'} | \`${c.defaultValue ?? 'null'}\` |\n`;
  }
  mdContent += `\n#### DDL Schema\n\`\`\`sql\n${table.sql};\n\`\`\`\n\n`;

  // Sample data
  const sampleRows = db.prepare(`SELECT * FROM "${table.name}" LIMIT 2`).all();
  if (sampleRows.length > 0) {
    mdContent += `#### Sample Row(s)\n\`\`\`json\n${JSON.stringify(sampleRows, null, 2)}\n\`\`\`\n\n`;
  }
}

// Write CODEX_DATA_REFERENCE.md to both outputDir and .codex/
fs.writeFileSync(path.join(outputDir, 'CODEX_DATA_REFERENCE.md'), mdContent, 'utf-8');

const codexDir = path.resolve(process.cwd(), '..', '.codex');
if (fs.existsSync(codexDir)) {
  fs.writeFileSync(path.join(codexDir, 'CODEX_DATA_REFERENCE.md'), mdContent, 'utf-8');
}

console.log(`\n Export completed successfully to ${outputDir}!`);
