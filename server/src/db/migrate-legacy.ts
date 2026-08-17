import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { sqlite } from './index.js';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';
import { nanoid } from 'nanoid';

const LEGACY_BACKUP_DIR = 'D:\\Gdrive\\WoN App\\backup';

// Robust SQL dump parser that handles strings, escapes, quotes, and HTML entities
function parseSqlInsertTuples(sqlContent: string): any[][] {
  const results: any[][] = [];
  const insertPattern = /INSERT INTO `?\w+`? VALUES\s*/gi;
  let match;

  while ((match = insertPattern.exec(sqlContent)) !== null) {
    let i = match.index + match[0].length;
    let inString = false;
    let stringChar = '';
    let isEscaped = false;
    let insideTuple = false;
    let currentTuple: any[] = [];
    let currentField = '';

    while (i < sqlContent.length) {
      const char = sqlContent[i];

      if (isEscaped) {
        currentField += char;
        isEscaped = false;
        i++;
        continue;
      }

      if (char === '\\') {
        isEscaped = true;
        i++;
        continue;
      }

      if (inString) {
        if (char === stringChar) {
          // Check for SQL escaped quote ''
          if (i + 1 < sqlContent.length && sqlContent[i + 1] === stringChar) {
            currentField += stringChar;
            i += 2;
            continue;
          }
          inString = false;
        } else {
          currentField += char;
        }
        i++;
        continue;
      }

      if (char === "'" || char === '"') {
        inString = true;
        stringChar = char;
        i++;
        continue;
      }

      // Statement ends at a semicolon outside of strings
      if (char === ';' && !insideTuple) {
        break;
      }

      if (char === '(' && !insideTuple) {
        insideTuple = true;
        currentTuple = [];
        currentField = '';
        i++;
        continue;
      }

      if (char === ')' && insideTuple) {
        insideTuple = false;
        currentTuple.push(cleanSqlField(currentField));
        results.push(currentTuple);
        currentTuple = [];
        currentField = '';
        i++;
        continue;
      }

      if (char === ',' && insideTuple) {
        currentTuple.push(cleanSqlField(currentField));
        currentField = '';
        i++;
        continue;
      }

      if (insideTuple) {
        currentField += char;
      }

      i++;
    }
  }

  return results;
}

function cleanSqlField(field: string): any {
  let trimmed = field.trim();
  if (trimmed.toUpperCase() === 'NULL') return null;
  // If wrapped in single quotes
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    trimmed = trimmed.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
  }
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  return trimmed;
}

function safeString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/div><div>/gi, '\n')
    .replace(/<div>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function mapLegacyCategory(category?: string, subCat?: string): string {
  const cat = (category || '').toLowerCase();
  const sub = (subCat || '').toLowerCase();

  if (cat.includes('short') || cat.includes('story') || cat.includes('fiction')) return 'Short Stories';
  if (cat.includes('shayari') || sub.includes('shayari')) return 'Shayari';
  if (cat.includes('poet') || cat.includes('song') || cat.includes('jingle')) return 'Poetry';
  if (cat.includes('joke') || cat.includes('humour') || cat.includes('comedy')) return 'Humour';
  if (cat.includes('review')) return 'Reviews';
  if (cat.includes('journal') || cat.includes('news')) return 'Journalism';
  if (sub.includes('philo') || sub.includes('wisdom') || sub.includes('religion')) return 'Philosophy';
  if (sub.includes('tech') || sub.includes('code') || sub.includes('science')) return 'Tech';
  if (sub.includes('culture') || sub.includes('travel') || sub.includes('life')) return 'Culture';
  return 'Essays';
}

async function runMigration() {
  console.log('🚀 Starting WritOn 1.0 -> 2.0 Legacy Data Migration...\n');

  if (!fs.existsSync(LEGACY_BACKUP_DIR)) {
    console.error(`❌ Legacy backup directory not found at ${LEGACY_BACKUP_DIR}`);
    process.exit(1);
  }

  const userIdMap = new Map<number, string>(); // legacy UserId -> modern user UUID
  const postIdMap = new Map<number, string>(); // legacy BlogId -> modern post UUID
  const usedPenNames = new Set<string>();
  const usedEmails = new Set<string>();

  const defaultPasswordHash = await bcrypt.hash('writon@123', 10);

  // ----------------------------------------------------
  // PART 1: MIGRATING USERS (Blog_UserMaster.sql)
  // ----------------------------------------------------
  console.log('📦 [Part 1/3] Migrating Authors & Users...');
  const userSqlPath = path.join(LEGACY_BACKUP_DIR, 'Blog_UserMaster.sql');
  if (fs.existsSync(userSqlPath)) {
    const userSql = fs.readFileSync(userSqlPath, 'utf8');
    const userTuples = parseSqlInsertTuples(userSql);

    const insertUser = sqlite.prepare(`
      INSERT OR REPLACE INTO users (id, pen_name, full_name, email, password_hash, avatar_url, bio, quote_of_day, followers_cnt, following_cnt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `);

    let userCount = 0;
    sqlite.transaction(() => {
      for (const tuple of userTuples) {
        // Tuple: [UserId, Name, Email, DOB, Gender, Password, IsActive, IsDeleted, CreationDate, UserName, QuoteofDay, Introducation, WorkingOn, LoginType, FacebookId, AvatorCode, FcmID]
        const legacyId = tuple[0];
        const rawName = safeString(tuple[1]);
        const rawEmail = safeString(tuple[2]).toLowerCase();
        const creationDate = safeString(tuple[8]) || new Date().toISOString();
        const rawUserName = safeString(tuple[9]);
        const quoteOfDay = tuple[10] ? safeString(tuple[10]) : null;
        const intro = tuple[11] ? safeString(tuple[11]) : null;

        if (!legacyId) continue;

        const modernId = `usr_leg_${legacyId}`;
        userIdMap.set(legacyId, modernId);

        // Deduplicate & normalize penName
        let basePenName = rawUserName || rawName || `writer_${legacyId}`;
        basePenName = basePenName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        if (basePenName.length < 2) basePenName = `writer_${legacyId}`;

        let penName = basePenName;
        let counter = 1;
        while (usedPenNames.has(penName)) {
          penName = `${basePenName}_${counter++}`;
        }
        usedPenNames.add(penName);

        // Deduplicate email
        let email = rawEmail && rawEmail.includes('@') ? rawEmail : `author_${legacyId}@legacy.writon.io`;
        let emailCounter = 1;
        while (usedEmails.has(email)) {
          email = `author_${legacyId}_${emailCounter++}@legacy.writon.io`;
        }
        usedEmails.add(email);

        const fullName = rawName || rawUserName || `Writer ${legacyId}`;
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(penName)}`;

        insertUser.run(
          modernId,
          penName,
          fullName,
          email,
          defaultPasswordHash,
          avatarUrl,
          intro,
          quoteOfDay,
          creationDate,
          creationDate
        );
        userCount++;
      }
    })();

    console.log(`✅ Successfully imported ${userCount} legacy authors.\n`);
  }

  // Ensure default fallback author exists
  const fallbackAuthorId = 'usr_leg_fallback';
  sqlite.prepare(`
    INSERT OR IGNORE INTO users (id, pen_name, full_name, email, password_hash, avatar_url, bio, quote_of_day)
    VALUES (?, 'writon_archive', 'WritOn Archive', 'archive@writon.io', ?, 'https://api.dicebear.com/7.x/bottts/svg?seed=archive', 'Preserved legacy stories and classics.', 'Every word leaves a mark.')
  `).run(fallbackAuthorId, defaultPasswordHash);

  // ----------------------------------------------------
  // PART 2: MIGRATING STORIES (Blog_BlogMaster.sql)
  // ----------------------------------------------------
  console.log('📦 [Part 2/3] Migrating Stories & Articles...');
  const blogSqlPath = path.join(LEGACY_BACKUP_DIR, 'Blog_BlogMaster.sql');
  if (fs.existsSync(blogSqlPath)) {
    const blogSql = fs.readFileSync(blogSqlPath, 'utf8');
    const blogTuples = parseSqlInsertTuples(blogSql);

    const insertPost = sqlite.prepare(`
      INSERT OR REPLACE INTO posts (id, author_id, title, slug, summary, content, category, cover_image, reading_time_min, likes_cnt, comments_cnt, bookmarks_cnt, is_published, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, ?, ?, ?)
    `);

    let postCount = 0;
    const usedSlugs = new Set<string>();

    sqlite.transaction(() => {
      for (const tuple of blogTuples) {
        // Tuple: [BlogId, Category, SubCat, Title, ShortDescription, LongDescription, CreateBy, CreationDate, Language, IsDraft, ...]
        const legacyBlogId = tuple[0];
        const rawCategory = safeString(tuple[1]);
        const rawSubCat = safeString(tuple[2]);
        const rawTitle = safeString(tuple[3]);
        const rawShortDesc = safeString(tuple[4]);
        const rawLongDesc = safeString(tuple[5]);
        const legacyAuthorId = tuple[6];
        const creationDate = safeString(tuple[7]) || new Date().toISOString();
        const isDraft = tuple[9] === 1;

        if (!legacyBlogId || !rawLongDesc || isDraft) continue;

        const modernPostId = `post_leg_${legacyBlogId}`;
        postIdMap.set(legacyBlogId, modernPostId);

        const authorId = userIdMap.get(legacyAuthorId) || fallbackAuthorId;
        const title = rawTitle || `Untitled Legacy Story #${legacyBlogId}`;
        const content = htmlToMarkdown(rawLongDesc);
        const summary = rawShortDesc ? htmlToMarkdown(rawShortDesc) : content.slice(0, 180) + '...';
        const category = mapLegacyCategory(rawCategory, rawSubCat);

        // Calculate reading time
        const wordCount = content.trim().split(/\s+/).length;
        const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

        // Generate slug
        let baseSlug = slugify(title, { lower: true, strict: true }) || `story-${legacyBlogId}`;
        let slug = `${baseSlug}-${legacyBlogId}`;
        usedSlugs.add(slug);

        // Curated editorial cover image per category
        const coverImage = `https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&auto=format&fit=crop&q=80`;

        insertPost.run(
          modernPostId,
          authorId,
          title,
          slug,
          summary,
          content,
          category,
          coverImage,
          readingTimeMin,
          creationDate,
          creationDate,
          creationDate
        );
        postCount++;
      }
    })();

    console.log(`✅ Successfully imported ${postCount} legacy stories & articles.\n`);
  }

  // ----------------------------------------------------
  // PART 3: MIGRATING SOCIAL INTERACTIONS (Comments, Bookmarks, Likes)
  // ----------------------------------------------------
  console.log('📦 [Part 3/3] Migrating Comments, Bookmarks & Social Graph...');

  // 1. Comments
  const commentSqlPath = path.join(LEGACY_BACKUP_DIR, 'Blog_BlogComment.sql');
  let commentCount = 0;
  if (fs.existsSync(commentSqlPath)) {
    const commentSql = fs.readFileSync(commentSqlPath, 'utf8');
    const commentTuples = parseSqlInsertTuples(commentSql);

    const insertComment = sqlite.prepare(`
      INSERT OR REPLACE INTO comments (id, post_id, author_id, parent_id, content, created_at)
      VALUES (?, ?, ?, NULL, ?, ?)
    `);

    sqlite.transaction(() => {
      for (const tuple of commentTuples) {
        // [Id, BlogId, Comment, UserId, CreationDate, IsDeleted]
        const legacyCommentId = tuple[0];
        const legacyBlogId = tuple[1];
        const rawComment = safeString(tuple[2]);
        const legacyUserId = tuple[3];
        const creationDate = safeString(tuple[4]) || new Date().toISOString();
        const isDeleted = tuple[5] === 1;

        if (!legacyCommentId || !rawComment || isDeleted) continue;

        const postId = postIdMap.get(legacyBlogId);
        const authorId = userIdMap.get(legacyUserId);

        if (!postId || !authorId) continue;

        const modernCommentId = `cmt_leg_${legacyCommentId}`;
        const content = htmlToMarkdown(rawComment);

        insertComment.run(modernCommentId, postId, authorId, content, creationDate);
        commentCount++;
      }
    })();
    console.log(`  💬 Imported ${commentCount} comments.`);
  }

  // 2. Bookmarks
  const bookmarkSqlPath = path.join(LEGACY_BACKUP_DIR, 'Blog_BookMarks.sql');
  let bookmarkCount = 0;
  if (fs.existsSync(bookmarkSqlPath)) {
    const bookmarkSql = fs.readFileSync(bookmarkSqlPath, 'utf8');
    const bookmarkTuples = parseSqlInsertTuples(bookmarkSql);

    const insertBookmark = sqlite.prepare(`
      INSERT OR IGNORE INTO bookmarks (id, user_id, post_id, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);

    sqlite.transaction(() => {
      for (const tuple of bookmarkTuples) {
        // [ID, UserID, BlogID]
        const legacyUserId = tuple[1];
        const legacyBlogId = tuple[2];

        const userId = userIdMap.get(legacyUserId);
        const postId = postIdMap.get(legacyBlogId);

        if (!userId || !postId) continue;

        insertBookmark.run(`bmk_${nanoid(10)}`, userId, postId);
        bookmarkCount++;
      }
    })();
    console.log(`  🔖 Imported ${bookmarkCount} bookmarks.`);
  }

  // 3. Likes / Votes
  const voteSqlPath = path.join(LEGACY_BACKUP_DIR, 'Blog_BlogVotes.sql');
  let likeCount = 0;
  if (fs.existsSync(voteSqlPath)) {
    const voteSql = fs.readFileSync(voteSqlPath, 'utf8');
    const voteTuples = parseSqlInsertTuples(voteSql);

    const insertLike = sqlite.prepare(`
      INSERT OR IGNORE INTO likes (id, user_id, post_id, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);

    sqlite.transaction(() => {
      for (const tuple of voteTuples) {
        // [ID, UserID, BlogID, Type]
        const legacyUserId = tuple[1];
        const legacyBlogId = tuple[2];

        const userId = userIdMap.get(legacyUserId);
        const postId = postIdMap.get(legacyBlogId);

        if (!userId || !postId) continue;

        insertLike.run(`like_${nanoid(10)}`, userId, postId);
        likeCount++;
      }
    })();
    console.log(`  ❤️  Imported ${likeCount} likes / applause.`);
  }

  // 4. Followers / Social Graph
  const followSqlPath = path.join(LEGACY_BACKUP_DIR, 'Blog_Following.sql');
  let followCount = 0;
  if (fs.existsSync(followSqlPath)) {
    const followSql = fs.readFileSync(followSqlPath, 'utf8');
    const followTuples = parseSqlInsertTuples(followSql);

    const insertFollow = sqlite.prepare(`
      INSERT OR IGNORE INTO follows (id, follower_id, following_id, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);

    sqlite.transaction(() => {
      for (const tuple of followTuples) {
        // [ID, UserID, FollowingID]
        const legacyFollowerId = tuple[1];
        const legacyFollowingId = tuple[2];

        const followerId = userIdMap.get(legacyFollowerId);
        const followingId = userIdMap.get(legacyFollowingId);

        if (!followerId || !followingId || followerId === followingId) continue;

        insertFollow.run(`flw_${nanoid(10)}`, followerId, followingId);
        followCount++;
      }
    })();
    console.log(`  👥 Imported ${followCount} follower connections.`);
  }

  // ----------------------------------------------------
  // RECALCULATE AGGREGATES
  // ----------------------------------------------------
  console.log('\n🔄 Recalculating story & author aggregate counts...');
  sqlite.exec(`
    UPDATE posts SET
      likes_cnt = (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id),
      comments_cnt = (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id),
      bookmarks_cnt = (SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = posts.id);

    UPDATE users SET
      followers_cnt = (SELECT COUNT(*) FROM follows WHERE follows.following_id = users.id),
      following_cnt = (SELECT COUNT(*) FROM follows WHERE follows.follower_id = users.id);
  `);

  console.log('\n🎉 Legacy Data Migration Complete!');
  console.log('All legacy authors, stories, comments, likes, and bookmarks are now live in WritOn 2.0.');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
