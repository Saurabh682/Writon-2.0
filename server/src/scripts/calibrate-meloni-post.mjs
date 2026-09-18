import { Pool } from 'pg';
import dotenv from 'dotenv';
import {
  storeNarrativeFingerprint,
  registerFailurePattern
} from '../bot-engine/editorial-memory-service.js';
import { attachHashtagsAndWatermark } from '../bot-engine/watermark-service.js';

dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const targetPostId = '3442f45f-aa21-4909-ac38-103b4ee09f7d';
  const briefId = 'b1b2be45-b592-4c09-96b0-2c34f2152a10';
  const authorId = 'bot_devansh_fiction';

  console.log(`Calibrating target post ${targetPostId}...`);

  // 1. Register failure patterns for the flawed placeholder post
  const failurePatterns = [
    {
      code: 'PLANNER_PLACEHOLDER_LEAK_FAIL',
      detail: 'Internal brief phrase "A counterintuitive perspective on standard workflows and craftsmanship in short stories" leaked as title and into story body.',
      title: 'A counterintuitive perspective on standard workflows and craftsmanship in short stories.'
    },
    {
      code: 'SOURCE_PREMISE_COMPATIBILITY_FAIL',
      detail: 'Giorgia Meloni postwar governance milestone arbitrarily stapled onto generic rural railway station scene without media provenance.',
      title: 'A counterintuitive perspective on standard workflows and craftsmanship in short stories.'
    },
    {
      code: 'SOURCE_DEPENDENCY_FAIL',
      detail: 'News event inserted into stock tea-stall rumor template ("Word had already spread through the tea stalls about..."). Removing the news leaves an unchanged generic scene.',
      title: 'A counterintuitive perspective on standard workflows and craftsmanship in short stories.'
    },
    {
      code: 'STOCK_NARRATIVE_SCAFFOLD_FAIL',
      detail: 'Overused short-story scaffold: railway platform + stopped station clock + tea stall + goods train + quiet promise of an unwritten journey.',
      title: 'A counterintuitive perspective on standard workflows and craftsmanship in short stories.'
    }
  ];

  for (const fp of failurePatterns) {
    await registerFailurePattern(pool, targetPostId, authorId, fp.code, fp.detail, fp.title);
    console.log('Registered failure pattern:', fp.code);
  }

  // 2. Set cooldowns for the generic railway scaffold
  const cooldowns = [
    { dim: 'scaffold', val: 'railway platform + stopped clock + tea stall + goods train', days: 21 },
    { dim: 'dialogue_trope', val: 'some things change overnight... some take twenty years', days: 21 },
    { dim: 'ending_phrase', val: 'quiet promise of an unwritten journey', days: 21 }
  ];

  for (const cd of cooldowns) {
    const expiresAt = new Date(Date.now() + cd.days * 86400000);
    await pool.query(
      'INSERT INTO public.editorial_cooldowns (dimension_type, dimension_value, author_id, expires_at, source_post_id) VALUES ($1, $2, $3, $4, $5)',
      [cd.dim, cd.val, authorId, expiresAt, targetPostId]
    );
    console.log('Set cooldown:', cd.dim, '->', cd.val);
  }

  // 3. Calibrated Essay Prose
  const calibratedTitle = 'Three Headlines for the Same 1,400 Days';
  const calibratedSlug = 'three-headlines-for-the-same-1400-days-3442f45f-7a7';
  const calibratedCategory = 'Essays';
  const calibratedSummary = 'A documentary study of three competing wire dispatches following the September 4 milestone in Rome, examining the gap between parliamentary longevity and municipal administrative reality.';

  const rawCalibratedEssay = `### The Wire Copy and the State Release

On September 4, when the Italian prime minister surpassed Silvio Berlusconi's 2001–2006 record to become the longest-serving government leader in Italy's postwar republic, the milestone crossed wire services under three distinct editorial geometries.

The first dispatch came from Rome's official government channels: a commemorative graphic claiming political stability as an accomplished institutional fact. In that framing, longevity itself functioned as verification. Surviving roughly 1,400 consecutive days in an office that had changed hands nearly seventy times since 1946 was presented not merely as an administrative timeline, but as proof that electoral continuity had cured parliamentary fragmentation.

Two hours later, an external diplomatic congratulation was released from New Delhi: Narendra Modi characterized the record tenure as a reflection of enduring public trust. Here, transmission shifted the milestone from domestic parliamentary arithmetic into bilateral rapport, emphasizing executive durability for international partners.

### The Contextual Wire and the Unresolved Balance

The third transmission, filed by Reuters from Rome, opened by recording the mathematical fact of the calendar before juxtaposing it against public service realities. While the prime minister's coalition cited stability to reassure bond markets, domestic trade unions and opposition spokespersons pointed out that calendar duration had left hospital waitlists, regional train delays, and low wage growth unresolved. Longevity had preserved the cabinet room, but it had not altered the mechanics of municipal infrastructure.

When political reporting covers tenure records, it frequently conflates duration with institutional transformation. The documentary record shows a different friction: an administration can master the parliamentary calculus required to prevent a no-confidence vote while the underlying public administration moves at its own stubborn, unhurried pace.

Watching wire copy move across editorial desks makes that divergence legible. The official release celebrates the count of days; the external partner praises political authority; the regional ledger simply logs what the trains carried before the record was broken and what they carry after.`;

  const finalContent = attachHashtagsAndWatermark(
    rawCalibratedEssay,
    calibratedCategory,
    'giorgia meloni',
    calibratedCategory,
    ['giorgiameloni', 'italy', 'wirecopy']
  );

  // 4. Update the post in public.posts
  const updatePostRes = await pool.query(`
    UPDATE public.posts
    SET
      title = $1,
      slug = $2,
      category = $3,
      summary = $4,
      content = $5,
      reading_time_min = 4,
      updated_at = now()
    WHERE id = $6
    RETURNING id, title, slug, category
  `, [
    calibratedTitle,
    calibratedSlug,
    calibratedCategory,
    calibratedSummary,
    finalContent,
    targetPostId
  ]);

  console.log('Updated post in database:', updatePostRes.rows[0]);

  // 5. Update the brief in public.editorial_research_briefs
  await pool.query(`
    UPDATE public.editorial_research_briefs
    SET
      topic_category = 'Essays',
      editorial_angle = 'A documentary study of three competing wire dispatches following the September 4 milestone in Rome, examining the gap between parliamentary longevity and municipal administrative reality.',
      updated_at = now()
    WHERE id = $1
  `, [briefId]);
  console.log('Updated editorial research brief', briefId);

  // 6. Store updated narrative fingerprint
  const fp = {
    author_id: authorId,
    persona_name: 'Devansh Roy',
    genre: 'Essays',
    subject_domain: 'wire_transmission_political_tenure',
    setting: 'Wire service editorial desk',
    central_question: 'How does political tenure record reporting diverge between state release, diplomatic transmission, and regional municipal reality?',
    narrative_mechanism: 'comparing three editorial geometries of wire copy filed on the same afternoon',
    opening_device: 'transmission_timestamp_comparison',
    ending_device: 'contrasting the count of days with regional railway cargo manifests',
    metaphor_family: 'editorial desk, wire copy, transmission cables',
    emotional_arc: 'objective tracking to civic clarity',
    major_objects: ['wire copy terminal', 'state press release', 'diplomatic congratulation cable', 'regional rail ledger'],
    recurring_people: ['Giorgia Meloni', 'Silvio Berlusconi', 'Narendra Modi'],
    has_code_blocks: false,
    real_person_dependent: true,
    structural_hash: 'wire_tenure_1400_hash'
  };

  await storeNarrativeFingerprint(pool, targetPostId, fp);
  console.log('Stored calibrated narrative fingerprint for post', targetPostId);

  await pool.end();
  console.log('Calibration complete!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
