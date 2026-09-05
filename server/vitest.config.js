import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The retired Hono implementation has its own dependency tree and is not part
    // of the production Fastify server verification surface.
    exclude: ['legacy_hono/**', 'node_modules/**'],
  },
});
