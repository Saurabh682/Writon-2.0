# WritOn Upgrade Roadmap Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WritOn reliable and secure for real readers and writers before expanding the editor, discovery, and AI capabilities.

**Architecture:** Keep the existing Android Compose app, Vite web client, Fastify API, Firebase authentication, and PostgreSQL database. Deliver independently deployable milestones that first protect and stabilize the existing public API, then improve the core read/write experience, and only then add large platform features. New server endpoints remain under `/api/v1`; Android and web consume the same documented contract.

**Tech Stack:** Kotlin/Jetpack Compose/Room/Retrofit, React/Vite/TypeScript, Fastify/Node.js, PostgreSQL, Firebase Auth, Vitest, Gradle.

## Global Constraints

- Preserve public visitor reading; only authenticated actions such as publishing, applauding, commenting, bookmarking, following, and profile editing require sign-in.
- Retain the approved WritOn palette: `#F8F4EE`, `#FFFDF9`, `#151718`, `#6D6963`, `#E75A2A`, `#E9E1D7`, and `#F2ECE4`.
- Keep all secrets out of Git. `serviceAccountKey*.json`, `.env*`, certificates, keystores, APKs, and AABs remain ignored.
- The active backend is `server/src/server.js`. Code under `server/legacy_hono/` and `app/archived_java/` is legacy until explicitly retired.
- Each task must pass its focused tests before its commit. Run `graphify update .` after implementation tasks that modify source code.

---

## Release sequence

| Release | Outcome | Depends on |
| --- | --- | --- |
| R0 — Foundation | Protected, observable API and reproducible builds | None |
| R1 — Content Core | Working uploads, ranked search, stable feed | R0 |
| R2 — Native Reader & Writer | Infinite feed, usable editor, narration and preferences | R1 |
| R3 — Web Product | Shareable URLs, cached data, offline reads, rich editor | R1 |
| R4 — Trust & Scale | Moderation, account lifecycle, analytics, delivery automation | R0–R3 |
| R5 — Optional AI | Embedding search and local model experiments | R1–R4 |

### Task 1: R0 API protection, operational contract, and automated verification

**Files:**
- Modify: `server/package.json`, `server/src/server.js:63`, `server/src/config.js:23`, `server/test/fastify.contract.test.js:28`
- Create: `server/src/plugins/rate-limit.js`, `server/src/plugins/error-contract.js`, `server/src/openapi.js`, `server/test/security.contract.test.js`
- Create: `.github/workflows/verify.yml`

**Interfaces:**
- Consumes: `buildServer({ runtimeConfig, pool, auth })` from `server/src/server.js`.
- Produces: `GET /docs`, `GET /docs/json`, a stable JSON error shape `{ error: string, code?: string, requestId?: string }`, and per-route rate-limit policy.

- [ ] **Step 1: Add focused failing API tests**

Test that an invalid request returns the standard error object, a health response has no secret data, and repeated unauthenticated writes receive HTTP 429 after the configured threshold. Test that `/docs/json` describes `/api/v1/posts` and an authenticated write endpoint.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run server/test/security.contract.test.js`

Expected: failures because the rate-limit plugin, OpenAPI contract, and shared error hook do not exist.

- [ ] **Step 3: Implement the minimum behavior**

Register `@fastify/rate-limit`, Swagger, and Swagger UI inside `buildServer`. Apply a conservative public-read policy and stricter create/authenticated-write policy. Convert validation, authentication, not-found, and unexpected errors to the documented shape; log unexpected errors with a request ID without logging tokens, passwords, or database URLs. Add a GitHub workflow that runs server tests, web build, and Android Kotlin compilation.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run server/test/security.contract.test.js`

Expected: all new contract tests pass, including HTTP 429 and documented routes.

- [ ] **Step 5: Run the affected integration checks**

Run: `npm test`; `npm run build` in `web`; `.\gradlew.bat :app:compileDebugKotlin --no-daemon`

Expected: all commands finish successfully.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add server/package.json server/src server/test .github/workflows/verify.yml
git commit -m "feat: protect and document API"
```

### Task 2: R1 media uploads and image lifecycle

**Files:**
- Modify: `server/src/server.js:63`, `server/src/config.js:23`, `web/src/lib/api.ts:182`, `app/src/main/java/com/ibitvalley/writon/modern/data/repository/PostRepository.kt:204`
- Create: `server/src/media/storage-provider.js`, `server/src/media/media-routes.js`, `server/test/media.contract.test.js`

**Interfaces:**
- Consumes: authenticated Firebase bearer token and a JPEG, PNG, or WebP file.
- Produces: `POST /api/v1/media/upload` returning `{ url: string, width: number, height: number, contentType: string }`; failures use the R0 error contract.

- [ ] **Step 1: Add focused failing media tests**

Test unauthenticated upload returns HTTP 401; unsupported MIME type returns HTTP 415; an oversized image returns HTTP 413; a valid image returns a URL and metadata. Include a test that the returned URL is accepted by post creation.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run server/test/media.contract.test.js`

Expected: failure because the active Fastify server does not expose `/api/v1/media/upload`.

- [ ] **Step 3: Implement the minimum behavior**

Use a `StorageProvider` interface with `putObject({ key, bytes, contentType }): Promise<{ url }>` so the initial provider can be local development storage and production can use one S3-compatible provider. Enforce a chosen file-size limit, decode-safe image dimensions, safe object keys, and WebP/JPEG/PNG MIME allow-list. Update Android and web upload calls to use the response URL.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run server/test/media.contract.test.js`

Expected: all upload scenarios return the documented statuses and the post contract accepts the returned URL.

- [ ] **Step 5: Run the affected integration checks**

Run: `npm test`; `npm run build` in `web`; `.\gradlew.bat :app:compileDebugKotlin --no-daemon`

Expected: all commands finish successfully.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add server/src server/test web/src/lib/api.ts app/src/main/java/com/ibitvalley/writon/modern/data/repository/PostRepository.kt
git commit -m "feat: add authenticated media uploads"
```

### Task 3: R1 ranked PostgreSQL search and paged discovery

**Files:**
- Modify: `server/src/server.js:374`, `server/migrations/`, `server/test/fastify.contract.test.js:28`
- Modify: `app/src/main/java/com/ibitvalley/writon/modern/feature/search/SearchViewModel.kt:25`, `web/src/lib/api.ts:10`
- Create: `server/test/search.contract.test.js`

**Interfaces:**
- Consumes: `GET /api/v1/posts?q=&category=&page=&limit=`.
- Produces: ranked post results with the existing pagination response and stable empty-result behavior.

- [ ] **Step 1: Add focused failing search tests**

Test exact title matches rank above incidental body matches; category filtering remains applied; blank queries retain the latest/popular sort; invalid page/limit returns HTTP 400; and no result returns an empty `items` collection with valid pagination metadata.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run server/test/search.contract.test.js`

Expected: ranking assertions fail because search lacks a PostgreSQL full-text vector and GIN index.

- [ ] **Step 3: Implement the minimum behavior**

Add a database migration that maintains a weighted `tsvector` from title, summary, content, and category, then adds a GIN index. Query with `websearch_to_tsquery` and `ts_rank_cd`; parameterize every value. Keep the current API fields and only add an optional numeric `searchRank` when a query is supplied.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run server/test/search.contract.test.js`

Expected: ranking, filtering, pagination, and empty-result tests pass.

- [ ] **Step 5: Run the affected integration checks**

Run: `npm test`; `.\gradlew.bat :app:compileDebugKotlin --no-daemon`; `npm run build` in `web`

Expected: all commands finish successfully.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add server app/src/main/java/com/ibitvalley/writon/modern/feature/search web/src/lib/api.ts
git commit -m "feat: add ranked post search"
```

### Task 4: R2 Android paging, offline reads, and action synchronization

**Files:**
- Modify: `app/build.gradle`, `app/src/main/java/com/ibitvalley/writon/modern/data/repository/PostRepository.kt:17`, `app/src/main/java/com/ibitvalley/writon/modern/feature/feed/FeedViewModel.kt:12`
- Modify: `app/src/main/java/com/ibitvalley/writon/modern/feature/feed/FeedScreen.kt`, `app/src/main/java/com/ibitvalley/writon/modern/core/database/WritOnDatabase.kt:16`
- Create: `app/src/main/java/com/ibitvalley/writon/modern/data/paging/PostRemoteMediator.kt`, `app/src/test/java/com/ibitvalley/writon/modern/data/paging/PostRemoteMediatorTest.kt`

**Interfaces:**
- Consumes: paged `/api/v1/posts` responses and the existing Room post/outbox tables.
- Produces: `Flow<PagingData<PostEntity>>`, cached reader content, and retryable queued actions.

- [ ] **Step 1: Add focused failing paging tests**

Test refresh stores page one, append requests the next page exactly once, end-of-pagination stops requests, and a network failure leaves cached stories visible. Test that an offline applause/bookmark action is queued once and retried when network becomes available.

- [ ] **Step 2: Verify the relevant failure**

Run: `.\gradlew.bat :app:testDebugUnitTest --tests "*PostRemoteMediatorTest" --no-daemon`

Expected: failure because Paging 3 and the mediator are absent.

- [ ] **Step 3: Implement the minimum behavior**

Add Paging 3 Compose/runtime dependencies. Implement `PostRemoteMediator` with transactional Room writes, explicit refresh/append keys, and no duplicate network calls. Render `LazyPagingItems` load, retry, empty, and cached-error states. Preserve guest read access and require authentication only when flushing queued protected actions.

- [ ] **Step 4: Verify the focused pass**

Run: `.\gradlew.bat :app:testDebugUnitTest --tests "*PostRemoteMediatorTest" --no-daemon`

Expected: the mediator tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `.\gradlew.bat :app:compileDebugKotlin --no-daemon`

Expected: Android production sources compile.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add app/build.gradle app/src/main/java app/src/test
git commit -m "feat: add paged offline feed"
```

### Task 5: R2 Android reader preferences, narration, and functioning editor actions

**Files:**
- Modify: `app/src/main/java/com/ibitvalley/writon/modern/feature/reader/ReaderScreen.kt:44`, `app/src/main/java/com/ibitvalley/writon/modern/feature/editor/StoryEditorScreen.kt:234`, `app/src/main/java/com/ibitvalley/writon/modern/feature/editor/EditorViewModel.kt:68`
- Create: `app/src/main/java/com/ibitvalley/writon/modern/feature/reader/ReaderPreferences.kt`, `app/src/main/java/com/ibitvalley/writon/modern/feature/reader/AndroidNarrator.kt`, `app/src/test/java/com/ibitvalley/writon/modern/feature/editor/EditorFormattingTest.kt`

**Interfaces:**
- Consumes: editor text, reader preferences stored in DataStore, and Android `TextToSpeech`.
- Produces: markdown insertion actions, configurable reader typography, and a stop/pause/resume narration state.

- [ ] **Step 1: Add focused failing tests**

Test bold, italic, heading, quote, list, link, and divider actions produce the correct markdown around selected text or at the cursor. Test preference defaults and persistence. Test narrator state transitions using a fake narrator rather than device speech.

- [ ] **Step 2: Verify the relevant failure**

Run: `.\gradlew.bat :app:testDebugUnitTest --tests "*EditorFormattingTest" --no-daemon`

Expected: failure because toolbar click handlers are empty and narration/preferences abstractions do not exist.

- [ ] **Step 3: Implement the minimum behavior**

Replace empty toolbar actions with deterministic text transformations. Add settings for serif/sans font, text size, line height, and reduced motion. Wrap `TextToSpeech` so initialization failure disables narration with an accessible message, changing playback speed restarts safely, and leaving the reader stops speech. Verify touch targets, contrast, TalkBack labels, and font scaling on the primary reader/editor paths.

- [ ] **Step 4: Verify the focused pass**

Run: `.\gradlew.bat :app:testDebugUnitTest --tests "*EditorFormattingTest" --no-daemon`

Expected: formatting and preference/narration state tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `.\gradlew.bat :app:compileDebugKotlin --no-daemon`

Expected: Android production sources compile.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add app/src/main/java app/src/test
git commit -m "feat: improve Android reading and editing"
```

### Task 6: R3 web routing, data cache, and offline reading

**Files:**
- Modify: `web/package.json`, `web/src/App.tsx:34`, `web/src/lib/api.ts:10`
- Create: `web/src/routes/`, `web/src/lib/query-client.ts`, `web/src/lib/offline-library.ts`, `web/vite.config.ts`, `web/src/test/routes.test.tsx`

**Interfaces:**
- Consumes: existing `/api/v1/posts/:idOrSlug` and `/api/v1/users/:idOrPenName` APIs.
- Produces: direct `/posts/:slug` and `/u/:penName` routes, cached query state, and saved-story offline reads.

- [ ] **Step 1: Add focused failing web tests**

Test a direct story URL renders after a hard navigation, an unknown slug shows a not-found state, a loading story retains cached content, and an offline saved story opens without a network request.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run web/src/test/routes.test.tsx`

Expected: failure because the app uses local view state and has no query/offline infrastructure.

- [ ] **Step 3: Implement the minimum behavior**

Introduce TanStack Router and TanStack Query without changing the server contract. Configure a Vite PWA service worker that caches only public app assets and user-selected saved story payloads; never cache bearer tokens or private profile responses. Route the existing reader and author views through route parameters.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run web/src/test/routes.test.tsx`

Expected: route, not-found, cache, and offline-read tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `npm run build`

Expected: TypeScript compilation and Vite production build succeed.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add web/package.json web/src web/vite.config.ts
git commit -m "feat: add routed offline web reader"
```

### Task 7: R4 account lifecycle, moderation, and notification delivery

**Files:**
- Modify: `server/src/server.js:433`, `server/src/config.js:23`, `server/migrations/`
- Modify: `app/src/main/java/com/ibitvalley/writon/modern/feature/settings/SettingsScreen.kt`, `web/src/context/AuthContext.tsx:24`
- Create: `server/src/services/moderation-service.js`, `server/src/services/notification-service.js`, `server/test/account-safety.contract.test.js`

**Interfaces:**
- Consumes: authenticated Firebase user, post/comment/profile identifiers, notification preferences.
- Produces: account export/delete request endpoints, report/block actions, notification read state, and delivery-job records.

- [ ] **Step 1: Add focused failing contract tests**

Test a user can export only their own data, delete only their own account, report a post once per reporter, block suppresses author content from the feed, and marking a notification read does not alter another user's notification. Test guest users receive HTTP 401 for each protected action.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm test -- --run server/test/account-safety.contract.test.js`

Expected: failure because the account-lifecycle, moderation, and notification-read endpoints do not exist.

- [ ] **Step 3: Implement the minimum behavior**

Add migrations with ownership-enforced records for reports, blocks, export requests, deletion requests, notification preferences, and notification delivery attempts. Keep account deletion as a product-defined workflow: the endpoint confirms the request and records it; physical deletion timing follows the chosen retention policy. Create notification jobs separately from FCM delivery so transient provider failure is retryable and visible.

- [ ] **Step 4: Verify the focused pass**

Run: `npm test -- --run server/test/account-safety.contract.test.js`

Expected: ownership, idempotency, and guest-access tests pass.

- [ ] **Step 5: Run the affected integration checks**

Run: `npm test`; `.\gradlew.bat :app:compileDebugKotlin --no-daemon`; `npm run build` in `web`

Expected: all commands finish successfully.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add server app/src/main/java/com/ibitvalley/writon/modern/feature/settings web/src/context/AuthContext.tsx
git commit -m "feat: add account safety controls"
```

### Task 8: R5 optional AI experiments and legacy retirement

**Files:**
- Create: `docs/adr/0001-local-ai-and-embeddings.md`, `docs/legacy-retirement-inventory.md`
- Proposed Modify: `web/src/lib/ai-engine.ts:7`, `app/src/main/java/com/ibitvalley/writon/modern/core/ai/OnDeviceAIEngine.kt:12`
- Proposed Remove after inventory approval: `server/legacy_hono/`, `app/archived_java/`

**Interfaces:**
- Consumes: anonymized public post text and explicit device capability checks.
- Produces: an approved experiment decision and a verified archive/removal inventory; no model feature is merged before those decisions.

- [ ] **Step 1: Add decision and inventory tests**

Create an inventory command or script test that lists all active imports/references into `server/legacy_hono/` and `app/archived_java/`; the test must fail if an active production source imports legacy code. Add benchmark fixtures for semantic-search relevance and Android memory/startup thresholds.

- [ ] **Step 2: Verify the relevant failure**

Run: `git grep -n "legacy_hono\|archived_java" -- ':!docs/*'`

Expected: current repository references and/or unclassified legacy content require an explicit inventory before removal.

- [ ] **Step 3: Implement the minimum behavior**

Write the ADR comparing server-side PostgreSQL full-text search, browser embeddings, and on-device model options by privacy, offline capability, APK/web bundle size, RAM, battery, and device coverage. Keep the current heuristic assistant as the stable fallback. Archive or remove legacy directories only after the inventory proves no build/runtime imports and the repository-retention decision is approved.

- [ ] **Step 4: Verify the focused pass**

Run: `git grep -n "legacy_hono\|archived_java" -- ':!docs/*'`

Expected: all remaining occurrences are documented archival references; no active production source imports them.

- [ ] **Step 5: Run the affected integration checks**

Run: `npm test`; `npm run build` in `web`; `.\gradlew.bat :app:compileDebugKotlin --no-daemon`

Expected: all production builds and tests remain successful after any approved cleanup.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add docs server app web
git commit -m "docs: record AI and legacy retirement decisions"
```

## Deferred capabilities

- Web Tiptap editor: begin only after R3 routing/query work stabilizes; it requires a content-format migration decision because current posts use plain Markdown text.
- Android shared-element transitions and voice dictation: add after R2 accessibility and performance baselines are recorded.
- Drizzle migration: consider only when raw SQL duplication creates a demonstrated maintenance problem; it is not required for R0–R4.
- Local embeddings, WebLLM, and MediaPipe/Gemma: prototype behind an opt-in feature flag after R5 ADR and device benchmarks.

## Unresolved product decisions

1. **Production media provider:** use Cloudflare R2, Amazon S3, Supabase Storage, or another S3-compatible service. This determines credentials, public URL policy, and retention costs.
2. **Upload policy:** maximum file size, allowed dimensions, and whether the service stores originals or only transformed WebP copies.
3. **Account deletion:** immediate permanent deletion, a grace-period deletion request, or anonymization with retained posts; this determines the database migration and user-facing confirmation.
4. **Moderation:** manual review only, trusted reporter thresholds, or automated classification; this determines reporting queues and response times.
5. **Analytics consent:** anonymous essential diagnostics only, opt-in product analytics, or no analytics; this determines event storage and privacy copy.
6. **AI commitment:** local-only experimentation versus a future consented cloud service; this determines model delivery, cost, safety review, and supported-device policy.

## Execution handoff

Implement one task per reviewable commit. The current host exposes inline implementation and code-review skills; execute this roadmap inline, verify each task with the listed commands, then update Graphify before the task is handed off.
