# WritOn website findings register — 1 October 2026

## Verdict and scope

Keep the visual identity and the lightweight public-site architecture. Fix the account/preference flows, HTML trust boundaries, publishing lifecycle, routing, and cache behavior before adding more features. A framework migration is not justified by this review.

This is a review, not an implementation. No application code, Android versions, deployments, Git branches, or bot behavior were changed. The current workspace contains substantial pre-existing uncommitted work; findings refer to that working tree and explicitly sampled production responses, not just Git HEAD.

Reviewed: public landing/discovery/reader/journal pages and their generators; Firebase hosting configuration; public account and email pages; React feed, reader, editor, profile, authentication and API integration; archive integrity; relevant CI and tests. Bot/admin frontends were checked for separation and hosting dependencies, not their entire operational behavior. Generated story pages were examined through templates, generators and samples, not a manual reading of every story.

Not established: authenticated production journeys, an exploit against production, real-device Android intent behavior, field Core Web Vitals, Search Console indexing outcomes, a complete WCAG assessment, or every bot/admin workflow. No passwords were submitted, preferences changed, stories published, or messages sent.

Priority: P1 = security, data loss, or materially misleading/broken flow; P2 = important reliability/accessibility/SEO improvement; P3 = maintainability or optional refinement. All findings below remain open recommendations.

## Why the existing parts are here

| Part | Purpose | Recommendation |
|---|---|---|
| `public/index.html`, `/hi`, `/mr`, `/bn` | Explain the product, demonstrate real Android screens, support regional acquisition, and send readers to discovery or Google Play. | Keep static delivery and the parchment identity. Generate shared sections to prevent translation/version drift. |
| `/explore` | Browse current public stories without installing or signing in. | Keep guest access, finite pagination, categories and reading-time labels. Make state and failure handling reliable. |
| `/stories/<slug>` | Read and share a particular work; supply search/social metadata; offer an app handoff. | Keep readable web content. Consolidate rendering and handle publication/removal dynamically or through a complete lifecycle-aware build. |
| `/journal` | Explain craft, product decisions and community values in durable editorial content. | Keep it separate from user stories and release notes. Avoid loading the complete journal catalog into every article. |
| `/updates` | Let readers understand actual product changes. | Keep concise, accurate, dated changes rather than technical or speculative promises. |
| RSS, sitemaps, structured data | Make public writing discoverable and available through open standards. | Keep them, but synchronize their URLs, dates and visibility with the reader. |
| `/go`, `/play`, social vanity links | Stable campaign destinations and Android acquisition attribution. | Keep controlled links. Make campaign labels explicit rather than leaving September defaults indefinitely. |
| Account/email utility pages | Finish identity actions and let people control communications. | Their appearance is good, but their actions must be real and verified. |
| `web/` | A separate React reader/writer app with authenticated API actions. | Do not treat it as the same deployment as `public/`. Fix its production API contract before promoting it as a complete browser app. |
| Canvas/editorial/LinkedIn/founding-writer tools | Operator workflows, not ordinary reader navigation. | Keep separate from the public product, protect APIs, and exclude operator pages from search. |

## P1: fix first

### W01 — Story rendering accepts unsafe HTML

**Evidence:** [public reader](</D:/VibeCode/WritOn-PowerUp/public/stories/index.html:366>), [prerender generator](</D:/VibeCode/WritOn-PowerUp/server/src/scripts/generate-story-prerender.mjs:82>), [React reader bypass](</D:/VibeCode/WritOn-PowerUp/web/src/components/StoryReader.tsx:512>).

The public reader puts `marked.parse` output into `innerHTML` without sanitizing it; the generator writes the same output into public files. A local, non-executing parser probe confirmed an `onerror` attribute survives. The React renderer also trusts a raw chunk beginning with its table-wrapper prefix, allowing author content to masquerade as renderer-generated HTML. API story input validates length but does not establish HTML safety.

**Improve:** one explicit allowlist for rendered literary HTML, safe link/image URL protocols, and no raw-prefix bypass. Escape JSON embedded inside HTML script elements too; the prerender generator currently inserts ordinary `JSON.stringify` output. Existing journal generation already escapes `<` in embedded JSON. Do not attempt a regex-only XSS sanitizer.

**Acceptance:** malicious HTML, event attributes, dangerous URLs and `</script>` in metadata cannot execute or escape their intended context in every renderer. Valid headings, poems, tables, links and genuine code examples still render correctly. [Marked explicitly warns that it does not sanitize output](https://marked.js.org/).

### W02 — Email preferences and unsubscribe report success without saving

**Evidence:** [static handlers](</D:/VibeCode/WritOn-PowerUp/public/email/unsubscribe.html:215>), [hosting rewrites](</D:/VibeCode/WritOn-PowerUp/firebase.json:436>), [existing real backend](</D:/VibeCode/WritOn-PowerUp/server/src/routes/email-engagement.js:19>).

The live page shows checked preferences without loading a user's values. Save and unsubscribe only alter DOM text. `/email/unsubscribe/**` routes to that static page, even though the backend already has a signed-token unsubscribe flow. A public read-only request to an invalid-token URL returned this page with HTTP 200.

**Improve:** connect account settings to the authenticated preference API; route signed unsubscribe links to the existing token-verifying backend flow. Never show success before persistence succeeds, and never infer consent from default checked controls. Do not replace a real unsubscribe flow with a marketing page.

**Acceptance:** use a disposable staging recipient; save, reload and verify stored values. Invalid/expired tokens fail clearly; an unsubscribe changes the intended scope and subsequent delivery eligibility. Production recipient settings were not changed during review.

### W03 — Password reset and email verification are presentation-only

**Evidence:** [reset form](</D:/VibeCode/WritOn-PowerUp/public/auth/reset-password.html:159>), [verification page](</D:/VibeCode/WritOn-PowerUp/public/auth/verify.html:144>).

The live reset form prevents submission, hides itself and displays “Password updated successfully”; it does not call Firebase. The verification page declares email confirmed without applying/checking an action code. Whether current outbound Firebase emails use these URLs must be checked separately; the publicly exposed pages themselves are misleading.

**Improve:** implement the Firebase email-action contract using validated mode/action codes, or stop presenting these pages as completed account actions. Handle expired/used/invalid links and actual network errors.

**Acceptance:** a staging reset really changes authentication credentials; invalid reset links never show success. Verification only shows confirmed after the identity provider confirms it.

### W04 — Static story copies have no removal/privacy lifecycle

**Evidence:** [generator writes snapshots](</D:/VibeCode/WritOn-PowerUp/server/src/scripts/generate-story-prerender.mjs:201>), [public reader catch](</D:/VibeCode/WritOn-PowerUp/public/stories/index.html:582>).

The generator creates files but does not reconcile old files when a post is deleted, unpublished or made private. A pre-rendered article starts visible; if its API lookup later fails, the catch only updates the hidden loading element, leaving the static article readable. This defeats the intended visibility check for previously copied content.

**Improve:** reuse the existing server story route for lifecycle-aware public delivery, or implement a complete snapshot inventory with invalidation/removal on visibility changes. Static files take precedence over Firebase rewrites, so adding a server rewrite alone will not retire existing copies.

**Acceptance:** publishing, editing, unpublishing, making private and deleting a staging story affect HTML, metadata, feeds and sitemaps consistently. Removed/private stories do not remain available from old public snapshots. [Firebase response precedence](https://firebase.google.com/docs/hosting/full-config#priority_order_of_hosting_responses) explains the static-file/rewrite constraint.

### W05 — Browser editor can lose work

**Evidence:** [editor state and publish flow](</D:/VibeCode/WritOn-PowerUp/web/src/components/StoryEditor.tsx:41>).

Title, summary, category, body and cover exist only in component state. There is no durable draft save/recovery, and Exit Editor or refresh discards the work. Android's offline draft capability does not make this React editor offline-safe.

**Improve:** add minimal local draft persistence scoped to account and draft, recovery, and an honest save indicator. Clear saved data deliberately after publication/account changes. Reuse server draft routes where appropriate; do not promise cloud sync until it is tested.

**Acceptance:** refresh, tab closure, navigation, failed upload and failed publish do not destroy recoverable text. Signing into another account never reveals the first account's draft.

### W06 — Publish retry identifiers are not stable across retries

**Evidence:** [API UUID fallback](</D:/VibeCode/WritOn-PowerUp/web/src/lib/api.ts:73>), [editor publish caller](</D:/VibeCode/WritOn-PowerUp/web/src/components/StoryEditor.tsx:141>), [current test](</D:/VibeCode/WritOn-PowerUp/web/src/lib/api.test.ts:65>).

Each `createStory` invocation generates a fresh UUID when none is supplied. The editor does not retain a draft UUID. If the server commits but the response is lost, clicking Publish again uses a different identity and can create a second story. The test named “stable client draft UUID” checks UUID format once, not retry stability.

**Improve:** create and persist the identifier with the draft, reuse it until the operation is confirmed, and test ambiguous response loss. Retain comment request identifiers for retryable submissions too. Review toggle endpoints before adding automatic write retries; retrying a toggle can undo the action.

**Acceptance:** the same draft submitted twice after a lost response produces one server story; editing a genuinely new draft gets a new identity.

### W07 — Signup rollback can delete a valid new Firebase account

**Evidence:** [registration catch](</D:/VibeCode/WritOn-PowerUp/web/src/context/AuthContext.tsx:94>).

Every profile-registration failure triggers `deleteUser`, including a timeout/connection loss after the server may already have saved the profile. That turns an ambiguous networking failure into destructive account rollback. Profile refresh failures also clear the app session regardless of whether Firebase remains signed in.

**Improve:** distinguish definitive validation/rejection from temporary/ambiguous failures. Reconcile/retry profile creation for the same Firebase identity instead of deleting it on all errors. Distinguish offline session recovery from actual revoked credentials.

**Acceptance:** simulate a committed profile with a lost response, offline startup and expired credentials; no valid account is deleted and recovery does not require creating another account.

### W08 — Year-long immutable caching applies to mutable assets

**Evidence:** [cache rules](</D:/VibeCode/WritOn-PowerUp/firebase.json:12>). Live `/js/explore.js` returned `Cache-Control: public, max-age=31536000, immutable`.

The file has an unversioned URL, so returning browsers can keep old filtering/reader fixes for a year. The same concern applies to assets overwritten in place. The homepage uses `Clear-Site-Data: "cache"`, a broad workaround that also discards useful same-origin cache; it is not a clean asset-versioning strategy.

**Improve:** reserve immutable caching for hashed/versioned URLs; use revalidation for mutable assets and short/revalidated HTML delivery. Remove the global cache purge once versioning is reliable.

**Acceptance:** an existing browser session receives a deployed fix without a manual cache clear, while unchanged versioned images remain cacheable.

### W09 — Security headers miss extensionless public routes

**Evidence:** [HTML header rules](</D:/VibeCode/WritOn-PowerUp/firebase.json:100>). Live `/` had CSP, nosniff, referrer and frame headers; sampled `/explore` and `/stories/the-reconnect-456d40ad` did not and used default one-hour caching.

The rules cover `/` and `**/*.html`, but users request extensionless paths. This leaves inconsistent protection precisely where public story content is rendered. Staging also lacks the production header block.

**Improve:** match actual request paths with coherent shared security defaults, then explicit exceptions. Validate production and staging separately. Do not indiscriminately weaken CSP to make integrations work.

**Acceptance:** an HTTP header matrix checks homepage, discovery, reader, journal, account and utility paths—not just their `.html` files. [Firebase matches headers against the original request before rewrites](https://firebase.google.com/docs/hosting/full-config#headers).

## P2: reliability, discovery, SEO and accessibility

### W10 — Explore's mobile language selector is clipped

**Evidence:** [inline header layout](</D:/VibeCode/WritOn-PowerUp/public/explore/index.html:673>). At a 375px live viewport, document width was 466px and the language control extended to x=466; the selector sat offscreen. The 768px and 1440px checks did not show that overflow.

**Improve:** simplify the visible mobile label, let the header's flex items shrink/reflow, and keep the native select reachable. Hiding overflow does not solve an unreachable control.

**Acceptance:** 320/375/390px widths and 200% text zoom retain the logo, menu and language selector without clipping. Include regional labels, not only English.

### W11 — Rapid filters/searches can display results for the wrong selection

**Evidence:** [public category guard/handlers](</D:/VibeCode/WritOn-PowerUp/public/js/explore.js:230>), [homepage fetch](</D:/VibeCode/WritOn-PowerUp/public/app.v7.js:173>), [React feed](</D:/VibeCode/WritOn-PowerUp/web/src/App.tsx:64>).

Public pages update the selected category but refuse a new fetch while the old one is loading. React starts multiple requests without discarding obsolete responses. Debouncing is not cancellation. Under adverse timing the active label and visible stories diverge.

**Improve:** cancel obsolete reads or use a latest-request identity; keep category/query state attached to the response. Reload authenticated Following data when identity changes.

**Acceptance:** delayed responses resolve in reverse order and rapid category changes still display only the last chosen category/query.

### W12 — Errors are hidden or misreported as missing content

**Evidence:** [reader catch](</D:/VibeCode/WritOn-PowerUp/public/stories/index.html:584>), [Explore catch](</D:/VibeCode/WritOn-PowerUp/public/js/explore.js:286>), [React feed catch](</D:/VibeCode/WritOn-PowerUp/web/src/App.tsx:81>).

Reader network/server failures are labeled “Story Not Found”; the primary and fallback API bases are identical, so failure often makes the same request twice. Discovery and several React interactions log errors without a useful user message. Most reads have no timeout. An unknown story path returned HTTP 200 from the generic static reader—a soft-404 risk.

**Improve:** separate loading, empty, offline, permission, retryable failure and genuine 404 states. Retain usable content during refresh; add bounded reads and a retry control. Serve actual missing stories as 404 when routing permits it.

**Acceptance:** empty 200, 404, 429, 503, DNS failure and slow responses have distinct truthful states and never spin indefinitely.

### W13 — Fresh story previews still depend on JavaScript

**Evidence:** [generic reader head](</D:/VibeCode/WritOn-PowerUp/public/stories/index.html:18>), [generator default](</D:/VibeCode/WritOn-PowerUp/server/src/scripts/generate-story-prerender.mjs:212>).

The live recent-story response initially contained “Story Preview — WritOn,” then JavaScript supplied the real title/content. There are 74 local story directories versus 821 total sitemap URLs (the latter includes non-story pages). The generator defaults to the latest 50, so snapshots are not a complete publishing mechanism. Social crawlers cannot be assumed to execute the enrichment script.

**Improve:** make publish-time/server HTML include the story title, excerpt, canonical URL and cover/author artwork. Prefer the already-existing server share-page route over introducing another rendering stack. Preserve browser reading for everyone; do not force Play Store navigation.

**Acceptance:** a freshly published story has correct metadata in the original HTTP response, including cover-less and regional-language stories, before JavaScript runs.

### W14 — Prerender metadata replacement has drifted from its template

**Evidence:** [canonical replacement](</D:/VibeCode/WritOn-PowerUp/server/src/scripts/generate-story-prerender.mjs:139>), [template canonical creation](</D:/VibeCode/WritOn-PowerUp/public/stories/index.html:32>), [publication date](</D:/VibeCode/WritOn-PowerUp/server/src/scripts/generate-story-prerender.mjs:78>).

The generator tries to replace a literal canonical `<link>`, but the template now creates that element in JavaScript, so the replacement cannot match. The static path uses creation time rather than publication time and retains default English metadata until JavaScript runs. Story hreflang points to the homepage, not an equivalent translated story; category/author schema URLs are generic query pages, not real destinations.

**Improve:** emit metadata directly from one contract, with actual publish/modify dates and language. Use hreflang only for genuine equivalents. Link category/author breadcrumbs to functioning pages. Remove unrelated FAQ markup from story pages.

**Acceptance:** inspect initial HTML for canonical/OG/JSON-LD/date/language consistency; fail a build when required template substitutions do not match.

### W15 — Category/author links and API paths do not share one routing contract

**Evidence:** [journal fallback](</D:/VibeCode/WritOn-PowerUp/public/journal/article.html:363>), [hosting rewrites](</D:/VibeCode/WritOn-PowerUp/firebase.json:380>), [React API base](</D:/VibeCode/WritOn-PowerUp/web/src/lib/api.ts:3>), [dev-only proxy](</D:/VibeCode/WritOn-PowerUp/web/vite.config.ts:18>).

Public reads usually use `api.writon.cc`, but journal fallback, React and some operator pages use `/api/v1`. Firebase has no API rewrite; a live sampled same-host API URL returned HTML 404. React's Vite proxy exists only during development. Category/author query links redirect to discovery, which does not initialize filters from those parameters. Existing backend author pages are not wired into the sampled static hosting configuration.

**Improve:** choose a stable production contract: explicit `api.writon.cc` or narrowly scoped gateway rewrites. Preserve canonical story/author URLs and parse supported query filters. Do not broadly send every static page through the backend.

**Acceptance:** test the built deployment, not the dev proxy. New journal articles absent from embedded data must load; API failures must return the intended response type; author/category links open the requested selection.

### W16 — React navigation makes sharing and browser history unreliable

**Evidence:** [in-memory view](</D:/VibeCode/WritOn-PowerUp/web/src/App.tsx:46>), [copy-link action](</D:/VibeCode/WritOn-PowerUp/web/src/components/StoryReader.tsx:149>).

Selecting a story changes component state, not the URL. Copy Link copies the browser app location rather than a canonical story URL; refresh loses the selected story, and browser Back does not represent the in-app journey. Clipboard success is shown without awaiting the operation.

**Improve:** canonical story links immediately; minimal History API navigation or the existing routing mechanism if one is adopted for actual needs. Report clipboard failure accurately and offer native sharing when supported. Public “Open in App” should also have an appropriate non-Android alternative.

**Acceptance:** a copied link opens the same story in a new browser; refresh, Back and Forward preserve meaningful navigation. Test Android installed/not-installed handoff on devices separately.

### W17 — Accessibility and motion need behavioral fixes

**Evidence:** [autoplay](</D:/VibeCode/WritOn-PowerUp/public/js/explore.js:98>), [category tabs](</D:/VibeCode/WritOn-PowerUp/public/explore/index.html:740>), [React header](</D:/VibeCode/WritOn-PowerUp/web/src/components/Header.tsx:49>).

The carousel advances every 6.5 seconds, pauses on mouse hover only, and restarts after manual navigation. There is no explicit pause or reduced-motion behavior. Category controls claim tab semantics without the complete keyboard model. Several React icon-only controls lack clear accessible names; some controls remove outlines. Mobile menu controls need Escape/focus behavior as well as visual open/close.

**Improve:** simplest option: manual carousel. Otherwise pause on focus and offer pause/resume with reduced-motion support. Use button semantics for filters unless implementing real tabs. Add skip links, visible focus, action labels, status announcements and tested contrast; keep native form controls.

**Acceptance:** keyboard-only and screen-reader smoke journeys; reduced motion; 200% text zoom; no focus loss during slide changes. [W3C carousel guidance](https://www.w3.org/WAI/tutorials/carousels/) requires user control of motion and keyboard access.

### W18 — Avatar fallback throws and imagery can misrepresent the work

**Evidence:** [undefined initial](</D:/VibeCode/WritOn-PowerUp/public/stories/index.html:499>), [discovery image/initial fallback](</D:/VibeCode/WritOn-PowerUp/public/js/explore.js:49>).

When an author image fails, its error callback references `initial`, which is defined only in the other branch. Discovery ignores author avatars and uses initials; generic category photos can look like the author's selected artwork. The live Explore fallback displayed a desk photo for an essay about an architectural demolition—technically functional but not truthful cover representation.

**Improve:** define a safe initials fallback once; use actual supplied cover and avatar first. Use a small branded literary placeholder when artwork is absent, not unrelated photography. Validate image URLs and dimensions; avoid unnecessary third-party image dependencies.

**Acceptance:** missing/broken/avatar-only/cover-only stories render without exceptions, wrong artwork, layout jumps or inaccessible image descriptions.

### W19 — Browser pagination, state resets and media cleanup are incomplete

**Evidence:** [feed limit](</D:/VibeCode/WritOn-PowerUp/web/src/App.tsx:78>), [profile state](</D:/VibeCode/WritOn-PowerUp/web/src/components/AuthorProfile.tsx:55>), [reader narration](</D:/VibeCode/WritOn-PowerUp/web/src/components/StoryReader.tsx:115>), [editor dictation](</D:/VibeCode/WritOn-PowerUp/web/src/components/StoryEditor.tsx:103>).

React retrieves only 20 feed stories without exposing collection pagination. Profile state is reused across authors without an explicit reset of private bookmark/tab state. Narration/dictation stop on button actions, not component unmount. Header's Bookmarks action navigates to the profile without selecting the bookmark tab.

**Improve:** finite Load More; reset account/author-specific state and cancel obsolete reads; stop media when leaving a view; wire actions to the tab they name. Keep private bookmarks owner-only.

**Acceptance:** more than 20 stories remain reachable, navigating between profiles shows no stale private data, and audio/microphone work stops when leaving the reader/editor.

### W20 — Measurement and public promises need reconciliation

**Evidence:** [homepage analytics](</D:/VibeCode/WritOn-PowerUp/public/index.html:5>), [CSP](</D:/VibeCode/WritOn-PowerUp/firebase.json:82>), [reader completion event](</D:/VibeCode/WritOn-PowerUp/public/stories/index.html:536>), [journal copy](</D:/VibeCode/WritOn-PowerUp/public/journal/article.html:282>).

The homepage CSP excludes the Google tag script and collection origins that its analytics requires. Reader completion combines a 15-second minimum with approximate page position; hidden-tab time and non-reading scrolling can qualify. “Next 5-minute read” can recommend a 2-minute story, and `currentCategory` is unused in that recommendation. September campaign labels remain defaults in October. Claims about six languages, offline saving, AI assistance and engagement need to distinguish Android, browser features, interface translations and accepted writing languages.

**Improve:** verify delivery of a small, privacy-conscious event set; use honest event names such as engaged read rather than claiming measured completion. Define campaign cohorts deliberately. Audit product copy against shipped behavior and explain automation/provenance where relevant. Do not add dark-pattern prompts or claim organic impact without measurements.

**Acceptance:** events arrive once with correct context and no credentials/action tokens; background time is excluded. Every prominent feature promise maps to a tested surface.

## P3: simplify and improve the delivery process

### W21 — The code-only archive is not structurally faithful

**Evidence:** ZIP inspection: 207 entries, zero nested paths, 94 duplicated filename groups. The full archive has 434 entries, 393 nested paths and no duplicate names; it includes `.well-known/assetlinks.json`.

`Compress-Archive -Path $files.FullName` flattened the selected files. Repeated `index.html` names lose their site locations and relative references. Neither public-only ZIP contains the React app or the server/hosting contracts necessary to understand the complete system.

**Improve:** build a path-preserving source package with `public/`, selected `web/` sources/config/lockfiles, Firebase configuration, relevant generators, tests and a README describing hosting dependencies. Exclude secrets, dependencies, release binaries and irrelevant campaign media. Keep a full media bundle separately.

**Acceptance:** extract into a clean temporary directory; compare relative paths/checksums and verify representative nested pages. Label public-static and full-source bundles accurately.

### W22 — Reduce duplication at the generation boundary

**Evidence:** [journal catalog embedding](</D:/VibeCode/WritOn-PowerUp/server/src/scripts/build-static-journal.mjs:467>), [duplicate story outputs](</D:/VibeCode/WritOn-PowerUp/server/src/scripts/generate-story-prerender.mjs:201>), [homepage script](</D:/VibeCode/WritOn-PowerUp/public/index.html:517>), [Hindi script](</D:/VibeCode/WritOn-PowerUp/public/hi/index.html:463>).

Every journal article carries the full embedded article catalog, including Markdown and rendered HTML. Stories are generated both as `.html` and directory `index.html`. Multiple homepage JavaScript generations remain, with English and regional pages using different versions. Similar headers, tokens, footers and metadata are copied across many HTML files.

**Improve:** shared build-time templates/data, one canonical story output plus compatibility redirects, one intended script version per site release, and one current article's data per journal page. Keep static output; no elaborate CMS/framework required.

**Acceptance:** a navigation/security/footer change is made once and appears on all supported pages; old URLs redirect; generated files are reproducible and do not contain unrelated article bodies.

### W23 — Bundle weight and deployment boundaries need budgets

**Evidence:** React production build: JS 535.55 kB minified / 130.74 kB gzip; CSS 58.55 kB / 9.52 kB gzip. Vite raised its >500 kB chunk warning. [Admin import](</D:/VibeCode/WritOn-PowerUp/web/src/App.tsx:9>) and [public operator button](</D:/VibeCode/WritOn-PowerUp/web/src/components/Header.tsx:87>) mix operator UI into the reader application.

**Improve:** load operator tools only when needed and restrict their discovery to authorized operators; preserve server-side authorization regardless of UI hiding. Keep editorial/admin pages out of search using noindex headers, not robots alone. Exclude archived campaign media from the website deployment where unused. Optimize actual requested images with dimensions and responsive sources.

Do not confuse ZIP size with page transfer weight, or infer LCP/INP/CLS from a build-size warning. Set budgets after collecting mobile measurements; retaining simple static pages is an advantage.

**Acceptance:** public readers do not download admin-heavy UI unnecessarily; admin APIs still deny unauthorized requests; mobile transfer and field performance are measured rather than described as “instant.”

### W24 — Existing tests do not establish complete website journeys

**Evidence:** [web API tests](</D:/VibeCode/WritOn-PowerUp/web/src/lib/api.test.ts:1>), [auth API tests](</D:/VibeCode/WritOn-PowerUp/web/src/lib/authApi.test.ts:1>), [CI](</D:/VibeCode/WritOn-PowerUp/.github/workflows/ci.yml:1>).

The six React tests cover mocked API compatibility, not rendering/navigation/account actions. Backend SEO tests exercise Fastify, not the Firebase/static website users actually receive. The default CI branch list omits `production`; verify intended release branches explicitly. A green build does not detect fake forms, wrong host routing, stale snapshots or mobile clipping.

**Improve:** add a small release-gating browser suite, generated-HTML checks, deployment header/routing assertions, and staging integration journeys. Reuse installed tools; production checks should remain read-only. Avoid treating optional/continue-on-error jobs as a release gate.

## Useful additions after the fixes

These are product suggestions, not defects or commitments. Choose by user need and evidence; no new paid platform is required for the first few.

1. **Search on public Explore:** title, author and topic search with clear zero-results/retry states. The React app already has search and the API accepts `q`; reuse that contract.
2. **Separate story language from site language:** an English UI can still show Hindi poetry. Persist the selection locally and put shareable filters in the URL.
3. **Public author pages:** readable biography, real avatar and published work at stable URLs. Reuse the backend author route rather than building another profile subsystem.
4. **Public reader controls:** modest font-size/line-spacing options and accessible code/table treatment; align with the existing Android/React reading model, without cluttering the page.
5. **Truthful install handoff:** label Android availability, keep full web reading, and use verified app links where possible; offer a QR code on desktop only if useful.
6. **Author-controlled artwork:** preserve the uploaded cover and use a brand placeholder when absent; provide a correct share preview from initial HTML.
7. **Clear trust/provenance:** distinguish editorial pieces, human authors and automated content where applicable. Match journal promises to actual behavior; do not imply fake authors are independent people.
8. **A real browser draft recovery experience:** this is more valuable than additional AI buttons, animation or gamification before durability is solved.
9. **Compact release notes:** actual current platform-specific improvements, dated and linked from About/Updates; do not promise future functionality as shipped.
10. **Accessible, theme-matched empty states:** a reusable visual plus plain explanation and a relevant action, not a spinner or decorative image alone.

## A strong, proportionate testing process

### On every change

- Typecheck/build and existing unit/contract tests.
- Generated-page checks: title/canonical/OG/language/date/JSON-LD, safe HTML/URLs, no duplicate canonical URLs, internal links and required assets.
- Adversarial rendering fixtures: raw HTML, attribute injection, script-closing metadata, broken images, tables, RTL/regional text and genuine code examples.
- Network tests: empty, 404, 429, 503, timeout, offline, reversed responses, lost responses after committed writes.

### Before deployment, on staging

- Guest: landing → filtered Explore → story → author → Back/Forward → share same story.
- Account: real reset/verification, signup response loss, session refresh/offline recovery and sign-out.
- Writer: draft restore, upload failure/retry, publish ambiguity/idempotency, edit, private/unpublished/deleted story lifecycle.
- Preferences: signed unsubscribe validation, persistence after reload, delivery eligibility after opt-out.
- Responsive/accessibility: 320/375/390/768/1440px, keyboard, screen-reader smoke, reduced motion and 200% text zoom.
- Real Android devices: installed/not-installed story handoff; these cannot be certified by a desktop browser.

### Immediately after deployment, read-only

- Header/routing matrix across extensionless URLs, static assets, API paths, missing stories, journal and account utility pages.
- Initial-response metadata and share preview for a newly published staging-approved/public story.
- Deployment identity, valid app-link association, broken links/assets and browser console/network errors.
- Confirm current, private and removed stories reflect their intended visibility without modifying production data.

### Measure periodically

- Field LCP/INP/CLS by mobile/desktop and page type; use throttled lab runs as diagnostics, not field proof.
- Search Console crawl/indexing and sitemap freshness; compare canonical pages against actually discoverable URLs.
- Funnel: discovery → story → engaged read → deliberate next action/app visit; avoid false “completion” or unsourced growth claims.

## Checks actually performed

| Check | Result |
|---|---|
| React tests | 2 files, 6 tests passed. |
| React production build | Passed; chunk-size warning noted above. |
| Backend SEO + vanity + campaign tests | Initial combined run: 42/43 passed, one campaign timeout. Isolated campaign rerun: 8/8 passed. Timeout treated as nondeterministic test reliability, not a confirmed route failure. SEO suite: 31 tests passed. |
| Local Markdown security probe | Raw event attribute survived parsing; no script executed and no payload was posted to production. |
| Archive structure | Flattened code-only bundle confirmed; full public archive preserves paths. |
| Live mobile homepage | Readable parchment layout and CTAs; no full accessibility/performance certification. |
| Live Explore | 375px overflow confirmed; 768px/1440px geometry checked. |
| Live story | Guest reading worked after API hydration; initial response was generic. |
| Live account/email pages | Presentation-only reset and preference controls confirmed by source/DOM; not submitted. |
| Public HTTP headers | Root protections present; sampled extensionless Explore/story protections absent; mutable Explore JS immutable for one year. |
| Public routing probes | Unknown story returned 200 shell; same-host journal API returned HTML 404; invalid unsubscribe-token path returned 200 static preferences page; assetlinks JSON returned 200. Returning assetlinks does not prove installed-device association. |

## Suggested sequence

1. Safe rendering, real account/preferences flows, snapshot visibility/removal.
2. Correct public routing, security headers, asset versioning and truthful failures.
3. React draft recovery, stable retries and non-destructive account reconciliation.
4. Mobile header, filters/history/share links, metadata and accessibility.
5. Release-gating browser/integration tests and measurement.
6. Only then add public search/language/author/reader enhancements and simplify templates.

The review uses code-review guidance for severity/evidence and browser-QA guidance for non-mutating production checks. It intentionally does not recommend a wholesale redesign, paid infrastructure changes, or bot modifications.
