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
    const postId = 'bcaf3f60-0538-478a-9c4d-731a62d6d233';
    const cleanContent = fs.readFileSync(
      'C:/Users/Kumar/.gemini/antigravity/brain/473d28a3-99b1-461c-a12b-69f9a319d26c/scratch/draft_meera_mirzapur.txt',
      'utf-8'
    ).trim();
    const cleanTitle = 'When Streaming Memory Enters the Cinema Hall';
    const cleanSummary = 'Mirzapur: The Movie tests whether an intimate relationship with a streaming series can be converted into community viewing in the cinema hall.';

    // 1. Update post in public.posts
    const updateRes = await client.query(`
      update public.posts
      set title = $1,
          summary = $2,
          content = $3,
          reading_time_min = 3,
          updated_at = now()
      where id = $4
      returning id, title, slug, reading_time_min, updated_at
    `, [cleanTitle, cleanSummary, cleanContent, postId]);

    console.log('Updated post:', updateRes.rows[0]);

    // 2. Register failure patterns in public.editorial_failure_patterns
    const failurePatterns = [
      {
        code: 'FIRST_PERSON_WITNESS_CLAIM_FAIL',
        detail: 'Prohibits claiming to attend real venues, observe real crowds, witness live audience behavior, or describe scene attendants in non-fiction, research-grounded or culture essays without source evidence.'
      },
      {
        code: 'UNVERIFIED_INDUSTRY_FIRST_FAIL',
        detail: 'Prohibits claiming "first ever", "first Indian", "first in history" or sweeping industry milestones without explicit primary source corroboration.'
      },
      {
        code: 'FICTIONAL_PRECISION_FAIL',
        detail: 'Prohibits synthetic technical precision metrics (wattage, seat counts, ticket prices) in cultural essays and non-fiction commentary.'
      }
    ];

    for (const pat of failurePatterns) {
      await client.query(`
        insert into public.editorial_failure_patterns (id, post_id, author_id, failure_code, failure_detail, draft_title, created_at)
        values (gen_random_uuid(), $1, 'bot_writer_021', $2, $3, $4, now())
      `, [postId, pat.code, pat.detail, cleanTitle]);
    }
    console.log('Registered 3 new failure patterns in public.editorial_failure_patterns');

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
        gen_random_uuid(), $1, 'bot_writer_021', 'Meera Varma', 'Culture', 'Indian Cinema & Streaming', 'Theatrical Distribution & Streaming Culture',
        'Can solitary streaming intimacy convert into communal theatrical ritual?',
        'industry_thesis_analysis', 'documented_creative_thesis', 'cultural_wager_resolution',
        'foreknowledge_and_memory', 'deliberation_to_cultural_wager',
        array['fifty-foot screen', 'phone screen', 'theatre sound system', 'ticket'],
        array['Munna Tripathi', 'Akhandanand Tripathi', 'Guddu Pandit', 'Pankaj Tripathi', 'Gurmmeet Singh'],
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
