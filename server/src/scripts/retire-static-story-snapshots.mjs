import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
if (!process.env.DATABASE_URL) dotenv.config({ path: '.env' });
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const STORIES_DIR = path.join(PUBLIC_DIR, 'stories');

// Parse flags
const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const isDryRun = !isApply;

async function main() {
  console.log(`--- Story Snapshot Retirement Script ---`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (pass --apply to execute deletions)' : 'APPLY (performing actual deletions)'}`);

  // 1. Verify DB Connectivity & inventory
  console.log('Verifying PostgreSQL database connection and published story inventory...');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not configured. Aborting retirement.');
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  let publishedStories = 0;
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT count(*)::int as count FROM public.posts WHERE status = 'published' AND is_public = true`);
      publishedStories = res.rows[0]?.count || 0;
      console.log(`Database connected successfully. Found ${publishedStories} active public stories.`);
      if (publishedStories === 0) {
        throw new Error('Database returned 0 published stories. Suspect database error or misconfiguration. Refusing to delete snapshots.');
      }
    } finally {
      client.release();
    }
  } catch (dbErr) {
    await pool.end();
    throw new Error(`Database check failed: ${dbErr.message}. Aborting snapshot retirement.`);
  }
  await pool.end();

  // 2. Scan public/stories directory
  const entries = await fs.readdir(STORIES_DIR, { withFileTypes: true });

  const toDeleteFiles = [];
  const toDeleteDirs = [];
  const preservedItems = [];

  for (const entry of entries) {
    const name = entry.name;
    // Strictly preserve public reader app & static assets
    if (name === 'index.html' || name === 'share.css' || name.startsWith('.')) {
      preservedItems.push(name);
      continue;
    }

    const fullPath = path.join(STORIES_DIR, name);
    // Path validation: ensure it stays within STORIES_DIR
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(STORIES_DIR)) {
      throw new Error(`Security validation error: path ${resolved} escapes ${STORIES_DIR}`);
    }

    if (entry.isFile()) {
      if (name.endsWith('.html')) {
        toDeleteFiles.push(fullPath);
      } else {
        preservedItems.push(name);
      }
    } else if (entry.isDirectory()) {
      toDeleteDirs.push(fullPath);
    }
  }

  console.log(`\nFound:`);
  console.log(`  - Preserved items: ${preservedItems.join(', ')}`);
  console.log(`  - Snapshot HTML files to retire: ${toDeleteFiles.length}`);
  console.log(`  - Snapshot directories to retire: ${toDeleteDirs.length}`);

  if (isDryRun) {
    console.log(`\n[DRY RUN] Would delete ${toDeleteFiles.length} files and ${toDeleteDirs.length} directories.`);
    if (toDeleteFiles.length > 0) {
      console.log(`Sample files that would be deleted:`);
      toDeleteFiles.slice(0, 5).forEach(f => console.log(`  - ${path.basename(f)}`));
    }
    if (toDeleteDirs.length > 0) {
      console.log(`Sample directories that would be deleted:`);
      toDeleteDirs.slice(0, 5).forEach(d => console.log(`  - ${path.basename(d)}/`));
    }
    console.log(`\nRun with --apply to perform deletions.`);
    return;
  }

  // Perform actual deletions
  let deletedFiles = 0;
  for (const file of toDeleteFiles) {
    await fs.unlink(file);
    deletedFiles++;
  }

  let deletedDirs = 0;
  for (const dir of toDeleteDirs) {
    await fs.rm(dir, { recursive: true, force: true });
    deletedDirs++;
  }

  console.log(`\n✅ Retirement complete. Successfully removed ${deletedFiles} HTML files and ${deletedDirs} story directories.`);
  console.log(`Preserved core reader files: index.html and share.css.`);
}

main().catch((err) => {
  console.error('\n❌ Fatal error in retire-static-story-snapshots:', err.message);
  process.exit(1);
});
