import crypto from 'node:crypto';

/**
 * Computes a deterministic sha256 hash of a JSON payload.
 * Sorts object keys recursively to ensure consistent hashing across runs.
 */
export function computeSourceHash(payload) {
  const canonicalJson = stableStringify(payload);
  return crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

/**
 * Creates or retrieves an immutable source bundle.
 * If verified, cannot be mutated without a supersedes link.
 */
export async function createSourceBundle(pool, {
  id,
  sourceType,
  sourceRef,
  title,
  payload = {},
  verifiedBy = null,
  verifiedAt = null,
  supersedesSourceBundleId = null
}) {
  if (!id || !sourceType || !sourceRef || !title) {
    throw new Error('Source bundle requires id, sourceType, sourceRef, and title');
  }

  const sourceHash = computeSourceHash(payload);

  const existing = await pool.query(
    'SELECT * FROM public.editorial_source_bundles WHERE id = $1',
    [id]
  );

  if (existing.rowCount > 0) {
    const existingBundle = existing.rows[0];
    if (existingBundle.source_hash !== sourceHash) {
      if (existingBundle.verified_at) {
        throw new Error(
          `Cannot mutate verified source bundle ${id}. Create a new bundle with supersedesSourceBundleId instead.`
        );
      }
      // If not yet verified, update payload and hash
      const updateRes = await pool.query(`
        UPDATE public.editorial_source_bundles
        SET payload = $1, source_hash = $2, title = $3
        WHERE id = $4
        RETURNING *
      `, [JSON.stringify(payload), sourceHash, title, id]);
      return updateRes.rows[0];
    }
    return existingBundle;
  }

  const insertRes = await pool.query(`
    INSERT INTO public.editorial_source_bundles (
      id, source_type, source_ref, title, payload, source_hash,
      verified_by, verified_at, supersedes_source_bundle_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO NOTHING
    RETURNING *
  `, [
    id, sourceType, sourceRef, title, JSON.stringify(payload), sourceHash,
    verifiedBy, verifiedAt, supersedesSourceBundleId
  ]);

  if (insertRes.rowCount === 0) {
    const check = await pool.query('SELECT * FROM public.editorial_source_bundles WHERE id = $1', [id]);
    return check.rows[0];
  }

  return insertRes.rows[0];
}

/**
 * Verifies an existing source bundle, locking it permanently against modification.
 */
export async function verifySourceBundle(pool, id, verifiedBy = 'system') {
  const res = await pool.query(`
    UPDATE public.editorial_source_bundles
    SET verified_by = $1, verified_at = NOW()
    WHERE id = $2 AND verified_at IS NULL
    RETURNING *
  `, [verifiedBy, id]);

  if (res.rowCount === 0) {
    const check = await pool.query('SELECT * FROM public.editorial_source_bundles WHERE id = $1', [id]);
    if (check.rowCount === 0) {
      throw new Error(`Source bundle ${id} not found`);
    }
    return check.rows[0]; // already verified
  }

  return res.rows[0];
}

/**
 * Links a post to a source bundle with claim scope and assertion classification.
 */
export async function linkPostSource(pool, {
  postId,
  sourceBundleId,
  claimScope = 'all',
  assertionType = 'fact'
}) {
  const res = await pool.query(`
    INSERT INTO public.editorial_post_sources (
      post_id, source_bundle_id, claim_scope, assertion_type, linked_at
    ) VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (post_id, source_bundle_id, claim_scope) DO UPDATE
      SET assertion_type = EXCLUDED.assertion_type,
          linked_at = NOW()
    RETURNING *
  `, [postId, sourceBundleId, claimScope, assertionType]);

  return res.rows[0];
}

/**
 * Query all source bundles linked to a specific post.
 */
export async function getSourcesForPost(pool, postId) {
  const res = await pool.query(`
    SELECT
      s.id, s.source_type, s.source_ref, s.title, s.payload, s.source_hash,
      s.verified_by, s.verified_at, s.supersedes_source_bundle_id, s.created_at,
      ps.claim_scope, ps.assertion_type, ps.linked_at
    FROM public.editorial_post_sources ps
    JOIN public.editorial_source_bundles s ON s.id = ps.source_bundle_id
    WHERE ps.post_id = $1
    ORDER BY ps.linked_at ASC
  `, [postId]);

  return res.rows;
}
