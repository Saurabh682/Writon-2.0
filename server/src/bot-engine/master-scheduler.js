/**
 * WritOn Master Daily Publishing & Review Scheduler
 *
 * Coordinates platform operations across:
 * - 07:00 AM IST: Dawn Digest (Poetry, Philosophy, Essays)
 * - 10:30 AM IST: Morning Tech & Mobility Review (EVs, Flagship Phones, Laptops)
 * - 01:30 PM IST: Lunch Break Satire (Humour, Workplace Chronicles, Culture)
 * - 04:30 PM IST: Afternoon Gear Lab (Keyboards, Coffee Tech, EDC, Audio)
 * - 07:30 PM IST: Evening Storytelling (Short Stories, Regional Cinema)
 * - 09:30 PM IST: Prime-Time Screens Review (Anime Sakuga, Prestige TV, IMAX)
 * - 11:00 PM IST: Midnight Courtyard (Ghazals, Classical Shayari)
 * - 02:00 AM IST: Housekeeping (Database Indexing & Retention Cleanup)
 */

import { runSparkPulse } from './spark-runner.js';
import { REVIEW_PERSONAS } from './review-personas.js';
import { generateStructuredReview } from './review-generator.js';
import { conductDeepTrendResearch } from './trend-scout-service.js';
import { ingestSparkBatch } from './spark-runner.js';
import { getProductCoverImage } from './image-service.js';

// 8 Defined Operational Windows in Indian Standard Time (IST = UTC + 5:30)
const SCHEDULE_SLOTS = [
  { id: 'dawn_digest', hour: 7, minute: 0, type: 'editorial', name: 'Dawn Digest (Poetry/Essays)' },
  { id: 'morning_tech', hour: 10, minute: 30, type: 'review_mobility', name: 'Morning Tech & Mobility' },
  { id: 'lunch_satire', hour: 13, minute: 30, type: 'editorial', name: 'Lunch Satire (Humour/Culture)' },
  { id: 'afternoon_gear', hour: 16, minute: 30, type: 'review_gear', name: 'Afternoon Gear Lab' },
  { id: 'evening_fiction', hour: 19, minute: 30, type: 'editorial', name: 'Evening Storytelling' },
  { id: 'prime_screens', hour: 21, minute: 30, type: 'review_screens', name: 'Prime-Time Screen Reviews' },
  { id: 'midnight_poetry', hour: 23, minute: 0, type: 'editorial', name: 'Midnight Courtyard (Shayari)' },
  { id: 'housekeeping', hour: 2, minute: 0, type: 'maintenance', name: 'Nightly Housekeeping' }
];

// Track fired slots per date (IST) to prevent duplicate runs
const firedSlots = new Set();

function getIstTime() {
  const now = new Date();
  // IST offset: +5.5 hours (+330 minutes)
  const istOffsetMs = 330 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  return {
    dateStr: istDate.toISOString().slice(0, 10),
    hours: istDate.getUTCHours(),
    minutes: istDate.getUTCMinutes()
  };
}

export function startMasterDailyScheduler(pool) {
  console.log('[Master Scheduler] Initialized 24-Hour Autonomous Publishing & Review Clock (IST)');

  const intervalTimer = setInterval(async () => {
    try {
      const { dateStr, hours, minutes } = getIstTime();

      for (const slot of SCHEDULE_SLOTS) {
        const slotKey = `${dateStr}_${slot.id}`;

        // Check if within a 15-minute execution window of the scheduled time
        const slotTotalMins = slot.hour * 60 + slot.minute;
        const currentTotalMins = hours * 60 + minutes;
        const diffMins = currentTotalMins - slotTotalMins;

        if (diffMins >= 0 && diffMins <= 15 && !firedSlots.has(slotKey)) {
          firedSlots.add(slotKey);
          console.log(`[Master Scheduler] ⏰ Triggering Slot: ${slot.name} (${slot.id})`);
          await executeScheduledSlot(pool, slot);
        }
      }
    } catch (err) {
      console.error('[Master Scheduler Error]', err.message);
    }
  }, 60 * 1000); // Evaluates every 60 seconds

  return () => clearInterval(intervalTimer);
}

async function executeScheduledSlot(pool, slot) {
  if (slot.type === 'editorial') {
    await runSparkPulse(pool).catch(e => console.error('[Editorial Slot Error]', e.message));
    return;
  }

  if (slot.type.startsWith('review_')) {
    let domainFilter = [];
    if (slot.type === 'review_mobility') {
      domainFilter = ['EVs & Battery Tech', 'Performance ICE Cars', 'Urban Commuter Bikes & EV 2W', 'Flagship Smartphones', 'Laptops, Silicon & Chips'];
    } else if (slot.type === 'review_gear') {
      domainFilter = ['Custom Mechanical Keyboards', 'Coffee Gear & Espresso Tech', 'EDC Gear & Rugged Tools', 'Headphones, IEMs & Audio Gear', 'Cameras, Prime Lenses & Optics'];
    } else if (slot.type === 'review_screens') {
      domainFilter = ['Shonen Anime & Sakuga Animation', 'Seinen & Psychological Anime', 'Prestige TV & Streaming Series', 'Hollywood Blockbusters & Sci-Fi Cinema', 'Gaming Handhelds & Consoles'];
    }

    const eligible = REVIEW_PERSONAS.filter(p => domainFilter.includes(p.domain));
    const reviewer = eligible[Math.floor(Math.random() * eligible.length)] || REVIEW_PERSONAS[0];

    const sampleTopic = `Latest ${reviewer.domain} Hardware Benchmark`;
    const dossier = await conductDeepTrendResearch(sampleTopic, reviewer.category).catch(() => null);

    const reviewData = generateStructuredReview({
      productName: sampleTopic,
      reviewer,
      researchDossier: dossier
    });

    const coverImage = getProductCoverImage(reviewer.domain, sampleTopic);

    await ingestSparkBatch(pool, {
      stories: [
        {
          authorPenName: reviewer.penName,
          title: reviewData.title,
          summary: reviewData.summary,
          content: reviewData.content,
          category: reviewer.category,
          coverImage,
          publishedAt: new Date().toISOString()
        }
      ]
    }).catch(e => console.error('[Review Slot Ingest Error]', e.message));

    console.log(`[Master Scheduler] ✅ Published Review: "${reviewData.title}" by @${reviewer.penName}`);
    return;
  }

  if (slot.type === 'maintenance') {
    console.log('[Master Scheduler] 🧹 Running Nightly Database Maintenance');
    await pool.query(`
      delete from public.reader_feed_sessions where created_at < now() - interval '30 days';
      delete from public.reader_behavior_events where created_at < now() - interval '90 days';
    `).catch(() => {});
  }
}
