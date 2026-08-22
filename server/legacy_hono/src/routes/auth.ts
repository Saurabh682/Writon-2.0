import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { hashPassword, comparePassword } from '../auth/password.js';
import { signToken, authMiddleware, TokenPayload } from '../auth/jwt.js';

const authApp = new Hono<{ Variables: { user: TokenPayload } }>();

const registerSchema = z.object({
  penName: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Pen name must be alphanumeric or underscore'),
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional()
});

const loginSchema = z.object({
  identifier: z.string().min(1), // email or penName
  password: z.string().min(1)
});

authApp.post('/register', zValidator('json', registerSchema), async (c) => {
  const data = c.req.valid('json');

  // Check if email or penName is taken
  const existing = await db
    .select()
    .from(users)
    .where(or(eq(users.email, data.email.toLowerCase()), eq(users.penName, data.penName.toLowerCase())))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].email.toLowerCase() === data.email.toLowerCase()) {
      return c.json({ error: 'Email is already registered' }, 409);
    }
    return c.json({ error: 'Pen name is already taken' }, 409);
  }

  const hashedPassword = await hashPassword(data.password);
  const userId = `usr_${nanoid(12)}`;

  const [newUser] = await db
    .insert(users)
    .values({
      id: userId,
      penName: data.penName.toLowerCase(),
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      passwordHash: hashedPassword,
      avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.penName}`,
      bio: data.bio || `Passionate writer and thinker on WritOn.`,
      quoteOfDay: 'Write with intention, read with reflection.'
    })
    .returning();

  const token = signToken({
    userId: newUser.id,
    email: newUser.email,
    penName: newUser.penName
  });

  const { passwordHash, ...safeUser } = newUser;
  return c.json({
    message: 'User registered successfully',
    token,
    user: safeUser
  }, 201);
});

authApp.post('/login', zValidator('json', loginSchema), async (c) => {
  const { identifier, password } = c.req.valid('json');
  const lowerIdentifier = identifier.toLowerCase();

  const matchingUsers = await db
    .select()
    .from(users)
    .where(or(eq(users.email, lowerIdentifier), eq(users.penName, lowerIdentifier)))
    .limit(1);

  if (matchingUsers.length === 0) {
    return c.json({ error: 'Invalid email/pen name or password' }, 401);
  }

  const user = matchingUsers[0];
  if (!user.passwordHash) {
    return c.json({ error: 'Account uses third-party sign in' }, 400);
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    return c.json({ error: 'Invalid email/pen name or password' }, 401);
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    penName: user.penName
  });

  const { passwordHash, ...safeUser } = user;
  return c.json({
    message: 'Login successful',
    token,
    user: safeUser
  });
});

authApp.get('/me', authMiddleware, async (c) => {
  const tokenUser = c.get('user');
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, tokenUser.userId))
    .limit(1);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const { passwordHash, ...safeUser } = user;
  return c.json({ user: safeUser });
});

export { authApp };
