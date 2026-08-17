import jwt from 'jsonwebtoken';
import { Context, Next } from 'hono';

const JWT_SECRET = process.env.JWT_SECRET || 'writon-ultra-secure-jwt-secret-key-2026';

export interface TokenPayload {
  userId: string;
  email: string;
  penName: string;
}

export function signToken(payload: TokenPayload, expiresIn: string = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
  }

  c.set('user', payload);
  await next();
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      c.set('user', payload);
    }
  }
  await next();
}
