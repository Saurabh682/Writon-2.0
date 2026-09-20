import pg from 'pg';
import { REVIEW_PERSONAS } from '../bot-engine/review-personas.js';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.rrxaitxeirykmiihgiqj:pxA6pa-f5fj7$nu@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log(`Seeding ${REVIEW_PERSONAS.length} review personas...`);
  for (const bot of REVIEW_PERSONAS) {
    await pool.query(`
      insert into public.profiles (id, email, pen_name, full_name, bio, avatar_url, account_type)
      values ($1, $2, $3, $4, $5, $6, 'editorial_bot')
      on conflict (id) do update set
        pen_name = excluded.pen_name,
        full_name = excluded.full_name,
        bio = excluded.bio,
        avatar_url = excluded.avatar_url,
        account_type = 'editorial_bot',
        updated_at = now()
    `, [
      bot.id,
      `${bot.penName}@bots.writon.internal`,
      bot.penName,
      bot.fullName,
      bot.bio,
      bot.avatarUrl
    ]);

    await pool.query(`
      insert into public.bot_configs (
        id, is_active, persona_prompt, categories, post_frequency_hours,
        like_probability, comment_probability, comment_style, bot_type, last_posted_at
      )
      values ($1, true, $2, $3, 24, 0.8, 0.5, 'analytical', 'reviewer', now())
      on conflict (id) do update set
        persona_prompt = excluded.persona_prompt,
        categories = excluded.categories,
        is_active = true,
        bot_type = 'reviewer',
        updated_at = now()
    `, [
      bot.id,
      `You are ${bot.fullName}, reviewing ${bot.domain}. Tone: ${bot.tone}. ${bot.antiGoals}`,
      ['Reviews', bot.category || 'Tech']
    ]);
  }
  console.log('All 20 review personas successfully seeded into profiles and bot_configs!');

  // Fix author of c0190045-2679-40f5-9946-19381118ceb0 to Vikramaditya Chauhan
  const r1 = await pool.query(
    'update public.posts set author_id = $1 where id = $2 returning id, title, author_id',
    ['reviewer_vikram_apex', 'c0190045-2679-40f5-9946-19381118ceb0']
  );
  console.log('Updated ICE cars review author:', r1.rows[0]);

  // Fix author of 6ac004fc-7813-47b1-8adc-05330c91107b to Ruzbeh Irani
  const r2 = await pool.query(
    'update public.posts set author_id = $1 where id = $2 returning id, title, author_id',
    ['reviewer_ruzbeh_moto', '6ac004fc-7813-47b1-8adc-05330c91107b']
  );
  console.log('Updated Bikes review author:', r2.rows[0]);

  // Archive duplicate post af2d0e0d-fae9-4e7f-9425-5e61732929da
  const r3 = await pool.query(
    "update public.posts set is_public = false, status = 'archived' where id = $1 returning id, title, status, is_public",
    ['af2d0e0d-fae9-4e7f-9425-5e61732929da']
  );
  console.log('Archived duplicate post:', r3.rows[0]);

  await pool.end();
}

run().catch(console.error);
