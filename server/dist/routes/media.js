import { Hono } from 'hono';
import { authMiddleware } from '../auth/jwt.js';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
const mediaApp = new Hono();
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// POST /api/v1/media/upload - Multipart image upload
mediaApp.post('/upload', authMiddleware, async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!file || typeof file === 'string') {
        return c.json({ error: 'No file uploaded' }, 400);
    }
    const fileObj = file;
    const originalName = fileObj.name || 'image.jpg';
    const ext = path.extname(originalName) || '.jpg';
    const fileName = `${Date.now()}-${nanoid(8)}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const arrayBuffer = await fileObj.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    const host = c.req.header('host') || 'localhost:3001';
    const protocol = c.req.header('x-forwarded-proto') || 'http';
    const url = `${protocol}://${host}/uploads/${fileName}`;
    return c.json({
        message: 'Media uploaded successfully',
        url,
        fileName,
        size: buffer.length
    }, 201);
});
export { mediaApp };
