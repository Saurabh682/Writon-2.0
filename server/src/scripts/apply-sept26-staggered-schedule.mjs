import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });

async function schedulePosts() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    // 1. Post 1: NOW
    // ID: bb0956e0-5d3f-4461-b6ee-4b5543c17c20 ("The Accountability Void" by @aarav_tech)
    await client.query(`
      UPDATE public.posts
      SET status = 'published',
          is_public = true,
          published_at = LEAST(published_at, NOW())
      WHERE id = 'bb0956e0-5d3f-4461-b6ee-4b5543c17c20'
    `);
    console.log('Post 1: "The Accountability Void" is LIVE NOW (status = published, is_public = true).');

    // 2. Post 2: 3:00 PM IST (09:30 UTC)
    // ID: ef49f47d-1aba-4d67-83f9-41df40d00325 ("The Serialized Rebellion" by @devansh_roy)
    // Set status = 'draft', is_public = false, and set published_at = '2026-09-26 15:00:00+05:30'
    await client.query(`
      UPDATE public.posts
      SET status = 'draft',
          is_public = false,
          published_at = '2026-09-26 15:00:00+05:30'::timestamptz
      WHERE id = 'ef49f47d-1aba-4d67-83f9-41df40d00325'
    `);
    console.log('Post 2: "The Serialized Rebellion" is STAGED for 3:00 PM IST (status = draft, is_public = false, published_at = 2026-09-26 15:00:00+05:30).');

    // 3. Post 3: 6:00 PM IST (12:30 UTC)
    // ID: dda702b2-493b-45e7-bfb1-407c77672016 ("Quiet Infrastructure" by @sunita_banerjee)
    // Set status = 'draft', is_public = false, and set published_at = '2026-09-26 18:00:00+05:30'
    await client.query(`
      UPDATE public.posts
      SET status = 'draft',
          is_public = false,
          published_at = '2026-09-26 18:00:00+05:30'::timestamptz
      WHERE id = 'dda702b2-493b-45e7-bfb1-407c77672016'
    `);
    console.log('Post 3: "Quiet Infrastructure" is STAGED for 6:00 PM IST (status = draft, is_public = false, published_at = 2026-09-26 18:00:00+05:30).');

    // Verification
    const res = await client.query(`
      SELECT id, title, slug, status, is_public, published_at
      FROM public.posts
      WHERE id IN (
        'bb0956e0-5d3f-4461-b6ee-4b5543c17c20',
        'ef49f47d-1aba-4d67-83f9-41df40d00325',
        'dda702b2-493b-45e7-bfb1-407c77672016'
      )
      ORDER BY published_at ASC
    `);

    console.log('\n--- Verified Post States in Database ---');
    console.table(res.rows);

  } catch (err) {
    console.error('Error updating post schedule:', err);
  } finally {
    await client.end();
    console.log('Database client closed.');
  }
}

schedulePosts();
