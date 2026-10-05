/**
 * Autonomous Publishing Clock & Release Dispatcher
 * 
 * Monitors staged stories scheduled for today and releases them
 * when their scheduled time (published_at <= NOW()) arrives.
 * 
 * Auto-regenerates SEO sitemaps and RSS feeds upon each release.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
dotenv.config({ path: 'server/.env' });

const TARGET_POST_IDS = [
  '5c6cb9d1-8c8a-434e-8e33-15db5d87bb77', // Story 2: The Review Debt (7:00 PM IST)
  'ab05d668-ac99-444b-8601-495eeef6f1fd', // Story 3: The Milestone Mirror (8:30 PM IST)
  '58c41b50-ca77-4a7c-aad9-926c661ab366'  // Story 4: The Witnessed Sentence (10:00 PM IST)
];

const CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

async function checkAndReleaseDuePosts() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Query for any staged posts whose scheduled time has arrived
    const dueRes = await client.query(`
      SELECT id, title, slug, published_at
      FROM public.posts
      WHERE id = ANY($1)
        AND status = 'draft'
        AND published_at <= NOW()
      ORDER BY published_at ASC
    `, [TARGET_POST_IDS]);

    if (dueRes.rowCount > 0) {
      for (const post of dueRes.rows) {
        console.log(`\n⏰ [CLOCK DISPATCH] Releasing scheduled post: "${post.title}" (ID: ${post.id})...`);
        
        await client.query(`
          UPDATE public.posts
          SET status = 'published',
              is_public = true,
              published_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `, [post.id]);

        console.log(`✅ [LIVE NOW]: "${post.title}" is publicly published!`);
        console.log(`   URL: https://writon.cc/stories/${post.slug}`);
      }

      // Regenerate SEO feeds and sitemaps after releasing
      console.log('\nRegenerating SEO sitemaps and RSS feed...');
      try {
        const { stdout } = await execAsync('node server/src/scripts/generate-seo-feeds.mjs');
        console.log(stdout.trim());
      } catch (e) {
        console.error('Error generating feeds:', e.message);
      }
    }

    // Check remaining staged posts
    const remainingRes = await client.query(`
      SELECT id, title, published_at
      FROM public.posts
      WHERE id = ANY($1)
        AND status = 'draft'
      ORDER BY published_at ASC
    `, [TARGET_POST_IDS]);

    const nowIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    if (remainingRes.rowCount > 0) {
      console.log(`[CLOCK PULSE - ${nowIST}] ${remainingRes.rowCount} story(ies) queued. Next: "${remainingRes.rows[0].title}" at ${new Date(remainingRes.rows[0].published_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    } else {
      console.log(`[CLOCK COMPLETE - ${nowIST}] All 4 stories for today are published and live! Exiting clock daemon.`);
      await client.end();
      process.exit(0);
    }

  } catch (err) {
    console.error('[CLOCK ERROR]:', err.message);
  } finally {
    await client.end();
  }
}

console.log('====================================================');
console.log('⏳ Autonomous Publishing Clock Daemon Started');
console.log(`Monitoring IDs: ${TARGET_POST_IDS.join(', ')}`);
console.log('Interval: 60s');
console.log('====================================================\n');

// Initial run
checkAndReleaseDuePosts();

// Schedule recurring pulse
setInterval(checkAndReleaseDuePosts, CHECK_INTERVAL_MS);
