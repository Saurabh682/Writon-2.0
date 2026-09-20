import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import { generateRedditFeed } from '../src/scripts/generate-reddit-feed.mjs';

describe('Reddit-Specific RSS Feed Generator', () => {
  it('generates a valid RSS 2.0 XML feed with Reddit Markdown formatting', async () => {
    const res = await generateRedditFeed();
    expect(res.count).toBeGreaterThan(0);
    expect(res.path).toContain('reddit-feed.xml');

    const xml = await fs.readFile(res.path, 'utf8');
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<title>WritOn — Reddit Editorial Craft Feed</title>');
    expect(xml).toContain('<atom:link href="https://writon.cc/reddit-feed.xml"');

    // Verify item structure
    expect(xml).toContain('<item>');
    expect(xml).toContain('<category>');
    expect(xml).toContain('<![CDATA[');

    // Verify Reddit formatting elements
    expect(xml).toContain('> "');
    expect(xml).toContain('**Author:**');
    expect(xml).toContain('[Read on WritOn]');
    expect(xml).toContain('💬 **Craft Discussion:**');

    // Verify strictly zero twitter hashtags
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item).not.toMatch(/#[a-zA-Z0-9_]+/);
    }
  });

  it('covers the live HTTP fetch and parsing path when mock transport is provided', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          posts: [
            {
              id: 'p-1',
              title: 'The Weight of the Nib',
              slug: 'the-weight-of-the-nib',
              summary: 'A reflection on brass fountain pens.',
              content: 'The brass barrel rests between thumb and forefinger.',
              category: 'Essays',
              author: { fullName: 'Aarav Sharma', penName: 'aarav_writes' },
              readingTimeMin: 4,
              createdAt: '2026-09-20T12:00:00Z'
            }
          ]
        })
      });

      const res = await generateRedditFeed({ forceHttp: true });
      expect(res.count).toBe(1);
      const xml = await fs.readFile(res.path, 'utf8');
      expect(xml).toContain('The Weight of the Nib');
      expect(xml).toContain('Aarav Sharma');
      expect(xml).toContain('aarav_writes@writon.cc');
      expect(xml).toContain('The brass barrel rests between thumb and forefinger.');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
