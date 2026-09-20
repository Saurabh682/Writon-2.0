import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function fixProfilesAndPosts() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // 1. Update all profiles to human
  const profUpdate = await pool.query(
    "UPDATE public.profiles SET account_type = 'human' WHERE account_type = 'unknown';"
  );
  console.log(`✅ ${profUpdate.rowCount} profiles updated to account_type = 'human'.`);

  // 2. Update all posts to human_verified provenance
  const postUpdate = await pool.query(
    "UPDATE public.posts SET provenance = 'human_verified' WHERE provenance = 'unknown';"
  );
  console.log(`✅ ${postUpdate.rowCount} posts updated to provenance = 'human_verified'.`);

  // 3. Verify count of accessible feed posts
  const check = await pool.query(`
    SELECT count(*)::int as accessible_count
    FROM public.posts p
    JOIN public.profiles author ON author.id = p.author_id
    WHERE p.status = 'published' AND p.is_public = true AND p.provenance = 'human_verified' AND author.account_type = 'human';
  `);
  console.log(`🎉 Total accessible published stories for mobile app: ${check.rows[0].accessible_count}`);

  await pool.end();
}

fixProfilesAndPosts();
