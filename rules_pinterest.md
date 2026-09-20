# Pinterest API & Automation Rules (`rules_pinterest.md`)

> **Source Reference**: [Pinterest Developer Platform](https://developers.pinterest.com/docs/api/v5/) & [Pinterest API v5 Documentation](https://developers.pinterest.com/docs/api/v5/)

---

## 1. Core Authentication & Identity Rules

### 1.1 OAuth2 Architecture
- **Mandatory OAuth2 v5**: All programmatic interactions must use OAuth2 Bearer authentication against `https://api.pinterest.com/v5`.
- **Base API URLs**:
  - Token endpoint: `https://api.pinterest.com/v5/oauth/token`
  - Authenticated API base: `https://api.pinterest.com/v5`
- **Supported Credential Schemes**:
  1. **Direct Access Token**: Static Bearer token generated from the developer portal for single-account brand automation (`PINTEREST_ACCESS_TOKEN`).
  2. **Refresh Token Flow**: Exchangeable via `grant_type=refresh_token` with HTTP Basic Authorization header (`base64(app_id:app_secret)`).

### 1.2 Required Permissions & Scopes
Every token used by WritOn's autonomous engine must declare the following scopes:
- `user_accounts:read` — Verify profile identity and audience metadata.
- `boards:read` — Discover existing boards, privacy status, and board IDs.
- `boards:write` — Create dedicated boards (e.g. "Writing Craft & Prompts", "Literary Quotes").
- `pins:read` — Retrieve Pin metadata and status.
- `pins:write` — Publish new image and carousel Pins.

---

## 2. Rate Limiting & Concurrency Policies

### 2.1 Request Budgets
- **Standard Quota**: 1,000 requests per minute per application.
- **Burst Prevention**: Concurrency must be serialized with minimum 250ms spacing between Pin creation requests.

### 2.2 Response Headers Inspection
Every response from Pinterest v5 provides rate-limiting tracking headers:
- `X-RateLimit-Limit`: Maximum allowable requests in the current window.
- `X-RateLimit-Remaining`: Number of requests remaining.
- `X-RateLimit-Reset`: Unix timestamp or seconds until current bucket resets.

### 2.3 HTTP 429 & Backoff Strategy
- Upon encountering **HTTP 429 Too Many Requests**:
  - Inspect `Retry-After` header. If absent, compute backoff from `X-RateLimit-Reset` or default to exponential backoff (2s, 4s, 8s).
  - Sleep for indicated duration + 1s jitter.
  - Retry up to 3 times before raising a structured error.

---

## 3. Content Specifications & Media Standards

### 3.1 Creative Asset Formatting
- **Standard Pin Aspect Ratio**: 2:3 vertical format (1000×1500 or 1080×1620) or standard Instagram portrait (1080×1350).
- **Supported Media Sources**:
  - `image_url`: Publicly hosted image URL.
  - `image_base64`: Direct Base64 encoded payload with `content_type: image/png` or `image/jpeg`.
- **Aesthetic Standard (WritOn Watercolor Aesthetic)**:
  - Base canvas: Warm Ivory Parchment (`#FAF5EE`).
  - Corner watercolor blooms: Terracotta (`#D45226`).
  - Strict policy: Zero obsidian dark cards.

### 3.2 Field Length Ceilings & Copywriting Governance
- **Title**: Maximum **100 characters**. Pinterest truncates longer titles in search cards.
- **Description**: Maximum **800 characters**. Must contain natural craft keywords for SEO discovery.
- **Alt Text**: Maximum **500 characters** for accessibility (WCAG AA).
- **Destination Link**: Canonical link back to `https://writon.cc` or delivery shortlink (`https://writon.cc/go/{delivery_id}`).

---

## 4. Error Handling & Resilience Contracts

1. **HTTP 401 Unauthorized**: Invalidate cached token immediately, request fresh token via refresh grant, and retry once.
2. **HTTP 403 Forbidden**: Log permission scope deficiency without infinite retries.
3. **HTTP 400 Bad Request**: Surface specific Pinterest validation error code and field errors.
