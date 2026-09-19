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
  const targetPostId = 'e82895e1-beb8-434c-90da-342a02c271f9';
  const authorId = 'bot_writer_095';

  console.log(`Calibrating target post ${targetPostId} (Anandita Dutta)...`);

  // 1. Register failure patterns for the flawed draft
  const failurePatterns = [
    {
      code: 'SOURCE_CAUSAL_RELEVANCE_FAIL',
      detail: 'Uttarakhand Waqf Board revised nikahnama headline mechanically attached to Assamese riverbank land dispute as thematic perfume.',
      title: 'The Weight of Wet Paper'
    },
    {
      code: 'METAPHORIC_SOURCE_BRIDGING_FAIL',
      detail: 'Used synthetic rhetorical bridge ("the friction is identical") to couple unrelated national legal headlines with fictional scene.',
      title: 'The Weight of Wet Paper'
    },
    {
      code: 'SHORT_STORY_STAKES_BINDING',
      detail: 'Narrator stated "I do not sign anything" without establishing the document, the uncle\'s demand, or what was surrendered.',
      title: 'The Weight of Wet Paper'
    },
    {
      code: 'MATERIAL_REALITY_OVER_SYMBOLISM',
      detail: 'River erosion reduced to abstract poetic metaphor ("who is merely permitted to stand upon it while the water rises") instead of physical mechanism altering cadastral boundaries.',
      title: 'The Weight of Wet Paper'
    },
    {
      code: 'GLOBAL_PROP_CLUSTER_COOLDOWN',
      detail: 'Overused clichéd WritOn house prop cluster: mahogany desk + fountain pen + chipped teapot + film on cooling tea + bruise-stained desk.',
      title: 'The Weight of Wet Paper'
    }
  ];

  for (const fp of failurePatterns) {
    await registerFailurePattern(pool, targetPostId, authorId, fp.code, fp.detail, fp.title);
    console.log('Registered failure pattern:', fp.code);
  }

  // 2. Set cooldowns for the clichéd props and empty metaphors
  const cooldowns = [
    { dim: 'prop', val: 'chipped teapot / chipped ceramic vessel', days: 30 },
    { dim: 'prop', val: 'film of oil / skin forming on cooling tea', days: 30 },
    { dim: 'prop', val: 'mahogany desk with bruise-shaped ink stain', days: 30 },
    { dim: 'prop', val: 'inherited father fountain pen', days: 21 },
    { dim: 'phrase', val: 'the friction is identical', days: 30 },
    { dim: 'metaphor', val: 'navigate the shifting currents without a compass', days: 30 }
  ];

  for (const cd of cooldowns) {
    const expiresAt = new Date(Date.now() + cd.days * 86400000);
    await pool.query(
      'INSERT INTO public.editorial_cooldowns (dimension_type, dimension_value, author_id, expires_at, source_post_id) VALUES ($1, $2, $3, $4, $5)',
      [cd.dim, cd.val, authorId, expiresAt, targetPostId]
    );
    console.log('Set cooldown:', cd.dim, '->', cd.val);
  }

  // 3. Calibrated Short Story Prose
  const calibratedTitle = 'The Weight of Wet Paper';
  const calibratedSlug = 'the-weight-of-wet-paper-26c9df94-ff3';
  const calibratedCategory = 'Short Stories';
  const calibratedSummary = 'When an uncle demands consent for an undisputed partition of an ancestral plot in North Guwahati, the cadastral map collides with thirty years of Brahmaputra bank erosion.';

  const rawCalibratedStory = `### The Cadastral Fold

The blue cloth backing of the 1968 cadastral map had split along the fold line for Dag Number 42, separating our homestead plot from the river boundary.

My uncle laid his ballpoint pen beside the revenue stamp. He had traveled thirty kilometers by shared taxi from Palashbari to reach our veranda in North Guwahati before the circle office closed for the weekend. The affidavit on the table was already notarized on non-judicial stamp paper. It stated that our family consented to the undisputed partition of the ancestral three kathas under the existing dag boundaries, allowing separate pattas to be issued for each share.

"Sign the second page," he said, pressing his thumb against the margin. "The revenue circle officer said if the partition consent is not registered this month, the patta stays frozen under dispute."

I did not take the pen. I unfolded the survey sheet across the low cane table. In the revenue surveyor's ink from fifty-eight years ago, the eastern edge of Dag 42 was fixed by three permanent markers: the culvert on the public road, an old jackfruit tree, and the high earthen bank of the Brahmaputra.

The culvert was still standing. But the jackfruit tree had slid into the water during the floods of 2014, and the riverbank itself had receded more than forty meters westward across our lower paddy. The land my uncle was asking me to partition on paper no longer existed in the physical world.

### The Boundary in the Water

"If I sign this consent," I said, "we are certifying to the revenue circle that the old boundaries stand. You will take the dry upper parcel along the paved road, and our share will be registered on the lower katha."

"The deed recognizes the full acreage," my uncle said, his voice tightening. "The government does not redraw the dag map after every monsoon. We divide what the title paper says we own."

"The lower katha is five feet beneath the river channel," I told him. "A boat crosses it twice every morning to reach the sandbar. If the circle officer enters this partition without field verification, our family will be paying annual land revenue on twenty yards of riverbed."

He pulled the papers toward his chest. "If we call for a fresh survey, they’ll mark the eroded portion separately. Once that happens, you know what becomes of the river-side share."

That was the actual transaction: he wanted documentary finality today, and he wanted my signature to absorb the loss that the river had already claimed.

A small beetle crawled from under the wooden map weight, stepped onto the blue margin of the survey sheet, crossed the faded surveyor's seal, and dropped off the wicker edge into the dust. Outside, between the bamboo clumps, the brown surface of the Brahmaputra moved east to west, heavy, silent, and indifferent to the registered acreage of the circle office.

### The Refusal

My mother came out from the kitchen carrying two stainless steel glasses of warm water. She set them on the wooden stool between us. She looked at the folded map, recognized the split along the center fold, and looked down at the courtyard where the garden ended at the bamboo fence. She did not ask about the partition.

"I will not sign the affidavit," I told my uncle.

He stared at me, his fingers curling over the notarized stamp paper. "The dispute will go before the assistant revenue settlement officer. You will lose the whole estate in litigation fees."

"Then let the survey team come to the bank and mark what is actually there," I said. "We will record what is left of the land, not what the grandfather wrote before the embankment collapsed."

He did not drink the water. He gathered his stamp papers, slid them into a brown plastic folder, snapped the rubber band around it, and walked down the veranda steps into the humid air. I stayed on the wicker bench, smoothing the split canvas of the old map, listening to the dull, steady slap of water against the cut bank below the silt road.`;

  const finalContent = `${rawCalibratedStory}\n\n---\n\n#brahmaputra #assam #landrecords #shortstories #rivererosion\n\n\u200B\uFEFF#writon\u200B`;

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

  // 5. Store updated narrative fingerprint
  const fp = {
    author_id: authorId,
    persona_name: 'Anandita Dutta',
    genre: 'Short Stories',
    subject_domain: 'land_records_cadastral_erosion',
    setting: 'Veranda overlooking the Brahmaputra in North Guwahati',
    central_question: 'What happens when a family inheritance deed legally defines a boundary that river erosion has physically erased?',
    narrative_mechanism: 'confrontation between an uncle bearing an affidavit and a niece comparing the 1968 cadastral map to the eroded riverbank',
    opening_device: 'split cloth backing of an old cadastral map',
    ending_device: 'refusal to sign affidavit, listening to the river eat the clay bank',
    metaphor_family: 'cadastral maps, dag numbers, revenue stamps, survey chains, river silt',
    emotional_arc: 'legal pressure to grounded resolve',
    major_objects: ['1968 cadastral map', 'notarized affidavit', 'fifty-rupee stamp paper', 'cane table', 'wooden map weight'],
    recurring_people: ['Uncle', 'Mother', 'Revenue Circle Officer'],
    has_code_blocks: false,
    real_person_dependent: false,
    structural_hash: 'anandita_cadastral_42_hash'
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
