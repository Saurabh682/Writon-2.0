import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { assessFeedShadowReadiness } from '../services/feed-shadow-readiness.js';

const { Client } = pg;
const PRODUCTION_PROJECT_REF = 'rrxaitxeirykmiihgiqj';
const productionRequested = process.argv.includes('--production');
const daysArgument = process.argv.find((argument) => argument.startsWith('--days='));
const days = Number.parseInt(daysArgument?.split('=')[1] ?? '7', 10);

if (!productionRequested || !Number.isInteger(days) || days < 1 || days > 31) {
  throw new Error('R3 reporting requires --production and --days=1..31.');
}

const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const connectionString = process.env.DATABASE_URL || execSync(
  'gcloud secrets versions access latest --secret=writon-database-url-production --project=writon-app-2020',
  { encoding: 'utf8', windowsHide: true },
).trim();
if (!connectionString.includes(PRODUCTION_PROJECT_REF)) {
  throw new Error(`Refusing R3 reporting outside production ref ${PRODUCTION_PROJECT_REF}.`);
}

const databaseHost = new URL(connectionString).hostname;
const database = new Client({
  connectionString,
  ssl: ['localhost', '127.0.0.1', '::1'].includes(databaseHost)
    ? false
    : {
        ca: await readFile(fileURLToPath(certificateUrl), 'utf8'),
        rejectUnauthorized: true,
      },
});

try {
  await database.connect();

  const coverageResult = await database.query(`
    with human_sessions as (
      select session.id, session.profile_id, session.ranking_version
      from public.reader_feed_sessions session
      inner join public.profiles profile
        on profile.id = session.profile_id and profile.account_type = 'human'
      where session.created_at >= now() - ($1::int * interval '1 day')
    ), visible_counts as (
      select exposure.feed_session_id, count(*) filter (where exposure.rank_position < 20)::int as first_page_items
      from public.feed_exposures exposure
      inner join human_sessions session on session.id = exposure.feed_session_id
      group by exposure.feed_session_id
    ), shadow_counts as (
      select shadow.feed_session_id, count(*) filter (where shadow.shadow_rank_position < 20)::int as first_page_items
      from public.feed_shadow_rankings shadow
      inner join human_sessions session on session.id = shadow.feed_session_id
      group by shadow.feed_session_id
    )
    select
      count(*) filter (where ranking_version = 'writon-feed-v1-base')::int as base_sessions,
      count(*) filter (where ranking_version = 'writon-feed-v1-control')::int as holdout_sessions,
      count(*) filter (where ranking_version = 'writon-feed-v1-shadow')::int as shadow_sessions,
      count(distinct profile_id) filter (where ranking_version = 'writon-feed-v1-shadow')::int as shadow_readers,
      count(*) filter (where ranking_version = 'writon-feed-v1-shadow' and coalesce(visible.first_page_items, 0) = 0)::int as visible_empty_sessions,
      count(*) filter (where ranking_version = 'writon-feed-v1-shadow' and coalesce(shadow.first_page_items, 0) = 0)::int as shadow_empty_sessions,
      count(*) filter (where ranking_version = 'writon-feed-v1-shadow' and coalesce(visible.first_page_items, 0) between 1 and 19)::int as visible_sparse_sessions,
      count(*) filter (where ranking_version = 'writon-feed-v1-shadow' and coalesce(shadow.first_page_items, 0) between 1 and 19)::int as shadow_sparse_sessions,
      round(avg(visible.first_page_items) filter (where ranking_version = 'writon-feed-v1-shadow'), 2)::float8 as average_visible_first_page_items,
      round(avg(shadow.first_page_items) filter (where ranking_version = 'writon-feed-v1-shadow'), 2)::float8 as average_shadow_first_page_items
    from human_sessions session
    left join visible_counts visible on visible.feed_session_id = session.id
    left join shadow_counts shadow on shadow.feed_session_id = session.id
  `, [days]);

  const comparisonResult = await database.query(`
    with shadow_sessions as (
      select session.id
      from public.reader_feed_sessions session
      inner join public.profiles profile
        on profile.id = session.profile_id and profile.account_type = 'human'
      where session.ranking_version = 'writon-feed-v1-shadow'
        and session.created_at >= now() - ($1::int * interval '1 day')
    ), per_session as (
      select shadow.feed_session_id,
        count(*) filter (
          where shadow.visible_rank_position < 20 and shadow.shadow_rank_position < 20
        )::int as top_20_overlap,
        round(avg(abs(shadow.visible_rank_position - shadow.shadow_rank_position)) filter (
          where shadow.visible_rank_position is not null
        ), 2)::float8 as average_absolute_rank_movement
      from public.feed_shadow_rankings shadow
      inner join shadow_sessions session on session.id = shadow.feed_session_id
      group by shadow.feed_session_id
    )
    select
      round(avg(top_20_overlap), 2)::float8 as average_top_20_overlap,
      min(top_20_overlap)::int as minimum_top_20_overlap,
      round(avg(average_absolute_rank_movement)::numeric, 2)::float8 as average_absolute_rank_movement
    from per_session
  `, [days]);

  const distributionResult = await database.query(`
    with shadow_sessions as (
      select session.id
      from public.reader_feed_sessions session
      inner join public.profiles profile
        on profile.id = session.profile_id and profile.account_type = 'human'
      where session.ranking_version = 'writon-feed-v1-shadow'
        and session.created_at >= now() - ($1::int * interval '1 day')
    ), placements as (
      select 'visible'::text as arm, exposure.feed_session_id, exposure.story_id
      from public.feed_exposures exposure
      inner join shadow_sessions session on session.id = exposure.feed_session_id
      where exposure.rank_position < 20
      union all
      select 'shadow'::text, shadow.feed_session_id, shadow.story_id
      from public.feed_shadow_rankings shadow
      inner join shadow_sessions session on session.id = shadow.feed_session_id
      where shadow.shadow_rank_position < 20
    ), annotated as (
      select placement.arm, placement.feed_session_id, post.author_id,
        coalesce(nullif(post.language_code, ''), 'und') as language,
        coalesce(nullif(post.category, ''), 'Uncategorized') as category,
        coalesce(nullif(post.content_form, ''), 'unknown') as content_form
      from placements placement
      inner join public.posts post on post.id = placement.story_id
    ), author_counts as (
      select author_id, count(*)::int as eligible_story_count
      from public.posts
      where status = 'published' and is_public = true and provenance = 'human_verified'
      group by author_id
    ), arm_totals as (
      select arm, count(*)::int as placements from annotated group by arm
    ), dimension_rows as (
      select arm, 'language'::text as dimension, language as value, count(*)::int as placements
      from annotated group by arm, language
      union all
      select arm, 'category', category, count(*)::int from annotated group by arm, category
      union all
      select arm, 'content_form', content_form, count(*)::int from annotated group by arm, content_form
    ), session_author_share as (
      select arm, feed_session_id, author_id, count(*)::numeric / sum(count(*)) over (partition by arm, feed_session_id) as share
      from annotated group by arm, feed_session_id, author_id
    ), session_category_share as (
      select arm, feed_session_id, category, count(*)::numeric / sum(count(*)) over (partition by arm, feed_session_id) as share
      from annotated group by arm, feed_session_id, category
    ), concentration as (
      select arm, 'author'::text as dimension, round(avg(max_share), 4)::float8 as average_max_share,
        round(max(max_share), 4)::float8 as maximum_share
      from (select arm, feed_session_id, max(share) as max_share from session_author_share group by arm, feed_session_id) item
      group by arm
      union all
      select arm, 'category', round(avg(max_share), 4)::float8, round(max(max_share), 4)::float8
      from (select arm, feed_session_id, max(share) as max_share from session_category_share group by arm, feed_session_id) item
      group by arm
    ), underexposed as (
      select annotated.arm,
        count(*) filter (where coalesce(author_counts.eligible_story_count, 0) <= 2)::int as placements,
        count(*)::int as total
      from annotated
      left join author_counts on author_counts.author_id = annotated.author_id
      group by annotated.arm
    )
    select 'distribution'::text as row_type, row.arm, row.dimension, row.value,
      row.placements, total.placements as arm_placements,
      null::float8 as average_max_share, null::float8 as maximum_share,
      null::int as underexposed_placements
    from dimension_rows row
    inner join arm_totals total on total.arm = row.arm
    union all
    select 'concentration', concentration.arm, concentration.dimension, null,
      null, total.placements, concentration.average_max_share, concentration.maximum_share, null
    from concentration
    inner join arm_totals total on total.arm = concentration.arm
    union all
    select 'underexposed', underexposed.arm, 'author_catalog_le_2', null,
      null, underexposed.total, null, null, underexposed.placements
    from underexposed
    order by row_type, arm, dimension, value
  `, [days]);

  const distributions = {};
  const concentration = {};
  const underexposedWriterPlacements = {};
  for (const row of distributionResult.rows) {
    if (row.row_type === 'distribution') {
      distributions[row.arm] ??= {};
      distributions[row.arm][row.dimension] ??= {};
      distributions[row.arm][row.dimension][row.value] = {
        placements: row.placements,
        share: row.arm_placements > 0
          ? Number((row.placements / row.arm_placements).toFixed(4))
          : null,
      };
    } else if (row.row_type === 'concentration') {
      concentration[row.arm] ??= {};
      concentration[row.arm][row.dimension] = {
        averageMaximumShare: row.average_max_share,
        maximumShare: row.maximum_share,
      };
    } else {
      underexposedWriterPlacements[row.arm] = {
        definition: 'author has at most two currently eligible published stories',
        placements: row.underexposed_placements,
        share: row.arm_placements > 0
          ? Number((row.underexposed_placements / row.arm_placements).toFixed(4))
          : null,
      };
    }
  }

  const coverage = coverageResult.rows[0];
  const structuralComparison = comparisonResult.rows[0];
  const readiness = assessFeedShadowReadiness({ coverage, structuralComparison, distributions, concentration });
  console.log(JSON.stringify({
    source: {
      productionProject: PRODUCTION_PROJECT_REF,
      databaseTables: ['reader_feed_sessions', 'feed_exposures', 'feed_shadow_rankings', 'posts', 'profiles'],
      generatedAt: new Date().toISOString(),
      windowDays: days,
      population: 'server-recorded feed sessions for profiles classified as human',
    },
    status: {
      engineering: 'complete',
      visibleRanking: 'unchanged_v1',
      outcomeGate: coverage.shadow_sessions > 0 ? readiness.decision : 'awaiting_non_test_sessions',
      smallSample: coverage.shadow_sessions < 20 || coverage.shadow_readers < 5,
    },
    coverage,
    structuralComparison,
    distributions,
    concentration,
    underexposedWriterPlacements,
    readiness,
    limitations: [
      'Shadow ranks are not served to readers, so this report measures structural safety rather than retention uplift.',
      'Second-story completion and D7 qualified return require mature outcome attribution and are not inferred here.',
      'Small samples are reported but must not be used to approve visible ranking.',
    ],
  }, null, 2));
} finally {
  await database.end().catch(() => {});
}
