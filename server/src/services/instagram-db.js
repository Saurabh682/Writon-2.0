/**
 * Typed Database Access Layer for WritOn Instagram Bot Subsystem
 * Pure SQL queries against PostgreSQL authoritative runtime.
 */

export class InstagramDb {
  constructor(pool) {
    this.pool = pool;
  }

  // --- Connections & Capabilities ---
  async getActiveConnection() {
    const res = await this.pool.query(
      `SELECT * FROM public.instagram_connections ORDER BY last_verified_at DESC LIMIT 1`
    );
    return res.rows[0] || null;
  }

  async upsertConnection({ igUserId, username, accountType, authProvider, tokenExpiresAt, permissions = [], capabilities = {} }) {
    const query = `
      INSERT INTO public.instagram_connections (
        ig_user_id, username, account_type, auth_provider, token_expires_at, permissions, capabilities, last_verified_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
      ON CONFLICT (ig_user_id) DO UPDATE SET
        username = EXCLUDED.username,
        account_type = EXCLUDED.account_type,
        auth_provider = EXCLUDED.auth_provider,
        token_expires_at = EXCLUDED.token_expires_at,
        permissions = EXCLUDED.permissions,
        capabilities = EXCLUDED.capabilities,
        last_verified_at = now(),
        updated_at = now()
      RETURNING *;
    `;
    const res = await this.pool.query(query, [
      igUserId, username, accountType, authProvider, tokenExpiresAt, permissions, capabilities
    ]);
    return res.rows[0];
  }

  // --- Candidates & Candidate Versions ---
  async createCandidate({ initialFormat, caption, visualSpec, hashes }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const candRes = await client.query(
        `INSERT INTO public.instagram_candidates (current_revision, status) VALUES (1, 'DRAFT') RETURNING *`
      );
      const candidate = candRes.rows[0];

      const versionRes = await client.query(
        `INSERT INTO public.instagram_candidate_versions (
          candidate_id, revision, format, caption, visual_spec,
          caption_hash, visual_spec_hash, content_hash, brain_hash,
          genesis_protocol_hash, instagram_editorial_rules_hash,
          platform_contract_version, governance_bundle_hash
        ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          candidate.id,
          initialFormat,
          caption,
          visualSpec,
          hashes.captionHash,
          hashes.visualSpecHash,
          hashes.contentHash,
          hashes.brainHash,
          hashes.genesisProtocolHash,
          hashes.instagramEditorialRulesHash,
          hashes.platformContractVersion || 'v26.0',
          hashes.governanceBundleHash
        ]
      );
      await client.query('COMMIT');
      return { candidate, version: versionRes.rows[0] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getCandidateVersion(versionId) {
    const res = await this.pool.query(
      `SELECT v.*, c.status as candidate_status 
       FROM public.instagram_candidate_versions v
       JOIN public.instagram_candidates c ON c.id = v.candidate_id
       WHERE v.id = $1`,
      [versionId]
    );
    return res.rows[0] || null;
  }

  async approveCandidateVersion(versionId, assetManifestHash) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const versionRes = await client.query(
        `UPDATE public.instagram_candidate_versions
         SET approved_at = now(), asset_manifest_hash = $2
         WHERE id = $1
         RETURNING *`,
        [versionId, assetManifestHash]
      );
      if (!versionRes.rows[0]) {
        throw new Error(`Candidate version ${versionId} not found`);
      }
      await client.query(
        `UPDATE public.instagram_candidates
         SET status = 'APPROVED', updated_at = now()
         WHERE id = $1`,
        [versionRes.rows[0].candidate_id]
      );
      await client.query('COMMIT');
      return versionRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Assets ---
  async attachAssets(candidateVersionId, assetsList) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];
      for (const a of assetsList) {
        const res = await client.query(
          `INSERT INTO public.instagram_assets (
            candidate_version_id, sequence_order, editorial_role, kind,
            mime_type, width, height, aspect_ratio, duration_seconds,
            file_size_bytes, sha256, storage_uri, public_fetch_url,
            url_expires_at, alt_text, accessibility_metadata, validation_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'VERIFIED')
          RETURNING *`,
          [
            candidateVersionId, a.sequenceOrder || 1, a.editorialRole || 'hook', a.kind,
            a.mimeType, a.width, a.height, a.aspectRatio, a.durationSeconds || null,
            a.fileSizeBytes, a.sha256, a.storageUri, a.publicFetchUrl,
            a.urlExpiresAt, a.altText || null, a.accessibilityMetadata || {}
          ]
        );
        inserted.push(res.rows[0]);
      }
      await client.query('COMMIT');
      return inserted;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getAssetsForVersion(candidateVersionId) {
    const res = await this.pool.query(
      `SELECT * FROM public.instagram_assets 
       WHERE candidate_version_id = $1 
       ORDER BY sequence_order ASC`,
      [candidateVersionId]
    );
    return res.rows;
  }

  async updateAssetSignedUrl(assetId, newFetchUrl, newExpiresAt) {
    const res = await this.pool.query(
      `UPDATE public.instagram_assets
       SET public_fetch_url = $2, url_expires_at = $3
       WHERE id = $1
       RETURNING *`,
      [assetId, newFetchUrl, newExpiresAt]
    );
    return res.rows[0];
  }

  // --- Validation Runs & Results ---
  async recordValidationRun({ candidateVersionId, governanceBundleHash, trigger, passed, gateResults }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const runRes = await client.query(
        `INSERT INTO public.instagram_validation_runs (
          candidate_version_id, governance_bundle_hash, trigger, passed, completed_at
        ) VALUES ($1, $2, $3, $4, now()) RETURNING *`,
        [candidateVersionId, governanceBundleHash, trigger, passed]
      );
      const runId = runRes.rows[0].id;

      for (const g of gateResults) {
        await client.query(
          `INSERT INTO public.instagram_validation_results (
            validation_run_id, gate_code, status, details
          ) VALUES ($1, $2, $3, $4)`,
          [runId, g.gateCode, g.status, g.details || {}]
        );
      }
      await client.query('COMMIT');
      return runRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Containers ---
  async recordContainer({ candidateVersionId, assetId = null, containerRole = 'SINGLE', sequenceOrder = null, containerId, parentContainerId = null, mediaType, status = 'IN_PROGRESS', errorDetails = null }) {
    const res = await this.pool.query(
      `INSERT INTO public.instagram_containers (
        candidate_version_id, asset_id, container_role, sequence_order, container_id, parent_container_id, media_type, status, error_details, last_polled_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
      ON CONFLICT (container_id) DO UPDATE SET
        status = EXCLUDED.status,
        error_details = EXCLUDED.error_details,
        last_polled_at = now()
      RETURNING *`,
      [candidateVersionId, assetId, containerRole, sequenceOrder, containerId, parentContainerId, mediaType, status, errorDetails]
    );
    return res.rows[0];
  }

  async updateContainerStatus(containerId, status, errorDetails = null) {
    const res = await this.pool.query(
      `UPDATE public.instagram_containers
       SET status = $2, error_details = $3, last_polled_at = now()
       WHERE container_id = $1
       RETURNING *`,
      [containerId, status, errorDetails]
    );
    return res.rows[0];
  }

  // --- Publish Intent & Execution ---
  async getOrCreatePublishIntent(candidateVersionId, publicationRole = 'PRIMARY') {
    const normalizedRole = publicationRole.toUpperCase();
    if (!['PRIMARY', 'COMPANION_STORY'].includes(normalizedRole)) {
      throw new Error(`Invalid publication_role: ${publicationRole}`);
    }
    const publishKey = `${candidateVersionId}_${normalizedRole}`;
    const res = await this.pool.query(
      `INSERT INTO public.instagram_publish_intents (
        publish_key, candidate_version_id, publication_role, status
      ) VALUES ($1, $2, $3, 'PENDING')
      ON CONFLICT (candidate_version_id, publication_role) DO UPDATE SET
        updated_at = now()
      RETURNING *`,
      [publishKey, candidateVersionId, normalizedRole]
    );
    return res.rows[0];
  }

  async lockPublishIntentForPublishing(intentId) {
    const res = await this.pool.query(
      `SELECT * FROM public.instagram_publish_intents 
       WHERE id = $1 AND status IN ('PENDING', 'RECONCILING')
       FOR UPDATE SKIP LOCKED`,
      [intentId]
    );
    return res.rows[0] || null;
  }

  async recordPublishAttempt({ publishIntentId, attemptNumber, containerId, startedAt }) {
    const res = await this.pool.query(
      `INSERT INTO public.instagram_publish_attempts (
        publish_intent_id, attempt_number, container_id, started_at, outcome
      ) VALUES ($1, $2, $3, $4, 'TIMEOUT_UNKNOWN')
      RETURNING *`,
      [publishIntentId, attemptNumber, containerId, startedAt]
    );
    return res.rows[0];
  }

  async resolvePublishAttempt({ attemptId, outcome, errorPayload = null }) {
    const res = await this.pool.query(
      `UPDATE public.instagram_publish_attempts
       SET outcome = $2, error_payload = $3, finished_at = now()
       WHERE id = $1
       RETURNING *`,
      [attemptId, outcome, errorPayload]
    );
    return res.rows[0];
  }

  async confirmPublication({ publishIntentId, candidateVersionId, igMediaId, shortcode, permalink, hashes }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const pubRes = await client.query(
        `INSERT INTO public.instagram_publications (
          publish_intent_id, candidate_version_id, ig_media_id, shortcode, permalink,
          content_hash, asset_manifest_hash, governance_bundle_hash, published_at, lifecycle_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), 'LIVE')
        RETURNING *`,
        [
          publishIntentId, candidateVersionId, igMediaId, shortcode, permalink,
          hashes.contentHash, hashes.assetManifestHash, hashes.governanceBundleHash
        ]
      );
      await client.query(
        `UPDATE public.instagram_publish_intents 
         SET status = 'CONFIRMED', resolved_at = now() 
         WHERE id = $1`,
        [publishIntentId]
      );
      await client.query('COMMIT');
      return pubRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async recordReconciliationCheck({ publishIntentId, strategy, result, evidence = {}, nextCheckAt = null }) {
    const res = await this.pool.query(
      `INSERT INTO public.instagram_reconciliation_checks (
        publish_intent_id, strategy, result, evidence, next_check_at
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [publishIntentId, strategy, result, evidence, nextCheckAt]
    );
    return res.rows[0];
  }

  async quarantinePublishIntent(intentId) {
    const res = await this.pool.query(
      `UPDATE public.instagram_publish_intents 
       SET status = 'QUARANTINED', resolved_at = now() 
       WHERE id = $1 RETURNING *`,
      [intentId]
    );
    return res.rows[0];
  }

  // --- Metrics & Observations ---
  async snapshotMetrics(publicationId, metricsData) {
    const res = await this.pool.query(
      `INSERT INTO public.instagram_metrics (
        publication_id, views, reach, likes, comments, saved, shares, total_interactions, watch_time_seconds, replies, link_clicks, raw_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        publicationId,
        metricsData.views ?? null,
        metricsData.reach ?? null,
        metricsData.likes ?? null,
        metricsData.comments ?? null,
        metricsData.saved ?? null,
        metricsData.shares ?? null,
        metricsData.totalInteractions ?? null,
        metricsData.watchTimeSeconds ?? null,
        metricsData.replies ?? null,
        metricsData.linkClicks ?? null,
        metricsData.rawPayload || {}
      ]
    );
    return res.rows[0];
  }

  async recordObservation(obs) {
    const res = await this.pool.query(
      `INSERT INTO public.instagram_observations (
        publication_id, metric_snapshot_id, brain_insight_id, archetype, format, opening_structure,
        slide_count, views, reach, save_rate, share_rate, reply_rate, observation_window
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        obs.publicationId,
        obs.metricSnapshotId || null,
        obs.brainInsightId,
        obs.archetype,
        obs.format,
        obs.openingStructure,
        obs.slideCount || 1,
        obs.views ?? null,
        obs.reach ?? null,
        obs.saveRate ?? null,
        obs.shareRate ?? null,
        obs.replyRate ?? null,
        obs.observationWindow || '24h'
      ]
    );
    return res.rows[0];
  }
}
