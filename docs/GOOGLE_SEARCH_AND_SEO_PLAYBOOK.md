# 🌐 WritOn Google Search & Technical SEO Playbook

A living engineering reference and operational manual for WritOn's search indexing, search appearance, crawlability, and internet distribution architecture.

---

## 1. Google Search Console & Indexing Architecture

### The Two-Pronged Sitemap Strategy
Google Search Central officially recommends pairing a full XML sitemap with a real-time RSS/Atom feed:

| Asset | URL | Purpose | Googlebot Crawl Cadence |
| :--- | :--- | :--- | :--- |
| **Full Sitemap** | `https://writon.cc/sitemap.xml` | **Master Directory**: Complete inventory of all 700+ stories, categories, and legal pages. | Periodic (weekly/monthly). Maps entire site architecture. |
| **Freshness Stream** | `https://writon.cc/feed.xml` | **Real-Time Stream**: Top 50 most recent stories with RFC-822 timestamps and author attribution. | **Frequent (hourly or multiple times daily)**. Fast-tracks new stories into the index. |

### Critical GSC Rules & Troubleshooting:
1. **Never Submit Redirecting URLs to Sitemaps**:
   * Google's sitemap ingestion parser strictly requires a direct `200 OK`. It **does not follow redirects**.
   * Submitting `https://www.writon.cc/sitemap.xml` permanently fails with "Couldn't fetch" because Firebase Hosting 301-redirects `www` to the apex domain `writon.cc`.
2. **The "Couldn't fetch" UI Placeholder Quirk**:
   * When a sitemap URL shows a red **"Couldn't fetch"** status with a blank ("—") **Last read** date, it is Google's default placeholder status while the file sits in Google's asynchronous processing queue.
   * Verify actual crawlability using **URL Inspection** > **Test Live URL**. If the live test returns `200 OK` with MIME type `application/xml` or `application/rss+xml`, Googlebot can fetch it without issue.
3. **Robots.txt Directives**:
   * [public/robots.txt](file:///d:/VibeCode/WritOn-PowerUp/public/robots.txt) must explicitly declare both endpoints:
     ```text
     User-agent: *
     Allow: /
     Sitemap: https://writon.cc/sitemap.xml
     Sitemap: https://writon.cc/feed.xml
     ```

---

## 2. Search Appearance & Favicon Standards

### Google Search Favicon Requirements:
Google Search has strict rules for displaying website icons next to domain names in search results:
1. **Homepage-Only Extraction**: Google Search looks for and updates your favicon **only when crawling your homepage** (`https://writon.cc/`).
2. **Dimension Multiples**: The favicon **must be a multiple of 48px square** (e.g. `48x48px`, `96x96px`, `192x192px`). Google rescales this to 16×16px for search results. Icons declared only as 16×16px or 32×32px without a 48px+ variant are ignored by Google Search.
3. **Required `<head>` tags**:
   ```html
   <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
   <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48x48.png?v=2" />
   <link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png?v=2" />
   <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png?v=2" />
   ```

### Title Links & Snippet Control:
* **Title Format**: Keep under 60 characters: `[Story Title] — WritOn` or `[Topic] Stories & Essays — WritOn`.
* **Robots Snippet Directives**: Injected on every indexable page:
  ```html
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  ```
  * `max-image-preview:large`: Authorizes Google to show full-width card images in Google Discover and mobile search.
  * `max-snippet:-1`: Removes arbitrary length limits on textual snippet previews.

---

## 3. Structured Data (Schema.org JSON-LD)

Structured data powers Google Rich Results, author badges, and Google Discover cards.

### Homepage (`/`):
* `schema.org/WebSite`: Establishes brand identity and enables Sitelinks search.
* `schema.org/Organization`: Links official logo, social accounts (`@Saurabh_682`), and Google Play app.
* `schema.org/SoftwareApplication`: Includes `AggregateRating: 4.8` (triggers Google Review Snippet badge).

### Story Pages (`/stories/<slug>`):
* `schema.org/BreadcrumbList`: Displays visual navigation paths in Google search results:
  $$\text{writon.cc} \longrightarrow \text{stories} \longrightarrow \text{Category} \longrightarrow \text{Story Title}$$
* `schema.org/BlogPosting`: Supplies Googlebot with:
  * `headline`: Story title
  * `description`: Story summary
  * `image`: High-resolution cover image
  * `datePublished` / `dateModified`: ISO 8601 timestamps
  * `author`: `Person` with full name and profile URL
  * `publisher`: `Organization` (WritOn)
  * `articleSection`: Story genre / category

---

## 4. JavaScript SEO & Social Preview Hygiene

### The Crawler Rendering Split:
* **Search Engine Crawlers (Googlebot)**: Use headless Chromium, but delay JavaScript rendering in an asynchronous queue. If an API request times out or is slow, Googlebot indexes fallback text.
* **Social Crawlers (WhatsApp, X/Twitter, Telegram, LinkedIn, Facebook)**: **Never execute JavaScript**. They parse only the raw static HTML.

### Our Solution:
1. **Pre-rendered Server Templates**:
   * [server/src/server.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/server.js) (`renderStorySharePage`) and [server/src/routes/seo-routes.js](file:///d:/VibeCode/WritOn-PowerUp/server/src/routes/seo-routes.js) render complete HTML with full story text, Open Graph tags, and Twitter Card tags.
2. **Dynamic Client-Side Hydration**:
   * [public/stories/index.html](file:///d:/VibeCode/WritOn-PowerUp/public/stories/index.html) immediately updates canonical links (`https://writon.cc/stories/<slug>`), Open Graph descriptions, and injects Schema.org JSON-LD upon loading.

---

## 5. Internet Syndication & Generative AI Search

Having an active RSS 2.0 feed at `https://writon.cc/feed.xml` unlocks distribution outside Google Search:

1. **RSS Readers**: Users can follow WritOn directly via Feedly, Inoreader, Flipboard, or NetNewsWire.
2. **Automated Social Distribution**: Tools like Zapier, Make, IFTTT, or Buffer can monitor `https://writon.cc/feed.xml` to automatically broadcast newly published stories to:
   * **X / Twitter** with hashtag indexing
   * **Telegram Channels**
   * **LinkedIn & Facebook pages**
3. **AI Search Indexing**: Modern AI search engines (Perplexity, ChatGPT Search, Google AI Overviews) continuously ingest RSS feeds to discover and cite fresh literary thinking.

---

## 6. Operational Runbook

### Re-synchronizing Sitemaps & RSS Feeds
Run whenever new batches of stories are published:
```bash
node server/src/scripts/generate-seo-feeds.mjs
```
* Queries all published posts from the WritOn API.
* Regenerates [public/feed.xml](file:///d:/VibeCode/WritOn-PowerUp/public/feed.xml) with the latest 50 stories.
* Regenerates [public/sitemap.xml](file:///d:/VibeCode/WritOn-PowerUp/public/sitemap.xml) with all 700+ URLs.

### Running Automated SEO Tests
Verify that all robots, sitemap, feed, and SSR routes are functioning:
```bash
cd server
npx vitest run test/seo-sitemap.test.js
```

### Deploying to CDN
Deploy static hosting updates to Firebase Hosting CDN:
```bash
npx firebase deploy --only hosting
```
