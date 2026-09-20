import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const AUTHOR_ID = 'bot_devansh_fiction';
const TITLE     = 'The Second Set at the Corner Shop';
const SUMMARY   = 'Late Monday night in Kolkata, Bimal starts a delayed replay of Mirra Andreeva vs Anastasia Potapova from the 2026 US Open — and tries to forbid every customer from saying the result. A story about what happens when the score arrives before the second set does.';

const CONTENT = `# The Second Set at the Corner Shop

Bimal found the replay a little after midnight on Tuesday. He had missed the match live — he had been working through Monday evening and by the time he sat down with the cable box, the whole neighbourhood had already seen it on their phones.

He knew this about the neighbourhood. He locked the front shutter to three-quarters closed and turned the set on.

The first customer arrived at twelve forty. Shankar from the chemist's, who still wore his work shirt.

"Did you see Andreeva last night?" Shankar said, by way of greeting.

"You are not coming in," Bimal said.

Shankar looked at the gap in the shutter. "I can see the screen from here."

"The screen is not for you. Go home."

Shankar stayed at the gap. "At least let me tell you what happened when Potapova—"

"Stop." Bimal moved a plastic crate in front of the shutter gap. The crate made it worse. Shankar simply stepped to the left.

"It was in the third set when she—"

Bimal turned the volume to maximum.

The second customer arrived at one fifteen. His name was Pradeep and he had seen the score on his phone on the way back from the pharmacy. He had not seen the match itself, only the result, so he said he was neutral.

"Neutral means you don't know things I don't know," Bimal said.

"I only know who won."

"That is the only thing I don't want to know."

Pradeep considered this. "So you want to watch a match knowing that uncertainty is false?"

"I want to watch a match."

Pradeep sat down. He was quiet for four minutes. The screen showed the first set. Potapova taking it 7–5. The shop was quiet in the way that only replays are quiet — the crowd noise real, the tension borrowed, the result already written somewhere in everyone's pocket.

A results crawl appeared along the bottom of the sports channel. Pradeep saw it first. He looked at Bimal. Bimal was watching the match, not the crawl.

Then Bimal saw it: ANDREEVA def. POTAPOVA 5–7, 6–4, 6–3.

The second set was beginning on screen. The information and the event arrived in the same frame. He watched the first rally anyway.

He reached over and switched off the cable box.

"That's it?" Pradeep said.

"That's it," Bimal said.

On Bimal's phone, the unopened score notification was still waiting.

---

#usopen #tennis #kolkata #replay #shortstory #writon`;

async function run() {
  const client = await pool.connect();
  try {
    // Check for existing draft
    const existing = await client.query(
      `SELECT id, title, status FROM public.posts WHERE author_id = $1 AND title ILIKE $2 LIMIT 1`,
      [AUTHOR_ID, '%Second Set%']
    );

    if (existing.rows.length > 0) {
      const { id, title, status } = existing.rows[0];
      console.log(`Found existing post "${title}" [${status}] — updating...`);
      await client.query(
        `UPDATE public.posts
         SET title = $1, content = $2, summary = $3,
             status = 'published', updated_at = NOW(),
             published_at = COALESCE(published_at, NOW())
         WHERE id = $4`,
        [TITLE, CONTENT, SUMMARY, id]
      );
      console.log(`✅ Updated post ${id}`);
    } else {
      console.log('No existing draft found — inserting new post...');
      const ins = await client.query(
        `INSERT INTO public.posts (title, content, summary, author_id, category, status, slug, created_at, updated_at, published_at)
         VALUES ($1, $2, $3, $4, 'Short Stories', 'published', $5, NOW(), NOW(), NOW())
         RETURNING id`,
        [TITLE, CONTENT, SUMMARY, AUTHOR_ID, 'the-second-set-at-the-corner-shop']
      );
      console.log(`✅ Inserted new post ${ins.rows[0].id}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
