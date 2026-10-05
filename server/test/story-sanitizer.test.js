import { describe, it, expect } from 'vitest';
import { sanitizeStoryHtml, renderStorySharePage } from '../src/server.js';

describe('Story HTML Sanitizer (W01 remediation)', () => {
  it('strips onerror and javascript event handlers from author markup', () => {
    const malicious = '<p>Normal text</p><img src="x" onerror="alert(1)"><script>alert(2)</script>';
    const cleaned = sanitizeStoryHtml(malicious);
    expect(cleaned).not.toContain('onerror');
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('alert(1)');
    expect(cleaned).not.toContain('alert(2)');
    expect(cleaned).toContain('<p>Normal text</p>');
  });

  it('preserves valid literary markdown elements including lists and blockquotes', () => {
    const literary = [
      '<h1>Chapter One</h1>',
      '<blockquote><p>A quiet observation of life.</p></blockquote>',
      '<ol><li>First line</li><li>Second line</li></ol>',
      '<ul><li>Word one</li><li>Word two</li></ul>',
      '<p>Here is <strong>bold</strong> and <em>italic</em> with a <br> line break.</p>'
    ].join('\n');

    const cleaned = sanitizeStoryHtml(literary);
    expect(cleaned).toContain('<h1>Chapter One</h1>');
    expect(cleaned).toContain('<blockquote><p>A quiet observation of life.</p></blockquote>');
    expect(cleaned).toContain('<ol><li>First line</li><li>Second line</li></ol>');
    expect(cleaned).toContain('<ul><li>Word one</li><li>Word two</li></ul>');
    expect(cleaned).toContain('<strong>bold</strong>');
    expect(cleaned).toContain('<em>italic</em>');
    expect(cleaned).toContain('<br />');
  });

  it('preserves table markup and valid table formatting', () => {
    const table = '<div class="story-table-wrap"><table><thead><tr><th style="text-align:center">Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table></div>';
    const cleaned = sanitizeStoryHtml(table);
    expect(cleaned).toContain('<div class="story-table-wrap">');
    expect(cleaned).toContain('<th style="text-align:center">Header</th>');
    expect(cleaned).toContain('<td>Data</td>');
  });

  it('strips javascript: and data: URLs on links while keeping safe external https: links with rel=noopener', () => {
    const links = '<a href="javascript:alert(1)">Click me</a> and <a href="https://example.com">Legit Link</a>';
    const cleaned = sanitizeStoryHtml(links);
    expect(cleaned).not.toContain('javascript:alert(1)');
    expect(cleaned).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Legit Link</a>');
  });

  it('preserves code blocks and syntax highlighter language classes', () => {
    const code = '<pre class="language-typescript"><code>const x: number = 42;</code></pre>';
    const cleaned = sanitizeStoryHtml(code);
    expect(cleaned).toContain('class="language-typescript"');
    expect(cleaned).toContain('const x: number = 42;');
  });

  it('escapes < characters in embedded JSON-LD scripts to prevent script breakout', () => {
    const story = {
      title: 'Testing <script>alert("xss")</script> Injection',
      slug: 'testing-xss-slug',
      summary: 'Summary with </script><script>breakout()</script>',
      content: 'Safe content',
      authorName: 'Malicious </script> Author',
      authorPenName: 'author_pen',
      category: 'Essays',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const html = renderStorySharePage({
      story,
      canonicalUrl: 'https://writon.cc/stories/testing-xss-slug',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
      origin: 'https://writon.cc'
    });

    // Check JSON-LD script tag content
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    expect(jsonLdMatch).not.toBeNull();
    const jsonLdRaw = jsonLdMatch[1];
    // Must NOT contain unescaped raw '<' inside the json content
    expect(jsonLdRaw).not.toContain('<script>');
    expect(jsonLdRaw).not.toContain('</script>');
    expect(jsonLdRaw).toContain('\\u003c');

    // JSON.parse must succeed and preserve the original text
    const parsed = JSON.parse(jsonLdRaw);
    expect(parsed['@graph']).toBeDefined();
    const blogPosting = parsed['@graph'].find(g => g['@type'] === 'BlogPosting');
    expect(blogPosting.headline).toBe('Testing <script>alert("xss")</script> Injection');
    expect(blogPosting.description).toBe('Summary with breakout');
    expect(blogPosting.author.name).toBe('Malicious </script> Author');
  });
});
