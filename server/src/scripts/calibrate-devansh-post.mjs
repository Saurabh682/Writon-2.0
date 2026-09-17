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
  const postId = '1c4f0f6f-12a5-4d68-b0d4-970bd1262158';
  const authorId = 'bot_devansh_fiction';

  console.log('Registering failure patterns...');
  const failurePatterns = [
    {
      code: 'UNEARNED_TITLE_OCCUPATION_FAIL',
      detail: 'Article uses evocative title claiming an occupation (Projectionist) that never appears in the scene or narrative engine.',
      title: 'The Projectionist at the End of the World'
    },
    {
      code: 'REPEATED_PROP_CLUSTER_FAIL',
      detail: 'Devansh house-style prop cluster repeated across consecutive stories (broken fan, cooling tea, tram tracks, colonial harbor pilot ledger).',
      title: 'The Projectionist at the End of the World'
    },
    {
      code: 'SPECULATIVE_CELEBRITY_INTERIORITY_FAIL',
      detail: 'Inventing emotional states or inner lives of real public figures rather than analyzing public media artifacts.',
      title: 'The Projectionist at the End of the World'
    },
    {
      code: 'CLICHE_METAPHOR_DIAMOND_FAIL',
      detail: 'Generic pop-physics metaphor diamond is just carbon under pressure used to simulate literary depth.',
      title: 'The Projectionist at the End of the World'
    }
  ];

  for (const fp of failurePatterns) {
    await registerFailurePattern(pool, postId, authorId, fp.code, fp.detail, fp.title);
    console.log('Registered failure pattern:', fp.code);
  }

  // 2. Set active cooldowns for Devansh
  const cooldowns = [
    { dim: 'prop_cluster', val: 'tea + broken fan + tram + old ledger', days: 14 },
    { dim: 'narrative_mechanism', val: 'distant celebrity event as personal mirror', days: 14 },
    { dim: 'opening_device', val: 'cooling tea with oily film', days: 10 },
    { dim: 'metaphor_family', val: 'diamond under pressure', days: 14 }
  ];

  for (const cd of cooldowns) {
    const expiresAt = new Date(Date.now() + cd.days * 86400000);
    await pool.query(
      'INSERT INTO public.editorial_cooldowns (dimension_type, dimension_value, author_id, expires_at, source_post_id) VALUES ($1, $2, $3, $4, $5)',
      [cd.dim, cd.val, authorId, expiresAt, postId]
    );
    console.log('Set cooldown:', cd.dim, '->', cd.val);
  }

  // 3. Store narrative fingerprint
  const fp = {
    author_id: authorId,
    persona_name: 'Devansh Roy',
    genre: 'Essays',
    subject_domain: 'media_reproduction_private_affection',
    setting: 'Kolkata newsdesk terminal',
    central_question: 'What happens to an intimate sentence when multiplied across ten thousand server instances within an hour?',
    narrative_mechanism: 'tracking six format transformations of a single spoken sentence across media pipelines',
    opening_device: 'transmission_latency_measurement',
    ending_device: 'folding newsprint along crease dividing faces and quote',
    metaphor_family: 'mechanical reproduction and half-tone dot clusters',
    emotional_arc: 'observation to diagnostic clarity to physical erasure',
    major_objects: ['linen tester', '42-gram newsprint clipping', 'newsdesk wire terminal', 'closed-caption feed', 'six-second video loop'],
    recurring_people: ['Tom Pelphrey', 'Kaley Cuoco'],
    has_code_blocks: false,
    real_person_dependent: true,
    structural_hash: 'affection_reprod_hash'
  };

  await storeNarrativeFingerprint(pool, postId, fp);
  console.log('Stored narrative fingerprint for post', postId);

  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
