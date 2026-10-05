# WritOn 2.0

WritOn is an Android-first editorial publishing app. The active production path is a Kotlin/Jetpack Compose client backed by a Fastify API and Supabase Postgres.

- **Primary Working Repository (Origin)**: [`Saurabh682/WritOn-PowerUp`](https://github.com/Saurabh682/WritOn-PowerUp.git)
- **Upstream Repository**: [`Saurabh682/Writon-2.0`](https://github.com/Saurabh682/Writon-2.0.git)
- **Active Working Branch**: `Till_29Aug` *(synchronized with `production` and `main`)*

## Active architecture


```mermaid
flowchart LR
  Android[Android app\nCompose + Room] -->|Firebase ID token| API[Fastify API]
  Android -->|offline mutations| Room[Room outbox + WorkManager]
  Room -->|retry when online| API
  API -->|service credentials| Firebase[Firebase Admin]
  API --> Postgres[Supabase Postgres]
```

- Active server entry point: `server/src/server.js`
- Active database: Supabase Postgres
- Authentication: Firebase Authentication ID tokens verified by Firebase Admin
- Offline writes: Room outbox retried by WorkManager

`server/src/index.ts`, `server/src/routes/`, and the SQLite/Drizzle files are legacy code retained for migration reference. They are not the deployment entry point.

## Run the API locally

```powershell
cd server
Copy-Item .env.example .env
npm install
npm run dev
Invoke-RestMethod http://localhost:3001/health
```

Set these values in `server/.env` locally, or in your host's encrypted environment-variable settings when deploying:

- `DATABASE_URL` — Supabase Postgres connection string
- `FIREBASE_SERVICE_ACCOUNT_JSON` — one-line Firebase service-account JSON
- `CORS_ORIGINS` — comma-separated HTTPS origins in production

Never commit `.env`, Firebase JSON, a database URL, or Android signing keys.

## Production API on Google Cloud

Production clients use the stable API domain `https://api.writon.cc/`, routed to the Fastify service on Cloud Run in `asia-south1`. Keep public routes under `/api/v1` backward compatible; the custom domain keeps Android builds independent of Cloud Run revision hostnames.

Cloud Run receives secrets through Secret Manager and uses its Google service identity for Firebase Admin. Scheduled background work is dispatched through Cloud Scheduler. Keep request-serving and worker service settings explicit, especially `SPARK_AUTOMATION_ENABLED` and `PUSH_DELIVERY_ENABLED`.

See `docs/deployment/cloud-run-migration.md` for the current deployment, operations, and verification record.

## Android API configuration

Copy `gradle.properties.example` to either the project `gradle.properties` or your user Gradle properties, then set the appropriate endpoint:

```properties
# Emulator debug build
WRITON_DEBUG_API_BASE_URL=http://10.0.2.2:3001/

# Physical device debug build (your computer's LAN address)
# WRITON_DEBUG_API_BASE_URL=http://192.168.x.x:3001/

# Release builds must use a real HTTPS API host.
WRITON_RELEASE_API_BASE_URL=https://api.your-domain.example/
```

Debug permits HTTP for local development. Release builds permit HTTPS only and redact authorization tokens from logs.

## Android release signing

Copy `keystore.properties.example` to the ignored `keystore.properties` and provide a newly generated upload key. The former tracked upload key has been removed from Git tracking; rotate it in Google Play Console before any production release.

## API surface

| Method | Endpoint | Requires a Firebase token |
| --- | --- | --- |
| `GET` | `/health` | No |
| `GET`, `PUT` | `/api/v1/me` | Yes |
| `GET`, `POST` | `/api/v1/posts` | GET no, POST yes |
| `GET` | `/api/v1/posts/:idOrSlug` | No |
| `POST` | `/api/v1/posts/:id/like` | Yes |
| `POST` | `/api/v1/posts/:id/bookmark` | Yes |
| `GET`, `POST` | `/api/v1/comments/:postId` | GET no, POST yes |
| `GET` | `/api/v1/users/:idOrPenName` | No |
| `POST` | `/api/v1/users/:id/follow` | Yes |

## Verification

```powershell
cd server
npm run build
npm test                 # Fastify API contract tests
npm run test:legacy      # optional Hono/SQLite migration-reference tests
Invoke-RestMethod http://localhost:3001/health
```

Add broader authenticated Fastify integration coverage before a public release.

## Key Features & Capabilities (v2.0.0)

- **Internationalization (i18n)**: In-app language switching with support for English, Hindi (हिन्दी), Spanish (Español), French (Français), Bengali (বাংলা), and Marathi (मराठी).
- **Biometric Security**: Native Fingerprint & Face ID App Lock protection.
- **Modern Jetpack Compose UI**: Dynamic `MaterialTheme` color palette across Paper, Sepia, Dark Obsidian, and System themes.
- **Offline-First Reading & Writing**: Room database caching with WorkManager outbox background sync.
- **Illustrated Editorial Covers**: Automatic rendering of vintage illustrated book covers for stories.
- **Google Search & SEO Architecture**: Dual sitemap & real-time RSS 2.0 ingestion, Google Search favicon compliance, and Schema.org rich snippets ([`docs/GOOGLE_SEARCH_AND_SEO_PLAYBOOK.md`](docs/GOOGLE_SEARCH_AND_SEO_PLAYBOOK.md)).
- **Google Play Compliance**: Full compliance with Child Safety Standards ([`CHILD_SAFETY_STANDARDS.md`](CHILD_SAFETY_STANDARDS.md)) and Data Safety Account Deletion policies ([`ACCOUNT_DELETION.md`](ACCOUNT_DELETION.md)).

For a detailed history of all changes, see [`CHANGELOG.md`](CHANGELOG.md).

