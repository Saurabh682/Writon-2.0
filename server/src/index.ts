import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authApp } from './routes/auth.js';
import { postsApp } from './routes/posts.js';
import { commentsApp } from './routes/comments.js';
import { usersApp } from './routes/users.js';
import { mediaApp } from './routes/media.js';
import path from 'path';

const app = new Hono();

// Global Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

// Static media files serving
app.use('/uploads/*', serveStatic({ root: './' }));

// Health Check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'WritOn REST API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.route('/api/v1/auth', authApp);
app.route('/api/v1/posts', postsApp);
app.route('/api/v1/comments', commentsApp);
app.route('/api/v1/users', usersApp);
app.route('/api/v1/media', mediaApp);

// Global Error Handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    error: err.message || 'Internal Server Error'
  }, 500);
});

// 404 Handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint Not Found' }, 404);
});

const PORT = parseInt(process.env.PORT || '3001', 10);

if (process.env.NODE_ENV !== 'test') {
  console.log(`🚀 WritOn 2.0 Backend Server starting on port ${PORT}...`);
  serve({
    fetch: app.fetch,
    port: PORT
  }, (info) => {
    console.log(`✨ WritOn API is listening at http://localhost:${info.port}`);
  });
}

export default app;
