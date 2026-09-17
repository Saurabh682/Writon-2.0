import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Connecting to PostgreSQL database...');
  const client = await pool.connect();

  try {
    const postId = 'a6e1d2d7-65e7-46f0-84e0-39e9eb5de9d2';
    const cleanContent = fs.readFileSync(
      'd:/VibeCode/WritOn-PowerUp/scratch/draft_sunita_zverev.txt',
      'utf-8'
    ).trim();
    const cleanTitle = 'Four Hours Inside a Foregone Conclusion';
    const cleanSummary = 'On paper, Alexander Zverev vs Quentin Halys at the US Open was a predictable second-round fixture. Four hours and thirty-three minutes later, hierarchy had survived, but only after paying full price.';
    const cleanSlug = 'four-hours-inside-a-foregone-conclusion-a6e1d2d7';

    // 1. Update post in public.posts
    const updateRes = await client.query(`
      update public.posts
      set title = $1,
          slug = $2,
          summary = $3,
          content = $4,
          reading_time_min = 3,
          updated_at = now()
      where id = $5
      returning id, title, slug, reading_time_min, updated_at
    `, [cleanTitle, cleanSlug, cleanSummary, cleanContent, postId]);

    console.log('Updated post:', updateRes.rows[0]);

    // 2. Register failure patterns in public.editorial_failure_patterns
    const failurePatterns = [
      {
        code: 'RESULT_CONTRADICTS_PREMISE_FAIL',
        detail: 'The real-world event outcome contradicts the article thesis. Describing a five-set marathon or grueling resistance as a predictable march forces reality into a predetermined premise.'
      },
      {
        code: 'SPORT_STYLE_GENERALIZATION_FAIL',
        detail: 'Sweeping, unverified sport-wide aesthetic decline claim detected. A single match cannot be used to declare that an entire era or sport has abandoned tactical variety.'
      },
      {
        code: 'TITLE_OBJECT_CONTRACT_FAIL',
        detail: 'Title promises two core material metaphors (The Metronome and the Clay), but the essay fails to feature clay. Both nouns must materially shape the piece.'
      },
      {
        code: 'PERSONA_LENS_CONTAMINATION_FAIL',
        detail: 'Persona lens contamination: Dr. Sunita Banerjee borrowing Aarav Mehta systems engineering / cache invalidation vocabulary for metaphor convenience.'
      },
      {
        code: 'SELF_REFERENCE_COOLDOWN',
        detail: 'Artificial bot network self-reference detected ("In my earlier essay..."). Continuity citations are disallowed unless the earlier piece is formally being revised or refuted.'
      }
    ];

    for (const pat of failurePatterns) {
      await client.query(`
        insert into public.editorial_failure_patterns (id, post_id, author_id, failure_code, failure_detail, draft_title, created_at)
        values (gen_random_uuid(), $1, 'bot_sunita_essays', $2, $3, $4, now())
      `, [postId, pat.code, pat.detail, cleanTitle]);
    }
    console.log('Registered 5 new failure patterns in public.editorial_failure_patterns');

    // 3. Narrative Fingerprint update
    await client.query(`
      delete from public.editorial_narrative_fingerprints where post_id = $1
    `, [postId]);

    await client.query(`
      insert into public.editorial_narrative_fingerprints (
        id, post_id, author_id, persona_name, genre, subject_domain, setting,
        central_question, narrative_mechanism, opening_device, ending_device,
        metaphor_family, emotional_arc, major_objects, recurring_people,
        has_code_blocks, real_person_dependent, structural_hash, created_at
      )
      values (
        gen_random_uuid(), $1, 'bot_sunita_essays', 'Dr. Sunita Banerjee', 'Essays', 'Sports & Pedagogy', 'Study room in Delhi / US Open Flushing Meadows',
        'What do rankings and administrative grades conceal about the resistance required to make expected results happen?',
        'pedagogical_parallel', 'brass_paperweight_provisional_grade', 'physical_ink_stroke_through_grade',
        'rankings_and_administrative_predictions', 'contemplative_disillusionment_to_sober_recognition',
        array['brass paperweight', 'tutorial assignments', 'monitor', 'fountain pen', 'notebook'],
        array['Alexander Zverev', 'Quentin Halys', 'Rabindranath Tagore'],
        false, false, md5($2), now()
      )
    `, [postId, cleanContent]);
    console.log('Updated narrative fingerprint for post', postId);

    console.log('Database updates completed successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
