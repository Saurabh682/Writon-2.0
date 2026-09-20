/**
 * Typed Database Access Layer for WritOn LinkedIn Bot Subsystem
 * Pure SQL queries against PostgreSQL authoritative runtime.
 */

export class LinkedInDb {
  constructor(pool) {
    this.pool = pool;
  }

  // --- Connections & Capabilities ---
  async getActiveConnection() {
    const res = await this.pool.query(
      `SELECT * FROM public.linkedin_connections ORDER BY last_verified_at DESC LIMIT 1`
    );
    return res.rows[0] || null;
  }

  async upsertConnection({
    authorUrn,
    authorType = 'MEMBER',
    accessTier = 'DEVELOPMENT',
    apiVersion = '202609',
    permissions = [],
    capabilities = {},
    configuredAppLimit = 500,
    configuredMemberLimit = 100,
    quotaSource = 'DEVELOPMENT_DEFAULT',
    tokenExpiresAt,
    refreshTokenExpiresAt = null,
    hasRefreshGrant = false,
  }) {
    const query = `
      INSERT INTO public.linkedin_connections (
        author_urn, author_type, access_tier, api_version, permissions, capabilities,
        configured_app_limit, configured_member_limit, quota_source,
        token_expires_at, refresh_token_expires_at, has_refresh_grant,
        last_verified_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
      ON CONFLICT (author_urn) DO UPDATE SET
        author_type = EXCLUDED.author_type,
        access_tier = EXCLUDED.access_tier,
        api_version = EXCLUDED.api_version,
        permissions = EXCLUDED.permissions,
        capabilities = EXCLUDED.capabilities,
        configured_app_limit = EXCLUDED.configured_app_limit,
        configured_member_limit = EXCLUDED.configured_member_limit,
        quota_source = EXCLUDED.quota_source,
        token_expires_at = EXCLUDED.token_expires_at,
        refresh_token_expires_at = EXCLUDED.refresh_token_expires_at,
        has_refresh_grant = EXCLUDED.has_refresh_grant,
        last_verified_at = now(),
        updated_at = now()
      RETURNING *;
    `;
    const res = await this.pool.query(query, [
      authorUrn, authorType, accessTier, apiVersion, permissions, capabilities,
      configuredAppLimit, configuredMemberLimit, quotaSource,
      tokenExpiresAt, refreshTokenExpiresAt, hasRefreshGrant
    ]);
    return res.rows[0];
  }

  async incrementLocalCallCounts({ appIdIncrement = 1, memberIdIncrement = 1 } = {}) {
    const query = `
      UPDATE public.linkedin_connections
      SET local_app_call_count_24h = local_app_call_count_24h + $1,
          local_member_call_count_24h = local_member_call_count_24h + $2,
          updated_at = now()
      WHERE id = (SELECT id FROM public.linkedin_connections ORDER BY last_verified_at DESC LIMIT 1)
      RETURNING *;
    `;
    const res = await this.pool.query(query, [appIdIncrement, memberIdIncrement]);
    return res.rows[0] || null;
  }

  // --- Candidates & Candidate Versions ---
  async createCandidate({ format = 'SINGLE_IMAGE', commentary, visualSpec = {}, hashes = {} }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const candRes = await client.query(
        `INSERT INTO public.linkedin_candidates (current_revision, status) VALUES (1, 'DRAFT') RETURNING *`
      );
      const candidate = candRes.rows[0];

      const versionRes = await client.query(
        `INSERT INTO public.linkedin_candidate_versions (
          candidate_id, revision, format, commentary, visual_spec,
          content_hash, asset_manifest_hash, brain_hash,
          linkedin_editorial_rules_hash, governance_bundle_hash
        ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          candidate.id,
          format,
          commentary,
          visualSpec,
          hashes.contentHash || 'hash_default',
          hashes.assetManifestHash || null,
          hashes.brainHash || 'brain_default',
          hashes.linkedinEditorialRulesHash || 'rules_default',
          hashes.governanceBundleHash || 'bundle_default',
        ]
      );
      const version = versionRes.rows[0];
      await client.query('COMMIT');
      return { candidate, version };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getCandidateVersionById(versionId) {
    const res = await this.pool.query(
      `SELECT v.*, c.status AS candidate_status
       FROM public.linkedin_candidate_versions v
       JOIN public.linkedin_candidates c ON c.id = v.candidate_id
       WHERE v.id = $1`,
      [versionId]
    );
    return res.rows[0] || null;
  }

  async approveCandidateVersion(versionId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const versionRes = await client.query(
        `UPDATE public.linkedin_candidate_versions
         SET approved_at = now()
         WHERE id = $1 AND approved_at IS NULL
         RETURNING *`,
        [versionId]
      );
      if (versionRes.rowCount === 0) {
        throw new Error(`Candidate version ${versionId} not found or already approved.`);
      }
      const version = versionRes.rows[0];
      await client.query(
        `UPDATE public.linkedin_candidates SET status = 'APPROVED', updated_at = now() WHERE id = $1`,
        [version.candidate_id]
      );
      await client.query('COMMIT');
      return version;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Assets ---
  async addAsset({ candidateVersionId, sequenceOrder = 1, kind = 'IMAGE', mimeType, fileSizeBytes, sha256, storageUri, localPath = null }) {
    const query = `
      INSERT INTO public.linkedin_assets (
        candidate_version_id, sequence_order, kind, mime_type, file_size_bytes, sha256, storage_uri, local_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const res = await this.pool.query(query, [
      candidateVersionId, sequenceOrder, kind, mimeType, fileSizeBytes, sha256, storageUri, localPath
    ]);
    return res.rows[0];
  }

  async getAssetsByCandidateVersion(versionId) {
    const res = await this.pool.query(
      `SELECT * FROM public.linkedin_assets WHERE candidate_version_id = $1 ORDER BY sequence_order ASC`,
      [versionId]
    );
    return res.rows;
  }

  // --- Validation Runs & Results ---
  async recordValidationRun({ candidateVersionId, triggeredBy, allPassed, totalGates = 34, passedGates, failedGates, gateResults = [] }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const runRes = await client.query(
        `INSERT INTO public.linkedin_validation_runs (
          candidate_version_id, triggered_by, all_passed, total_gates, passed_gates, failed_gates
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [candidateVersionId, triggeredBy, allPassed, totalGates, passedGates, failedGates]
      );
      const run = runRes.rows[0];

      for (const result of gateResults) {
        await client.query(
          `INSERT INTO public.linkedin_validation_results (
            run_id, gate_code, passed, failure_reason, metadata
          ) VALUES ($1, $2, $3, $4, $5)`,
          [run.id, result.gateCode, result.passed, result.failureReason || null, result.metadata || {}]
        );
      }
      await client.query('COMMIT');
      return run;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Publish Intents & Attempts ---
  async createPublishIntent({ candidateVersionId, publishKey }) {
    const query = `
      INSERT INTO public.linkedin_publish_intents (
        candidate_version_id, publish_key, status
      ) VALUES ($1, $2, 'PENDING')
      ON CONFLICT (candidate_version_id) DO NOTHING
      RETURNING *;
    `;
    const res = await this.pool.query(query, [candidateVersionId, publishKey]);
    if (res.rowCount === 0) {
      const existing = await this.pool.query(
        `SELECT * FROM public.linkedin_publish_intents WHERE candidate_version_id = $1`,
        [candidateVersionId]
      );
      return { created: false, intent: existing.rows[0] };
    }
    return { created: true, intent: res.rows[0] };
  }

  async recordPublishAttempt({ publishIntentId, attemptNumber, outcome, httpStatus = null, rawXRestliId = null, responsePayload = {}, errorMessage = null }) {
    const query = `
      INSERT INTO public.linkedin_publish_attempts (
        publish_intent_id, attempt_number, outcome, http_status, raw_x_restli_id, response_payload, error_message, finished_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      RETURNING *;
    `;
    const res = await this.pool.query(query, [
      publishIntentId, attemptNumber, outcome, httpStatus, rawXRestliId, responsePayload, errorMessage
    ]);
    return res.rows[0];
  }

  async markIntentConfirmed(intentId) {
    const res = await this.pool.query(
      `UPDATE public.linkedin_publish_intents SET status = 'CONFIRMED', updated_at = now() WHERE id = $1 RETURNING *`,
      [intentId]
    );
    return res.rows[0];
  }

  async markIntentQuarantined(intentId) {
    const res = await this.pool.query(
      `UPDATE public.linkedin_publish_intents SET status = 'QUARANTINED', updated_at = now() WHERE id = $1 RETURNING *`,
      [intentId]
    );
    return res.rows[0];
  }

  // --- Publications ---
  async recordPublication({ publishIntentId, candidateVersionId, postUrn, rawXRestliId, liveUrl, authorUrn }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const pubRes = await client.query(
        `INSERT INTO public.linkedin_publications (
          publish_intent_id, candidate_version_id, post_urn, raw_x_restli_id, live_url, author_urn
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [publishIntentId, candidateVersionId, postUrn, rawXRestliId, liveUrl, authorUrn]
      );
      const publication = pubRes.rows[0];

      await client.query(
        `UPDATE public.linkedin_publish_intents SET status = 'CONFIRMED', updated_at = now() WHERE id = $1`,
        [publishIntentId]
      );

      const verRes = await client.query(
        `SELECT candidate_id FROM public.linkedin_candidate_versions WHERE id = $1`,
        [candidateVersionId]
      );
      if (verRes.rowCount > 0) {
        await client.query(
          `UPDATE public.linkedin_candidates SET status = 'PUBLISHED', updated_at = now() WHERE id = $1`,
          [verRes.rows[0].candidate_id]
        );
      }

      await client.query('COMMIT');
      return publication;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getRecentPublications(limit = 20) {
    const res = await this.pool.query(
      `SELECT p.*, v.commentary, v.format
       FROM public.linkedin_publications p
       JOIN public.linkedin_candidate_versions v ON v.id = p.candidate_version_id
       ORDER BY p.published_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
}
