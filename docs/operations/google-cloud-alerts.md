# Google Cloud Monitoring, Alerting & Incident Response Runbook

**Service Target:** `writon-app-api` (`asia-south1`)  
**Gateway Target:** `https://api.writon.cc` (Firebase Hosting: `writon-api-gateway`)  
**Database:** Production Supabase (`rrxaitxeirykmiihgiqj`)  
**Project:** `writon-app-2020`  

---

## 1. Metric Dashboards & Observability Layout

### A. HTTP & Application Runtime
- **Request Volume & Error Rates**: Monitored via Cloud Run metric `run.googleapis.com/request_count`.
  - Grouped by response code class (`2xx`, `4xx`, `5xx`).
  - Alert trigger: Sustained error rate (`5xx` rate > 2% over 5-minute rolling window) rather than paging on isolated single errors.
- **Latency Distribution**: Monitored via `run.googleapis.com/request_latencies`.
  - Target SLOs: p50 < 250ms, p95 < 800ms, p99 < 2000ms.
- **Container Sizing & Concurrency**:
  - Container instances: `run.googleapis.com/container/instance_count` (min: 0, max: 5).
  - CPU utilization: Target < 70%, alert threshold > 85%.
  - Memory utilization: Target < 65% of 512 MiB, alert threshold > 80%.
  - Execution timeout: 60s hard ceiling.
- **Database Connection Pool**:
  - Max pool per container: 10 connections.
  - Hard cluster ceiling: Managed by Supabase transaction/session pooler.
  - Alert condition: Pool exhaustion or acquisition timeout in application logs.

### B. Notification & Outbox Observability
- **Outbox Queue Depth**:
  - Tracked via periodic query and Cloud Logging structured events:
    - `pending`: Target < 25.
    - `sending`: Transient rows currently claimed with lease.
    - `sent`: Accumulated successfully delivered rows.
    - `skipped`: Explicitly skipped rows (e.g. muted preferences, invalid tokens, deleted stories).
- **Outbox Age**: Alert if oldest `pending` row age exceeds 15 minutes during normal operating hours.
- **Scheduler Worker Telemetry**:
  - Monitored via `cloud_scheduler_job` log filter:
    `resource.type="cloud_scheduler_job" AND jsonPayload.status.code!=0`
  - Jobs:
    1. `writon-notification-outbox-drain` (every 1 min)
    2. `writon-followed-writer-fanout` (every 1 min)
    3. `writon-daily-digest` (daily at 20:00 IST)
    4. `writon-feed-retention` (daily at 03:00 IST)
- **Token Health & Privacy**:
  - Revocations per day recorded in audit logs.
  - Zero PII / raw token logging rule strictly enforced.

---

## 2. Severity Tiers & Paging Rules

| Tier | Severity | Criteria | Notification Target | SLA |
|---|---|---|---|---|
| **P1** | Critical | Sustained 5xx > 5% for 3m, Database unavailable, Outbox age > 30m, Security/Auth bypass | Immediate on-call pager / Telegram webhook | < 15 min response |
| **P2** | High | p95 latency > 1500ms for 10m, Scheduler 3+ consecutive failures, Outbox depth > 100 | Operations channel / Discord webhook | < 1 hour response |
| **P3** | Moderate | Memory > 80%, abnormal invalid token surge, cold start surge | Daily digest report / GitHub Issue | Next business day |

---

## 3. Capacity Caps & Budget Controls

1. **Max Instance Guardrails**:
   - Production (`writon-app-api`): Capped at `--max-instances=5`.
   - Canary (`writon-app-api-canary`): Capped at `--max-instances=3`.
   - Staging (`writon-app-api-staging`): Capped at `--max-instances=1`.
2. **Concurrency**: Set to 80 concurrent requests per container for high-throughput I/O-bound efficiency.
3. **Budget Alerts**:
   - Monthly budget cap defined in Google Cloud Billing.
   - Notifications configured at 50%, 80%, and 100% of forecast threshold.

---

## 4. Operational Incident Runbooks

### Runbook A: Outbox Drain Stalled
1. Check Cloud Scheduler execution status:
   ```bash
   gcloud scheduler jobs describe writon-notification-outbox-drain --location=asia-south1 --project=writon-app-2020
   ```
2. Check Cloud Logging for `drain-outbox` errors:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND textPayload:*drain-outbox*" --limit=20 --project=writon-app-2020
   ```
3. Manually trigger a test drain:
   ```bash
   gcloud scheduler jobs run writon-notification-outbox-drain --location=asia-south1 --project=writon-app-2020
   ```

### Runbook B: Database Connection Saturation
1. Check active pool connections from Cloud Logging.
2. If pool connections are saturated due to container scaling, temporarily reduce max-instances:
   ```bash
   gcloud run services update writon-app-api --max-instances=3 --region=asia-south1 --project=writon-app-2020
   ```
3. Confirm Supabase pooler health in Supabase dashboard.

### Runbook C: Emergency Instant Rollback
If a regression occurs on `writon-app-api`:
1. **Option 1 (Rollback to Canary Revision)**:
   Update `firebase.api.json` to point rewrite to `writon-app-api-canary` and deploy:
   ```bash
   npx --yes firebase-tools@latest deploy --only hosting:writon-api-gateway --config firebase.api.json --project writon-app-2020
   ```
2. **Option 2 (Rollback to Render Standby)**:
   Pause Google Cloud Scheduler workers to prevent double processing:
   ```bash
   gcloud scheduler jobs pause writon-notification-outbox-drain --location=asia-south1 --project=writon-app-2020
   ```
   Update DNS or reverse-proxy rewrite to point `api.writon.cc` to `https://writon-powerup.onrender.com`.
