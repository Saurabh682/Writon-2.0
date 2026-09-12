#!/usr/bin/env node
/**
 * Standalone Reddit Community & Trend Scout Agent
 * Usage:
 *   node scripts/reddit_scout.mjs --subreddit=writing [--limit=15]
 *   node scripts/reddit_scout.mjs --subreddits=writing,writingprompts,selfpublish
 *   node scripts/reddit_scout.mjs --subreddit=writing --keyword=feedback --json
 */

import { RedditClient } from '../server/src/services/reddit-client.js';
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
  const subredditsArg = options.subreddits || options.subreddit || 'writing,writingprompts,selfpublish';
  const subreddits = subredditsArg.split(',').map((s) => s.trim().replace(/^r\//, ''));
  const limit = parseInt(options.limit, 10) || 10;
  const sort = options.sort || 'hot';
  const jsonMode = Boolean(options.json);
  const keyword = options.keyword?.toLowerCase();

  const client = new RedditClient({ log: console });

  if (!jsonMode) {
    console.log(`🔎 Reddit Community Scout Agent scanning r/${subreddits.join(', r/')} [sort: ${sort}, limit: ${limit}]...\n`);
  }

  if (!client.isConfigured()) {
    console.warn('⚠️ Reddit credentials missing in environment (.env).');
    console.warn('Scout Agent requires Reddit credentials to authenticate with https://oauth.reddit.com.\n');
    process.exit(0);
  }

  const allResults = [];

  for (const sr of subreddits) {
    try {
      const feed = await client.getSubredditFeed(sr, { sort, limit });
      const filtered = keyword
        ? feed.filter(p => p.title.toLowerCase().includes(keyword) || (p.selftext || '').toLowerCase().includes(keyword))
        : feed;

      allResults.push({ subreddit: sr, posts: filtered });

      if (!jsonMode) {
        console.log(`\n========================================`);
        console.log(`📚 Top Discussions from r/${sr}`);
        console.log(`========================================`);

        if (filtered.length === 0) {
          console.log('No posts returned.');
          continue;
        }

        filtered.forEach((post, i) => {
          console.log(`\n[#${i + 1}] ▲ ${post.score} | 💬 ${post.numComments} comments`);
          console.log(`Title: ${post.title}`);
          console.log(`Link: ${post.permalink}`);
          if (post.selftext) {
            console.log(`Snippet: ${post.selftext.slice(0, 160).replace(/\n/g, ' ')}...`);
          }
        });
      }
    } catch (err) {
      console.error(`❌ Error fetching r/${sr}: ${err.message}`);
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(allResults, null, 2));
  }
}

main().catch((err) => {
  console.error('Scout Agent fatal error:', err);
  process.exit(1);
});
