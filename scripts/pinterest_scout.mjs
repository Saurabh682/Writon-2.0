#!/usr/bin/env node
/**
 * Standalone Pinterest Scout Agent
 * Usage:
 *   node scripts/pinterest_scout.mjs --boards [--limit=10]
 *   node scripts/pinterest_scout.mjs --board=<board_id> [--limit=20]
 *   node scripts/pinterest_scout.mjs --profile [--json]
 */

import { PinterestClient } from '../server/src/services/pinterest-client.js';
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
  const jsonMode = Boolean(options.json);
  const limit = parseInt(options.limit, 10) || 10;
  const client = new PinterestClient({ log: console });

  if (!jsonMode) {
    console.log('🔎 Pinterest Scout Agent starting...\n');
  }

  if (!client.isConfigured()) {
    console.warn('⚠️ Pinterest credentials missing in environment (.env).');
    console.warn('Scout Agent requires PINTEREST_ACCESS_TOKEN to query Pinterest API v5.\n');
    process.exit(0);
  }

  try {
    if (options.profile) {
      const me = await client.getMe();
      if (jsonMode) {
        console.log(JSON.stringify(me, null, 2));
      } else {
        console.log('👤 Profile Information:');
        console.log(`Username: @${me.username}`);
        console.log(`Account Type: ${me.account_type}`);
        console.log(`Website: ${me.website_url || '(none)'}`);
        console.log(`About: ${me.about || '(none)'}`);
      }
      return;
    }

    if (options.board) {
      const boardId = options.board;
      const board = await client.getBoard(boardId);
      if (jsonMode) {
        console.log(JSON.stringify(board, null, 2));
      } else {
        console.log(`📋 Board Details: ${board.name} (${board.id})`);
        console.log(`Description: ${board.description || '(none)'}`);
        console.log(`Privacy: ${board.privacy}`);
        console.log(`Pin Count: ${board.pin_count || 0}`);
      }
      return;
    }

    // Default: list boards
    const boardsResponse = await client.getBoards({ pageSize: limit });
    const items = boardsResponse.items || [];

    if (jsonMode) {
      console.log(JSON.stringify(items, null, 2));
    } else {
      console.log(`📚 Found ${items.length} Boards on account:`);
      items.forEach((b, i) => {
        console.log(`\n[#${i + 1}] ${b.name}`);
        console.log(`ID: ${b.id}`);
        console.log(`Privacy: ${b.privacy}`);
        if (b.description) console.log(`Description: ${b.description}`);
      });
    }
  } catch (err) {
    console.error(`❌ Scout error: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
