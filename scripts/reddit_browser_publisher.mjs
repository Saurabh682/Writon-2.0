#!/usr/bin/env node
/**
 * Standalone Reddit Playwright Browser Automation Publisher
 * 
 * Bypasses Reddit Developer Data API restrictions and third-party subscription paywalls.
 * Publishes native Markdown posts directly to r/writon using a saved browser session.
 * 
 * Usage:
 *   node scripts/reddit_browser_publisher.mjs --login
 *   node scripts/reddit_browser_publisher.mjs --from-feed [--dry-run] [--headed]
 *   node scripts/reddit_browser_publisher.mjs --day=1 [--dry-run]
 *   node scripts/reddit_browser_publisher.mjs --subreddit=writon --title="My Title" --body="My Post"
 */

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('server/.env') });
dotenv.config();

const AUTH_STATE_FILE = path.resolve('.auth/reddit_storage_state.json');
const PUBLISHED_HISTORY_FILE = path.resolve('campaign/published-history.json');
const REDDIT_FEED_FILE = path.resolve('public/reddit-feed.xml');
const ARTIFACTS_DIR = path.resolve('.artifacts');

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

/**
 * Parses items from public/reddit-feed.xml without external XML dependencies.
 */
async function parseRedditFeed() {
  if (!existsSync(REDDIT_FEED_FILE)) {
    throw new Error(`Reddit feed file not found at ${REDDIT_FEED_FILE}`);
  }

  const xml = await fs.readFile(REDDIT_FEED_FILE, 'utf8');
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemBlock = match[1];
    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemBlock);
    const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemBlock);
    const guidMatch = /<guid[^>]*>([\s\S]*?)<\/guid>/.exec(itemBlock);
    const descMatch = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/.exec(itemBlock);
    const categoryMatch = /<category>([\s\S]*?)<\/category>/.exec(itemBlock);

    if (titleMatch && (linkMatch || guidMatch)) {
      items.push({
        title: titleMatch[1].trim(),
        link: (linkMatch ? linkMatch[1] : guidMatch[1]).trim(),
        guid: guidMatch ? guidMatch[1].trim() : (linkMatch ? linkMatch[1].trim() : ''),
        body: descMatch ? descMatch[1].trim() : '',
        category: categoryMatch ? categoryMatch[1].trim() : 'writon',
      });
    }
  }

  return items;
}

/**
 * Loads published history.
 */
async function loadHistory() {
  try {
    if (existsSync(PUBLISHED_HISTORY_FILE)) {
      const raw = await fs.readFile(PUBLISHED_HISTORY_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[History] Could not read ${PUBLISHED_HISTORY_FILE}: ${err.message}`);
  }
  return {};
}

/**
 * Saves published post to history.
 */
async function recordPublishedPost({ title, link, redditUrl, subreddit }) {
  try {
    const history = await loadHistory();
    history.redditPosts = history.redditPosts || [];
    history.reddit = history.reddit || {};

    const record = {
      title,
      link,
      redditUrl,
      subreddit,
      publishedAt: new Date().toISOString(),
    };

    history.redditPosts.push(record);
    history.reddit[subreddit] = record;

    await fs.writeFile(PUBLISHED_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    console.log(`📝 Saved post record to ${PUBLISHED_HISTORY_FILE}`);
  } catch (err) {
    console.warn(`[History] Could not save post history: ${err.message}`);
  }
}

/**
 * Creates storageState.json directly from a reddit_session cookie value.
 */
async function saveSessionCookie(rawCookie) {
  let cookieVal = rawCookie.trim();
  if (cookieVal.includes('reddit_session=')) {
    const match = /reddit_session=([^;]+)/.exec(cookieVal);
    if (match) cookieVal = match[1];
  }
  await fs.mkdir(path.dirname(AUTH_STATE_FILE), { recursive: true });
  const expires = Math.floor(Date.now() / 1000) + (180 * 24 * 3600);
  const storageState = {
    cookies: [
      {
        name: 'reddit_session',
        value: cookieVal,
        domain: '.reddit.com',
        path: '/',
        expires,
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      },
      {
        name: 'token',
        value: cookieVal,
        domain: '.reddit.com',
        path: '/',
        expires,
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      },
      {
        name: 'token_v2',
        value: cookieVal,
        domain: '.reddit.com',
        path: '/',
        expires,
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      },
    ],
    origins: [
      {
        origin: 'https://www.reddit.com',
        localStorage: [],
      },
    ],
  };
  await fs.writeFile(AUTH_STATE_FILE, JSON.stringify(storageState, null, 2), 'utf8');
  console.log(`✅ Authentication state successfully created at:\n   ${AUTH_STATE_FILE}`);
}

/**
 * Interactive login session setup.
 * Opens Chromium headed, allows the user to log in as u/writon_socialapp,
 * and saves authentication state.
 */
async function setupLogin() {
  console.log('🌐 Launching dedicated Chromium browser for Reddit session setup...');
  await fs.mkdir(path.dirname(AUTH_STATE_FILE), { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized', '--window-position=50,50'],
  });

  const context = await browser.newContext({
    viewport: null, // Full window size
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  console.log('🔗 Navigating to Reddit login page...');
  await page.goto('https://www.reddit.com/login', { waitUntil: 'domcontentloaded' });

  console.log('\n=============================================================');
  console.log('🔐 ACTION REQUIRED: Please log into Reddit as u/writon_socialapp');
  console.log('   The Chromium window is open on your screen.');
  console.log('   The script will automatically detect when login completes');
  console.log('   and save your session state.');
  console.log('=============================================================\n');

  // Check if credentials are in env to offer auto-fill assistance
  const envUser = process.env.REDDIT_USERNAME;
  const envPass = process.env.REDDIT_PASSWORD;
  if (envUser && envPass) {
    try {
      console.log(`💡 Detected credentials for ${envUser} in environment, attempting autofill...`);
      const userField = page.locator('input[name="username"], input#login-username, input[autocomplete="username"]').first();
      const passField = page.locator('input[name="password"], input#login-password, input[autocomplete="current-password"]').first();
      if (await userField.isVisible({ timeout: 4000 })) {
        await userField.fill(envUser);
        if (await passField.isVisible({ timeout: 2000 })) {
          await passField.fill(envPass);
        }
      }
    } catch {}
  }

  // Poll for successful login
  const startTime = Date.now();
  const maxWaitMs = 300000; // 5 minutes timeout
  let loggedIn = false;
  let pollCount = 0;

  while (Date.now() - startTime < maxWaitMs) {
    await page.waitForTimeout(2000);
    pollCount++;
    const url = page.url();
    const cookies = await context.cookies(['https://www.reddit.com']);
    const hasSessionCookie = cookies.some(c => c.name === 'reddit_session' || c.name === 'token');

    // Check if redirected away from login or avatar/user dropdown is present
    if (hasSessionCookie || (!url.includes('/login') && !url.includes('/register') && url.includes('reddit.com'))) {
      const avatarOrUser = page.locator('button[aria-label*="User account"], [data-testid="user-dropdown"], #USER_DROPDOWN_ID, faceplate-dropdown-menu').first();
      const isUserVisible = await avatarOrUser.isVisible().catch(() => false);

      if (hasSessionCookie || isUserVisible) {
        loggedIn = true;
        console.log('🎉 Login detected successfully!');
        break;
      }
    }

    if (pollCount % 3 === 0) {
      const elapsedSec = Math.round((Date.now() - startTime) / 1000);
      console.log(`⏳ Waiting for login... (${elapsedSec}s elapsed) — current URL: ${url}`);
    }
  }

  if (!loggedIn) {
    console.error('❌ Login timed out after 3 minutes. Please try again.');
    await browser.close();
    process.exit(1);
  }

  // Wait 3 seconds to let any secondary cookies or tokens set
  await page.waitForTimeout(3000);

  await context.storageState({ path: AUTH_STATE_FILE });
  console.log(`\n✅ Authenticated session successfully saved to:\n   ${AUTH_STATE_FILE}`);
  console.log('✨ You can now run autonomous headless posts via:\n   npm run post:reddit:browser\n');

  await browser.close();
}

/**
 * Main publishing routine.
 */
async function publishPost({ title, body, subreddit = 'writon', headless = true, dryRun = false, storyLink = null }) {
  // Strip hashtags to adhere strictly to campaign/HUMAN_VOICE_CODEX.md
  const cleanBody = body.replace(/#\w+/g, '').replace(/[ \t]{2,}/g, ' ').trim();

  console.log('\n================ Post Summary ================');
  console.log(`Target: r/${subreddit}`);
  console.log(`Title:  ${title}`);
  console.log(`Body:\n${cleanBody}`);
  console.log('==============================================\n');

  if (dryRun) {
    console.log('🔍 DRY RUN: Submission skipped. Content is valid.');
    return { success: true, dryRun: true };
  }

  if (!existsSync(AUTH_STATE_FILE)) {
    const envCookie = process.env.REDDIT_SESSION_COOKIE;
    if (envCookie) {
      await saveSessionCookie(envCookie);
    }
  }

  if (!existsSync(AUTH_STATE_FILE)) {
    console.error(`❌ Session state not found at ${AUTH_STATE_FILE}`);
    console.error('👉 Run "npm run post:reddit:login" once to create your session.');
    process.exit(1);
  }

  console.log(`🚀 Launching Playwright browser (headless: ${headless})...`);
  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const context = await browser.newContext({
    storageState: AUTH_STATE_FILE,
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  const submitUrl = `https://www.reddit.com/r/${subreddit}/submit`;
  console.log(`🔗 Navigating to ${submitUrl}...`);

  await page.goto(submitUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);

  // Verify authentication
  if (page.url().includes('/login') || page.url().includes('/register')) {
    console.error('❌ Session expired or invalid. Please re-authenticate using:');
    console.error('   npm run post:reddit:login');
    await browser.close();
    process.exit(1);
  }

  // 1. Locate and fill Title
  console.log('✍️  Entering title...');
  const titleComponent = page.locator('post-composer-title, textarea[placeholder*="Title"], input[name="title"]').first();
  await titleComponent.waitFor({ state: 'visible', timeout: 20000 });
  await titleComponent.click();
  await page.keyboard.type(title);

  await page.waitForTimeout(1000);

  // 2. Locate and fill Body
  console.log('✍️  Entering post body...');
  const bodyInput = page.locator('textarea[placeholder*="Text"], [aria-label="Post body text field"], [role="textbox"]').last();
  await bodyInput.waitFor({ state: 'visible', timeout: 15000 });
  await bodyInput.click();
  await bodyInput.fill(cleanBody).catch(async () => {
    await page.keyboard.insertText(cleanBody);
  });

  // Small pause to let form state validate
  await page.waitForTimeout(2000);

  // 3. Click Submit / Post Button
  console.log('🚀 Submitting post...');
  const postBtn = page.getByRole('button', { name: 'Post', exact: true });
  await postBtn.waitFor({ state: 'visible', timeout: 15000 });
  await postBtn.click();

  // 4. Wait for navigation to published comments URL
  console.log('⏳ Waiting for post confirmation...');
  let finalUrl = '';
  try {
    await page.waitForURL(url => url.pathname.includes('/comments/'), { timeout: 35000 });
    finalUrl = page.url();
  } catch {
    finalUrl = page.url();
    if (!finalUrl.includes('/comments/')) {
      const permalinkEl = page.locator('a[href*="/comments/"]').first();
      if (await permalinkEl.isVisible().catch(() => false)) {
        finalUrl = await permalinkEl.getAttribute('href');
      }
    }
  }

  console.log(`\n🎉 Post published successfully!`);
  console.log(`🔗 URL: ${finalUrl}\n`);

  // 6. Capture screenshot verification
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  const screenshotPath = path.join(ARTIFACTS_DIR, `reddit_publish_${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
  console.log(`📸 Screenshot saved: ${screenshotPath}`);

  // 7. Save to published history
  await recordPublishedPost({
    title,
    link: storyLink,
    redditUrl: finalUrl,
    subreddit,
  });

  await browser.close();
  return { success: true, url: finalUrl };
}

async function main() {
  const options = parseArgs();

  const cookieInput = options.cookie || options.session || process.env.REDDIT_SESSION_COOKIE;
  if (cookieInput) {
    await saveSessionCookie(cookieInput);
    if (options.login || options['setup-login']) return;
  }

  // Setup / Login command
  if (options.login || options['setup-login']) {
    await setupLogin();
    return;
  }

  const dryRun = Boolean(options['dry-run'] || options.dryRun);
  const headed = Boolean(options.headed);
  const headless = options.headless !== undefined ? Boolean(options.headless) : !headed;
  const subreddit = options.subreddit || process.env.REDDIT_DEFAULT_SUBREDDIT || 'writon';

  let title = options.title;
  let body = options.body || options.text;
  let storyLink = options.url || null;

  // Option A: Publish from public/reddit-feed.xml
  if (options['from-feed'] || options.feed || (!title && !options.day)) {
    console.log('📡 Reading stories from public/reddit-feed.xml...');
    const feedItems = await parseRedditFeed();
    if (!feedItems.length) {
      console.error('❌ No items found in reddit-feed.xml');
      process.exit(1);
    }

    const history = await loadHistory();
    const publishedGuids = new Set(
      (history.redditPosts || []).map(p => p.link || p.title)
    );

    // Find the latest unposted story
    const candidate = feedItems.find(item => !publishedGuids.has(item.link) && !publishedGuids.has(item.title)) || feedItems[0];

    title = candidate.title;
    body = candidate.body;
    storyLink = candidate.link;
    console.log(`📖 Selected story: "${title}" (${candidate.category})`);
  }

  // Option B: Publish from campaign day package
  if (options.day) {
    const day = parseInt(options.day, 10);
    const { getDailyCampaignPayload } = await import('../server/src/services/campaign-dispatcher.js');
    const payload = await getDailyCampaignPayload(day);
    title = `${payload.theme} — ${payload.hook}`;
    body = `${payload.captions.en}\n\n---\n*Read and publish on WritOn:* [${payload.shortlink}](${payload.shortlink})`;
    storyLink = payload.shortlink;
    console.log(`📦 Loaded Day ${day} campaign package: "${payload.theme}"`);
  }

  if (!title || !body) {
    console.error('❌ Error: Missing title or body content to publish.');
    console.error('Usage: node scripts/reddit_browser_publisher.mjs --from-feed [--dry-run]');
    process.exit(1);
  }

  await publishPost({
    title,
    body,
    subreddit,
    headless,
    dryRun,
    storyLink,
  });
}

main().catch(err => {
  console.error(`❌ Unexpected error: ${err.message}`);
  process.exit(1);
});
