import { publishShort17ReelAndStory } from './publish_short17_reel.mjs';

const TARGET_TIME_ISO = '2026-09-24T02:30:00.000Z'; // 08:00 AM IST on Sept 24, 2026
const target = new Date(TARGET_TIME_ISO);
const now = new Date();
const delayMs = target.getTime() - now.getTime();

console.log('====================================================');
console.log('⏰ WRITON SHORTS 17 DISPATCH SCHEDULER');
console.log(`Current Time (UTC): ${now.toISOString()}`);
console.log(`Target Time (UTC):  ${target.toISOString()} (08:00 AM IST)`);
console.log(`Countdown:          ${(delayMs / 1000 / 60 / 60).toFixed(2)} hours (${Math.round(delayMs / 1000)} seconds)`);
console.log('====================================================');

if (delayMs <= 0) {
  console.log('⚡ Target time has already arrived or passed! Executing immediately...');
  publishShort17ReelAndStory().catch(console.error);
} else {
  console.log(`⏳ Waiting ${Math.round(delayMs / 1000)}s until 8:00 AM IST...`);
  setTimeout(async () => {
    console.log('🚀 [8:00 AM IST TRIGGER] Executing scheduled dispatch for Short 17...');
    try {
      await publishShort17ReelAndStory();
      console.log('✅ Scheduled publication completed successfully at 8:00 AM IST!');
    } catch (err) {
      console.error('❌ Scheduled publication failed:', err);
    }
  }, delayMs);
}
