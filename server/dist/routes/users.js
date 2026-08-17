import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db/index.js';
import { users, posts, follows, bookmarks } from '../db/schema.js';
import { eq, and, sql, desc, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { authMiddleware, optionalAuthMiddleware } from '../auth/jwt.js';
const usersApp = new Hono();
// GET /api/v1/users/:id_or_penName - Author profile
usersApp.get('/:id_or_penName', optionalAuthMiddleware, async (c) => {
    const idOrPenName = c.req.param('id_or_penName');
    if (!idOrPenName) {
        return c.json({ error: 'Author identifier is required' }, 400);
    }
    const currentUserId = c.get('user')?.userId;
    const [user] = await db
        .select({
        id: users.id,
        penName: users.penName,
        fullName: users.fullName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        quoteOfDay: users.quoteOfDay,
        followersCnt: users.followersCnt,
        followingCnt: users.followingCnt,
        createdAt: users.createdAt
    })
        .from(users)
        .where(or(eq(users.id, idOrPenName), eq(users.penName, idOrPenName.toLowerCase())))
        .limit(1);
    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }
    // Count total published stories
    const [postCountResult] = await db
        .select({ count: sql `count(*)` })
        .from(posts)
        .where(and(eq(posts.authorId, user.id), eq(posts.isPublished, true)));
    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
        const [followRecord] = await db
            .select()
            .from(follows)
            .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, user.id)))
            .limit(1);
        isFollowing = !!followRecord;
    }
    return c.json({
        user: {
            ...user,
            totalStories: postCountResult?.count || 0,
            isFollowing
        }
    });
});
// GET /api/v1/users/:id/posts - User's stories
usersApp.get('/:id/posts', optionalAuthMiddleware, async (c) => {
    const authorId = c.req.param('id');
    if (!authorId) {
        return c.json({ error: 'Author ID is required' }, 400);
    }
    const currentUserId = c.get('user')?.userId;
    const userPosts = await db
        .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        summary: posts.summary,
        category: posts.category,
        coverImage: posts.coverImage,
        readingTimeMin: posts.readingTimeMin,
        likesCnt: posts.likesCnt,
        commentsCnt: posts.commentsCnt,
        bookmarksCnt: posts.bookmarksCnt,
        createdAt: posts.createdAt,
        author: {
            id: users.id,
            penName: users.penName,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl
        }
    })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(and(eq(posts.authorId, authorId), eq(posts.isPublished, true)))
        .orderBy(desc(posts.createdAt));
    return c.json({ posts: userPosts });
});
// GET /api/v1/users/:id/bookmarks - User's saved stories
usersApp.get('/:id/bookmarks', optionalAuthMiddleware, async (c) => {
    const userId = c.req.param('id');
    if (!userId) {
        return c.json({ error: 'User ID is required' }, 400);
    }
    const bookmarkedPosts = await db
        .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        summary: posts.summary,
        category: posts.category,
        coverImage: posts.coverImage,
        readingTimeMin: posts.readingTimeMin,
        likesCnt: posts.likesCnt,
        commentsCnt: posts.commentsCnt,
        bookmarksCnt: posts.bookmarksCnt,
        createdAt: posts.createdAt,
        savedAt: bookmarks.createdAt,
        author: {
            id: users.id,
            penName: users.penName,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl
        }
    })
        .from(bookmarks)
        .innerJoin(posts, eq(bookmarks.postId, posts.id))
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(eq(bookmarks.userId, userId))
        .orderBy(desc(bookmarks.createdAt));
    return c.json({ bookmarks: bookmarkedPosts });
});
// POST /api/v1/users/:id/follow - Follow / Unfollow author
usersApp.post('/:id/follow', authMiddleware, async (c) => {
    const currentUser = c.get('user');
    const targetUserId = c.req.param('id');
    if (!targetUserId) {
        return c.json({ error: 'Target author ID is required' }, 400);
    }
    if (currentUser.userId === targetUserId) {
        return c.json({ error: 'You cannot follow yourself' }, 400);
    }
    const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);
    if (!targetUser) {
        return c.json({ error: 'Author not found' }, 404);
    }
    const [existingFollow] = await db
        .select()
        .from(follows)
        .where(and(eq(follows.followerId, currentUser.userId), eq(follows.followingId, targetUserId)))
        .limit(1);
    let following = false;
    let newFollowersCnt = targetUser.followersCnt;
    if (existingFollow) {
        // Unfollow
        await db.delete(follows).where(eq(follows.id, existingFollow.id));
        newFollowersCnt = Math.max(0, targetUser.followersCnt - 1);
        await db.update(users).set({ followersCnt: newFollowersCnt }).where(eq(users.id, targetUserId));
        await db.update(users).set({ followingCnt: sql `MAX(0, ${users.followingCnt} - 1)` }).where(eq(users.id, currentUser.userId));
        following = false;
    }
    else {
        // Follow
        const followId = `flw_${nanoid(12)}`;
        await db.insert(follows).values({
            id: followId,
            followerId: currentUser.userId,
            followingId: targetUserId
        });
        newFollowersCnt = targetUser.followersCnt + 1;
        await db.update(users).set({ followersCnt: newFollowersCnt }).where(eq(users.id, targetUserId));
        await db.update(users).set({ followingCnt: sql `${users.followingCnt} + 1` }).where(eq(users.id, currentUser.userId));
        following = true;
    }
    return c.json({ following, followersCount: newFollowersCnt });
});
// PUT /api/v1/users/profile - Update Current User Profile
const updateProfileSchema = z.object({
    fullName: z.string().min(2).max(100).optional(),
    bio: z.string().max(500).optional(),
    quoteOfDay: z.string().max(255).optional(),
    avatarUrl: z.string().url().optional()
});
usersApp.put('/profile', authMiddleware, zValidator('json', updateProfileSchema), async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    const [updatedUser] = await db
        .update(users)
        .set({
        ...data,
        updatedAt: new Date().toISOString()
    })
        .where(eq(users.id, user.userId))
        .returning();
    const { passwordHash, ...safeUser } = updatedUser;
    return c.json({ message: 'Profile updated successfully', user: safeUser });
});
export { usersApp };
