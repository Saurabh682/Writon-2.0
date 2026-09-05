import { generateAllCampaignAssets } from '../services/social-card-generator.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../../../campaign/fomo-ground-floor/rendered-assets');

console.log('🎨 Generating all autonomous FOMO campaign creatives with Sharp...');
const result = await generateAllCampaignAssets(outputDir);
console.log(`✅ Successfully generated ${result.count} high-resolution PNG assets into:`);
console.log(`📂 ${outputDir}`);
for (const f of result.day1) {
  console.log(`   • ${path.basename(f)}`);
}
console.log(`   • ${path.basename(result.day4)}`);
console.log(`   • ${path.basename(result.day5)}`);
