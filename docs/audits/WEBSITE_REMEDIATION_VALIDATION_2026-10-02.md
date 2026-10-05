# Website remediation validation — 2 October 2026

## Verdict: Changes Requested / DO NOT SHIP

The reported 90 backend tests genuinely pass, and several useful fixes are present. The claim that all W01–W24 findings are addressed and verified is not supported by the current workspace or sampled public deployment. Two independent frontend compilation failures and a broken email-preference contract are release blockers.

This is a review, not an implementation or deployment. No application code, accounts, production preferences, stories, bot code, or deployment settings were changed. A temporary loopback-only static preview was stopped after testing. This document is the only review artifact added.

Baseline: `docs/audits/WEBSITE_REVIEW_2026-10-01.md`. Finding IDs below retain their original meanings. The supplied remediation report changes the meanings of several IDs from W12 onward; those substitutions must not count as closing the original findings.

## Independently executed checks

| Check | Result |
| --- | --- |
| Server: `npx.cmd vitest run test/email-unsubscribe-contract.test.js test/story-sanitizer.test.js test/email-engagement-routes.test.js test/fastify.contract.test.js --no-file-parallelism` | 4 files, 90 tests passed |
| Web: `npm.cmd test -- --run` | 2 files, 6 tests passed; these are API mocks, not editor/browser journeys |
| Web: `npm.cmd run build` | FAILED: TS6133 twice and TS7006 once in StoryEditor |
| `node --check public/js/explore.js` | FAILED: unexpected `const` at line 158, caused by extra closing brace at line 155 |
| Inline-script syntax: reader, email settings, reset, verification, journal fallback | Passed syntax-only compilation; not a functional certification |
| Local email-settings script with all-enabled API fixture | All three displayed checkboxes incorrectly became false; submitted patch uses unsupported keys |
| Local inert image-attribute probe | A quoted author name introduced an `onerror` attribute with inert value `void 0` |
| Local edited Explore at 320/375/390px | Language selector right edge approximately 456.2px at every width: still clipped |
| Local Explore at 768/1440px | No document-width overflow observed in these samples |
| Local browser console | `SyntaxError: Unexpected token 'const'` from `/js/explore.js` |
| Code-only ZIP inventory | 207 entries; zero nested paths; 94 duplicate-name groups: original packaging finding persists |
| JSON-LD escaping expression in server renderer | Escapes `<` and remains parseable, preserving original text |

No staging sign-in, password changes, real unsubscribe POST, publication, database mutation, deployment, or full accessibility/performance certification was performed. No visual baseline, screen-reader pass, or field Core Web Vitals evidence exists for this review.

## Confirmed blockers and major follow-ups

### V01 [BLOCKER] — Explore JavaScript cannot execute

**Evidence:** `public/js/explore.js:155–158`; reproduced by Node syntax check and the browser console.

**What:** An extra `}` after `loadTopStoriesForCarousel` ends the outer function before the grid declarations. The entire script fails parsing.

**Why:** Live story loading, category filters, pagination, carousel controls and mobile navigation handlers never initialize; static fallback cards can hide the failure visually.

**Fix:** Remove the unmatched brace, syntax-check the complete script, then verify real category switching, Load More and mobile menu behavior in the browser. The new AbortController code cannot be accepted while its containing script is invalid.

### V02 [BLOCKER] — React production build fails

**Evidence:** `web/src/components/StoryEditor.tsx:1`, `:40`, `:196`.

**What:** `useRef` and `setClientDraftId` are unused (TS6133); the dictation updater parameter `prev` has implicit `any` (TS7006).

**Why:** `tsc && vite build` stops before generating a deployable bundle. Passing API tests do not establish build readiness.

**Fix:** Remove unused declarations and give restored string fields explicit types/validated values; run the complete production build again. Do not silence the checks globally.

### V03 [BLOCKER, W02/W15] — Preferences cannot load/save truthfully

**Evidence:** `public/email/unsubscribe.html:283–285`, `:325–327`, `:377–392`, `:408–412`; `server/src/routes/email-engagement.js:187–206`; `server/src/email/preferences.js:3–10`.

**What:** The API returns and accepts `reading`, `activity`, `lifecycle`, `writerTips`. The page reads `reading_enabled`/`activity_enabled`/craft aliases and sends `reading_enabled`, `activity_enabled`, `craft_enabled`. Unknown patch keys are ignored by the backend. Its production API base is also the website origin, but `firebase.json` has no `/api/**` rewrite.

**Why:** Enabled settings appear disabled. Even after the routing issue is resolved, a successful PATCH can leave every preference unchanged while displaying success. “Unsubscribe all” does not address lifecycle or writerTips.

**Fix:** Use the exact API fields, include all optional scopes for unsubscribe-all, and call the stable API origin or an explicitly configured gateway rewrite. Render the returned persisted state. Add a frontend/backend contract test that verifies the changed database parameters and subsequent GET, including failure handling. Consider Google sign-in support separately for Google-only accounts.

### V04 [BLOCKER, W01] — Sanitization is incomplete at other DOM boundaries

**Evidence:** `public/stories/index.html:383–396`, `:513`, `:523`.

**What:** Missing DOMPurify falls back to returning raw parsed HTML. Avatar and cover markup still interpolate names/titles/URLs directly into HTML attributes outside the sanitizer.

**Why:** Sanitizing story-body HTML does not secure separately constructed image markup. An inert local probe using a quoted author name introduced an event-handler attribute. A sanitizer load failure also restores the original unsafe body path. These legacy reader paths remain publicly deployable even if the principal story route is moved to server rendering.

**Fix:** Use DOM element properties/textContent for names, titles and images; validate image URLs; fail closed to escaped plain text when the sanitizer is unavailable. Test the complete renderer, including author metadata and dependency-load failure, not only `sanitizeStoryHtml`.

### V05 [MAJOR, W03/W09/W20] — Claimed CSP/header standardization is absent

**Evidence:** `firebase.json:62–119`; Firebase SDK references in the three auth/preferences pages.

**What:** Security policies still match `/` and `**/*.html`, not the claimed catch-all. The CSP permits only self/inline scripts and self plus api.writon.cc connections; it does not permit the newly loaded gstatic Firebase scripts or the necessary Firebase Auth/Google Analytics endpoints. Clear-Site-Data cache purges also remain.

**Why:** Clean routes still lack the intended header coverage; direct HTML auth pages can block their own SDK. Homepage analytics remains outside the allowed script policy. Merely adding real Firebase API calls is not end-to-end verification.

**Fix:** Apply a deliberate route/header policy for both clean and HTML URLs, allowing only the actual required SDK, auth and analytics origins. Preserve the stronger restrictions for unrelated surfaces. Validate the deployed header matrix and auth network requests in a preview environment. Remove unnecessary blanket cache purges.

### V06 [MAJOR, W10] — Mobile language control is still unreachable

**Evidence:** `public/explore/index.html:634–649`, `:685–689`; local browser geometry.

**What:** Added breakpoints adjust cards and padding but not the problematic header layout. The selector extends to x≈456.2 at widths 320, 375 and 390.

**Why:** A right-clipped language selector is still unusable. Hiding horizontal overflow does not make the control reachable.

**Fix:** Let header children shrink/reflow and simplify the mobile label; verify the actual selector fits at 320/375/390px and with 200% text zoom and regional labels.

### V07 [MAJOR, W05/W06] — Draft storage is shared across accounts

**Evidence:** `web/src/components/StoryEditor.tsx:40–42`, `:105–120`, `:223–236`.

**What:** A single origin-global `writon_active_draft_id` restores any previous user's draft. There is no owner namespace or account-boundary reset. The initial active-ID lookup is also outside a try/catch.

**Why:** On a shared browser, another account can see or publish the previous account's unpublished writing. Browser storage restrictions can throw during mount rather than showing a safe unsaved-draft state.

**Fix:** Scope storage and active IDs to the authenticated account or an explicit guest identity, handle account changes and blocked/quota-exhausted storage, and validate restored payload types. Test refresh/retry/logout/account-switch cases before claiming draft durability.

### V08 [MAJOR, W15/W16/W19] — Navigation/state fixes are only partial

**Evidence:** `web/src/App.tsx:109–123`, `:180–201`, `:228`, `:237`, `:245`; `web/src/components/StoryReader.tsx:151`; `web/src/components/AuthorProfile.tsx:55–86`.

**What:** Only story/author selection writes history. Home, Back, Write and publish-success change component state without synchronizing the URL. Clipboard copy still uses the current browser URL without awaiting success. Feed reads still lack latest-request protection/pagination, and profile bookmarks/tab state is not cleared when authors change.

**Why:** The URL can describe a different story/view than the UI; refresh and sharing remain unreliable. Slow old responses can replace newer selections; stale account-specific profile state persists.

**Fix:** Route every view transition through one minimal URL contract, copy canonical story URLs and await clipboard operations, cancel/discard obsolete reads, expose finite feed pagination and explicitly clear account/author-specific state. Confirm refresh routes exist in the built hosting deployment.

### V09 [MAJOR, W04] — Dynamic rendering does not yet prove timely privacy removal

**Evidence:** `server/src/server.js:2606`, `:2626`; snapshot retirement script and deleted local snapshots.

**What:** The backend queries only published public stories, which is useful, but emits `public, max-age=300, stale-while-revalidate=3600`. A cached story may outlive a privacy/unpublish/delete change. Local retirement is not proof that deployed snapshots were removed.

**Why:** Database visibility enforcement occurs only when the request reaches the origin. Removing disk snapshots alone does not revoke cached public responses.

**Fix:** Define the permitted privacy-removal delay, then use revalidation/no-store or tested purge behavior to meet it. Verify visibility changes against the deployed CDN with a staging story. Guard against reintroducing snapshots through the still-present prerender generator.

### V10 [MAJOR, W24] — Test totals do not cover the website journeys

**Evidence:** `web/src/lib/api.test.ts`, `web/src/lib/authApi.test.ts`, `.github/workflows/ci.yml:5–7`, `server/test/story-sanitizer.test.js`.

**What:** The six web tests remain API mocks; there are no added editor/navigation/auth-form integration tests in `web/src`. The five sanitizer tests do not test JSON-LD escaping despite the report's statement. CI still omits production from its branch list.

**Why:** Both frontend build/syntax failures and the preference field mismatch coexist with 90 green backend tests. Unit/contract checks are valuable but not release certification.

**Fix:** Gate releases on React build, public JS syntax, generated HTML checks, targeted browser journeys, Firebase header/routing checks and staging auth/preferences/privacy tests. Keep production smoke checks read-only. Retain the new backend tests.

## Public deployment samples

Read-only HEAD requests on 2 October 2026:

| URL | Observed result |
| --- | --- |
| `https://writon.cc/explore` | 200, default `max-age=3600`, no CSP/nosniff/frame/referrer headers in sampled response |
| `https://writon.cc/api/v1/journal/why-writon-exists` | 404, `text/html`, not the intended journal JSON |
| `https://writon.cc/stories/website-audit-missing-readonly-probe` | 200 generic static-sized HTML, not a real missing-story 404 |
| `https://writon.cc/email/unsubscribe/invalid.token.here` | 200 static-sized HTML, not backend token rejection |

These sampled responses have Last-Modified 26 September 2026. The new website rewrites and snapshot retirement have not been established on the sampled live deployment. This does not establish the status of every Cloud Run revision or authorize a new deployment.

## Original W01–W24 reconciliation

“Implemented” below describes observed local code, not deployment or full acceptance. No finding receives blanket production closure from these checks.

| ID | Original subject | Review status / remaining evidence |
| --- | --- | --- |
| W01 | Unsafe story rendering | Partial: maintained sanitizers added, but V04 remains; full-renderer tests absent |
| W02 | Fake email preferences/unsubscribe | Partial: backend one-click POST tests pass; preference UI contract/routing still broken (V03) |
| W03 | Fake password reset/verification | Real SDK calls added; CSP/auth end-to-end validation still needed (V05) |
| W04 | Stale public story snapshots/privacy | Local snapshots retired and rewrites added; live removal and cache revocation not verified (V09) |
| W05 | Lost editor work | Local persistence added; build, account isolation and storage failure handling unresolved (V02/V07) |
| W06 | Unstable publish retry ID | ID now retained in one editor session; retry/refresh/account isolation not integration-tested |
| W07 | Destructive signup rollback | Destructive deleteUser removed; profile reconciliation/correction journey still needs testing |
| W08 | Mutable assets cached immutably | Local CSS/JS rules shortened; actual new deployed policy and cache lifecycle still need checking |
| W09 | Missing clean-route security headers | OPEN: configuration and live sample still demonstrate missing coverage (V05) |
| W10 | Mobile language selector clipping | OPEN: reproduced locally at 320/375/390px (V06) |
| W11 | Obsolete filter/search responses | Partial code for Explore, but script cannot run; React feed remains unguarded (V01/V08) |
| W12 | Hidden/misreported errors | OPEN: console-only catches and indefinite profile loading remain; manual carousel is not this finding |
| W13 | JavaScript-dependent fresh-story previews | Dynamic rewrite added locally; live missing-story sample still returns static shell; fresh/regional metadata not deployment-tested |
| W14 | Metadata/template drift | Partial: literal canonical restored, but legacy generator still uses createdAt and template retains homepage hreflang/FAQ; dynamic delivery requires validation |
| W15 | Inconsistent API/category/author routing | OPEN: missing same-host API rewrite and live journal 404; no author rewrite in hosting contract (V03/V08) |
| W16 | History and share links | Partial pushState/popstate; other transitions and clipboard remain incorrect (V08) |
| W17 | Accessibility/motion behavior | Manual-navigation edit present but invalid script; tab keyboard semantics/accessibility acceptance unverified |
| W18 | Avatar fallback/misleading imagery | Initial variable scope fixed; stock category covers still used, image boundary unsafe (V04) |
| W19 | Pagination/profile/media cleanup | Dictation unmount cleanup added; feed pagination and profile state reset still absent (V08) |
| W20 | Analytics and truthful product promises | OPEN: CSP still blocks required analytics, reader still counts wall-clock time without visibility gating; full promise reconciliation unverified |
| W21 | Flattened review archive | OPEN: reproduced 207 entries, zero nested paths, 94 duplicated-name groups; journal changes do not fix archive packaging |
| W22 | Duplication at generation boundary | Partial: journal catalog embedding removed and snapshots retired; duplicate asset/template consolidation not verified |
| W23 | Bundle/operator/deployment boundaries | Lazy import added; production build fails, operator discovery remains public, performance/transfer budgets unverified |
| W24 | Missing complete website journeys | OPEN: new backend tests help, but no corresponding frontend journey suite or deployment gate (V10) |

## Follow-up order for Antigravity

1. Fix Explore syntax and React type/build errors; rerun both builds/checks.
2. Correct preferences field contract, production API routing and all-scope unsubscribe behavior; add a real integration check.
3. Close remaining DOM trust boundaries and make sanitizer failures safe.
4. Correct header/CSP coverage and the mobile header layout.
5. Finish account-isolated drafts, navigation/share consistency and privacy-cache behavior.
6. Add the small release-gating browser/staging suite, preserve original finding IDs, then perform an explicitly authorized preview deployment and verification.
7. Only mark findings closed against their original acceptance criteria; keep incomplete items open rather than renumbering them.
