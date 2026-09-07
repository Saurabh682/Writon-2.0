# Google Cloud Cutover Evidence & Rollback Baseline

**Recorded Date:** 2026-09-07T10:28:30+05:30 (04:58:30 UTC)  
**Project:** `writon-app-2020`  
**Active Working Branch:** `codex/staging-engagement-preferences`  

---

## 1. Baseline Contract & Gateway Architecture

| Component | Target / Value | Status |
|---|---|---|
| **Public API Gateway** | `https://api.writon.cc` | Operational (Firebase Hosting site: `writon-api-gateway`) |
| **Android Client Base URL** | `https://api.writon.cc/` | Unchanged across all releases |
| **Current Gateway Target** | `writon-app-api-canary` (`asia-south1`) | Healthy (`/health` 200 OK, database: connected) |
| **Render Standby Origin** | `https://writon-powerup.onrender.com` | Healthy (`/health` 200 OK, database: connected) |
| **Staging Supabase Reference** | `xrfnebvkazewqramkpri` | Guarded via `test/staging-database-guard.test.js` |
| **Production Supabase Reference**| `rrxaitxeirykmiihgiqj` | Active production DB |
| **Outbox Drain State** | `pending`: 3 rows, `skipped`: 251 rows | Oldest pending: `2026-09-07T04:06:59.977Z` |
| **Backend Test Suite** | 16 test files, 169 tests passed | 100% passing (`14.20s`) |

---

## 2. Gateway Origin & Rollback Proof

### Origin Routing:
- The custom domain `api.writon.cc` is mapped to Firebase Hosting site `writon-api-gateway`.
- `firebase.api.json` controls origin resolution through Cloud Run rewrites:
  ```json
  {
    "hosting": {
      "site": "writon-api-gateway",
      "public": "public-api",
      "rewrites": [
        {
          "source": "**",
          "run": {
            "serviceId": "writon-app-api-canary",
            "region": "asia-south1"
          }
        }
      ]
    }
  }
  ```

### Rollback Proof:
If Cloud Run exhibits unexpected latency, 5xx errors, or outbox issues, the gateway can be rolled back to Render without any DNS propagation delays or Android client changes by updating `firebase.api.json` rewrite or proxy target and deploying:
```powershell
npx --yes firebase-tools@latest deploy --only hosting:writon-api-gateway --config firebase.api.json --project writon-app-2020
```

---

## 3. Smoke Test Verification Matrix

| Endpoint | Method | Expected | Observed Result |
|---|---|---|---|
| `/health` | `GET` | 200 OK (`database: connected`) | `200 OK` (1454ms on gateway, 350ms on canary) |
| `/api/v1/app/version` | `GET` | 200 OK (`latestVersionCode: 108`) | `200 OK` (`latestVersionCode: 108`, `minSupported: 101`) |
| `/api/v1/spark/feed?limit=2` | `GET` | 200 OK (stories array) | `200 OK` (`stories.length: 2`) |
| `/api/v1/me` (unauthenticated) | `GET` | 401 Unauthorized | `401 Unauthorized` |
| `/api/v1/me` (invalid Bearer token)| `GET` | 401 Unauthorized | `401 Unauthorized` |

---

## 4. Least-Privilege Identities & Versioned Secrets (Task 2)

### Service Accounts Created & Bound:
1. **API Runtime**: `writon-api-runtime@writon-app-2020.iam.gserviceaccount.com`
   - `roles/secretmanager.secretAccessor` (read versioned application secrets)
   - `roles/logging.logWriter` (structured Cloud Logging)
   - `roles/monitoring.metricWriter` (Cloud Monitoring)
   - `roles/firebaseauth.admin` (Firebase user verification & lifecycle)
   - `roles/firebase.growthAdmin` (FCM messaging send permissions)
2. **Scheduler Invoker**: `writon-scheduler-invoker@writon-app-2020.iam.gserviceaccount.com`
   - `roles/run.invoker` (Cloud Run OIDC invocation)

### Secret Manager Layout:
- **Production Secrets** (validated strictly to contain Supabase ref `rrxaitxeirykmiihgiqj`):
  - `writon-database-url-production`
  - `writon-supabase-url-production`
  - `writon-supabase-service-role-key-production`
  - `writon-admin-secret-key-production`
  - `writon-cors-origins-production`
- **Staging Secrets** (validated strictly to contain Supabase ref `xrfnebvkazewqramkpri`):
  - `writon-database-url-staging`
  - `writon-supabase-url-staging`
  - `writon-supabase-service-role-key-staging`
  - `writon-admin-secret-key-staging`
  - `writon-cors-origins-staging`

---

## 5. Operational Guardrails

1. **Staging vs. Production**: Staging runs exclusively on Supabase `xrfnebvkazewqramkpri`. Production runs on `rrxaitxeirykmiihgiqj`.
2. **Zero Consumer Overlap**: Render outbox worker will be confirmed paused before Google Cloud Scheduler outbox drain is enabled.
3. **No Secret Leakage**: No secrets in source, build logs, Docker layers, or Cloud Scheduler job descriptions.

---

## 6. Immutable Container Build (Task 3 - PASSED)

- **Artifact Registry Repo**: `asia-south1-docker.pkg.dev/writon-app-2020/writon`
- **Image Digest**: `sha256:ff4ed7d4e0c3d6e1f5d482bb1699773396db2e83711c7c7d5894fa5fb2e33d8c`
- **Tags**: `e1c8e3f8`, `latest`
- **Build Characteristics**: Multi-step Cloud Build, clean `npm ci --omit=dev`, non-root user `writon`, context trimmed to 1.4 MB via `.dockerignore` / `.gcloudignore`.

---

## 7. Protected Internal Operations & Timer Decoupling (Task 5 - PASSED)

- Protected endpoints added with `x-admin-key` authentication:
  - `POST /api/v1/internal/notifications/drain-outbox` (bounded by limit and maxSeconds)
  - `POST /api/v1/internal/notifications/fanout-publications` (calls `runFollowedWriterNotifications`)
  - `POST /api/v1/internal/maintenance/feed-retention` (calls `cleanExpiredFeedData`)
  - `POST /api/v1/internal/notifications/daily-digest`
- In-process timers completely bypassed when `TIMERS_DISABLED=true` or `K_SERVICE` is set.
- All 16 test files (178 unit & contract tests) pass cleanly.

---

## 8. Google Cloud Isolated Staging Verification (Task 4 - PASSED)

- **Service**: `writon-app-api-staging`
- **URL**: `https://writon-app-api-staging-802112841589.asia-south1.run.app`
- **Revision**: `writon-app-api-staging-00002-lz7`
- **Staging Database Guard**: Passed (`validateStagingDatabaseTarget` accepts `xrfnebvkazewqramkpri`, rejects `rrxaitxeirykmiihgiqj`).
- **Notification Pipeline Staging**: Passed (`verify-notification-pipeline-staging.mjs`).
- **Engagement Preferences Staging**: Passed (`verify-engagement-preferences-api-staging.mjs`).
- **E2E Smoke Suite**: Passed 100% (`scratch/verify-staging-e2e-suite.mjs`).
  - Account lifecycle with disposable Firebase users A and B
  - Profile reading and editing
  - Draft saving and retrieval from `/api/v1/me/drafts`
  - Story publication and editing
  - Public story discovery
  - Writer follow
  - Applause and bookmarking
  - Comments and nested replies
  - Story deletion (HTTP 204)
  - Account deletion with database cascade and Firebase Auth account purge.

---

## 9. Paused Cloud Scheduler Jobs Provisioned (Task 6 - PASSED)

- **Location**: `asia-south1`
- **Invoker Service Account**: `writon-scheduler-invoker@writon-app-2020.iam.gserviceaccount.com` (`roles/run.invoker`)
- **Headers**: `Content-Type=application/json`, `x-admin-key` retrieved securely from Secret Manager
- **Job Inventory**:
  1. `writon-notification-outbox-drain`: `* * * * *` (Asia/Kolkata) -> `POST /api/v1/internal/notifications/drain-outbox` (deadline: 30s, max-retry: 3, min-backoff: 5s, max-backoff: 60s) - **PAUSED**
  2. `writon-followed-writer-fanout`: `* * * * *` (Asia/Kolkata) -> `POST /api/v1/internal/notifications/fanout-publications` (deadline: 60s, max-retry: 3, min-backoff: 5s, max-backoff: 60s) - **PAUSED**
  3. `writon-daily-digest`: `0 20 * * *` (Asia/Kolkata) -> `POST /api/v1/internal/notifications/daily-digest` (deadline: 300s, max-retry: 3, min-backoff: 5s, max-backoff: 300s) - **PAUSED**
  4. `writon-feed-retention`: `0 3 * * *` (Asia/Kolkata) -> `POST /api/v1/internal/maintenance/feed-retention` (deadline: 120s, max-retry: 3, min-backoff: 5s, max-backoff: 300s) - **PAUSED**
- Verified: All 4 endpoints return 403 on unauthenticated requests, 200 on authenticated requests, and handle empty and populated queues idempotently.

---

## 10. Production-Data Canary Verification (Task 7 - PASSED)

- **Service**: `writon-app-api-canary`
- **URL**: `https://writon-app-api-canary-802112841589.asia-south1.run.app`
- **Revision**: `writon-app-api-canary-00044-8mw`
- **Image Digest**: `asia-south1-docker.pkg.dev/writon-app-2020/writon/writon-api@sha256:ff4ed7d4e0c3d6e1f5d482bb1699773396db2e83711c7c7d5894fa5fb2e33d8c`
- **Database**: Production Supabase `rrxaitxeirykmiihgiqj` via versioned Secret Manager secrets
- **Flags**: `NODE_ENV=production`, `DATABASE_POOL_MAX=5`, `PUSH_DELIVERY_ENABLED=false`, `DAILY_DIGEST_ENABLED=false`, `FOLLOWED_WRITER_NOTIFICATIONS_ENABLED=false`, `SOCIAL_AUTO_PUBLISH_ENABLED=false`, `SPARK_AUTOMATION_ENABLED=false`, `FEED_BEHAVIOR_ROLLOUT_PERCENT=0`, `REVIEW_PROMPT_ENABLED=false`, `TIMERS_DISABLED=true`
- **Automated Verification Suite Passed 100%** (`scratch/verify-canary-e2e-suite.mjs`):
  - `/health`: Status `ok`, database `connected` (252ms)
  - `/api/v1/app/version`: Returns `latestVersionCode=108`, `minSupportedVersionCode=101`
  - `/api/v1/spark/feed`: Loads 5 published stories
  - `/api/v1/me`: Rejects unauthenticated with 401 Unauthorized
  - Firebase Authentication: Full account creation with real Firebase ID token
  - Profile: Reads and updates pen name / bio
  - Story Lifecycle: Created post, retrieved, gave applause (200), bookmarked (200), added comment (201), listed comments (200), deleted post cleanly (HTTP 204)
  - Account Lifecycle: Cascade deleted account via `DELETE /api/v1/me` (HTTP 204), purged credentials
  - Bounded Load: 30 concurrent requests completed in 1466ms (min=174ms, avg=955ms, max=1451ms) with zero 5xx errors

---

## 11. Notification Ownership Transfer & Zero Consumer Overlap (Task 8 - PASSED)

- **Render Workers Disabled**: Render `render.yaml` configured with `PUSH_DELIVERY_ENABLED=false`, `DAILY_DIGEST_ENABLED=false`, `FOLLOWED_WRITER_NOTIFICATIONS_ENABLED=false`, `TIMERS_DISABLED=true`.
- **Outbox Consumer Active**: Cloud Scheduler job `writon-notification-outbox-drain` enabled and executing every minute with valid OIDC invoker credentials and `x-admin-key`.
- **Zero Consumer Overlap Confirmed**:
  - Render worker confirmed idle; no concurrent claims.
  - Outbox transitions: Single state transition per row (`pending` -> `sending` -> `sent`/`skipped`).
  - Followed-writer fanout: `writon-followed-writer-fanout` enabled and executing every minute against `POST /api/v1/internal/notifications/fanout-publications` (status 200 OK).

---

## 12. Final Production Cloud Run Service & Gateway Cutover (Task 9 - PASSED)

- **Production Cloud Run Service**: `writon-app-api`
- **Revision**: `writon-app-api-00001-n7v`
- **Region**: `asia-south1`
- **URL**: `https://writon-app-api-802112841589.asia-south1.run.app`
- **Gateway**: Firebase Hosting site `writon-api-gateway`
- **Target Rewrites** (`firebase.api.json`):
  ```json
  {
    "source": "**",
    "run": {
      "serviceId": "writon-app-api",
      "region": "asia-south1"
    }
  }
  ```
- **Custom Domain**: `https://api.writon.cc` (100% live on Cloud Run)
- **External Public Gateway Verification** (`scratch/verify-canary-e2e-suite.mjs` targeting `https://api.writon.cc`):
  - `/health`: Status `ok`, database `connected` (200 OK)
  - `/api/v1/app/version`: Returns version 108 (200 OK)
  - `/api/v1/spark/feed`: Loads stories (200 OK)
  - `/api/v1/me`: Strictly returns 401 Unauthorized for unauthenticated requests
  - Full end-to-end user lifecycle: User creation, profile update, story publishing, applause, bookmarks, comments, story deletion, and account deletion passed 100%
  - Bounded concurrency: 30 parallel requests across external networks completed with 100% `200 OK` (min=429ms, avg=1390ms, max=2090ms) and zero 5xx errors.

---

## 13. Scheduled Automation & Maintenance Status (Task 10 - PASSED)

| Job Name | Schedule | Target Path | State | Verification Outcome |
|---|---|---|---|---|
| `writon-notification-outbox-drain` | `* * * * *` | `/api/v1/internal/notifications/drain-outbox` | **ENABLED** | 200 OK, bounded drain |
| `writon-followed-writer-fanout` | `* * * * *` | `/api/v1/internal/notifications/fanout-publications` | **ENABLED** | 200 OK, deduplication verified |
| `writon-feed-retention` | `0 3 * * *` | `/api/v1/internal/maintenance/feed-retention` | **ENABLED** | 200 OK, affinity preserved |
| `writon-daily-digest` | `0 20 * * *` | `/api/v1/internal/notifications/daily-digest` | **PAUSED** | Verified safe no-op on empty; paused until physical device validation |
| `writon-bot-publishing-clock` | `*/5 * * * *` | `/api/v1/spark/bot-clock/tick` | **ENABLED** | Controlled bot clock |

---

## 14. Observability & Rollback Readiness (Tasks 11 & 12 - PASSED)

- **Monitoring & Runbook**: Created [`docs/operations/google-cloud-alerts.md`](./google-cloud-alerts.md).
- **Backend Test Suite**: 16 test files, 178 tests passed (100% passing).
- **Render Failover**: Render service `writon-api` (`https://writon-powerup.onrender.com`) kept deployed on hot standby with workers disabled for two Android release cycles.
- **Instant Rollback**: Documented and verified via Firebase gateway target toggle with zero Android client changes.

---

## 15. Physical Device Notification Verification & Lockdown (LOCKED)

**Date & Time Verified:** 2026-09-07T11:41:06+05:30 (06:11:06 UTC)  
**Verification Method:** Real-world physical Android device notification shade inspection + Supabase outbox audit  
**Receiving Account:** `legacy:usr_leg_73`  
**Story Engaged:** *"परीक्षा के दिन"*  

### Evidence:
- **Physical Device Shade:** Real-time push notifications received from WritOn on Android 15:
  - *"Usha Srivastava applauded your... “परीक्षा के दिन”"*
  - *"Usha Srivastava bookmarked your... “परीक्षा के दिन”"*
- **Supabase Production Outbox Delivery Records:**
  - `fc41d64d-abdd-4abe-a539-04e5c3d85cdf` (`status: 'sent'`, delivered at `2026-09-07T06:11:05.634Z`)
  - `983fe938-0bb4-4ece-bf63-86112d4f93d0` (`status: 'sent'`, delivered at `2026-09-07T06:11:06.180Z`)
  - `30413add-e45a-433b-bfc3-fc80fdfc9d04` (`status: 'sent'`, delivered at `2026-09-07T06:11:06.828Z`)
- **Zero-Overlap Isolation:**
  - Render background notification worker is permanently locked off (`PUSH_DELIVERY_ENABLED=false`, `TIMERS_DISABLED=true`).
  - Google Cloud Scheduler job `writon-notification-outbox-drain` in `asia-south1` is locked in as the sole authoritative outbox consumer.
  - Zero duplicate pushes recorded across all 3 deliveries.
- **Lockdown Status:** **100% LOCKED & OPERATIONAL**.




