#!/usr/bin/env node
/**
 * Standalone Pinterest Publisher Agent
 * Usage:
 *   node scripts/pinterest_publisher.mjs --title="Your Title" --description="Your Description" --image="path/to/card.png" [--dry-run]
 *   node scripts/pinterest_publisher.mjs --day=1 [--dry-run]
 */

import { PinterestClient } from '../server/src/services/pinterest-client.js';
import { getDailyCampaignPayload } from '../server/src/services/campaign-dispatcher.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('server/.env') });
dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value === undefined ? true : value;
    }
  }
  return options;
}

async function main() {
  const options = parseArgs();
  const dryRun = Boolean(options['dry-run'] || options.dryRun);
  const client = new PinterestClient({ log: console });

  console.log('📌 Starting Pinterest Publisher Agent...');

  let title = options.title;
  let description = options.description || options.desc || '';
  let link = options.link || options.url || 'https://writon.cc';
  let imagePath = options.image || options.imagePath || null;
  let imageUrl = options.imageUrl || null;
  let boardId = options.board || options.boardId || process.env.PINTEREST_DEFAULT_BOARD_ID || 'writon_craft_board';

  // If a campaign day is provided, load the campaign delivery payload
  if (options.day) {
    const day = parseInt(options.day, 10);
    const baseUrl = process.env.PUBLIC_API_BASE_URL || 'https://writon.cc';
    const payload = await getDailyCampaignPayload(day, baseUrl);
    title = `${payload.theme}: ${payload.hook}`.slice(0, 100);
    description = `${payload.captions.en}\n\nRead more and join the writing community on WritOn: ${payload.shortlink}\n\n#writon #writingcommunity #amwriting #storytelling #quotes`.slice(0, 800);
    link = payload.shortlink;

    const renderedAssetsDir = path.resolve('campaign/fomo-ground-floor/rendered-assets');
    const primaryAsset = payload.imageAssets?.[0];
    if (primaryAsset) {
      imagePath = path.resolve(renderedAssetsDir, primaryAsset);
    }
    console.log(`📦 Loaded Day ${day} campaign package: "${payload.theme}"`);
  }

  if (!title) {
    console.error('❌ Error: Missing --title or --day argument.');
    process.exit(1);
  }

  console.log('\n--- Pin Preview ---');
  console.log(`Target Board: ${boardId}`);
  console.log(`Title (${title.length}/100): ${title}`);
  console.log(`Link: ${link}`);
  console.log(`Image Source: ${imagePath || imageUrl || '(none specified)'}`);
  console.log(`Description (${description.length}/800):\n${description}\n-------------------\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN ENABLED: Skipping live submission to Pinterest.');
    process.exit(0);
  }

  if (!client.isConfigured()) {
    console.error('❌ Pinterest credentials missing in environment (.env).');
    console.error('Please configure PINTEREST_ACCESS_TOKEN (or PINTEREST_REFRESH_TOKEN, PINTEREST_APP_ID, PINTEREST_APP_SECRET).');
    process.exit(1);
  }

  try {
    const outcome = await client.createPin({
      boardId,
      title,
      description,
      link,
      imagePath,
      imageUrl,
    });

    console.log(`✅ Pin published successfully!`);
    console.log(`Pin ID: ${outcome.id}`);
    console.log(`URL: ${outcome.url}`);

    try {
      const historyPath = path.resolve('campaign/published-history.json');
      let history = {};
      try { history = JSON.parse(await fs.readFile(historyPath, 'utf8')); } catch {}
      if (!history.pinterest) history.pinterest = {};
      history.pinterest[outcome.id] = {
        title,
        url: outcome.url,
        boardId,
        publishedAt: new Date().toISOString(),
      };
      await fs.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf8');
      console.log(`📝 Saved to published-history.json`);
    } catch (e) {
      console.warn(`Could not save history: ${e.message}`);
    }
  } catch (err) {
    console.error(`❌ Publish failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
