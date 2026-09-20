import 'dotenv/config';
import { getDailyCampaignPayload } from '../services/campaign-dispatcher.js';
import { postToX, postToInstagram, postToInstagramCarousel } from '../services/social-poster.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const payload = await getDailyCampaignPayload(1);

console.log('=====================================================');
console.log(`🚀 WRITON CAMPAIGN [DAY ${payload.day}]: ${payload.theme}`);
console.log('=====================================================\n');

console.log('📸 Rendered PNG Images on Disk:');
for (const img of payload.imageAssets) {
  console.log(`   • campaign/fomo-ground-floor/rendered-assets/${img}`);
}

console.log('\n🔗 Tracked Shortlink:');
console.log(`   ${payload.shortlink}\n`);

console.log('-----------------------------------------------------');
console.log('📱 INSTAGRAM & THREADS CAPTION (Copy & Paste):');
console.log('-----------------------------------------------------');
console.log(payload.captions.en);

console.log('\n-----------------------------------------------------');
console.log('🧵 X (TWITTER) POST / THREAD:');
console.log('-----------------------------------------------------');
console.log(`The writers who joined Substack in 2018 built massive newsletters.
The writers who joined Medium in 2015 built lifelong audiences.

Right now, a new sanctuary for prose, poetry, and essays called WritOn is opening up.

- Zero ads. Zero video clutter.
- Clean card-deck reading (3-min reads).
- Distraction-free native editor.
- Early writers get featured directly on the daily deck.

Your ideal pen name (@handle) is still available today. 

Claim your place before it's crowded:
${payload.shortlink}`);

console.log('\n=====================================================');
console.log('🤖 Attempting API Auto-Publish (if credentials set)...');

const xResult = await postToX({
  text: `The writers who joined Substack in 2018 built massive newsletters.\nThe writers who joined Medium in 2015 built lifelong audiences.\n\nWritOn is opening its doors: zero ads, card-deck reading, pure craft.\n\nClaim your pen name before it's taken:\n${payload.shortlink}`,
});

if (xResult.success) {
  console.log('✅ Successfully published to X (Twitter)! Post ID:', xResult.postId);
} else {
  console.log('ℹ️ X API response:', JSON.stringify(xResult, null, 2));
}

const localSlidePaths = payload.imageAssets.map((img) =>
  path.resolve(__dirname, '../../../campaign/fomo-ground-floor/rendered-assets', img)
);

const igResult = await postToInstagramCarousel({
  localImagePaths: localSlidePaths,
  caption: payload.captions.en,
});

if (igResult.success) {
  console.log('🎉 SUCCESSFULLY PUBLISHED 5-SLIDE CAROUSEL TO INSTAGRAM!');
  console.log('📌 Instagram Published Post ID:', igResult.publishedPostId);
} else {
  console.log('ℹ️ Instagram API response:', JSON.stringify(igResult, null, 2));
}
console.log('=====================================================\n');
