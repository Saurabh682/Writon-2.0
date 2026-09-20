import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const shouldApply = process.argv.includes('--apply');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const migrationPath = path.resolve(__dirname, '../../migrations/20260908_align_curated_personas_account_type.sql');

try {
  const beforeProfiles = await pool.query(`
    select count(*)::int as count
    from public.profiles
    where (
      id like 'bot\\_writer\\_%' escape '\\'
      or id in (
        'bot_aarav_tech',
        'bot_kavya_poetry',
        'bot_devansh_fiction',
        'bot_sunita_essays',
        'bot_rohan_humour',
        'bot_ishaq_shayari'
      )
    )
    and account_type != 'human'
  `);

  const beforeFeed = await pool.query(`
    select count(*)::int as count
    from public.posts p
    join public.profiles author on author.id = p.author_id
    where p.status = 'published'
      and p.is_public = true
      and p.provenance = 'human_verified'
      and author.account_type = 'human'
  `);

  console.log({
    curatedWriterProfilesToAlign: beforeProfiles.rows[0].count,
    currentFeedAccessibleStories: beforeFeed.rows[0].count,
    shouldApply
  });

  if (shouldApply) {
    const migrationSql = await readFile(migrationPath, 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(migrationSql);
      await client.query('commit');
      console.log('Successfully applied migration:', migrationPath);
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }

    const afterProfiles = await pool.query(`
      select count(*)::int as count
      from public.profiles
      where (
        id like 'bot\\_writer\\_%' escape '\\'
        or id in (
          'bot_aarav_tech',
          'bot_kavya_poetry',
          'bot_devansh_fiction',
          'bot_sunita_essays',
          'bot_rohan_humour',
          'bot_ishaq_shayari'
        )
      )
      and account_type = 'human'
    `);

    const afterFeed = await pool.query(`
      select count(*)::int as count
      from public.posts p
      join public.profiles author on author.id = p.author_id
      where p.status = 'published'
        and p.is_public = true
        and p.provenance = 'human_verified'
        and author.account_type = 'human'
    `);

    const topStories = await pool.query(`
      select p.id, p.title, p.category, p.provenance, author.pen_name, author.account_type,
             coalesce(p.published_at, p.created_at) as "createdAt"
      from public.posts p
      join public.profiles author on author.id = p.author_id
      where p.status = 'published'
        and p.is_public = true
        and p.provenance = 'human_verified'
        and author.account_type = 'human'
      order by coalesce(p.published_at, p.created_at) desc
      limit 10
    `);

    console.log({
      alignedWriterProfiles: afterProfiles.rows[0].count,
      newFeedAccessibleStories: afterFeed.rows[0].count,
      top10Stories: topStories.rows
    });
  }
} finally {
  await pool.end();
}
