/**
 * Release Ingestion Service
 *
 * Implements:
 * - Strict release idempotency
 * - Creation of immutable source bundle (editorial_source_bundles)
 * - Auto-generation and immediate publication of factual /updates entry (allowed for 'update' type)
 * - Evaluation of editorial_significance_score (0-100)
 * - Automatic generation of a Journal 'idea' ONLY when editorial_significance_score >= 60 (or is_major)
 */

import { createSourceBundle, verifySourceBundle, linkPostSource } from './sources.js';
import { evaluateEditorialSignificance } from './significance.js';
import { createEditorialPost, publishPostAtomic } from './posts.js';
import { withTransaction } from '../../db/transaction.js';

export async function ingestReleaseEvent(pool, {
  idempotencyKey,
  platform = 'android',
  versionCode,
  versionName,
  rawPayload = {},
  userVisibleChanges = [],
  isMajor = false
}) {
  if (!idempotencyKey) {
    throw new Error('Release event requires an idempotencyKey (e.g. android:117)');
  }

  // 1. Check if release already ingested
  const existingRelease = await pool.query(
    'SELECT * FROM public.editorial_releases WHERE idempotency_key = $1',
    [idempotencyKey]
  );
  if (existingRelease.rowCount > 0) {
    return {
      success: true,
      alreadyProcessed: true,
      release: existingRelease.rows[0],
      message: 'Release event already ingested'
    };
  }

  return await withTransaction(pool, async (client) => {
    // 1. Claim release idempotency key first within transaction
    const releaseRes = await client.query(`
      INSERT INTO public.editorial_releases (
        idempotency_key, platform, version_code, version_name,
        raw_payload, user_visible_changes, is_major, processed, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW(), NOW())
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *
    `, [
      idempotencyKey, platform, versionCode, versionName,
      JSON.stringify(rawPayload), JSON.stringify(userVisibleChanges), isMajor
    ]);

    if (releaseRes.rowCount === 0) {
      // Concurrent insert won the race, fetch the existing one
      const existing = await client.query('SELECT * FROM public.editorial_releases WHERE idempotency_key = $1', [idempotencyKey]);
      return {
        success: true,
        alreadyProcessed: true,
        release: existing.rows[0],
        message: 'Release event already ingested'
      };
    }
    const release = releaseRes.rows[0];

    // 2. Create and verify the immutable source bundle for this release
    const bundleId = `src_release_${platform}_${versionCode}`;
    const sourceBundle = await createSourceBundle(client, {
      id: bundleId,
      sourceType: 'release',
      sourceRef: `${platform}:${versionCode}`,
      title: `${platform.toUpperCase()} Release v${versionName} (Build ${versionCode})`,
      payload: {
        platform,
        versionCode,
        versionName,
        userVisibleChanges,
        isMajor,
        rawPayload
      }
    });
    await verifySourceBundle(client, bundleId, 'release_pipeline');

    // 4. Calculate editorial significance score
    const significance = evaluateEditorialSignificance({
      changes: userVisibleChanges,
      isMajor
    });

    // 5. Generate and publish factual Updates post
    let updatePost = null;
    if (userVisibleChanges && userVisibleChanges.length > 0) {
      const updateSlug = `update-${platform}-v${versionName.replace(/[^a-zA-Z0-9]/g, '-')}-${versionCode}`;
      const updateTitle = `WritOn for ${platform.toUpperCase()} ${versionName} (Build ${versionCode})`;
      const updateExcerpt = userVisibleChanges.slice(0, 2).join('; ') + '.';
      const updateMarkdown = [
        `### What's New in Version ${versionName}`,
        '',
        userVisibleChanges.map(change => `- ${change}`).join('\n'),
        '',
        `This release is live on ${platform === 'android' ? 'Google Play' : platform}.`
      ].join('\n');

      updatePost = await createEditorialPost(client, {
        slug: updateSlug,
        title: updateTitle,
        subtitle: `Release notes for build ${versionCode}`,
        type: 'update',
        category: 'writon-updates',
        status: 'draft',
        language: 'en',
        authorName: 'WritOn Engineering',
        authorPenName: 'writon_engineering',
        excerpt: updateExcerpt,
        contentMarkdown: updateMarkdown,
        editorialSignificanceScore: significance.score,
        editorialSignificanceDetails: significance,
        automationMetadata: { generatedFromRelease: true, platform, versionCode }
      });

      // Link post to release source bundle with relational integrity
      await linkPostSource(client, {
        postId: updatePost.id,
        sourceBundleId: bundleId,
        claimScope: 'all',
        assertionType: 'fact'
      });

      // Auto-publish update (type 'update' is permitted by publication gate)
      updatePost = await publishPostAtomic(client, updatePost.id, {
        actor: 'release_pipeline',
        isAutomated: true,
        changeReason: `Automated release publication for ${idempotencyKey}`
      });

      // Associate update post with release
      await client.query(`
        UPDATE public.editorial_releases
        SET processed = true, post_id = $1, updated_at = NOW()
        WHERE id = $2
      `, [updatePost.id, release.id]);
    }

    // 6. If editorial significance score >= 60, seed a Journal IDEA (not published article)
    let journalIdea = null;
    if (significance.isSignificant) {
      const ideaSlug = `idea-release-${platform}-v${versionName.replace(/[^a-zA-Z0-9]/g, '-')}`;
      const ideaTitle = `Behind the Change: ${userVisibleChanges[0] || updatePost?.title || 'Architecture of Quiet Focus'}`;
      const ideaExcerpt = `Editorial exploration prompted by build ${versionCode}: ${significance.reason}.`;

      journalIdea = await createEditorialPost(client, {
        slug: ideaSlug,
        title: ideaTitle,
        type: 'journal',
        category: 'building-writon',
        status: 'idea',
        language: 'en',
        authorName: 'WritOn Editorial',
        excerpt: ideaExcerpt,
        contentMarkdown: null, // nullable until real draft
        editorialSignificanceScore: significance.score,
        editorialSignificanceDetails: significance,
        automationMetadata: {
          triggeredByRelease: idempotencyKey,
          editorialIntent: significance.reason,
          requiredSources: [bundleId, 'founder_record']
        }
      });

      await linkPostSource(client, {
        postId: journalIdea.id,
        sourceBundleId: bundleId,
        claimScope: 'release_context',
        assertionType: 'fact'
      });
    }

    return {
      success: true,
      alreadyProcessed: false,
      release,
      sourceBundle,
      updatePost,
      significance,
      journalIdea
    };
  });
}

/**
 * Query recent updates
 */
export async function getRecentUpdates(pool, { limit = 20 } = {}) {
  const res = await pool.query(`
    SELECT
      id, slug, title, subtitle, type, category, status,
      language, author_name as "authorName", excerpt,
      content_rendered_html as "contentHtml",
      automation_metadata->>'version' as "version",
      published_at as "publishedAt", created_at as "createdAt"
    FROM public.editorial_posts
    WHERE type = 'update' AND status = 'published'
    ORDER BY published_at DESC
    LIMIT $1
  `, [limit]);

  return res.rows;
}

