import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db/index.js';
import { posts, users, likes, bookmarks, follows } from '../db/schema.js';
import { eq, and, desc, sql, like, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import slugify from 'slugify';
import { authMiddleware, optionalAuthMiddleware } from '../auth/jwt.js';
const postsApp = new Hono();
// Helper to calculate reading time from text (approx 200 words/min)
function calculateReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
}
// GET /api/v1/posts - Feed with filtering & pagination
postsApp.get('/', optionalAuthMiddleware, async (c) => {
    const category = c.req.query('category');
    const tab = c.req.query('tab') || 'latest'; // latest, trending, following
    const search = c.req.query('q');
    const authorId = c.req.query('authorId');
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '15', 10);
    const offset = (page - 1) * limit;
    const currentUserId = c.get('user')?.userId;
    let query = db
        .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        summary: posts.summary,
        content: posts.content,
        category: posts.category,
        coverImage: posts.coverImage,
        readingTimeMin: posts.readingTimeMin,
        likesCnt: posts.likesCnt,
        commentsCnt: posts.commentsCnt,
        bookmarksCnt: posts.bookmarksCnt,
        isPublished: posts.isPublished,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        author: {
            id: users.id,
            penName: users.penName,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
            bio: users.bio
        }
    })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id));
    // Build conditions
    const conditions = [eq(posts.isPublished, true)];
    if (category && category !== 'All') {
        conditions.push(eq(posts.category, category));
    }
    if (authorId) {
        conditions.push(eq(posts.authorId, authorId));
    }
    if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(or(like(posts.title, searchPattern), like(posts.summary, searchPattern), like(posts.content, searchPattern)));
    }
    // Filter for 'following' tab
    if (tab === 'following' && currentUserId) {
        const followedAuthors = db
            .select({ followingId: follows.followingId })
            .from(follows)
            .where(eq(follows.followerId, currentUserId));
        const allFollows = await followedAuthors;
        const followedIds = allFollows.map(f => f.followingId);
        if (followedIds.length === 0) {
            return c.json({
                posts: [],
                pagination: { page, limit, total: 0, hasMore: false }
            });
        }
        // SQLite inArray equivalent
        conditions.push(sql `${posts.authorId} IN (${sql.join(followedIds.map(id => sql `${id}`), sql `, `)})`);
    }
    const whereClause = and(...conditions);
    // Sorting
    let orderByClause = desc(posts.createdAt);
    if (tab === 'trending') {
        // Trending score weighted by likes + comments
        orderByClause = desc(sql `(${posts.likesCnt} * 3 + ${posts.commentsCnt} * 2)`);
    }
    const rawPosts = await query
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);
    // If user is authenticated, attach isLiked / isBookmarked flags
    let userLikedPostIds = new Set();
    let userBookmarkedPostIds = new Set();
    if (currentUserId && rawPosts.length > 0) {
        const userLikes = await db
            .select({ postId: likes.postId })
            .from(likes)
            .where(eq(likes.userId, currentUserId));
        userLikedPostIds = new Set(userLikes.map(l => l.postId));
        const userBookmarks = await db
            .select({ postId: bookmarks.postId })
            .from(bookmarks)
            .where(eq(bookmarks.userId, currentUserId));
        userBookmarkedPostIds = new Set(userBookmarks.map(b => b.postId));
    }
    const enrichedPosts = rawPosts.map(p => ({
        ...p,
        isLiked: userLikedPostIds.has(p.id),
        isBookmarked: userBookmarkedPostIds.has(p.id)
    }));
    return c.json({
        posts: enrichedPosts,
        pagination: {
            page,
            limit,
            hasMore: enrichedPosts.length === limit
        }
    });
});
// GET /api/v1/posts/:id_or_slug - Detail view
postsApp.get('/:id_or_slug', optionalAuthMiddleware, async (c) => {
    const idOrSlug = c.req.param('id_or_slug');
    if (!idOrSlug) {
        return c.json({ error: 'Story ID or slug is required' }, 400);
    }
    const currentUserId = c.get('user')?.userId;
    const result = await db
        .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        summary: posts.summary,
        content: posts.content,
        category: posts.category,
        coverImage: posts.coverImage,
        readingTimeMin: posts.readingTimeMin,
        likesCnt: posts.likesCnt,
        commentsCnt: posts.commentsCnt,
        bookmarksCnt: posts.bookmarksCnt,
        isPublished: posts.isPublished,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        author: {
            id: users.id,
            penName: users.penName,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
            bio: users.bio,
            quoteOfDay: users.quoteOfDay,
            followersCnt: users.followersCnt,
            followingCnt: users.followingCnt
        }
    })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(or(eq(posts.id, idOrSlug), eq(posts.slug, idOrSlug)))
        .limit(1);
    if (result.length === 0) {
        return c.json({ error: 'Story not found' }, 404);
    }
    const post = result[0];
    let isLiked = false;
    let isBookmarked = false;
    let isFollowingAuthor = false;
    if (currentUserId) {
        const [likeRecord] = await db
            .select()
            .from(likes)
            .where(and(eq(likes.userId, currentUserId), eq(likes.postId, post.id)))
            .limit(1);
        isLiked = !!likeRecord;
        const [bookmarkRecord] = await db
            .select()
            .from(bookmarks)
            .where(and(eq(bookmarks.userId, currentUserId), eq(bookmarks.postId, post.id)))
            .limit(1);
        isBookmarked = !!bookmarkRecord;
        const [followRecord] = await db
            .select()
            .from(follows)
            .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, post.author.id)))
            .limit(1);
        isFollowingAuthor = !!followRecord;
    }
    return c.json({
        post: {
            ...post,
            isLiked,
            isBookmarked,
            isFollowingAuthor
        }
    });
});
// POST /api/v1/posts - Create Story (Protected)
const createPostSchema = z.object({
    title: z.string().min(3).max(255),
    content: z.string().min(10),
    summary: z.string().max(500).optional(),
    category: z.string().default('Essays'),
    coverImage: z.string().url().optional(),
    isPublished: z.boolean().default(true)
});
postsApp.post('/', authMiddleware, zValidator('json', createPostSchema), async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    const baseSlug = slugify.default ? slugify.default(data.title, { lower: true, strict: true }) : slugify(data.title, { lower: true, strict: true });
    const uniqueSlug = `${baseSlug || 'story'}-${nanoid(6)}`;
    const readingTime = calculateReadingTime(data.content);
    const postId = `post_${nanoid(12)}`;
    const summary = data.summary || data.content.substring(0, 180).replace(/[#*`_]/g, '') + '...';
    const [newPost] = await db
        .insert(posts)
        .values({
        id: postId,
        authorId: user.userId,
        title: data.title,
        slug: uniqueSlug,
        summary,
        content: data.content,
        category: data.category,
        coverImage: data.coverImage || null,
        readingTimeMin: readingTime,
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date().toISOString() : null
    })
        .returning();
    return c.json({ message: 'Story created successfully', post: newPost }, 201);
});
// PUT /api/v1/posts/:id - Update Story (Protected)
const updatePostSchema = z.object({
    title: z.string().min(3).max(255).optional(),
    content: z.string().min(10).optional(),
    summary: z.string().max(500).optional(),
    category: z.string().optional(),
    coverImage: z.string().url().nullable().optional(),
    isPublished: z.boolean().optional()
});
postsApp.put('/:id', authMiddleware, zValidator('json', updatePostSchema), async (c) => {
    const user = c.get('user');
    const postId = c.req.param('id');
    if (!postId) {
        return c.json({ error: 'Story ID is required' }, 400);
    }
    const data = c.req.valid('json');
    const [existingPost] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
    if (!existingPost) {
        return c.json({ error: 'Story not found' }, 404);
    }
    if (existingPost.authorId !== user.userId) {
        return c.json({ error: 'Forbidden: You do not own this story' }, 403);
    }
    const updates = {
        updatedAt: new Date().toISOString()
    };
    if (data.title !== undefined)
        updates.title = data.title;
    if (data.summary !== undefined)
        updates.summary = data.summary;
    if (data.category !== undefined)
        updates.category = data.category;
    if (data.coverImage !== undefined)
        updates.coverImage = data.coverImage;
    if (data.isPublished !== undefined)
        updates.isPublished = data.isPublished;
    if (data.content !== undefined) {
        updates.content = data.content;
        updates.readingTimeMin = calculateReadingTime(data.content);
        if (!data.summary) {
            updates.summary = data.content.substring(0, 180).replace(/[#*`_]/g, '') + '...';
        }
    }
    const [updatedPost] = await db
        .update(posts)
        .set(updates)
        .where(eq(posts.id, postId))
        .returning();
    return c.json({ message: 'Story updated successfully', post: updatedPost });
});
// DELETE /api/v1/posts/:id - Delete Story (Protected)
postsApp.delete('/:id', authMiddleware, async (c) => {
    const user = c.get('user');
    const postId = c.req.param('id');
    if (!postId) {
        return c.json({ error: 'Story ID is required' }, 400);
    }
    const [existingPost] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
    if (!existingPost) {
        return c.json({ error: 'Story not found' }, 404);
    }
    if (existingPost.authorId !== user.userId) {
        return c.json({ error: 'Forbidden: You do not own this story' }, 403);
    }
    await db.delete(posts).where(eq(posts.id, postId));
    return c.json({ message: 'Story deleted successfully' });
});
// POST /api/v1/posts/:id/like - Toggle Like
postsApp.post('/:id/like', authMiddleware, async (c) => {
    const user = c.get('user');
    const postId = c.req.param('id');
    if (!postId) {
        return c.json({ error: 'Story ID is required' }, 400);
    }
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) {
        return c.json({ error: 'Story not found' }, 404);
    }
    const [existingLike] = await db
        .select()
        .from(likes)
        .where(and(eq(likes.userId, user.userId), eq(likes.postId, postId)))
        .limit(1);
    let liked = false;
    let newLikesCnt = post.likesCnt;
    if (existingLike) {
        // Unlike
        await db.delete(likes).where(eq(likes.id, existingLike.id));
        newLikesCnt = Math.max(0, post.likesCnt - 1);
        await db.update(posts).set({ likesCnt: newLikesCnt }).where(eq(posts.id, postId));
        liked = false;
    }
    else {
        // Like
        const likeId = `like_${nanoid(12)}`;
        await db.insert(likes).values({
            id: likeId,
            userId: user.userId,
            postId: postId
        });
        newLikesCnt = post.likesCnt + 1;
        await db.update(posts).set({ likesCnt: newLikesCnt }).where(eq(posts.id, postId));
        liked = true;
    }
    return c.json({ liked, likesCount: newLikesCnt });
});
// POST /api/v1/posts/:id/bookmark - Toggle Bookmark
postsApp.post('/:id/bookmark', authMiddleware, async (c) => {
    const user = c.get('user');
    const postId = c.req.param('id');
    if (!postId) {
        return c.json({ error: 'Story ID is required' }, 400);
    }
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) {
        return c.json({ error: 'Story not found' }, 404);
    }
    const [existingBookmark] = await db
        .select()
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, user.userId), eq(bookmarks.postId, postId)))
        .limit(1);
    let bookmarked = false;
    let newBookmarksCnt = post.bookmarksCnt;
    if (existingBookmark) {
        // Remove bookmark
        await db.delete(bookmarks).where(eq(bookmarks.id, existingBookmark.id));
        newBookmarksCnt = Math.max(0, post.bookmarksCnt - 1);
        await db.update(posts).set({ bookmarksCnt: newBookmarksCnt }).where(eq(posts.id, postId));
        bookmarked = false;
    }
    else {
        // Add bookmark
        const bookmarkId = `bm_${nanoid(12)}`;
        await db.insert(bookmarks).values({
            id: bookmarkId,
            userId: user.userId,
            postId: postId
        });
        newBookmarksCnt = post.bookmarksCnt + 1;
        await db.update(posts).set({ bookmarksCnt: newBookmarksCnt }).where(eq(posts.id, postId));
        bookmarked = true;
    }
    return c.json({ bookmarked, bookmarksCount: newBookmarksCnt });
});
export { postsApp };
