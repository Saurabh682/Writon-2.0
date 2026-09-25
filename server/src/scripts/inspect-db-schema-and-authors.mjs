import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'posts' 
      ORDER BY ordinal_position
    `);
    console.log('Columns of public.posts:');
    for (const row of res.rows) {
      console.log(`- ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    }

    const profilesRes = await client.query(`
      SELECT id, pen_name, full_name, account_type
      FROM public.profiles
      WHERE id IN ('bot_aarav_tech', 'bot_sunita_essays', 'bot_writer_065', 'bot_devansh_fiction')
    `);
    console.log('\nTarget Profiles:');
    console.table(profilesRes.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
