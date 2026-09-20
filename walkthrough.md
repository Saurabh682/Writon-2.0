# WritOn Brain: System Component Inventory

Prepared to support the **WritOn Brain: Safe Upgrade Execution Plan**. Below is the verified inventory of the current server architecture and components, with validated file paths within the `server/src` structure.

## 1. Story Generation & Intelligence
- **Spark Runner (Primary AI Generator):** `bot-engine/spark-runner.js`
- **Gemini AI Client:** `bot-engine/gemini-spark-client.js`
- **Deep Research Orchestrator:** `bot-engine/deep-research-orchestrator.js`
- **Editorial Intelligence:** `bot-engine/editorial-intelligence-service.js`
- **Editorial Ledger & Memory:** `bot-engine/editorial-ledger-service.js`, `bot-engine/editorial-memory-service.js`

## 2. Release Ingestion & Trends
- **Cloud Trend Sync:** `services/trend-cloud-sync.js`
- **Trend Intelligence Service:** `services/trend-intelligence-service.js`
- **Trend Orchestrator:** `bot-engine/trend-orchestrator.js`
- **App Releases Seeder:** `scripts/seed-app-releases.mjs`

## 3. Weekly Editorial
- **Weekly Runner:** `services/editorial/weekly-runner.js`
- **Weekly Digest Scheduler (Job):** `jobs/weekly-digest-scheduler.js`
- **Week 1 Scorecard Script:** `scripts/report-week1-scorecard.mjs`

## 4. Admin Routes
- **Admin Bots:** `routes/admin-bots.js`
- **Admin Founding Writers:** `routes/admin-founding-writers.js`
- **Admin LinkedIn:** `routes/admin-linkedin.js`
- **Admin Reviews:** `routes/admin-reviews.js`

## 5. Campaign Jobs & Outbound
- **Social Campaign Publisher:** `jobs/social-campaign-publisher.js`
- **Daily Digest Emails:** `jobs/daily-digest.js`
- **Discovery Notifications:** `jobs/discovery-notifications.js`
- **Followed Writer Notifications:** `jobs/followed-writer-notifications.js`

## 6. Schedulers & Orchestration
- **Master Daily Scheduler:** `bot-engine/master-scheduler.js`
- **Weekly Digest Scheduler:** `jobs/weekly-digest-scheduler.js`

## 7. Platform Publisher Services & Syndication
- **Editorial Dispatch Coordinator:** `services/editorial-dispatch-coordinator.js`
- **Story Syndication Service:** `services/editorial/story-syndication-service.js`
- **Social Card Generator:** `services/editorial/social-card-generator.js`
- **Social Poster Wrapper:** `services/editorial/social-poster.js`
- **Instagram Publisher:** `services/editorial/instagram-publisher-service.js`, `services/editorial/instagram-client.js`
- **LinkedIn Publisher:** `services/editorial/linkedin-publisher-service.js`, `services/editorial/linkedin-client.js`
- **X (Twitter) Bot:** `services/x-bot-service.js`
- **Pinterest Client:** `services/editorial/pinterest-client.js`
- **YouTube Client:** `services/editorial/youtube-client.js`
- **Reddit Client:** `services/editorial/reddit-client.js`

## 8. Server Startup Registration
- **Fastify Server Entry & Bootstrap:** `server.js` (registers all routes, configures Firebase Admin, instantiates PostgreSQL Pool, starts `spark-runner`, `master-scheduler`, etc.)

## 9. Notable CLIs & Utility Scripts (`scripts/` directory)
- **Campaign Execution:** `post-x-campaign.mjs`, `publish-daily-fresh-stories.mjs`, `dispatch-eval.mjs`, `publish-day4-fomo.js`, `publish-day5-spotlight.js`
- **Validation & Shadow Testing:** `verify-feed-quality-shadow-production.mjs`, `verify-notification-pipeline-staging.mjs`
- **Data Imports/Syncs:** `run_sept19_ingest.mjs`, `sync-spark-trend-report.mjs`
