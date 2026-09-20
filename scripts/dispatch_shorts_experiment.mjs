#!/usr/bin/env node

/**
 * WritOn 5-Shorts Campaign Dispatcher
 *
 * Usage:
 *   node scripts/dispatch_shorts_experiment.mjs --list
 *   node scripts/dispatch_shorts_experiment.mjs --short=1
 *   node scripts/dispatch_shorts_experiment.mjs --short=1 --dry-run
 *   node scripts/dispatch_shorts_experiment.mjs --all
 */

import { YouTubeClient } from '../server/src/services/youtube-client.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
dotenv.config();

const historyFilePath = path.resolve(__dirname, '../campaign/published-history.json');

const lineup = [
  {
    index: 1,
    id: 'short1_shayari_unsaid',
    format: 'Poetry & Shayari #1',
    targetSlot: '09:30 AM IST',
    title: 'Some Words Are Only Meant for Silence #shorts',
    description: 'Some words are never meant to be spoken. They are only meant to be understood in silence.\n\nRead & write offline literature on WritOn:\n📲 https://writon.cc\n\n#shorts #shayari #poetry #writingcommunity #writon #literature',
    tags: ['shayari', 'poetry', 'writing', 'craft', 'writon', 'shorts'],
    videoPath: path.resolve(__dirname, '../campaign/shorts-rendered/short1_shayari_unsaid/renders/short1_shayari_unsaid_2026-09-13_09-13-50.mp4')
  },
  {
    index: 2,
    id: 'short2_tiny_story_water',
    format: 'Tiny Story',
    targetSlot: '12:30 PM IST',
    title: 'The 5:55 PM Glass of Water #shorts',
    description: 'He brought the glass of water at 5:55 PM, exactly like yesterday. Neither of them mentioned the hospital letter sitting unopened under the tea canister.\n\nTake your stories out of the notes app into the quiet:\n📲 https://writon.cc\n\n#shorts #storytelling #flashfiction #writingcommunity #writon #tinystory',
    tags: ['storytelling', 'flashfiction', 'writing', 'tinystory', 'writon', 'shorts'],
    videoPath: path.resolve(__dirname, '../campaign/shorts-rendered/short2_tiny_story_water_4k/renders/short2_tiny_story_water_4k_2026-09-13_09-31-16.mp4')
  },
  {
    index: 3,
    id: 'short3_shayari_letters',
    format: 'Poetry & Shayari #2',
    targetSlot: '03:30 PM IST',
    title: 'The Dates Our Memory Quietly Abandoned #shorts',
    description: 'In old unread letters, those calendar dates are still alive which our memory quietly abandoned.\n\nClaim your pen name on WritOn:\n📲 https://writon.cc\n\n#shorts #poetry #shayari #writingcommunity #writon #books',
    tags: ['poetry', 'shayari', 'books', 'craft', 'writon', 'shorts'],
    videoPath: path.resolve(__dirname, '../campaign/shorts-rendered/short3_shayari_letters/renders/short3_shayari_letters_2026-09-13_09-14-47.mp4')
  },
  {
    index: 4,
    id: 'short4_line_worth_keeping',
    format: 'Line Worth Keeping',
    targetSlot: '07:00 PM IST',
    title: 'Three Ways to Begin a Scene #shorts',
    description: 'Three ways to begin a scene: a want, a small gesture, or one unexpected detail. Never open with the weather unless the rain is ruining someone’s only pair of shoes.\n\nDistraction-free reading & writing:\n📲 https://writon.cc\n\n#shorts #writingtips #craft #writingcommunity #writon #author',
    tags: ['writingtips', 'craft', 'author', 'writingcommunity', 'writon', 'shorts'],
    videoPath: path.resolve(__dirname, '../campaign/shorts-rendered/short4_line_worth_keeping_4k/renders/short4_line_worth_keeping_4k_2026-09-13_15-54-53.mp4')
  },
  {
    index: 5,
    id: 'short5_writer_thought',
    format: 'Writer Thought',
    targetSlot: '10:00 PM IST',
    title: 'Maybe Closure is Memory Running Out of Questions #shorts',
    description: 'Maybe closure is just memory running out of questions. The draft in your notes app at 2:00 AM wasn’t a mistake. It was the only honest sentence you wrote all week.\n\nTake it out of the dark:\n📲 https://writon.cc\n\n#shorts #writingcommunity #writon #books #creativity #craft',
    tags: ['writingcommunity', 'writon', 'books', 'creativity', 'craft', 'shorts'],
    videoPath: path.resolve(__dirname, '../campaign/shorts-rendered/short5_writer_thought_4k/renders/short5_writer_thought_4k_2026-09-14_16-39-45.mp4')
  }
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    shortNum: null,
    list: false,
    all: false,
    dryRun: false
  };

  for (const arg of args) {
    if (arg === '--list') options.list = true;
    else if (arg === '--all') options.all = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--short=')) options.shortNum = parseInt(arg.split('=')[1], 10);
  }
  return options;
}

async function recordHistory(shortItem, videoId) {
  try {
    let history = { publishedDays: {}, youtubeUploads: [] };
    try {
      const raw = await fs.readFile(historyFilePath, 'utf8');
      history = JSON.parse(raw);
    } catch (_e) {}

    if (!history.youtubeUploads) history.youtubeUploads = [];

    history.youtubeUploads.push({
      shortId: shortItem.id,
      format: shortItem.format,
      videoId,
      url: `https://www.youtube.com/shorts/${videoId}`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title: shortItem.title,
      channel: '@writon_app',
      publishedAt: new Date().toISOString(),
      asset: shortItem.videoPath
    });

    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.warn(`Failed to record in history ledger: ${err.message}`);
  }
}

async function publishItem(client, item, dryRun = false) {
  console.log(`\n🎬 [Short ${item.index}/5] ${item.format}`);
  console.log(`   Slot Target: ${item.targetSlot}`);
  console.log(`   Title: ${item.title}`);
  console.log(`   Video: ${item.videoPath}`);

  if (dryRun) {
    console.log(`   🧪 [DRY RUN] Would upload to @writon_app with #shorts appended.`);
    return { success: true, videoId: 'dry_run_' + item.id };
  }

  const result = await client.uploadVideo({
    videoPath: item.videoPath,
    title: item.title,
    description: item.description,
    tags: item.tags,
    privacyStatus: 'public',
    isShort: true
  });

  console.log(`   ✅ Published! URL: https://www.youtube.com/shorts/${result.videoId}`);
  await recordHistory(item, result.videoId);
  return result;
}

async function main() {
  const options = parseArgs();
  const client = new YouTubeClient();

  if (options.list) {
    console.log('\n📜 WritOn Curated 5-Shorts Experiment Lineup:\n');
    for (const item of lineup) {
      console.log(`[#${item.index}] [${item.targetSlot}] ${item.format.padEnd(20)}: ${item.title}`);
    }
    return;
  }

  if (options.shortNum) {
    const target = lineup.find(s => s.index === options.shortNum);
    if (!target) {
      console.error(`❌ Invalid --short number. Choose 1 to 5.`);
      process.exit(1);
    }
    await publishItem(client, target, options.dryRun);
    return;
  }

  if (options.all) {
    console.log(`🚀 Dispatching all 5 Shorts sequentially...`);
    for (const item of lineup) {
      await publishItem(client, item, options.dryRun);
    }
    return;
  }

  console.log('Usage:');
  console.log('  node scripts/dispatch_shorts_experiment.mjs --list');
  console.log('  node scripts/dispatch_shorts_experiment.mjs --short=1 [--dry-run]');
  console.log('  node scripts/dispatch_shorts_experiment.mjs --all [--dry-run]');
}

main().catch(err => {
  console.error('❌ Dispatch error:', err.message);
  process.exit(1);
});
