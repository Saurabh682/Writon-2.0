# Global Search Engine Optimization (SEO), Search Appearance & Web Discovery Rule

Whenever designing, developing, updating, or auditing any web application, publishing platform, landing page, or public API across any project, you MUST adhere to the following Google Search Central and web discovery standards:

---

## 1. Google Search Console & Sitemaps Architecture
- **Dual Ingestion Strategy (for content & dynamic publishing sites)**:
  - **Master XML Sitemap (`/sitemap.xml`)**: Complete site directory containing all URLs, with ISO 8601 `<lastmod>`, `<changefreq>`, and `<priority>` tags according to the sitemaps.org 0.9 protocol.
  - **Real-Time RSS 2.0 / Atom Feed (`/feed.xml` or `/rss.xml`)**: Ingestion stream containing the 30–50 most recently published articles/items with RFC-822 `<pubDate>`, per-item `<guid isPermaLink="true">`, `<dc:creator>`, and `<media:content>`. Fast-tracks fresh content into Google Search and Google Discover within hours instead of waiting for full sitemap recrawls.
  - **Both must be submitted to Google Search Console** under the Sitemaps tool.
- **Strict Redirect Prohibition for Sitemaps**:
  - Google's sitemap crawler strictly requires a direct **`200 OK`**. Never submit a redirecting subdomain (e.g. `www.domain.com/sitemap.xml` if `www` 301-redirects to apex).
- **GSC "Couldn't fetch" Placeholder Knowledge**:
  - A red "Couldn't fetch" status with a blank ("—") "Last read" date in Google Search Console is Google's asynchronous queue placeholder, not an error. Verify true crawlability using the **Live URL Inspection** tool.
- **Robots.txt Directives**:
  - Always declare all sitemaps explicitly at the bottom of `robots.txt`:
    ```text
    User-agent: *
    Allow: /
    Sitemap: https://<domain>/sitemap.xml
    Sitemap: https://<domain>/feed.xml
    ```

---

## 2. Google Search Favicon Compliance
- **Google Search Homepage Requirement**: Google Search extracts and updates website search snippet favicons **only when crawling the root homepage** (`/`).
- **48px Square Multiple Mandate**: Google strictly requires the icon to be a **multiple of 48px square** (e.g. `48x48`, `96x96`, `192x192`, or scalable SVG). Declaring only `16x16` or `32x32` icons results in Google displaying a generic default globe icon in search results.
- **Standard `<head>` Declarations**:
  ```html
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48x48.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />
  ```

---

## 3. Title Links, Snippets & Meta Directives
- **Concise, Branded `<title>` Tags**: Under 60 characters: `Page/Story Title — BrandName`.
- **Unique Meta Descriptions**: Under 160 characters per page.
- **Search Snippet Directives**: Injected into every indexable page:
  ```html
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  ```
  - `max-image-preview:large`: Permits Google to display large, high-resolution thumbnail cards in Google Discover and mobile search.
  - `max-snippet:-1`: Eliminates arbitrary character limits on snippet previews.

---

## 4. Structured Data (Schema.org JSON-LD)
Every web application must include valid JSON-LD structured data:
- **Homepage / Root**:
  - `schema.org/WebSite`: Brand identity and `potentialAction` for Sitelinks search.
  - `schema.org/Organization`: Official logo, social profile links (`sameAs`), and contact/app links.
  - `schema.org/SoftwareApplication` (if applicable): App category, operating system, and `AggregateRating` for Review Snippet eligibility.
- **Content / Story / Blog Pages**:
  - `schema.org/BreadcrumbList`: Produces clean visual navigation paths in Google search results (`domain.com › category › title`) instead of raw URLs.
  - `schema.org/Article` or `schema.org/BlogPosting`: Supplies `headline`, `description`, `image`, `datePublished`, `dateModified`, `author` (`Person`), and `publisher` (`Organization`).

---

## 5. JavaScript SEO & Social Sharing Hygiene
- **Social Crawlers Don't Execute JavaScript**: WhatsApp, X/Twitter, Telegram, Facebook, LinkedIn, and iMessage crawlers **never run JavaScript**. They inspect only raw static HTML.
- **Pre-rendered HTML / Open Graph**: Critical metadata (`og:title`, `og:description`, `og:image`, `og:url`, `twitter:card: summary_large_image`) and primary article content must either be server-rendered or pre-rendered so crawlers receive immediate text without a client-side `fetch()` dependency.
- **Canonical URLs**: Always include `<link rel="canonical" href="...">` pointing to the single authoritative URL, and update dynamically if routing on the client side.

---

## 6. RSS Auto-Discovery & Syndication
- Every site with publishing content must include an RSS auto-discovery tag in `<head>`:
  ```html
  <link rel="alternate" type="application/rss+xml" title="[Brand] Feed" href="https://<domain>/feed.xml" />
  ```
- This allows RSS readers (Feedly, Inoreader, Flipboard), AI search engines (Perplexity, ChatGPT Search, Google AI Overviews), and social automation pipelines (Buffer, Zapier, Telegram bots) to ingest and distribute content automatically.
