import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    penName: text('pen_name').notNull().unique(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    quoteOfDay: text('quote_of_day'),
    followersCnt: integer('followers_cnt').default(0).notNull(),
    followingCnt: integer('following_cnt').default(0).notNull(),
    createdAt: text('created_at').default(sql `CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text('updated_at').default(sql `CURRENT_TIMESTAMP`).notNull()
});
export const posts = sqliteTable('posts', {
    id: text('id').primaryKey(),
    authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    summary: text('summary'),
    content: text('content').notNull(), // Markdown or HTML/JSON block structure
    category: text('category').notNull().default('Essays'), // Essays, Poetry, Tech, Philosophy, Fiction, Culture
    coverImage: text('cover_image'),
    readingTimeMin: integer('reading_time_min').default(3).notNull(),
    likesCnt: integer('likes_cnt').default(0).notNull(),
    commentsCnt: integer('comments_cnt').default(0).notNull(),
    bookmarksCnt: integer('bookmarks_cnt').default(0).notNull(),
    isPublished: integer('is_published', { mode: 'boolean' }).default(true).notNull(),
    publishedAt: text('published_at').default(sql `CURRENT_TIMESTAMP`),
    createdAt: text('created_at').default(sql `CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text('updated_at').default(sql `CURRENT_TIMESTAMP`).notNull()
});
export const bookmarks = sqliteTable('bookmarks', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').default(sql `CURRENT_TIMESTAMP`).notNull()
});
export const likes = sqliteTable('likes', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').default(sql `CURRENT_TIMESTAMP`).notNull()
});
export const comments = sqliteTable('comments', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    content: text('content').notNull(),
    createdAt: text('created_at').default(sql `CURRENT_TIMESTAMP`).notNull()
});
export const follows = sqliteTable('follows', {
    id: text('id').primaryKey(),
    followerId: text('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    followingId: text('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').default(sql `CURRENT_TIMESTAMP`).notNull()
});
