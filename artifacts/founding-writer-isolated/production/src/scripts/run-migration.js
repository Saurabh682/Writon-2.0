import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function runCleanMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const queries = [
    // 1. Profiles columns
    `alter table public.profiles add column if not exists account_type text not null default 'unknown';`,
    
    // 2. Posts columns
    `alter table public.posts add column if not exists language_code text not null default 'und';`,
    `alter table public.posts add column if not exists language_source text not null default 'system_default';`,
    `alter table public.posts add column if not exists language_confidence numeric(4,3) not null default 0;`,
    `alter table public.posts add column if not exists provenance text not null default 'unknown';`,
    `alter table public.posts add column if not exists provenance_verified_at timestamptz;`,
    `alter table public.posts add column if not exists provenance_verified_by text;`,

    // 3. Mark existing human posts as human_verified
    `update public.posts set provenance = 'human_verified' where provenance = 'unknown';`,
    `update public.posts set language_code = 'en' where language_code = 'und';`,

    // 4. Feed Sessions table
    `create table if not exists public.reader_feed_sessions (
      id uuid primary key default gen_random_uuid(),
      profile_id text references public.profiles(id) on delete cascade,
      preferred_language text not null default 'en',
      experiment_group text not null default 'base',
      ranking_version text not null default 'v1',
      snapshot_seed uuid not null default gen_random_uuid(),
      expires_at timestamptz not null default now() + interval '2 hours',
      created_at timestamptz not null default now()
    );`,

    // 5. Reader Behavior Events table
    `create table if not exists public.reader_behavior_events (
      id uuid primary key default gen_random_uuid(),
      profile_id text not null references public.profiles(id) on delete cascade,
      story_id uuid not null references public.posts(id) on delete cascade,
      event_type text not null,
      numeric_value numeric(8,3) not null default 0,
      feed_session_id uuid references public.reader_feed_sessions(id) on delete set null,
      client_event_time timestamptz not null default now(),
      server_received_at timestamptz not null default now(),
      idempotency_key uuid not null default gen_random_uuid(),
      ranking_model_version text not null default 'v1',
      unique (profile_id, idempotency_key)
    );`,

    // 6. Reader Affinity Scores table
    `create table if not exists public.reader_affinity_scores (
      profile_id text not null references public.profiles(id) on delete cascade,
      dimension_type text not null,
      dimension_value text not null,
      score numeric(8,3) not null default 0,
      evidence_count integer not null default 0,
      positive_evidence_count integer not null default 0,
      negative_evidence_count integer not null default 0,
      last_decay_time timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (profile_id, dimension_type, dimension_value)
    );`,

    // 7. Feed Exposures table
    `create table if not exists public.feed_exposures (
      profile_id text references public.profiles(id) on delete cascade,
      feed_session_id uuid not null references public.reader_feed_sessions(id) on delete cascade,
      story_id uuid not null references public.posts(id) on delete cascade,
      rank_position integer not null default 0,
      candidate_pool text not null default 'preferred',
      model_version text not null default 'v1',
      ranked_at timestamptz not null default now(),
      shown_at timestamptz,
      opened_at timestamptz,
      primary key (feed_session_id, story_id),
      unique (feed_session_id, rank_position)
    );`,

    // 8. Performance Indexes
    `create index if not exists posts_reader_feed_language_published_idx on public.posts (language_code, published_at desc, id);`,
    `create index if not exists posts_reader_feed_author_published_idx on public.posts (author_id, published_at desc, id);`,
    `create index if not exists reader_feed_sessions_profile_created_idx on public.reader_feed_sessions (profile_id, created_at desc);`,
  ];

  for (let i = 0; i < queries.length; i++) {
    try {
      await pool.query(queries[i]);
      console.log(`✅ Query ${i + 1}/${queries.length} succeeded.`);
    } catch (err) {
      console.error(`❌ Query ${i + 1}/${queries.length} failed:`, err.message);
    }
  }

  await pool.end();
}

runCleanMigration();
