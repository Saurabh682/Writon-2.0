#!/usr/bin/env node
/**
 * Standalone Reddit Publisher Agent
 * Usage:
 *   node scripts/reddit_publisher.mjs --subreddit=writing --title="Your Title" --body="Your Post" [--dry-run]
 *   node scripts/reddit_publisher.mjs --day=1 [--dry-run]
 */

import { RedditClient } from '../server/src/services/reddit-client.js';
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
  const client = new RedditClient({ log: console });

  console.log('🤖 Starting Reddit Publisher Agent...');

  let title = options.title;
  let text = options.body || options.text;
  let url = options.url || null;
  let subreddit = options.subreddit || process.env.REDDIT_DEFAULT_SUBREDDIT || 'writon';
  let kind = options.kind || (url ? 'link' : 'self');

  // If a campaign day is provided, load the campaign delivery payload
  if (options.day) {
    const day = parseInt(options.day, 10);
    const payload = await getDailyCampaignPayload(day);
    title = `${payload.theme} — ${payload.hook}`;
    text = `${payload.captions.en}\n\n---\n*Read and publish on WritOn:* [${payload.shortlink}](${payload.shortlink})`;
    console.log(`📦 Loaded Day ${day} campaign package: "${payload.theme}"`);
  }

  if (!title) {
    console.error('❌ Error: Missing --title or --day argument.');
    process.exit(1);
  }

  console.log('\n--- Post Preview ---');
  console.log(`Subreddit: r/${subreddit}`);
  console.log(`Title: ${title}`);
  console.log(`Kind: ${kind}`);
  console.log(`Body:\n${text || url}\n---------------------\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN ENABLED: Skipping live submission to Reddit.');
    process.exit(0);
  }

  if (!client.isConfigured()) {
    console.error('❌ Reddit credentials missing in environment (.env).');
    console.error('Please configure REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, and REDDIT_PASSWORD.');
    process.exit(1);
  }

  try {
    const outcome = await client.submitPost({
      subreddit,
      title,
      text,
      url,
      kind,
    });

    console.log(`✅ Post published successfully!`);
    console.log(`Fullname: ${outcome.name}`);
    console.log(`URL: ${outcome.url}`);

    try {
      const historyPath = path.resolve('campaign/published-history.json');
      let history = {};
      try { history = JSON.parse(await fs.readFile(historyPath, 'utf8')); } catch {}
      if (!history.reddit) history.reddit = {};
      history.reddit[subreddit] = { fullname: outcome.name, url: outcome.url, publishedAt: new Date().toISOString() };
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
