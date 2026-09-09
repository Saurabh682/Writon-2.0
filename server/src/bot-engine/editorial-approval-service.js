const BRIEF_STATUSES = new Set(['pending_review', 'approved', 'publishing', 'rejected', 'published']);

function normalizeTopic(topic = '') {
  return String(topic).toLowerCase().replace(/\b(live|latest|today|news|update|updates|202[0-9])\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function queueEditorialBrief(pool, brief) {
  const result = await pool.query(`
    insert into public.editorial_research_briefs (
      research_date, topic, normalized_topic, category, topic_category,
      suggested_author_pen_name, editorial_angle, headline, trend_score,
      verification, hashtag_intelligence, research_dossier, status,
      approval_mode, created_at, updated_at
    ) values (
      current_date, $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb,
      $11::jsonb, $12, $13, now(), now()
    )
    on conflict (research_date, normalized_topic) do update set
      category = case
        when public.editorial_research_briefs.status in ('publishing', 'published') then public.editorial_research_briefs.category
        else excluded.category
      end,
      topic_category = case
        when public.editorial_research_briefs.status in ('publishing', 'published') then public.editorial_research_briefs.topic_category
        else excluded.topic_category
      end,
      headline = excluded.headline,
      suggested_author_pen_name = excluded.suggested_author_pen_name,
      editorial_angle = excluded.editorial_angle,
      trend_score = excluded.trend_score,
      verification = excluded.verification,
      hashtag_intelligence = excluded.hashtag_intelligence,
      research_dossier = excluded.research_dossier,
      status = case
        when public.editorial_research_briefs.status in ('publishing', 'rejected', 'published') then public.editorial_research_briefs.status
        else excluded.status
      end,
      approval_mode = excluded.approval_mode,
      updated_at = now()
    returning *
  `, [
    brief.topic,
    brief.normalizedTopic,
    brief.category,
    brief.topicCategory,
    brief.suggestedAuthorPenName || null,
    brief.editorialAngle || null,
    brief.headline,
    brief.trendScore,
    JSON.stringify(brief.verification),
    JSON.stringify(brief.hashtagIntelligence),
    JSON.stringify(brief.researchDossier || {}),
    brief.approval.status,
    brief.approval.mode
  ]);
  return result.rows[0];
}

export async function getNextApprovedEditorialBrief(pool, { category = 'Trending' } = {}) {
  const result = await pool.query(`
    select * from public.editorial_research_briefs
    where status = 'approved' and category = $1
    order by trend_score desc, reviewed_at asc nulls last, created_at asc
    limit 1
  `, [category]);
  return result.rows[0] || null;
}

export async function getEditorialBriefById(pool, id) {
  const result = await pool.query(`
    select * from public.editorial_research_briefs where id = $1 limit 1
  `, [id]);
  return result.rows[0] || null;
}

export async function claimEditorialBriefForPublication(pool, id) {
  const result = await pool.query(`
    update public.editorial_research_briefs
    set status = 'publishing', updated_at = now()
    where id = $1 and status = 'approved'
    returning *
  `, [id]);
  return result.rows[0] || null;
}

export async function releaseEditorialBriefClaim(pool, id, reason = null) {
  const result = await pool.query(`
    update public.editorial_research_briefs
    set status = 'approved', review_note = coalesce($2, review_note), updated_at = now()
    where id = $1 and status = 'publishing'
    returning *
  `, [id, reason]);
  return result.rows[0] || null;
}

export async function holdEditorialBriefForReview(pool, id, reason) {
  const result = await pool.query(`
    update public.editorial_research_briefs
    set status = 'pending_review', approval_mode = 'human_required',
        review_note = $2, updated_at = now()
    where id = $1 and status = 'publishing'
    returning *
  `, [id, reason]);
  return result.rows[0] || null;
}

export async function listEditorialBriefs(pool, { status = 'pending_review', limit = 25 } = {}) {
  const normalizedStatus = BRIEF_STATUSES.has(status) ? status : 'pending_review';
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const result = await pool.query(`
    select * from public.editorial_research_briefs
    where status = $1
    order by trend_score desc, created_at desc
    limit $2
  `, [normalizedStatus, safeLimit]);
  return result.rows;
}

export async function reviewEditorialBrief(pool, { id, decision, reviewer, note = null, topic = null }) {
  if (!['approved', 'rejected'].includes(decision)) {
    const error = new Error('Decision must be approved or rejected');
    error.code = 'INVALID_EDITORIAL_DECISION';
    throw error;
  }
  const result = await pool.query(`
    update public.editorial_research_briefs
    set status = $2, reviewed_by = $3, review_note = $4,
        topic = coalesce($5, topic), normalized_topic = coalesce($6, normalized_topic),
        reviewed_at = now(), updated_at = now()
    where id = $1 and status = 'pending_review'
    returning *
  `, [id, decision, reviewer, note, topic, topic ? normalizeTopic(topic) : null]);
  return result.rows[0] || null;
}

export async function markEditorialBriefPublished(pool, { id, postId }) {
  const result = await pool.query(`
    update public.editorial_research_briefs
    set status = 'published', published_post_id = $2, updated_at = now()
    where id = $1 and status in ('approved', 'publishing')
    returning *
  `, [id, postId]);
  return result.rows[0] || null;
}
