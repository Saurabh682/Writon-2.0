/**
 * publish_sept25_linkedin.mjs
 * 
 * Alpha - LinkedIn Bot Dispatch for 25 Sep 2026:
 * "The dirty secret of AI-assisted software engineering is the 'supervisory tax.'"
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { LinkedInClient } from '../server/src/services/linkedin-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const historyFilePath = path.resolve(__dirname, '../campaign/published-history.json');

async function recordHistory(postData) {
  try {
    let history = { publishedDays: {} };
    try {
      const raw = await fs.readFile(historyFilePath, 'utf8');
      history = JSON.parse(raw);
    } catch (_e) {}

    if (!history.linkedin) history.linkedin = {};
    history.linkedin[postData.id] = postData;

    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    console.log(`[LinkedIn Publisher] Recorded ${postData.id} to published-history.json`);
  } catch (err) {
    console.warn(`[LinkedIn Publisher] Could not update history: ${err.message}`);
  }
}

async function main() {
  const client = new LinkedInClient({ log: console });
  if (!client.isConfigured()) {
    console.error('❌ Missing LinkedIn credentials in server/.env');
    process.exit(1);
  }

  const articleTitle = "AI Verification Bottlenecks and Human Judgment";
  const articleUrl = "https://writon.cc/post/generation-scaled-verification-didn-t-9107770b-067";

  const commentary = `The dirty secret of AI-assisted software engineering is the "supervisory tax."

In the last two years, code generation scaled with compute. A prompt yields eighty lines of syntactically flawless code in three seconds. But code verification still scales strictly with human working memory.

Reading code has always been harder than writing it. When an author is an LLM, the output looks remarkably plausible—clean variable naming, neat indentation, convincing comments. But proving that plausible code won't silently deadlock a database connection pool under burst traffic requires intense human judgment.

Senior engineers didn't get faster. They became full-time proofreaders of synthetic drafts.

The scarce resource in technology was never typing speed. It was always discernment, systems architecture, and mechanical sympathy.

Tools that generate volume without simplifying verification aren't solving bottlenecks—they're shifting them onto human attention.

Read the full essay on WritOn:
${articleUrl}

#artificialintelligence #softwareengineering #codereview`;

  console.log('===============================================================');
  console.log('🚀 ALPHA - LINKEDIN BOT PUBLISHER');
  console.log(`   Author: ${client.personUrn}`);
  console.log(`   Title: ${articleTitle}`);
  console.log('===============================================================\n');

  const postResult = await client.createPost({
    commentary,
    format: 'TEXT_ONLY',
    articleUrl,
    articleTitle,
  });

  if (!postResult.success) {
    throw new Error(`Failed to create LinkedIn post: ${postResult.error}`);
  }

  console.log('\n===============================================================');
  console.log('🎉 LINKEDIN POST PUBLISHED SUCCESSFULLY!');
  console.log(`• Post URN: ${postResult.postUrn}`);
  console.log(`• Live URL: ${postResult.liveUrl}`);
  console.log('===============================================================\n');

  await recordHistory({
    id: 'dispatch_20260925_1300_linkedin',
    platform: 'linkedin',
    postUrn: postResult.postUrn,
    liveUrl: postResult.liveUrl,
    publishedAt: new Date().toISOString(),
    title: articleTitle,
  });
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
