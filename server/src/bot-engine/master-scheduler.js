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

import { processDueDelayedActions, runSparkPulse } from './spark-runner.js';
import { processOutboxEvents } from './outbox-service.js';
import { REVIEW_PERSONAS } from './review-personas.js';
import { generateStructuredReview } from './review-generator.js';
import { generateSparkArticle } from './gemini-spark-client.js';
import { conductDeepTrendResearch, getLiveDailyTrends } from './trend-scout-service.js';
import { orchestrateTrendPipeline, routeTopicToEditorialSlot } from './trend-orchestrator.js';
import { ingestSparkBatch } from './spark-runner.js';
import { getProductCoverImage } from './image-service.js';
import { resolveReviewCategory } from './content-relevance-service.js';
import {
  claimEditorialBriefForPublication,
  getNextApprovedEditorialBrief,
  holdEditorialBriefForReview,
  markEditorialBriefPublished,
  queueEditorialBrief,
  releaseEditorialBriefClaim
} from './editorial-approval-service.js';
import {
  buildEditorialBrief,
  normalizeTrendTopic,
  reevaluateAutomaticEditorialBrief
} from './editorial-intelligence-service.js';

// Domain-specific product candidates for specialist reviews
export const DOMAIN_PRODUCT_CANDIDATES = {
  'EVs & Battery Tech': [
    'Tata Curvv EV 55kWh Real-World Highway Range & Thermal Stress Test',
    'Mahindra BE 6e Fast-Charging Curve & BMS Thermal Analysis',
    'BYD Seal Performance Battery Degradation at 20,000 km Assessment',
    'MG Windsor EV Battery-as-a-Service Real Cost Assessment',
    'Hyundai Ioniq 5 Highway Efficiency in Extreme Heat'
  ],
  'Performance ICE Cars': [
    'Hyundai Verna 1.5 Turbo DCT Track Assessment & Chassis Balance',
    'Skoda Slavia 1.5 TSI Manual Steering Feedback on Indian Tarmac',
    'BMW M340i LCI Mechanical Feedback & Dual-Clutch Latency',
    'Volkswagen Virtus GT DSG Heat Management in Stop-Go Traffic',
    'Mahindra Thar Earth Edition Highway Ride Quality & NVH'
  ],
  'Urban Commuter Bikes & EV 2W': [
    'Ather 450X Apex vs Ola S1 Pro Gen 2 City Pothole & Suspension Benchmark',
    'TVS iQube ST Real-World Commute Heat & Range Test',
    'Royal Enfield Guerrilla 450 Pillion Ergonomics & City Heat Assessment',
    'Hero Vida V1 Pro Removable Battery Durability in Monsoon Traffic',
    'Bajaj Freedom 125 CNG vs Petrol City Cost-per-Kilometer'
  ],
  '4x4 Off-Roaders & Expedition SUVs': [
    'Mahindra Thar Roxx 4x4 Axle Articulation & Transfer Case Crawl Ratio',
    'Force Gurkha 5-Door Mechanical Diff Lock Performance on Mountain Slopes',
    'Maruti Suzuki Jimny Alpha Low-Range Crawl in Riverbed Rock'
  ],
  'Flagship Smartphones': [
    'Vivo X100 Pro vs Xiaomi 14 Ultra: Telephoto & Perspective Compression',
    'Pixel 9 Pro Tensor G4 Thermal Throttling Under Continuous 4K 60fps',
    'Samsung Galaxy S24 Ultra Anti-Reflective Display & Battery Longevity'
  ],
  'Laptops, Silicon & Chips': [
    'Apple M3 Pro vs Snapdragon X Elite Sustained Thermal Dissipation',
    'Framework Laptop 16 Modular GPU Performance & Linux Compatibility',
    'ThinkPad T14s Gen 5 Battery Life Under Real Developer Workloads'
  ],
  'Custom Mechanical Keyboards': [
    'Keychron Q1 Max Gasket Mount Acoustics & Wireless Latency',
    'Mode Sonnet Top Mount FR4 Plate Typing Feel & Flex',
    'Neo65 Tri-Mode Aluminum Case Sound Profile with Oil King Switches'
  ],
  'Coffee Gear & Espresso Tech': [
    'Timemore Sculptor 078s vs DF64 Gen 2 Particle Distribution & Fines',
    'Flair 58+ Manual Lever Thermal Stability on Light Roasts',
    'Fellow Ode Gen 2 SSP Cast Burrs Extraction Clarity'
  ],
  'EDC Gear & Rugged Tools': [
    'Leatherman ARC MagnaCut Blade Edge Retention & One-Handed Deployment',
    'Quiet Carry Drift Vanax SuperClean Corrosion Resistance in Coastal Humidity'
  ],
  'Headphones, IEMs & Audio Gear': [
    'Sennheiser HD 600 vs HiFiMAN Edition XS Timbre Accuracy with OTL Tube Amp',
    'Moondrop Blessing 3 Hybrid Tuning & Treble Extension',
    'Sony WH-1000XM5 ANC Cabin Pressure vs Bose QuietComfort Ultra'
  ],
  'Cameras, Prime Lenses & Optics': [
    'Fujifilm X100VI 40MP Sensor Corner Sharpness & IBIS Effectiveness',
    'Sony 35mm f/1.4 GM Chromatic Aberration & Focus Breathing Test'
  ],
  'Shonen Anime & Sakuga Animation': [
    'Jujutsu Kaisen Season 2 Shibuya Arc Action Direction & Spatial Coherence',
    'Demon Slayer Hashira Training Arc Digital Compositing Analysis'
  ],
  'Seinen & Psychological Anime': [
    'Vinland Saga Season 2 Pacing and Existential Character Depth',
    'Pluto Visual Stillness and Atmospheric Background Art'
  ],
  'Prestige TV & Streaming Series': [
    'Severance Season 1 Production Design and Corporate Alienation',
    'Succession Season 4 Handheld Camerawork and Ensemble Blocking'
  ],
  'Hollywood Blockbusters & Sci-Fi Cinema': [
    'Dune Part Two 70mm IMAX Framing and Practical Sound Mix Dynamics',
    'Oppenheimer Non-Linear Sound Design and Contrast Dynamics'
  ],
  'Gaming Handhelds & Consoles': [
    'Steam Deck OLED 90Hz Display and Battery Efficiency Under 15W TDP',
    'ASUS ROG Ally X Ergonomics and VRR Implementation'
  ]
};

// 8 Defined Operational Windows in Indian Standard Time (IST = UTC + 5:30)
export const SCHEDULE_SLOTS = [
  { id: 'dawn_digest', hour: 7, minute: 0, type: 'editorial', name: 'Dawn Digest (Culture/Essays)' },
  { id: 'morning_tech', hour: 10, minute: 30, type: 'review_mobility', name: 'Morning Review (Mobility & Hardware)' },
  { id: 'lunch_satire', hour: 13, minute: 30, type: 'editorial', name: 'Midday Economics (Business & Finance)' },
  { id: 'afternoon_gear', hour: 16, minute: 30, type: 'review_gear', name: 'Afternoon Gear Lab (Measured Reviews)' },
  { id: 'evening_fiction', hour: 19, minute: 30, type: 'editorial', name: 'Evening Dispatch (Journalism & Public Truth)' },
  { id: 'prime_screens', hour: 21, minute: 30, type: 'review_screens', name: 'Prime-Time Screens (Entertainment Reviews)' },
  { id: 'midnight_poetry', hour: 23, minute: 0, type: 'editorial', name: 'Midnight Courtyard (Poetry/Shayari)' },
  { id: 'housekeeping', hour: 2, minute: 0, type: 'maintenance', name: 'Nightly Housekeeping' }
];

function getIstTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    dateStr: `${value.year}-${value.month}-${value.day}`,
    hours: Number(value.hour),
    minutes: Number(value.minute)
  };
}

function scheduledInstant(dateStr, slot) {
  const hour = String(slot.hour).padStart(2, '0');
  const minute = String(slot.minute).padStart(2, '0');
  return new Date(`${dateStr}T${hour}:${minute}:00+05:30`).toISOString();
}

export function getDueScheduleSlots(now = new Date()) {
  const { dateStr, hours, minutes } = getIstTime(now);
  const currentMinute = hours * 60 + minutes;

  return SCHEDULE_SLOTS
    .filter(slot => (slot.hour * 60 + slot.minute) <= currentMinute)
    .sort((left, right) => (left.hour * 60 + left.minute) - (right.hour * 60 + right.minute))
    .map(slot => ({
      ...slot,
      scheduleDate: dateStr,
      scheduledFor: scheduledInstant(dateStr, slot)
    }));
}

async function claimScheduleSlot(pool, slot, now) {
  const inserted = await pool.query(`
    insert into public.bot_schedule_runs (
      schedule_date, slot_id, slot_name, scheduled_for, status,
      attempts, started_at, created_at, updated_at
    )
    values ($1, $2, $3, $4, 'running', 1, $5, $5, $5)
    on conflict (schedule_date, slot_id) do nothing
    returning slot_id
  `, [slot.scheduleDate, slot.id, slot.name, slot.scheduledFor, now.toISOString()]);

  if (inserted.rowCount > 0) return true;

  const reclaimed = await pool.query(`
    update public.bot_schedule_runs
    set status = 'running', attempts = attempts + 1, started_at = $3,
        completed_at = null, last_error = null, updated_at = $3
    where schedule_date = $1 and slot_id = $2
      and attempts < 3
      and (
        status = 'failed'
        or (status = 'running' and started_at < $3::timestamptz - interval '30 minutes')
      )
    returning slot_id
  `, [slot.scheduleDate, slot.id, now.toISOString()]);

  return reclaimed.rowCount > 0;
}

export async function runMasterSchedulerTick(pool, {
  now = new Date(),
  executeSlot = executeScheduledSlot
} = {}) {
  const outcome = { completed: [], failed: [], skipped: [], published: [], held: [], queued: [] };

  for (const slot of getDueScheduleSlots(now)) {
    const claimed = await claimScheduleSlot(pool, slot, now);
    if (!claimed) {
      outcome.skipped.push(slot.id);
      continue;
    }

    try {
      const result = await executeSlot(pool, slot);

      // A result carrying .error is a soft failure (no exception thrown but no success)
      if (result?.error) {
        await pool.query(`
          update public.bot_schedule_runs
          set status = 'failed', last_error = $3, completed_at = now(), updated_at = now()
          where schedule_date = $1 and slot_id = $2 and status = 'running'
        `, [slot.scheduleDate, slot.id, String(result.error).slice(0, 2000)]);
        outcome.failed.push(slot.id);
        console.error(`[Master Scheduler] Slot soft-failed: ${slot.id}`, result.error);
        continue;
      }

      await pool.query(`
        update public.bot_schedule_runs
        set status = 'completed', result = $3::jsonb, completed_at = now(), updated_at = now()
        where schedule_date = $1 and slot_id = $2 and status = 'running'
      `, [slot.scheduleDate, slot.id, JSON.stringify(result ?? {})]);
      outcome.completed.push(slot.id);

      // Classify outcome into semantic arrays (never overlap with failed/skipped)
      if (result?.postId) {
        outcome.published.push({ slotId: slot.id, postId: result.postId });
      } else if (result?.action?.includes('held') || result?.action === 'review_quality_rejected') {
        outcome.held.push(slot.id);
      } else if (result?.action?.includes('queued') || result?.action?.includes('commission')) {
        outcome.queued.push(slot.id);
      }
    } catch (error) {
      await pool.query(`
        update public.bot_schedule_runs
        set status = 'failed', last_error = $3, completed_at = now(), updated_at = now()
        where schedule_date = $1 and slot_id = $2 and status = 'running'
      `, [slot.scheduleDate, slot.id, String(error?.message || error).slice(0, 2000)]);
      outcome.failed.push(slot.id);
      console.error(`[Master Scheduler] Slot failed: ${slot.id}`, error?.message || error);
    }
  }

  return outcome;
}

export function startMasterDailyScheduler(pool, { intervalMs = 60_000 } = {}) {
  console.log('[Master Scheduler] Initialized durable 24-hour publishing and review clock (Asia/Kolkata)');

  const runSchedule = () => {
    runMasterSchedulerTick(pool).catch(error => {
      console.error('[Master Scheduler Error]', error.message);
    });
  };
  const runQueue = () => {
    processDueDelayedActions(pool).catch(error => {
      console.error('[Spark Queue Runner Error]', error.message);
    });
    processOutboxEvents(pool).catch(error => {
      console.error('[Outbox Runner Error]', error.message);
    });
  };

  runSchedule();
  runQueue();
  const scheduleTimer = setInterval(runSchedule, intervalMs);
  const queueTimer = setInterval(runQueue, 60_000);
  scheduleTimer.unref?.();
  queueTimer.unref?.();

  return () => {
    clearInterval(scheduleTimer);
    clearInterval(queueTimer);
  };
}

export async function executeScheduledSlot(pool, slot, {
  discoverTrends = getLiveDailyTrends,
  runPulse = runSparkPulse,
  getApprovedBrief = getNextApprovedEditorialBrief,
  claimBrief = claimEditorialBriefForPublication,
  queueBrief = queueEditorialBrief,
  holdBrief = holdEditorialBriefForReview,
  markBriefPublished = markEditorialBriefPublished,
  releaseBriefClaim = releaseEditorialBriefClaim,
  researchTopic = conductDeepTrendResearch,
  createReview = generateStructuredReview,
  generateArticle = generateSparkArticle,
  publishBatch = ingestSparkBatch,
  selectProductCover = getProductCoverImage
} = {}) {
  if (slot.type === 'editorial') {
    const approvedBrief = await getApprovedBrief(pool, { category: 'Trending' });
    if (approvedBrief) {
      const claimedBrief = await claimBrief(pool, approvedBrief.id);
      if (claimedBrief) {
        try {
          let canPublish = true;
          if (claimedBrief.approval_mode === 'automatic_low_risk') {
            const reevaluation = reevaluateAutomaticEditorialBrief(claimedBrief);
            if (reevaluation.approval.status !== 'approved') {
              await holdBrief(pool, claimedBrief.id, reevaluation.approval.reasons.join('; '));
              canPublish = false;
            }
          }
          if (canPublish) {
            const result = await runPulse(pool, {
              topicHint: claimedBrief.topic,
              category: claimedBrief.topic_category || claimedBrief.category,
              preferredAuthorPenName: claimedBrief.suggested_author_pen_name,
              researchDossier: {
                ...(claimedBrief.research_dossier || {}),
                topicCategory: claimedBrief.topic_category,
                verification: claimedBrief.verification,
                hashtagIntelligence: claimedBrief.hashtag_intelligence
              },
              automaticPublication: claimedBrief.approval_mode === 'automatic_low_risk',
              forcePublication: true
            });
            if (!result?.error && result?.postId) {
              await markBriefPublished(pool, { id: claimedBrief.id, postId: result.postId });
              return { ...result, researchBriefId: claimedBrief.id };
            }
            if (result?.action === 'pulse_skipped' || result?.skipped) {
              console.log(`[Master Scheduler] Brief ${claimedBrief.id} skipped cleanly by editorial gate: ${result.reason}`);
              await holdBrief(pool, claimedBrief.id, `Editorial Gate SKIP: ${result.reason || 'No distinctive persona angle'}`);
              return { action: 'brief_skipped', researchBriefId: claimedBrief.id, reason: result.reason };
            }
            await holdBrief(pool, claimedBrief.id, result?.error || 'Publishing did not return a post ID');
          }
        } catch (error) {
          console.warn(`[Master Scheduler] Publication for brief ${claimedBrief.id} failed: ${error.message}. Proceeding to topic pivot.`);
          await releaseBriefClaim(pool, claimedBrief.id, `Scheduled publication failed: ${error.message}`);
        }
      }
    }

    const trends = await discoverTrends({ deepResearch: true });
    const angles = trends.curatedStoryAngles ?? [];
    const editorialSlotIndex = SCHEDULE_SLOTS
      .filter(candidate => candidate.type === 'editorial')
      .findIndex(candidate => candidate.id === slot.id);
    const slotCategories = {
      dawn_digest: 'Essays',
      morning_tech: 'Journalism',
      lunch_satire: 'Business & Finance',
      afternoon_gear: 'Reviews',
      evening_fiction: 'Culture',
      prime_screens: 'Entertainment',
      midnight_poetry: 'Poetry'
    };
    const fallbackCategory = slotCategories[slot.id] || 'Essays';
    let selectedAngle = null;
    let selectedQueuedBrief = null;

    if (angles.length > 0) {
      // Find the first viable angle starting from this slot's index
      const startIndex = Math.max(0, editorialSlotIndex) % angles.length;
      for (let i = 0; i < angles.length; i++) {
        const candidateAngle = angles[(startIndex + i) % angles.length];
        if (!candidateAngle?.researchBrief) continue;

        const queued = await queueBrief(pool, {
          ...candidateAngle.researchBrief,
          suggestedAuthorPenName: candidateAngle.authorPenName,
          editorialAngle: candidateAngle.editorialAngle
        });

        if (queued.status === 'approved') {
          selectedAngle = candidateAngle;
          selectedQueuedBrief = queued;
          break;
        }
      }
    }

    // If an approved trend brief was found from angles, attempt publishing it
    if (selectedQueuedBrief) {
      const claimedBrief = await claimBrief(pool, selectedQueuedBrief.id);
      if (claimedBrief) {
        try {
          const reevaluation = reevaluateAutomaticEditorialBrief(claimedBrief);
          if (reevaluation.approval.status === 'approved') {
            const result = await runPulse(pool, {
              topicHint: claimedBrief.topic,
              category: claimedBrief.topic_category || claimedBrief.category,
              preferredAuthorPenName: claimedBrief.suggested_author_pen_name,
              researchDossier: {
                ...(claimedBrief.research_dossier || {}),
                topicCategory: claimedBrief.topic_category,
                verification: reevaluation.verification,
                hashtagIntelligence: claimedBrief.hashtag_intelligence
              },
              automaticPublication: true,
              forcePublication: true
            });
            if (!result?.error && result?.postId) {
              await markBriefPublished(pool, { id: claimedBrief.id, postId: result.postId });
              return { ...result, researchBriefId: claimedBrief.id };
            }
          } else {
            await holdBrief(pool, claimedBrief.id, reevaluation.approval.reasons.join('; '));
          }
        } catch (error) {
          await releaseBriefClaim(pool, claimedBrief.id, `Scheduled publication failed: ${error.message}`);
        }
      }
    }

    // TOPIC PIVOT & REWRITE:
    // When no trend angle qualified or the brief encountered an issue, pivot to a fresh topic & title
    // in the target category and rewrite a new story rather than stalling the schedule or forcing flawed premises.
    const chosenCategory = fallbackCategory || 'Essays';
    let fallbackResult = null;
    try {
      fallbackResult = await runPulse(pool, {
        category: chosenCategory,
        forcePublication: true,
        automaticPublication: true
      });
    } catch (err) {
      console.warn(`[Master Scheduler] Fallback pulse failed for ${chosenCategory}: ${err.message}. Retrying with Essays.`);
      fallbackResult = await runPulse(pool, {
        category: 'Essays',
        forcePublication: true,
        automaticPublication: true
      }).catch(e => ({ error: e.message }));
    }

    return {
      ...fallbackResult,
      action: fallbackResult?.postId ? 'published_story' : 'held_for_review',
      fallback: true,
      topicPivoted: true,
      category: chosenCategory,
      reason: selectedQueuedBrief ? 'Trend brief was held or re-evaluated; pivoted to fresh category story rewrite' : 'No source-backed trend angle qualified; pivoted topic and executed fresh category story'
    };
  }

  if (slot.type.startsWith('review_')) {
    const approvedReview = await getApprovedBrief(pool, { category: 'Reviews' });
    if (approvedReview) {
      const claimedReview = await claimBrief(pool, approvedReview.id);
      if (!claimedReview) return { action: 'brief_already_claimed', researchBriefId: approvedReview.id };
      try {
        // Reevaluate automatic_low_risk approvals just as the editorial path does; manual approvals proceed.
        if (claimedReview.approval_mode === 'automatic_low_risk') {
          const reevaluation = reevaluateAutomaticEditorialBrief(claimedReview);
          if (reevaluation.approval.status !== 'approved') {
            await holdBrief(pool, claimedReview.id, reevaluation.approval.reasons.join('; '));
            return { action: 'held_for_review', researchBriefId: claimedReview.id };
          }
        }
        const reviewer = REVIEW_PERSONAS.find(persona => persona.penName === claimedReview.suggested_author_pen_name);
        if (!reviewer) throw new Error('Approved review brief has no matching specialist reviewer');

        const reviewData = await createReview({
          productName: claimedReview.topic,
          reviewer,
          researchDossier: claimedReview.research_dossier,
          generateArticle
        });
        if (!reviewData) {
          await releaseBriefClaim(pool, claimedReview.id, 'Review quality gates rejected the generated output');
          return { action: 'review_quality_rejected', researchBriefId: claimedReview.id, reviewer: reviewer.penName };
        }
        const outcome = await publishBatch(pool, { stories: [{
          authorPenName: reviewer.penName,
          title: reviewData.title,
          summary: reviewData.summary,
          content: reviewData.content,
          category: 'Reviews',
          coverImage: selectProductCover(reviewer.domain, claimedReview.topic),
          publishedAt: new Date().toISOString()
        }] });
        const postId = outcome.stories?.[0]?.id;
        if (!postId) throw new Error('Review publishing engine did not return a post id');
        await markBriefPublished(pool, { id: claimedReview.id, postId });
        return { action: 'published_review', researchBriefId: claimedReview.id, postId, reviewer: reviewer.penName };
      } catch (error) {
        await releaseBriefClaim(pool, claimedReview.id, `Scheduled review publication failed: ${error.message}`);
        throw error;
      }
    }

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
    const reviewCategory = resolveReviewCategory(reviewer.domain, reviewer.category);

    // Fetch recent review post titles to enforce strict anti-duplication
    const recentPostsRes = await pool.query(
      `select title from public.posts where category = 'Reviews' order by created_at desc limit 50`
    ).catch(() => ({ rows: [] }));
    const recentTitles = new Set((recentPostsRes.rows || []).map(r => (r.title || '').toLowerCase()));

    const candidates = DOMAIN_PRODUCT_CANDIDATES[reviewer.domain] || [
      `Latest ${reviewer.domain} Hardware Benchmark`
    ];

    // Pick a candidate topic that has not been recently published
    let sampleTopic = candidates.find(c => {
      const targetTitle = `${c}: Research-Based Assessment`.toLowerCase();
      return !recentTitles.has(targetTitle) && !recentTitles.has(c.toLowerCase());
    });

    if (!sampleTopic) {
      const dateTag = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date());
      sampleTopic = `${candidates[Math.floor(Math.random() * candidates.length)]} (${dateTag} Assessment)`;
    }

    const dossier = await researchTopic(sampleTopic, reviewCategory).catch(() => null);

    const reviewBrief = buildEditorialBrief({
      candidate: {
        topic: sampleTopic,
        normalizedTopic: normalizeTrendTopic(sampleTopic),
        geo: 'IN',
        signals: [{ source: 'scheduled_review_commission' }]
      },
      topicCategory: reviewer.category,
      researchDossier: dossier,
      publicationCategory: 'Reviews'
    });
    // Publish only after the existing automated review quality gates pass.
    // No human approval step is required for scheduled review commissions.
    const reviewData = await createReview({
      productName: sampleTopic, reviewer, researchDossier: dossier, generateArticle
    });
    if (!reviewData) {
      return { action: 'review_quality_rejected', reviewer: reviewer.penName };
    }
    reviewBrief.approval = {
      status: 'approved', mode: 'automatic_quality_gates',
      sensitive: Boolean(reviewBrief.approval?.sensitive),
      reasons: ['Generated review passed automated quality gates']
    };
    const queuedReview = await queueBrief(pool, {
      ...reviewBrief,
      suggestedAuthorPenName: reviewer.penName,
      editorialAngle: `Evidence-based ${reviewer.domain} review using ${reviewer.evaluationCriteria.join(', ')}`
    });

    const claimed = await claimBrief(pool, queuedReview.id);
    if (!claimed) return { action: 'brief_already_claimed', researchBriefId: queuedReview.id };
    try {
      const outcome = await publishBatch(pool, { stories: [{
        authorPenName: reviewer.penName, title: reviewData.title,
        summary: reviewData.summary, content: reviewData.content, category: 'Reviews',
        coverImage: selectProductCover(reviewer.domain, sampleTopic),
        publishedAt: new Date().toISOString()
      }] });
      const postId = outcome.stories?.[0]?.id;
      if (!postId) throw new Error('Review publishing engine did not return a post id');
      await markBriefPublished(pool, { id: queuedReview.id, postId });
      return { action: 'published_review', researchBriefId: queuedReview.id, postId, reviewer: reviewer.penName };
    } catch (error) {
      await releaseBriefClaim(pool, queuedReview.id, `Scheduled review publication failed: ${error.message}`);
      throw error;
    }
  }

  if (slot.type === 'maintenance') {
    console.log('[Master Scheduler] 🧹 Running Nightly Database Maintenance');
    const result = await pool.query(`
      delete from public.reader_feed_sessions where created_at < now() - interval '30 days';
      delete from public.reader_behavior_events where created_at < now() - interval '90 days';
    `);
    return { action: 'maintenance', affectedRows: result.rowCount ?? 0 };
  }

  throw new Error(`Unsupported scheduler slot type: ${slot.type}`);
}
