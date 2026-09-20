# Pinterest API v5 Endpoints Reference (`pinterest_api_reference.md`)

> **Comprehensive API Directory & Schema Guide**  
> **Base API URL**: `https://api.pinterest.com/v5`  
> **Token Endpoint**: `https://api.pinterest.com/v5/oauth/token`  
> **Source**: [Pinterest API v5 Documentation](https://developers.pinterest.com/docs/api/v5/)

---

## Quick Navigation by Category
1. [Authentication & Tokens](#1-authentication--tokens)
2. [User Account](#2-user-account)
3. [Boards](#3-boards)
4. [Pins](#4-pins)
5. [Analytics](#5-analytics)
6. [Search](#6-search)

---

## 1. Authentication & Tokens

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/v5/oauth/token` | `POST` | None (Basic Auth) | Exchanges authorization code or refresh token. Headers: `Authorization: Basic base64(app_id:app_secret)`. Body params: `grant_type=refresh_token`, `refresh_token=...`. Returns `access_token`, `token_type`, `expires_in`, `scope`. |

---

## 2. User Account

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/v5/user_account` | `GET` | `user_accounts:read` | Returns the authenticated user's profile: `account_type`, `profile_image`, `website_url`, `username`, `about`. |
| `/v5/user_account/analytics` | `GET` | `user_accounts:read` | Fetch account-level analytics. Query params: `start_date`, `end_date`, `metric_types`, `split_by`. |

---

## 3. Boards

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/v5/boards` | `GET` | `boards:read` | Retrieves list of boards. Query params: `page_size` (1-250), `bookmark` (pagination). Returns array of board objects (`id`, `name`, `description`, `privacy`). |
| `/v5/boards` | `POST` | `boards:write` | Creates a new board. JSON body: `name` (required, max 50 chars), `description` (max 500 chars), `privacy` (`PUBLIC` or `PROTECTED`). |
| `/v5/boards/{board_id}` | `GET` | `boards:read` | Get specific board details by `board_id`. |
| `/v5/boards/{board_id}` | `PATCH` | `boards:write` | Update board name, description, or privacy settings. |
| `/v5/boards/{board_id}` | `DELETE` | `boards:write` | Permanently removes a board. |
| `/v5/boards/{board_id}/pins` | `GET` | `boards:read`, `pins:read` | List all Pins on a specific board. Query params: `page_size`, `bookmark`. |

---

## 4. Pins

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/v5/pins` | `POST` | `pins:write`, `boards:read` | **Creates a new Pin**. JSON body:<br>• `board_id` (required): target board ID<br>• `title`: string (max 100 chars)<br>• `description`: string (max 800 chars)<br>• `link`: destination URL (e.g. `https://writon.cc`)<br>• `alt_text`: accessibility text (max 500 chars)<br>• `media_source`: object with `source_type` (`image_url` or `image_base64`) |
| `/v5/pins/{pin_id}` | `GET` | `pins:read` | Retrieve Pin details: `id`, `title`, `description`, `link`, `board_id`, `media`, `created_at`. |
| `/v5/pins/{pin_id}` | `PATCH` | `pins:write` | Update Pin title, description, board, or link. |
| `/v5/pins/{pin_id}` | `DELETE` | `pins:write` | Deletes a Pin permanently. |

### Pin Creation Media Payload Schemas

#### Schema A: Public Image URL
```json
{
  "board_id": "123456789012345",
  "title": "Three Ways to Begin a Story",
  "description": "Start with a concrete action, an unexpected question, or a sensory detail. Discover deep craft insights on WritOn.",
  "link": "https://writon.cc",
  "alt_text": "Warm Ivory parchment card with calligraphy typography and botanical illustration",
  "media_source": {
    "source_type": "image_url",
    "url": "https://writon.cc/assets/cards/day-7-morning.png"
  }
}
```

#### Schema B: Local File Base64 Encoded (Native Zero-Dependency)
```json
{
  "board_id": "123456789012345",
  "title": "Crafting Narrative Tension",
  "description": "A direct exploration of pacing and character focus. #writon #writingcommunity",
  "link": "https://writon.cc",
  "alt_text": "WritOn literary craft card in warm watercolor style",
  "media_source": {
    "source_type": "image_base64",
    "content_type": "image/png",
    "data": "iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

---

## 5. Analytics

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/v5/pins/{pin_id}/analytics` | `GET` | `pins:read` | Pin-level engagement metrics. Query params:<br>• `start_date`: YYYY-MM-DD<br>• `end_date`: YYYY-MM-DD<br>• `metric_types`: comma-separated (`IMPRESSION`, `SAVE`, `PIN_CLICK`, `OUTBOUND_CLICK`)<br>Returns metric counts keyed by type. |

---

## 6. Search

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/v5/search/partner/pins` | `GET` | `pins:read` | Search organic partner pins by keyword query. Query params: `term_query`, `country_code`, `bookmark`, `locale`. |
