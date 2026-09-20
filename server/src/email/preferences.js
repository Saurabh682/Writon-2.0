const BOOL_FIELDS = ['reading_enabled', 'activity_enabled', 'lifecycle_enabled', 'writer_tips_enabled'];

function publicState(row) {
  return {
    reading: Boolean(row?.reading_enabled),
    activity: Boolean(row?.activity_enabled),
    lifecycle: Boolean(row?.lifecycle_enabled),
    writerTips: Boolean(row?.writer_tips_enabled),
    locale: row?.locale || 'en',
    timezone: row?.timezone || 'Asia/Kolkata',
  };
}

export async function getPreferences(pool, profileId) {
  const result = await pool.query('SELECT * FROM user_email_preferences WHERE profile_id=$1', [profileId]);
  return result.rows[0] ? publicState(result.rows[0]) : publicState(null);
}

export async function patchPreferences(pool, profileId, patch, { source = 'settings', consentTextVersion = 'v1' } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingResult = await client.query('SELECT * FROM user_email_preferences WHERE profile_id=$1 FOR UPDATE', [profileId]);
    const existing = existingResult.rows[0] || null;
    const before = publicState(existing);
    const next = {
      reading_enabled: patch.reading ?? before.reading,
      activity_enabled: patch.activity ?? before.activity,
      lifecycle_enabled: patch.lifecycle ?? before.lifecycle,
      writer_tips_enabled: patch.writerTips ?? before.writerTips,
      locale: patch.locale || before.locale,
      timezone: patch.timezone || before.timezone,
    };
    for (const f of BOOL_FIELDS) next[f] = Boolean(next[f]);
    const anyEnabled = BOOL_FIELDS.some(f => next[f]);

    const result = await client.query(
      `INSERT INTO user_email_preferences(
        profile_id, reading_enabled, activity_enabled, lifecycle_enabled, writer_tips_enabled,
        locale, timezone, consent_source, consent_text_version, consented_at, withdrawn_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $10 THEN NOW() ELSE NULL END,CASE WHEN $10 THEN NULL ELSE NOW() END)
       ON CONFLICT (profile_id) DO UPDATE SET
        reading_enabled=EXCLUDED.reading_enabled, activity_enabled=EXCLUDED.activity_enabled,
        lifecycle_enabled=EXCLUDED.lifecycle_enabled, writer_tips_enabled=EXCLUDED.writer_tips_enabled,
        locale=EXCLUDED.locale, timezone=EXCLUDED.timezone, consent_source=EXCLUDED.consent_source,
        consent_text_version=EXCLUDED.consent_text_version,
        consented_at=CASE WHEN $10 AND user_email_preferences.consented_at IS NULL THEN NOW() ELSE user_email_preferences.consented_at END,
        withdrawn_at=CASE WHEN $10 THEN NULL ELSE NOW() END, updated_at=NOW()
       RETURNING *`,
      [profileId, next.reading_enabled, next.activity_enabled, next.lifecycle_enabled, next.writer_tips_enabled,
        next.locale, next.timezone, source, consentTextVersion, anyEnabled],
    );
    const after = publicState(result.rows[0]);
    await client.query(
      `INSERT INTO email_preference_audit(profile_id, source, consent_text_version, before_state, after_state)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb)`,
      [profileId, source, consentTextVersion, JSON.stringify(before), JSON.stringify(after)],
    );
    await client.query('COMMIT');
    return after;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function unsubscribeScope(pool, profileId, scope, source = 'unsubscribe') {
  const patch = scope === 'reading' ? { reading: false }
    : scope === 'activity' ? { activity: false }
    : scope === 'lifecycle' ? { lifecycle: false }
    : scope === 'writer_tips' ? { writerTips: false }
    : { reading: false, activity: false, lifecycle: false, writerTips: false };
  return patchPreferences(pool, profileId, patch, { source, consentTextVersion: 'unsubscribe' });
}
