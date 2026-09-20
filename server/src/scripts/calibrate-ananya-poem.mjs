import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// The Calibrated Nepal Hydropower Story:
// 1. Title/premise fixed: "The Shares Beneath the Silt" (resolves premise violation of "The Weight of Wet Concrete")
// 2. Bound to real event: Nepal, Rasuwa, Upper Trishuli run-of-the-river project, August 26 glacial collapse flood
// 3. Pension details grounded: local resident share quota and Dhunche bank share certificate in plastic sack
// 4. Removed Iran wedding strike comparison completely (prevents TRAGEDY_STACKING_FAIL and CAUSAL_EQUIVALENCE_FAIL)
// The Calibrated Nepal Hydropower Story:
// 1. Fixed central asset: Rasuwagadhi Hydropower Company (111 MW, issued 10% local resident shares in 2022)
// 2. Removed Upper Trishuli mismatch & 30 MW line; replaced with authentic father line: "I still have the allotment number... They told us the shares would be for our children."
// 3. Removed unsupported regional debris statistic (2 million tonnes at plant) and "six feet of pulverized schist"
// 4. Fixed geography: "above Syabrubesi" in Rasuwa district
// 5. Grounded denial: "The plant is still there." without speculative tunnel claims
// 6. Ending preserved: scraping boot heel until coin-sized crust drops with soft click
const calibratedStory = `### The Silt Line

The waterline on the kitchen wall has dried into a gray mark that stops level with my father's shoulder. In the corner, where the masonry meets the doorframe of our house above Syabrubesi, a skim of fine mountain silt has begun to peel from the plaster like dry paper.

My father does not touch the wall. He sits on a low wooden stool, holding a blue plastic fertilizer sack across his knees. Inside are his printed Rasuwagadhi Hydropower allotment papers, bought under the project-affected residents' quota when shares were offered across the valley. The paper inside the sack is damp at the edges, but the stamp from the collection counter in Dhunche is still legible through the polyethylene.

"I still have the allotment number," he says. He speaks without looking up from the bag. "They told us the shares would be for our children."

Down along the riverbed, the water is no longer surging, but the banks and access road are buried beneath grey silt, boulders, and shattered timber. On August 26, when the glacial collapse hit the upper catchment across the border, the flood did not arrive as clean water. It came as a dense slurry moving fast enough to wedge trees into the intake gates and drive mud deep into the powerhouse. The plant had been built around predictable seasonal flow from the monsoon; it was never designed to swallow a collapsing mountain.

### The Passbook in the Kitchen

Outside, in the lane below our terrace, our neighbor is trying to haul a hand-tiller out of the ditch. The metal makes a dull clink against river stone, moves an inch, and jams. He leaves the towline slack and sits down on the mud bank to catch his breath.

My father reaches down to the floor, picks up a dull kitchen knife, and begins prying caked silt from the treads of his work boots. He works deliberately, following the deep rubber grooves around the heel.

"The cooperative office in the bazaar is submerged up to the lintel," I tell him. "They won't be certifying share transfers or dividend ledgers this quarter."

"The plant is still there," he answers.

He simply continues scraping the heel of his left boot. A dried crust of gray silt the size of a coin breaks loose and drops with a soft click against the cement floor.`;

const title = 'The Shares Beneath the Silt';
const slug = 'the-shares-beneath-the-silt-24305149-bca';
const summary = 'In the aftermath of the Trishuli valley flood above Syabrubesi, a father holds his Rasuwagadhi Hydropower allotment papers while scraping river silt from his boots.';

async function evaluateAndRebuild() {
  console.log('1. Checking Zero AI Slop hard gates (Rules 47-56)...');
  const { validateZeroAISlopEngineBlockers } = await import('../bot-engine/editorial-intelligence-service.js');
  const gateCheck = validateZeroAISlopEngineBlockers({
    title,
    content: calibratedStory,
    category: 'Short Stories',
    persona: { penName: 'atharv_bhav', fullName: 'Atharva Bhavsar' }
  });

  if (!gateCheck.isValid) {
    console.error('Hard Gate Violations:', gateCheck.violations);
    process.exit(1);
  }
  console.log('Zero AI Slop Hard Gates: PASSED (0 violations)');

  console.log('\n2. Verifying with local LM Studio on port 1234...');
  const { reviewDraftWithLmStudio } = await import('../services/lm-studio-critic.js');
  const lmReview = await reviewDraftWithLmStudio({
    title,
    content: calibratedStory,
    category: 'Short Stories',
    author: 'Atharva Bhavsar'
  });

  console.log('LM Studio Available:', lmReview.available);
  console.log('Score:', lmReview.score, 'Verdict:', lmReview.verdict);
  console.log('\n--- LM Studio Critique ---');
  console.log(lmReview.critique);
  console.log('---------------------------\n');

  if (lmReview.available && lmReview.verdict !== 'APPROVE') {
    console.error('LM Studio rejected the draft. Aborting DB update.');
    process.exit(1);
  }

  console.log('3. Attaching thematic hashtags and watermark...');
  const { attachHashtagsAndWatermark } = await import('../bot-engine/watermark-service.js');
  const taggedContent = attachHashtagsAndWatermark(calibratedStory, 'Short Stories', title, 'Short Stories', ['nepalhydropower', 'localshares', 'trishulivalley']);

  console.log('4. Persisting approved story with hashtags to PostgreSQL...');
  const res = await pool.query(`
    UPDATE public.posts
    SET title = $1,
        slug = $2,
        summary = $3,
        content = $4,
        updated_at = NOW()
    WHERE id = 'c8fdc4bb-b1b6-486e-a1df-3e01a3cdf235'
    RETURNING id, title, category, updated_at;
  `, [title, slug, summary, taggedContent]);

  console.log('PostgreSQL Updated with tags:', res.rows[0]);
  await pool.end();
}

evaluateAndRebuild().catch(console.error);

