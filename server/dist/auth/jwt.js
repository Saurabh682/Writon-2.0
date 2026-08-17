import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'writon-ultra-secure-jwt-secret-key-2026';
export function signToken(payload, expiresIn = '7d') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (err) {
        return null;
    }
}
export async function authMiddleware(c, next) {
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
export async function optionalAuthMiddleware(c, next) {
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
