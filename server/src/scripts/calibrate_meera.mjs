import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import {
  storeNarrativeFingerprint,
  registerFailurePattern
} from '../bot-engine/editorial-memory-service.js';

dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const postId = 'bcaf3f60-0538-478a-9c4d-731a62d6d233';
    const authorId = 'bot_writer_021';
    const draftPath = 'C:/Users/Kumar/.gemini/antigravity/brain/473d28a3-99b1-461c-a12b-69f9a319d26c/scratch/draft_meera_mirzapur.txt';
    const draftContent = fs.readFileSync(draftPath, 'utf8').trim();

    const title = 'When Streaming Memory Enters the Cinema Hall';
    const slug = 'when-streaming-memory-enters-the-cinema-hall-bcaf3f60';
    const summary = 'When Mirzapur: The Movie brings an OTT franchise into theatres as a prequel, resurrecting Munna Tripathi before an audience that already watched him die, streaming memory becomes industrial nostalgia.';
    const readingTimeMin = 4;

    console.log(`Updating post ${postId}...`);
    const updateRes = await client.query(`
      update public.posts
      set title = $1,
          slug = $2,
          summary = $3,
          content = $4,
          reading_time_min = $5,
          updated_at = now()
      where id = $6
      returning id, title, slug, author_id
    `, [title, slug, summary, draftContent, readingTimeMin, postId]);

    console.log('Post updated in DB:', updateRes.rows[0]);

    // 1. Register failure patterns for the leaked post
    console.log('Registering failure patterns...');
    const failurePatterns = [
      {
        code: 'PLANNER_TEXT_LEAK_FAIL',
        detail: 'Internal planning description "An exploration of failure, patience, and recovery within the realm of culture" leaked directly into title and body paragraphs.',
        title: 'The Living Heritage of An exploration of failure, patience, and recovery within the realm of culture.'
      },
      {
        code: 'SOURCE_WITHOUT_ARGUMENT_FAIL',
        detail: 'Article cites Mirzapur: The Movie source solely as a license to talk about generic static heritage rather than addressing the actual theatrical adaptation and prequel mechanics.',
        title: 'The Living Heritage of An exploration of failure, patience, and recovery within the realm of culture.'
      },
      {
        code: 'GENERIC_CULTURE_TEMPLATE_FAIL',
        detail: 'Interchangeable Mad Lib culture scaffolding ("Every city carries within its stones...", "time is measured not in seconds...", "heritage is not a static museum relic").',
        title: 'The Living Heritage of An exploration of failure, patience, and recovery within the realm of culture.'
      },
      {
        code: 'UNATTRIBUTED_APHORISM_FAIL',
        detail: 'Unattributed quote-card pull quote > "Culture is what remains when everything ephemeral has been forgotten."',
        title: 'The Living Heritage of An exploration of failure, patience, and recovery within the realm of culture.'
      },
      {
        code: 'ABSTRACT_CULTURE_WITHOUT_OBJECT_FAIL',
        detail: 'Essay stuffed with abstract tokens (heritage, tradition, continuum, craft, vernacular) without concrete objects, people, or performance scenes.',
        title: 'The Living Heritage of An exploration of failure, patience, and recovery within the realm of culture.'
      }
    ];

    for (const fp of failurePatterns) {
      await registerFailurePattern(pool, postId, authorId, fp.code, fp.detail, fp.title);
      console.log('Registered failure pattern:', fp.code);
    }

    // 2. Set active cooldowns for Meera Varma and platform
    const cooldowns = [
      { dim: 'title_formula', val: 'the living heritage of [topic]', days: 14 },
      { dim: 'metaphor_family', val: 'every city carries within its stones an archive of memory', days: 14 },
      { dim: 'opening_device', val: 'verandah and spices generic culture opening', days: 10 },
      { dim: 'narrative_mechanism', val: 'heritage is not a static museum relic', days: 14 }
    ];

    for (const cd of cooldowns) {
      const expiresAt = new Date(Date.now() + cd.days * 86400000);
      await client.query(
        'INSERT INTO public.editorial_cooldowns (dimension_type, dimension_value, author_id, expires_at, source_post_id) VALUES ($1, $2, $3, $4, $5)',
        [cd.dim, cd.val, authorId, expiresAt, postId]
      );
      console.log('Set cooldown:', cd.dim, '->', cd.val);
    }

    // 3. Store calibrated narrative fingerprint
    const fp = {
      author_id: authorId,
      persona_name: 'Meera Varma',
      genre: 'Culture',
      subject_domain: 'streaming_franchise_theatrical_adaptation',
      setting: 'Gorakhpur single-screen cinema hall',
      central_question: 'What happens when an intimate, phone-screen memory is converted into an eight-hundred-seat theatrical ritual?',
      narrative_mechanism: 'contrasting the private solitary consumption of streaming television with the amplified collective chanting of cinema halls',
      opening_device: 'projector_lamp_humming_before_curtain',
      ending_device: 'audience shouting lines before actor speaks as private world departs',
      metaphor_family: 'theatrical tragedy versus commercial prequel memory erasure',
      emotional_arc: 'curiosity to diagnostic cultural critique to lingering absence',
      major_objects: ['single-screen projector lamp', 'balcony seats', 'white safari suit', 'country-made pistol', 'theatre flashlight'],
      recurring_people: ['Munna Tripathi', 'Kaleen Bhaiya', 'Guddu Pandit'],
      has_code_blocks: false,
      real_person_dependent: true,
      structural_hash: 'mirzapur_theatre_nostalgia_hash'
    };

    await storeNarrativeFingerprint(pool, postId, fp);
    console.log('Stored narrative fingerprint for post', postId);

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
