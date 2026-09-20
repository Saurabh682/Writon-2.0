import crypto from 'node:crypto';

export async function recordShareAction(pool, { profileId, storyId, destination = 'unknown', eventId = crypto.randomUUID(), occurredAt = new Date() }) {
  const eventKey = `share:${eventId}`;
  const result = await pool.query(
    `INSERT INTO writer_engagement_events(id, profile_id, story_id, event_type, event_key, metadata, occurred_at)
     VALUES ($1,$2,$3,'story_share_initiated',$4,$5::jsonb,$6)
     ON CONFLICT (event_key) DO NOTHING
     RETURNING id`,
    [crypto.randomUUID(), profileId, storyId, eventKey, JSON.stringify({ destination }), occurredAt],
  );
  return Boolean(result.rowCount);
}

export async function recordMilestone(pool, { profileId, milestone, storyId = null, occurredAt = new Date() }) {
  const eventKey = `${profileId}:${milestone.eventKey}`;
  const result = await pool.query(
    `INSERT INTO writer_engagement_events(id, profile_id, story_id, event_type, event_key, metadata, occurred_at)
     VALUES ($1,$2,$3,'writer_milestone',$4,$5::jsonb,$6)
     ON CONFLICT (event_key) DO NOTHING
     RETURNING id`,
    [crypto.randomUUID(), profileId, storyId, eventKey, JSON.stringify(milestone), occurredAt],
  );
  return Boolean(result.rowCount);
}
