import { createHash } from 'node:crypto';

/**
 * Computes a deterministic SHA-256 hash of the request body.
 */
export function computePayloadHash(payload) {
  if (!payload) return createHash('sha256').update('').digest('hex');
  const normalized = typeof payload === 'string'
    ? payload.trim()
    : JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Validates whether an idempotency key exists, checks for payload collision,
 * or allows proceeding with execution.
 *
 * @param {object} pool Database pool
 * @param {object} params
 * @param {string} params.key Idempotency key from header
 * @param {string} params.route Route identifier (e.g. '/api/v1/spark/publish')
 * @param {any} params.payload Request payload
 * @returns {Promise<{ isReplay?: boolean, isMismatch?: boolean, statusCode?: number, body?: any, scopedKey?: string, hash?: string, shouldTrack?: boolean, error?: string }>}
 */
export async function checkIdempotency(pool, { key, route, payload }) {
  if (!key || typeof key !== 'string' || !key.trim()) {
    return { shouldTrack: false };
  }

  const cleanKey = key.trim();
  const scopedKey = `${route}:${cleanKey}`;
  const hash = computePayloadHash(payload);

  try {
    const res = await pool.query(
      `select scoped_key, request_hash, route, response_status, response_body, expires_at
       from public.bot_idempotency_records
       where scoped_key = $1 and expires_at > now()
       limit 1`,
      [scopedKey]
    );

    if (res.rowCount > 0) {
      const record = res.rows[0];
      if (record.request_hash !== hash) {
        return {
          isMismatch: true,
          error: 'Idempotency key was previously used with a different request payload.'
        };
      }
      return {
        isReplay: true,
        statusCode: record.response_status,
        body: typeof record.response_body === 'string' ? JSON.parse(record.response_body) : record.response_body
      };
    }

    return {
      shouldTrack: true,
      scopedKey,
      hash,
      route
    };
  } catch (err) {
    console.warn('[Idempotency Service] Check warning:', err.message);
    return { shouldTrack: false, error: err.message };
  }
}

/**
 * Persists the response of an idempotent operation.
 */
export async function saveIdempotencyRecord(pool, { scopedKey, hash, route, statusCode, body }) {
  if (!scopedKey || !hash) return;
  try {
    await pool.query(
      `insert into public.bot_idempotency_records
       (scoped_key, request_hash, route, response_status, response_body, created_at, expires_at)
       values ($1, $2, $3, $4, $5, now(), now() + interval '24 hours')
       on conflict (scoped_key) do update set
         response_status = excluded.response_status,
         response_body = excluded.response_body,
         request_hash = excluded.request_hash`,
      [scopedKey, hash, route, statusCode, JSON.stringify(body)]
    );
  } catch (err) {
    console.warn('[Idempotency Service] Save warning:', err.message);
  }
}
