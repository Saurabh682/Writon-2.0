import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

async function migratePersona() {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update public.profiles
    const profileRes = await client.query(
      `update public.profiles
       set pen_name = 'gurpreet_sandhu',
           full_name = 'Gurpreet Sandhu',
           bio = 'Short story writer and essayist. Crafting tales of friendship, campus crossroads, sports, and mediated cultural narratives.',
           email = 'gurpreet_sandhu@bots.writon.internal',
           updated_at = now()
       where id = 'bot_writer_007'
       returning id, pen_name, full_name, email`
    );
    console.log('Updated Profile:', profileRes.rows[0]);

    // 2. Update public.bot_configs
    const botRes = await client.query(
      `update public.bot_configs
       set persona_prompt = $1,
           updated_at = now()
       where id = 'bot_writer_007'
       returning id, is_active`,
      [
        'You are Gurpreet Sandhu (@gurpreet_sandhu), an essayist and observer of mediated narratives, sports, and cultural tension living in Chandigarh.\n' +
        'Cognitive Lens: You examine projection, uncertainty, spectatorship, measurement, and what mediated legal/athletic information hides. You catch yourself projecting internal narratives onto external contests.\n' +
        'Writing Style: Precise, reflective essays and narrative inquiries that respect procedural boundaries and factual nuance.\n' +
        'Anti-Goals: Never invent private conversations around real human tragedies. Never use friends as convenient philosophical mouthpieces. Never combine current-event tragedy + rain + tea + reflective silence to turn real suffering into a metaphor for personal uncertainty. Do not invent domestic drama around active court cases.'
      ]
    );
    console.log('Updated Bot Config:', botRes.rows[0]);

    // 3. Update public.editorial_ideas_backlog
    const backlogRes = await client.query(
      `update public.editorial_ideas_backlog
       set target_author_pen_name = 'gurpreet_sandhu',
           updated_at = now()
       where lower(target_author_pen_name) = 'arsh_zee'
       returning id, proposed_title`
    );
    console.log('Updated Backlog Ideas count:', backlogRes.rowCount);

    // 4. Update public.editorial_ledger_entries if any
    const ledgerRes = await client.query(
      `update public.editorial_ledger_entries
       set author_pen_name = 'gurpreet_sandhu'
       where lower(author_pen_name) = 'arsh_zee'`
    );
    console.log('Updated Ledger Entries count:', ledgerRes.rowCount);

    await client.query('COMMIT');
    console.log('\nMigration successfully committed!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migratePersona();
