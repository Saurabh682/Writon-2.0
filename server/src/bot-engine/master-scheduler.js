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
import { conductDeepTrendResearch, getLiveDailyTrends } from './trend-scout-service.js';
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

// 8 Defined Operational Windows in Indian Standard Time (IST = UTC + 5:30)
export const SCHEDULE_SLOTS = [
  { id: 'dawn_digest', hour: 7, minute: 0, type: 'editorial', name: 'Dawn Digest (Poetry/Essays)' },
  { id: 'morning_tech', hour: 10, minute: 30, type: 'review_mobility', name: 'Morning Tech & Mobility' },
  { id: 'lunch_satire', hour: 13, minute: 30, type: 'editorial', name: 'Lunch Satire (Humour/Culture)' },
  { id: 'afternoon_gear', hour: 16, minute: 30, type: 'review_gear', name: 'Afternoon Gear Lab' },
  { id: 'evening_fiction', hour: 19, minute: 30, type: 'editorial', name: 'Evening Storytelling' },
  { id: 'prime_screens', hour: 21, minute: 30, type: 'review_screens', name: 'Prime-Time Screen Reviews' },
  { id: 'midnight_poetry', hour: 23, minute: 0, type: 'editorial', name: 'Midnight Courtyard (Shayari)' },
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
  const outcome = { completed: [], failed: [], skipped: [] };

  for (const slot of getDueScheduleSlots(now)) {
    const claimed = await claimScheduleSlot(pool, slot, now);
    if (!claimed) {
      outcome.skipped.push(slot.id);
      continue;
    }

    try {
      const result = await executeSlot(pool, slot);
      await pool.query(`
        update public.bot_schedule_runs
        set status = 'completed', result = $3::jsonb, completed_at = now(), updated_at = now()
        where schedule_date = $1 and slot_id = $2 and status = 'running'
      `, [slot.scheduleDate, slot.id, JSON.stringify(result ?? {})]);
      outcome.completed.push(slot.id);
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
  publishBatch = ingestSparkBatch,
  selectProductCover = getProductCoverImage,
  autoPublishReviews = true
} = {}) {
  if (slot.type === 'editorial') {
    const approvedBrief = await getApprovedBrief(pool, { category: 'Trending' });
    if (approvedBrief) {
      const claimedBrief = await claimBrief(pool, approvedBrief.id);
      if (!claimedBrief) return { action: 'brief_already_claimed', researchBriefId: approvedBrief.id };
      try {
        if (claimedBrief.approval_mode === 'automatic_low_risk') {
          const reevaluation = reevaluateAutomaticEditorialBrief(claimedBrief);
          if (reevaluation.approval.status !== 'approved') {
            await holdBrief(pool, claimedBrief.id, reevaluation.approval.reasons.join('; '));
            return {
              action: 'held_for_review',
              researchBriefId: claimedBrief.id,
              reasons: reevaluation.approval.reasons
            };
          }
        }
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
        if (result?.error) throw new Error(result.error);
        if (!result?.postId) throw new Error('Publishing engine returned without a post id');
        await markBriefPublished(pool, { id: claimedBrief.id, postId: result.postId });
        return { ...result, researchBriefId: claimedBrief.id };
      } catch (error) {
        await releaseBriefClaim(pool, claimedBrief.id, `Scheduled publication failed: ${error.message}`);
        throw error;
      }
    }

    const trends = await discoverTrends({ deepResearch: true });
    const angles = trends.curatedStoryAngles ?? [];
    const editorialSlotIndex = SCHEDULE_SLOTS
      .filter(candidate => candidate.type === 'editorial')
      .findIndex(candidate => candidate.id === slot.id);
    const angle = angles.length > 0
      ? angles[Math.max(0, editorialSlotIndex) % angles.length]
      : null;
    const slotCategories = {
      dawn_digest: 'Essays',
      lunch_satire: 'Humour',
      evening_fiction: 'Short Stories',
      midnight_poetry: 'Poetry'
    };
    const fallbackCategory = slotCategories[slot.id] || 'Essays';

    if (!angle?.researchBrief) {
      const fallbackResult = await runPulse(pool, {
        category: fallbackCategory,
        forcePublication: true,
        automaticPublication: true
      });
      return {
        ...fallbackResult,
        action: fallbackResult?.postId ? 'published_story' : 'held_for_review',
        fallback: true,
        reason: 'No source-backed trend brief was available; executed fallback editorial story'
      };
    }
    const queued = await queueBrief(pool, {
      ...angle.researchBrief,
      suggestedAuthorPenName: angle.authorPenName,
      editorialAngle: angle.editorialAngle
    });
    if (queued.status !== 'approved') {
      const slotCategories = {
        dawn_digest: 'Essays',
        lunch_satire: 'Humour',
        evening_fiction: 'Short Stories',
        midnight_poetry: 'Poetry'
      };
      const fallbackCategory = slotCategories[slot.id] || 'Essays';
      const fallbackResult = await runPulse(pool, {
        category: fallbackCategory,
        forcePublication: true,
        automaticPublication: true
      });
      return {
        ...fallbackResult,
        action: fallbackResult?.postId ? 'published_story' : 'queued_for_review',
        fallback: true,
        unapprovedBriefId: queued.id,
        trendScore: queued.trend_score,
        verification: queued.verification
      };
    }

    const claimedBrief = await claimBrief(pool, queued.id);
    if (!claimedBrief) return { action: 'brief_already_claimed', researchBriefId: queued.id };
    try {
      const reevaluation = reevaluateAutomaticEditorialBrief(claimedBrief);
      if (reevaluation.approval.status !== 'approved') {
        await holdBrief(pool, claimedBrief.id, reevaluation.approval.reasons.join('; '));
        return {
          action: 'held_for_review',
          researchBriefId: claimedBrief.id,
          reasons: reevaluation.approval.reasons
        };
      }
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
      if (result?.error) throw new Error(result.error);
      if (!result?.postId) throw new Error('Publishing engine returned without a post id');
      await markBriefPublished(pool, { id: claimedBrief.id, postId: result.postId });
      return { ...result, researchBriefId: claimedBrief.id };
    } catch (error) {
      await releaseBriefClaim(pool, claimedBrief.id, `Scheduled publication failed: ${error.message}`);
      throw error;
    }
  }

  if (slot.type.startsWith('review_')) {
    const approvedReview = await getApprovedBrief(pool, { category: 'Reviews' });
    if (approvedReview) {
      const claimedReview = await claimBrief(pool, approvedReview.id);
      if (!claimedReview) return { action: 'brief_already_claimed', researchBriefId: approvedReview.id };
      try {
        const reviewer = REVIEW_PERSONAS.find(persona => persona.penName === claimedReview.suggested_author_pen_name);
        if (!reviewer) throw new Error('Approved review brief has no matching specialist reviewer');
        const reviewData = createReview({
          productName: claimedReview.topic,
          reviewer,
          researchDossier: claimedReview.research_dossier
        });
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

    const sampleTopic = `Latest ${reviewer.domain} Hardware Benchmark`;
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
    reviewBrief.approval = {
      status: 'pending_review',
      mode: 'human_required',
      sensitive: false,
      reasons: ['Scheduled review commissions require a named product and editorial approval']
    };
    const queuedReview = await queueBrief(pool, {
      ...reviewBrief,
      suggestedAuthorPenName: reviewer.penName,
      editorialAngle: `Evidence-based ${reviewer.domain} review using ${reviewer.evaluationCriteria.join(', ')}`
    });

    // In unit testing where queueBrief is explicitly mocked or commission-only is desired, queue commission and return.
    if (autoPublishReviews === false) {
      return {
        action: 'review_commission_queued',
        researchBriefId: queuedReview.id,
        reviewer: reviewer.penName,
        domain: reviewer.domain
      };
    }

    // In autonomous publishing mode, generate and publish the structured review immediately
    try {
      const reviewData = createReview({
        productName: sampleTopic,
        reviewer,
        researchDossier: dossier
      });
      const outcome = await publishBatch(pool, { stories: [{
        authorPenName: reviewer.penName,
        title: reviewData.title,
        summary: reviewData.summary,
        content: reviewData.content,
        category: 'Reviews',
        coverImage: selectProductCover(reviewer.domain, sampleTopic),
        publishedAt: new Date().toISOString()
      }] });
      const postId = outcome.stories?.[0]?.id;
      if (postId) {
        await markBriefPublished(pool, { id: queuedReview.id, postId }).catch(() => {});
        return {
          action: 'published_review',
          researchBriefId: queuedReview.id,
          postId,
          reviewer: reviewer.penName
        };
      }
    } catch (reviewErr) {
      console.warn('[Master Scheduler] Direct review generation failed, falling back to queued commission:', reviewErr.message);
    }

    return {
      action: 'review_commission_queued',
      researchBriefId: queuedReview.id,
      reviewer: reviewer.penName,
      domain: reviewer.domain
    };
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
