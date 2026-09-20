#!/usr/bin/env node

/**
 * WritOn LinkedIn Scout CLI Agent
 * 
 * Harvests multi-surface metrics and performs quarantine audits:
 * - Inspects active connection & capability flags
 * - Audits quarantined or pending reconciliation checks
 * - Harvests post/video analytics via LinkedInAnalyticsProvider (dry-run safe)
 * 
 * Usage:
 *   node scripts/linkedin_scout.mjs --dry-run
 *   node scripts/linkedin_scout.mjs --harvest-window=24h --dry-run
 *   node scripts/linkedin_scout.mjs --audit-quarantine --json
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
import { LinkedInDb } from '../server/src/services/linkedin-db.js';
import { LinkedInClient } from '../server/src/services/linkedin-client.js';
import {
  MemberPostAnalyticsProvider,
  MemberVideoAnalyticsProvider,
  OrganizationShareAnalyticsProvider,
} from '../server/src/services/linkedin-analytics-provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      options[key] = val === undefined ? true : val;
    }
  }
  return options;
}

async function main() {
  const options = parseArgs();
  const isDryRun = Boolean(options['dry-run'] || !options.live);
  const isJson = Boolean(options.json);
  const windowHours = parseInt(options['harvest-window'] || '24', 10);

  if (!isJson) {
    console.log('===============================================================');
    console.log('🔭 WRITON LINKEDIN SCOUT AGENT');
    console.log(`   Mode: ${isDryRun ? '🔍 DRY RUN (Telemetry & Audit)' : '⚡ LIVE HARVEST'}`);
    console.log(`   Window: Last ${windowHours} hours`);
    console.log('===============================================================\n');
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = new LinkedInDb(pool);
  const client = new LinkedInClient({ log: console });
  const memberAnalytics = new MemberPostAnalyticsProvider(client);
  const videoAnalytics = new MemberVideoAnalyticsProvider(client);
  const orgAnalytics = new OrganizationShareAnalyticsProvider(client);

  try {
    const connection = await db.getActiveConnection();
    if (!connection) {
      console.error('No active LinkedIn connection found in PostgreSQL.');
      process.exit(1);
    }

    // 1. Connection Status & Capability Assessment
    const connectionReport = {
      authorUrn: connection.author_urn,
      tier: connection.rate_tier,
      isOrg: connection.is_org,
      canPublishMember: connection.can_publish_member,
      canPublishOrg: connection.can_publish_org,
      hasMemberAnalytics: connection.has_member_analytics,
      hasOrgAnalytics: connection.has_org_analytics,
      hasRefreshGrant: connection.has_refresh_grant,
      estimatedDailyLimits: {
        appCalls: connection.configured_app_limit,
        memberCalls: connection.configured_member_limit,
      },
    };

    // 2. Quarantine & Reconciliation Audit
    const quarantinedChecks = await pool.query(
      `SELECT r.*, i.candidate_version_id, p.post_urn
       FROM public.linkedin_reconciliation_checks r
       JOIN public.linkedin_publish_intents i ON r.publish_intent_id = i.id
       LEFT JOIN public.linkedin_publications p ON p.publish_intent_id = i.id
       WHERE r.result = 'QUARANTINED'
       ORDER BY r.checked_at DESC
       LIMIT 20`
    );

    // 3. Recent Publications Query
    const recentPubs = await pool.query(
      `SELECT p.*, cv.format, cv.commentary
       FROM public.linkedin_publications p
       JOIN public.linkedin_candidate_versions cv ON p.candidate_version_id = cv.id
       WHERE p.published_at >= NOW() - ($1 || ' hours')::interval
       ORDER BY p.published_at DESC`,
      [windowHours]
    );

    // 4. Metrics Snapshot Assessment
    const metricsHarvest = [];
    for (const pub of recentPubs.rows) {
      if (isDryRun) {
        metricsHarvest.push({
          publicationUrn: pub.post_urn,
          format: pub.format,
          impressions: 0,
          reactions: 0,
          comments: 0,
          shares: 0,
          simulated: true,
        });
      } else {
        // Live harvest based on capabilities
        if (connection.is_org && connection.has_org_analytics) {
          const stats = await orgAnalytics.getShareMetrics(pub.post_urn);
          metricsHarvest.push({ publicationUrn: pub.post_urn, ...stats });
        } else if (connection.has_member_analytics) {
          const stats = pub.format === 'VIDEO'
            ? await videoAnalytics.getVideoMetrics(pub.post_urn)
            : await memberAnalytics.getPostMetrics(pub.post_urn);
          metricsHarvest.push({ publicationUrn: pub.post_urn, ...stats });
        }
      }
    }

    const scoutSummary = {
      timestamp: new Date().toISOString(),
      mode: isDryRun ? 'DRY_RUN' : 'LIVE',
      connection: connectionReport,
      quarantineCount: quarantinedChecks.rows.length,
      quarantinedChecks: quarantinedChecks.rows,
      recentPublicationsCount: recentPubs.rows.length,
      metricsHarvest,
    };

    if (isJson) {
      console.log(JSON.stringify(scoutSummary, null, 2));
    } else {
      console.log(`👤 Connected Author: ${connectionReport.authorUrn} (${connectionReport.tier} tier)`);
      console.log(`🔑 Refresh Grant: ${connectionReport.hasRefreshGrant ? 'YES' : 'NO'}`);
      console.log(`📊 Member Analytics Scope: ${connectionReport.hasMemberAnalytics ? 'AVAILABLE' : 'RESTRICTED / NOT_GRANTED'}`);
      console.log(`🏢 Org Analytics Scope: ${connectionReport.hasOrgAnalytics ? 'AVAILABLE' : 'N/A'}`);
      console.log(`\n🛡️ Quarantine Status: ${quarantinedChecks.rows.length} items quarantined requiring operator review.`);
      if (quarantinedChecks.rows.length > 0) {
        quarantinedChecks.rows.forEach((q) => {
          console.log(`   - Intent: ${q.publish_intent_id} | Post: ${q.published_urn || 'UNKNOWN'} | Strategy: ${q.recovery_strategy}`);
        });
      }
      console.log(`\n📈 Publications in last ${windowHours}h: ${recentPubs.rows.length}`);
      console.log(`✨ Metrics harvest pass complete (${metricsHarvest.length} records).`);
    }
  } catch (err) {
    console.error('Scout encountered error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
