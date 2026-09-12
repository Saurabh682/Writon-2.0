#!/usr/bin/env node

/**
 * Community Intelligence Scout Agent for YouTube
 *
 * Usage:
 *   node scripts/youtube_scout.mjs --keyword="creative writing prompts" --limit=5
 *   node scripts/youtube_scout.mjs --keyword="poetry craft" --json
 */

import { YouTubeClient } from '../server/src/services/youtube-client.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    keyword: 'creative writing prompts',
    limit: 5,
    json: false,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === '--json') options.json = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--keyword=')) options.keyword = arg.split('=')[1];
    else if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1], 10);
  }
  return options;
}

async function main() {
  const options = parseArgs();
  const client = new YouTubeClient();

  if (options.dryRun) {
    console.log('🧪 [DRY RUN] YouTube Scout Agent initialized.');
    console.log(`🧪 [DRY RUN] Target query: "${options.keyword}", Limit: ${options.limit}`);
    console.log('🧪 [DRY RUN] Configured for API queries:', client.isConfigured());
    return;
  }

  if (!client.isConfigured()) {
    console.error('❌ Missing YouTube credentials. Set YOUTUBE_API_KEY or OAuth credentials in .env');
    process.exit(1);
  }

  try {
    const results = await client.searchVideos({
      query: options.keyword,
      maxResults: options.limit,
    });

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    console.log(`\n🔍 YouTube Scout Results for: "${options.keyword}" (${results.length} found)\n`);
    for (const [idx, item] of results.entries()) {
      console.log(`[${idx + 1}] ${item.title}`);
      console.log(`    Channel: ${item.channelTitle}`);
      console.log(`    Published: ${item.publishedAt}`);
      console.log(`    URL: ${item.url}`);
      console.log(`    Summary: ${(item.description || '').slice(0, 100)}...`);
      console.log('─'.repeat(60));
    }
  } catch (err) {
    console.error(`❌ Scout error: ${err.message}`);
    process.exit(1);
  }
}

main();
