import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db/index.js';
import { comments, users, posts } from '../db/schema.js';
import { eq, desc, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { authMiddleware, TokenPayload } from '../auth/jwt.js';

const commentsApp = new Hono<{ Variables: { user: TokenPayload } }>();

const addCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional()
});

// GET /api/v1/comments/:postId - List comments for post (with thread hierarchy)
commentsApp.get('/:postId', async (c) => {
  const postId = c.req.param('postId');
  if (!postId) {
    return c.json({ error: 'Post ID is required' }, 400);
  }

  const rawComments = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      authorId: comments.authorId,
      parentId: comments.parentId,
      content: comments.content,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        penName: users.penName,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl
      }
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));

  // Build tree structure
  const rootComments: any[] = [];
  const commentMap = new Map<string, any>();

  for (const c of rawComments) {
    const node = { ...c, replies: [] };
    commentMap.set(c.id, node);
  }

  for (const c of rawComments) {
    const node = commentMap.get(c.id)!;
    if (c.parentId && commentMap.has(c.parentId)) {
      commentMap.get(c.parentId)!.replies.push(node);
    } else {
      rootComments.push(node);
    }
  }

  return c.json({ comments: rootComments, total: rawComments.length });
});

// POST /api/v1/comments/:postId - Add comment or reply
commentsApp.post('/:postId', authMiddleware, zValidator('json', addCommentSchema), async (c) => {
  const user = c.get('user');
  const postId = c.req.param('postId');
  if (!postId) {
    return c.json({ error: 'Post ID is required' }, 400);
  }
  const { content, parentId } = c.req.valid('json');

  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) {
    return c.json({ error: 'Story not found' }, 404);
  }

  const commentId = `cmt_${nanoid(12)}`;

  const [newComment] = await db
    .insert(comments)
    .values({
      id: commentId,
      postId,
      authorId: user.userId,
      parentId: parentId || null,
      content
    })
    .returning();

  // Increment comments count on post
  await db
    .update(posts)
    .set({ commentsCnt: sql`${posts.commentsCnt} + 1` })
    .where(eq(posts.id, postId));

  const [author] = await db
    .select({
      id: users.id,
      penName: users.penName,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl
    })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1);

  return c.json({
    message: 'Comment added',
    comment: {
      ...newComment,
      author,
      replies: []
    }
  }, 201);
});

// DELETE /api/v1/comments/:id - Delete comment
commentsApp.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const commentId = c.req.param('id');

  if (!commentId) {
    return c.json({ error: 'Comment ID is required' }, 400);
  }

  const [existingComment] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!existingComment) {
    return c.json({ error: 'Comment not found' }, 404);
  }

  if (existingComment.authorId !== user.userId) {
    return c.json({ error: 'Forbidden: You do not own this comment' }, 403);
  }

  await db.delete(comments).where(eq(comments.id, commentId));

  // Decrement comments count
  await db
    .update(posts)
    .set({ commentsCnt: sql`MAX(0, ${posts.commentsCnt} - 1)` })
    .where(eq(posts.id, existingComment.postId));

  return c.json({ message: 'Comment deleted successfully' });
});

export { commentsApp };
