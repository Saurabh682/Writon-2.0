import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });

async function checkAndSchedule() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    // 1. Check current status
    const currentRes = await client.query(`
      SELECT id, title, slug, status, published_at, is_public
      FROM public.posts
      WHERE id IN (
        'bb0956e0-5d3f-4461-b6ee-4b5543c17c20',
        'ef49f47d-1aba-4d67-83f9-41df40d00325',
        'dda702b2-493b-45e7-bfb1-407c77672016'
      )
      ORDER BY id ASC
    `);

    console.log('\n--- Current Post Records ---');
    console.table(currentRes.rows);

    // 2. Story 1: NOW (Ensure published, published_at = NOW() or already past, is_public = true)
    await client.query(`
      UPDATE public.posts
      SET status = 'published',
          is_public = true,
          published_at = LEAST(published_at, NOW())
      WHERE id = 'bb0956e0-5d3f-4461-b6ee-4b5543c17c20'
    `);
    console.log('Story 1 (Aarav Mehta - The Accountability Void) confirmed as LIVE NOW.');

    // 3. Story 2: 3:00 PM IST (2026-09-26 15:00:00+05:30)
    // Note: status set to 'scheduled' with published_at at 15:00 IST
    const story2Time = '2026-09-26 15:00:00+05:30';
    await client.query(`
      UPDATE public.posts
      SET status = 'scheduled',
          is_public = true,
          published_at = $1::timestamptz
      WHERE id = 'ef49f47d-1aba-4d67-83f9-41df40d00325'
    `, [story2Time]);
    console.log(`Story 2 (Devansh Roy - The Serialized Rebellion) scheduled for 3:00 PM IST (${story2Time}).`);

    // 4. Story 3: 6:00 PM IST (2026-09-26 18:00:00+05:30)
    // Note: status set to 'scheduled' with published_at at 18:00 IST
    const story3Time = '2026-09-26 18:00:00+05:30';
    await client.query(`
      UPDATE public.posts
      SET status = 'scheduled',
          is_public = true,
          published_at = $1::timestamptz
      WHERE id = 'dda702b2-493b-45e7-bfb1-407c77672016'
    `, [story3Time]);
    console.log(`Story 3 (Sunita Banerjee - Quiet Infrastructure) scheduled for 6:00 PM IST (${story3Time}).`);

    // 5. Verify updated records
    const updatedRes = await client.query(`
      SELECT id, title, slug, status, published_at, is_public
      FROM public.posts
      WHERE id IN (
        'bb0956e0-5d3f-4461-b6ee-4b5543c17c20',
        'ef49f47d-1aba-4d67-83f9-41df40d00325',
        'dda702b2-493b-45e7-bfb1-407c77672016'
      )
      ORDER BY published_at ASC
    `);

    console.log('\n--- Updated Post Records ---');
    console.table(updatedRes.rows);

  } catch (err) {
    console.error('Error scheduling posts:', err);
  } finally {
    await client.end();
    console.log('Database client closed.');
  }
}

checkAndSchedule();
