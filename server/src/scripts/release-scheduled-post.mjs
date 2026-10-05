import pg from 'pg';
import dotenv from 'dotenv';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
dotenv.config({ path: 'server/.env' });

const TARGET_POST_ID = process.argv[2];

if (!TARGET_POST_ID) {
  console.error('Usage: node release-scheduled-post.mjs <POST_ID>');
  process.exit(1);
}

async function releasePost() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`Connected to DB. Releasing post ${TARGET_POST_ID}...`);

    const updateRes = await client.query(`
      UPDATE public.posts
      SET status = 'published',
          is_public = true,
          published_at = NOW()
      WHERE id = $1
      RETURNING id, title, slug, status, is_public, published_at
    `, [TARGET_POST_ID]);

    if (updateRes.rowCount === 0) {
      console.error(`Post not found with ID: ${TARGET_POST_ID}`);
      return;
    }

    const post = updateRes.rows[0];
    console.log(`SUCCESS! Released post: "${post.title}"`);
    console.log(`Status: ${post.status}, is_public: ${post.is_public}, published_at: ${post.published_at}`);
    console.log(`Live Reader URL: https://writon.cc/stories/${post.slug}`);

    // Regenerate SEO feeds and sitemaps
    console.log('\nRegenerating SEO sitemaps and RSS feed...');
    const { stdout, stderr } = await execAsync('node server/src/scripts/generate-seo-feeds.mjs');
    console.log(stdout);
    if (stderr) console.error(stderr);

  } catch (err) {
    console.error('Error releasing post:', err);
  } finally {
    await client.end();
    console.log('Database client closed.');
  }
}

releasePost();
