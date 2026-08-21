import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const applyChanges = process.argv.includes('--apply');
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '../../..');
const exportDirectory = resolve(repositoryRoot, 'data-exports/csv');
const backupDirectory = resolve(repositoryRoot, 'server/backups');
const importPrefix = 'legacy:';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Add it to server/.env before running this importer.');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length !== 0) {
        throw new Error(`Malformed CSV: unexpected quote at character ${index}.`);
      }
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (quoted) {
    throw new Error('Malformed CSV: unterminated quoted value.');
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...values] = rows;
  if (!headers?.length) {
    throw new Error('Malformed CSV: header row is missing.');
  }

  return values
    .filter((values) => values.some((value) => value.length > 0))
    .map((values, rowIndex) => {
      if (values.length !== headers.length) {
        throw new Error(`Malformed CSV: row ${rowIndex + 2} has ${values.length} values; expected ${headers.length}.`);
      }

      return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    });
}

async function readCsv(name) {
  return parseCsv(await readFile(resolve(exportDirectory, `${name}.csv`), 'utf8'));
}

function nullable(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validEmail(value) {
  const email = nullable(value)?.toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function deterministicUuid(namespace, legacyId) {
  const bytes = createHash('sha256').update(`writon:${namespace}:${legacyId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function shortHash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 7);
}

function normalizePenName(value, legacyId) {
  const normalized = String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  const fallback = `writer_${shortHash(legacyId)}`;
  return (normalized || fallback).slice(0, 32);
}

function uniqueValue(candidate, occupied, fallback) {
  let value = candidate || fallback;
  let suffix = 0;

  while (occupied.has(value)) {
    suffix += 1;
    const tail = `_${suffix}`;
    value = `${(candidate || fallback).slice(0, Math.max(1, 32 - tail.length))}${tail}`;
  }

  occupied.add(value);
  return value;
}

function uniqueEmail(candidate, occupied, legacyId) {
  if (!candidate) {
    return null;
  }

  if (!occupied.has(candidate)) {
    occupied.add(candidate);
    return candidate;
  }

  const [local, domain] = candidate.split('@');
  const alias = `${local.slice(0, 48)}+legacy-${shortHash(legacyId)}@${domain}`;
  let value = alias;
  let suffix = 0;
  while (occupied.has(value)) {
    suffix += 1;
    value = `${local.slice(0, 40)}+legacy-${shortHash(`${legacyId}:${suffix}`)}@${domain}`;
  }
  occupied.add(value);
  return value;
}

function normalizeDate(value, fallback, invalidDates) {
  const raw = nullable(value);
  if (!raw) {
    return fallback;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    invalidDates.count += 1;
    return fallback;
  }

  return date.toISOString();
}

function asPositiveInteger(value, fallback = 1) {
  const number = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function isPublished(value) {
  return ['1', 'true', 'yes', 'published'].includes(String(value ?? '').trim().toLowerCase());
}

function makeSlug(value, legacyId) {
  const normalized = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return normalized || `story-${shortHash(legacyId)}`;
}

function uniqueSlug(candidate, occupied, legacyId) {
  const base = candidate.slice(0, 82);
  let value = base;
  let suffix = 0;
  while (occupied.has(value)) {
    suffix += 1;
    const tail = `-${shortHash(`${legacyId}:${suffix}`)}`;
    value = `${base.slice(0, Math.max(1, 96 - tail.length))}${tail}`;
  }
  occupied.add(value);
  return value;
}

function batched(values, size = 100) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function insertRows(client, table, columns, rows, onConflict) {
  for (const batch of batched(rows)) {
    const parameters = [];
    const placeholders = batch.map((row, rowIndex) => {
      const offset = rowIndex * columns.length;
      parameters.push(...row);
      return `(${columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`).join(', ')})`;
    });
    await client.query(
      `insert into public.${table} (${columns.join(', ')}) values ${placeholders.join(', ')} ${onConflict}`,
      parameters,
    );
  }
}

async function readExistingValues(client) {
  const [profiles, slugs] = await Promise.all([
    client.query("select pen_name, email from public.profiles where id not like 'legacy:%'"),
    client.query("select slug from public.posts where author_id not like 'legacy:%'"),
  ]);

  return {
    penNames: new Set(profiles.rows.map((row) => row.pen_name)),
    emails: new Set(profiles.rows.map((row) => row.email).filter(Boolean)),
    slugs: new Set(slugs.rows.map((row) => row.slug)),
  };
}

async function loadMigrationData(existing) {
  const [users, posts, comments, follows, likes, bookmarks] = await Promise.all([
    readCsv('users'),
    readCsv('posts'),
    readCsv('comments'),
    readCsv('follows'),
    readCsv('likes'),
    readCsv('bookmarks'),
  ]);

  const timestampFallback = new Date().toISOString();
  const invalidDates = { count: 0 };
  const importedProfiles = [];
  const userMap = new Map();

  for (const source of users) {
    const legacyId = nullable(source.id);
    if (!legacyId || userMap.has(legacyId)) {
      throw new Error('Legacy users contain a missing or duplicate id.');
    }

    const profileId = `${importPrefix}${legacyId}`;
    const penName = uniqueValue(
      normalizePenName(source.pen_name || source.full_name, legacyId),
      existing.penNames,
      `writer_${shortHash(legacyId)}`,
    );
    const email = uniqueEmail(validEmail(source.email), existing.emails, legacyId);
    const createdAt = normalizeDate(source.created_at, timestampFallback, invalidDates);
    const updatedAt = normalizeDate(source.updated_at, createdAt, invalidDates);

    userMap.set(legacyId, profileId);
    importedProfiles.push({
      profileId,
      legacyId,
      email,
      penName,
      fullName: nullable(source.full_name) || nullable(source.pen_name) || `Legacy writer ${shortHash(legacyId)}`,
      bio: nullable(source.bio),
      avatarUrl: nullable(source.avatar_url),
      quoteOfDay: nullable(source.quote_of_day),
      createdAt,
      updatedAt,
    });
  }

  const importedPosts = [];
  const postMap = new Map();
  for (const source of posts) {
    const legacyId = nullable(source.id);
    const authorId = userMap.get(nullable(source.author_id));
    if (!legacyId || postMap.has(legacyId) || !authorId) {
      continue;
    }

    const published = isPublished(source.is_published);
    const createdAt = normalizeDate(source.created_at, timestampFallback, invalidDates);
    const updatedAt = normalizeDate(source.updated_at, createdAt, invalidDates);
    const publishedAt = published ? normalizeDate(source.published_at, createdAt, invalidDates) : null;
    const title = nullable(source.title) || `Untitled legacy story ${shortHash(legacyId)}`;
    const postId = deterministicUuid('post', legacyId);

    postMap.set(legacyId, postId);
    importedPosts.push({
      postId,
      authorId,
      title,
      slug: uniqueSlug(makeSlug(source.slug || title, legacyId), existing.slugs, legacyId),
      summary: nullable(source.summary),
      content: String(source.content ?? ''),
      category: nullable(source.category) || 'Essays',
      coverImageUrl: nullable(source.cover_image),
      status: published ? 'published' : 'draft',
      isPublic: published,
      readingTime: asPositiveInteger(source.reading_time_min),
      createdAt,
      updatedAt,
      publishedAt,
    });
  }

  const importedComments = [];
  for (const source of comments) {
    const legacyId = nullable(source.id);
    const postId = postMap.get(nullable(source.post_id));
    const authorId = userMap.get(nullable(source.author_id));
    const content = nullable(source.content);
    if (!legacyId || !postId || !authorId || !content) {
      continue;
    }
    importedComments.push({
      commentId: deterministicUuid('comment', legacyId),
      postId,
      authorId,
      content,
      parentLegacyId: nullable(source.parent_id),
      createdAt: normalizeDate(source.created_at, timestampFallback, invalidDates),
    });
  }

  const importedFollows = follows
    .map((source) => ({
      followerId: userMap.get(nullable(source.follower_id)),
      followingId: userMap.get(nullable(source.following_id)),
      createdAt: normalizeDate(source.created_at, timestampFallback, invalidDates),
    }))
    .filter((row) => row.followerId && row.followingId && row.followerId !== row.followingId);

  const importedApplauds = likes
    .map((source) => ({
      userId: userMap.get(nullable(source.user_id)),
      postId: postMap.get(nullable(source.post_id)),
      createdAt: normalizeDate(source.created_at, timestampFallback, invalidDates),
    }))
    .filter((row) => row.userId && row.postId);

  const importedBookmarks = bookmarks
    .map((source) => ({
      userId: userMap.get(nullable(source.user_id)),
      postId: postMap.get(nullable(source.post_id)),
      createdAt: normalizeDate(source.created_at, timestampFallback, invalidDates),
    }))
    .filter((row) => row.userId && row.postId);

  return {
    rawCounts: { users: users.length, posts: posts.length, comments: comments.length, follows: follows.length, likes: likes.length, bookmarks: bookmarks.length },
    profiles: importedProfiles,
    posts: importedPosts,
    comments: importedComments,
    follows: importedFollows,
    applauds: importedApplauds,
    bookmarks: importedBookmarks,
    invalidDates: invalidDates.count,
  };
}

async function writeBackup(client) {
  const tables = ['profiles', 'posts', 'comments', 'follows', 'bookmarks', 'post_applauds', 'notifications'];
  const snapshot = { exportedAt: new Date().toISOString(), tables: {} };

  for (const table of tables) {
    const result = await client.query(`select * from public.${table}`);
    snapshot.tables[table] = result.rows;
  }

  await mkdir(backupDirectory, { recursive: true });
  const backupPath = resolve(backupDirectory, `pre-legacy-import-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(backupPath, JSON.stringify(snapshot, null, 2), 'utf8');
  return backupPath;
}

async function tableCounts(client) {
  const result = await client.query(`
    select
      (select count(*)::int from public.profiles) as profiles,
      (select count(*)::int from public.posts) as posts,
      (select count(*)::int from public.comments) as comments,
      (select count(*)::int from public.follows) as follows,
      (select count(*)::int from public.post_applauds) as applauds,
      (select count(*)::int from public.bookmarks) as bookmarks
  `);
  return result.rows[0];
}

async function ensureMetadataTables(client) {
  await client.query(`
    create table if not exists public.legacy_import_profile_attributes (
      profile_id text primary key references public.profiles(id) on delete cascade,
      legacy_user_id text not null unique,
      quote_of_day text,
      imported_at timestamptz not null default now()
    );
    create table if not exists public.legacy_import_comment_links (
      comment_id uuid primary key references public.comments(id) on delete cascade,
      legacy_parent_id text,
      imported_at timestamptz not null default now()
    );
  `);
}

async function applyMigration(client, data) {
  await ensureMetadataTables(client);

  await insertRows(
    client,
    'profiles',
    ['id', 'email', 'pen_name', 'full_name', 'bio', 'avatar_url', 'joined_at', 'created_at', 'updated_at', 'followers_count', 'following_count'],
    data.profiles.map((row) => [row.profileId, row.email, row.penName, row.fullName, row.bio, row.avatarUrl, row.createdAt, row.createdAt, row.updatedAt, 0, 0]),
    'on conflict (id) do update set email = excluded.email, pen_name = excluded.pen_name, full_name = excluded.full_name, bio = excluded.bio, avatar_url = excluded.avatar_url, updated_at = excluded.updated_at',
  );
  await insertRows(
    client,
    'legacy_import_profile_attributes',
    ['profile_id', 'legacy_user_id', 'quote_of_day'],
    data.profiles.map((row) => [row.profileId, row.legacyId, row.quoteOfDay]),
    'on conflict (profile_id) do update set quote_of_day = excluded.quote_of_day, imported_at = now()',
  );
  await insertRows(
    client,
    'posts',
    ['id', 'slug', 'author_id', 'title', 'summary', 'content', 'category', 'cover_image_url', 'status', 'is_public', 'reading_time_min', 'likes_count', 'comments_count', 'bookmarks_count', 'created_at', 'updated_at', 'published_at'],
    data.posts.map((row) => [row.postId, row.slug, row.authorId, row.title, row.summary, row.content, row.category, row.coverImageUrl, row.status, row.isPublic, row.readingTime, 0, 0, 0, row.createdAt, row.updatedAt, row.publishedAt]),
    'on conflict (id) do update set slug = excluded.slug, author_id = excluded.author_id, title = excluded.title, summary = excluded.summary, content = excluded.content, category = excluded.category, cover_image_url = excluded.cover_image_url, status = excluded.status, is_public = excluded.is_public, reading_time_min = excluded.reading_time_min, updated_at = excluded.updated_at, published_at = excluded.published_at',
  );
  await insertRows(
    client,
    'comments',
    ['id', 'post_id', 'author_id', 'content', 'created_at', 'updated_at'],
    data.comments.map((row) => [row.commentId, row.postId, row.authorId, row.content, row.createdAt, row.createdAt]),
    'on conflict (id) do update set post_id = excluded.post_id, author_id = excluded.author_id, content = excluded.content, updated_at = excluded.updated_at',
  );
  await insertRows(
    client,
    'legacy_import_comment_links',
    ['comment_id', 'legacy_parent_id'],
    data.comments.filter((row) => row.parentLegacyId).map((row) => [row.commentId, row.parentLegacyId]),
    'on conflict (comment_id) do update set legacy_parent_id = excluded.legacy_parent_id, imported_at = now()',
  );
  await insertRows(client, 'follows', ['follower_id', 'following_id', 'created_at'], data.follows.map((row) => [row.followerId, row.followingId, row.createdAt]), 'on conflict do nothing');
  await insertRows(client, 'post_applauds', ['post_id', 'user_id', 'created_at'], data.applauds.map((row) => [row.postId, row.userId, row.createdAt]), 'on conflict do nothing');
  await insertRows(client, 'bookmarks', ['post_id', 'user_id', 'created_at'], data.bookmarks.map((row) => [row.postId, row.userId, row.createdAt]), 'on conflict do nothing');

  await client.query(`
    update public.posts post set
      likes_count = (select count(*)::int from public.post_applauds applause where applause.post_id = post.id),
      comments_count = (select count(*)::int from public.comments comment where comment.post_id = post.id),
      bookmarks_count = (select count(*)::int from public.bookmarks bookmark where bookmark.post_id = post.id)
    where post.id in (select id from public.posts where author_id like 'legacy:%');

    update public.profiles profile set
      followers_count = (select count(*)::int from public.follows follow where follow.following_id = profile.id),
      following_count = (select count(*)::int from public.follows follow where follow.follower_id = profile.id)
    where profile.id like 'legacy:%';
  `);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();

try {
  const existing = await readExistingValues(client);
  const data = await loadMigrationData(existing);
  const before = await tableCounts(client);

  console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'dry-run', before, sourceRows: data.rawCounts, importableRows: {
    profiles: data.profiles.length,
    posts: data.posts.length,
    comments: data.comments.length,
    follows: data.follows.length,
    applauds: data.applauds.length,
    bookmarks: data.bookmarks.length,
  }, invalidTimestampValues: data.invalidDates }, null, 2));

  if (!applyChanges) {
    console.log('Dry run complete. Re-run with --apply only after reviewing these counts.');
    process.exitCode = 0;
  } else {
    const backupPath = await writeBackup(client);
    await client.query('begin');
    try {
      await applyMigration(client, data);
      const after = await tableCounts(client);
      await client.query('commit');
      console.log(JSON.stringify({ status: 'imported', backupPath, after }, null, 2));
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }
} finally {
  client.release();
  await pool.end();
}
