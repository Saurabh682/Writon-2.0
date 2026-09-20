# Reddit API & Automation Rules (`rules.md`)

> **Source Reference**: [Reddit API Documentation](https://www.reddit.com/dev/api/?logging_in=true) & [Reddit Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki)

---

## 1. Core Authentication & Identity Rules

### 1.1 OAuth2 Requirement
- **Mandatory OAuth2**: All programmatic API interactions must use OAuth2. Legacy cookie/password-based session login (`/api/login`) is disabled.
- **Base OAuth URLs**:
  - Token endpoint: `https://www.reddit.com/api/v1/access_token`
  - Authenticated API base: `https://oauth.reddit.com`
- **Application Types**:
  - **Script**: For personal/automated background worker scripts, cron tasks, and internal server tools. Requires `client_id`, `client_secret`, Reddit account username, and account password (`grant_type=password`).
  - **Web App**: For public multi-user web applications using standard authorization code flows with redirect URIs (`grant_type=authorization_code`).
  - **Installed App**: For mobile/desktop client apps where secret credentials cannot be stored securely (PKCE).

### 1.2 User-Agent Header Standard
- **Strict Format Requirement**: Reddit strictly monitors and blocks generic User-Agents (e.g. `curl`, `python-requests`, `node-fetch`, or default Axios headers).
- **Mandatory User-Agent Syntax**:
  ```http
  User-Agent: <platform>:<app ID>:<version string> (by /u/<reddit username>)
  ```
  *Example for WritOn:*
  ```http
  User-Agent: web:writon-publisher:v2.0.0 (by /u/writon_official)
  ```
- **Never spoof** standard web browser user-agent strings when calling API endpoints (`https://oauth.reddit.com`).

---

## 2. Rate Limiting & Concurrency Policies

### 2.1 Request Limits
- **OAuth Rate Limit**: Standard OAuth applications receive **60 to 100 requests per minute** per client/account (non-commercial tier allows up to 100 req/min).
- **Burst Prevention**: Do not send parallel requests in unbounded concurrency. Pace requests with a minimum 1-second interval or rely on rate-limiting queues.

### 2.2 Response Headers Inspection
Every HTTP response from Reddit contains rate limit status headers that your client **MUST** inspect and adhere to:
- `X-Ratelimit-Used`: Number of requests made in the current 10-minute window.
- `X-Ratelimit-Remaining`: Number of requests remaining in the current window before throttling begins.
- `X-Ratelimit-Reset`: Number of seconds remaining until the current quota window resets.

### 2.3 HTTP 429 & Backoff Strategy
- When receiving **HTTP 429 Too Many Requests**:
  - Parse the `Retry-After` header or `X-Ratelimit-Reset` seconds.
  - Pause execution for the indicated duration + 1-2 seconds jitter.
  - Never immediately retry on a 429 error without waiting.

---

## 3. Protocol Architecture & Data Conventions

### 3.1 Fullnames (Compact Globally Unique Identifiers)
Reddit resources use **fullnames**—a combination of a 2-character type prefix, an underscore, and the base-36 unique ID:

| Prefix | Resource Type | Example Fullname |
| :--- | :--- | :--- |
| `t1_` | **Comment** | `t1_c0hk549` |
| `t2_` | **Account** | `t2_1w72` |
| `t3_` | **Link / Submission** | `t3_15bfi0` |
| `t4_` | **Message** | `t4_a1b2c` |
| `t5_` | **Subreddit** | `t5_2s30g` |
| `t6_` | **Award** | `t6_xyz12` |

- When an endpoint accepts an item target (e.g. `/api/vote`, `/api/save`, `/api/comment`), pass the `id` as the complete fullname (e.g. `id=t3_15bfi0`).

### 3.2 Listings Pagination Protocol
Endpoints returning feeds or lists (`/hot`, `/new`, `/top`, `/user/{user}/submitted`, `/r/{subreddit}/about/rules`) use the **Listings Protocol** rather than page numbers:
- `after`: Fullname of the last item in the previous batch (anchor for the next page).
- `before`: Fullname of the first item in the current batch (anchor for the previous page).
- `limit`: Maximum number of items to return in a slice (default: 25, maximum: 100).
- `count`: Number of items already seen across previous slices (used to calculate correct pagination UI markers).
- `show`: Pass `all` to disable user preference filters (such as "hide links I have voted on").

**Pagination Rule:**
Fetch initial request without `after` or `count`. Read `data.after` from response JSON. If non-null, supply `after` and increment `count += slice.length` on the subsequent request until `data.after` is `null`.

### 3.3 Response Body HTML Encoding (`raw_json=1`)
- **Default Legacy Behavior**: Reddit encodes `<`, `>`, and `&` as `&lt;`, `&gt;`, and `&amp;` in JSON responses.
- **Mandatory Parameter**: Always append `raw_json=1` query parameter to GET/POST requests to receive unescaped JSON strings:
  ```http
  GET https://oauth.reddit.com/r/writing/hot?raw_json=1
  ```

### 3.4 Modhashes & CSRF
- A `modhash` is a CSRF mitigation token returned by `/api/me.json`.
- **OAuth Exemption**: Modhashes are **not required** when authenticated with OAuth2 (`Bearer <token>`). If using session auth (legacy), provide `X-Modhash` header.

---

## 4. Automation & Bot Publishing Rules

### 4.1 Automated Content Submissions (`POST /api/submit`)
When automating post submissions:
- **Subreddit Rules Compliance**: Always fetch and obey subreddit rules (`GET /r/{subreddit}/about/rules`) and post requirements (`GET /api/v1/{subreddit}/post_requirements`) before submitting.
- **Parameters**:
  - `sr`: Name of subreddit (without `/r/` prefix).
  - `kind`: `self` (text post), `link` (URL), `image`, or `video`.
  - `title`: Clean, non-clickbait post title (max 300 characters).
  - `text`: Markdown-formatted body for text posts.
  - `resubmit`: Boolean (`true` allows re-submitting links already posted).
  - `sendreplies`: Set to `true` or `false` depending on whether inbox notifications are desired.
- **Flair Compliance**: If a subreddit mandates flairs, retrieve options via `GET /api/link_flair_v2` and include `flair_id` in the submit payload.

### 4.2 Content Integrity, Anti-Spam & Reddit Sentinel Guardrails
- **Reddit Sentinel Automated Spam Detection**: Reddit enforces automated heuristics ("Sentinel") that flag and shadowban accounts or subreddits without human moderator review. Key automated triggers that MUST be strictly avoided:
  1. **New Account Outbound Link Quarantine**: Brand-new accounts (under 30 days old or with < 100 organic comment karma) posting outbound links to a single domain are immediately flagged as automated link-farming/SEO spammers.
  2. **Single-Domain Subreddit Flagging**: Creating a new subreddit (e.g. `r/writon`) and populating it primarily or exclusively with outbound links to a single website (`writon.cc`) triggers automated subreddit banning and moderator account suspension.
  3. **The 9:1 Self-Promotion Policy**: Strictly adhere to Reddit's 9:1 guideline: at least **9 genuine, non-promotional text contributions or comments** across established subreddits for every **1 post containing a self-referential link**.
  4. **Self-Contained Value Rule (Zero Teasers)**: Reddit communities strongly penalize "teaser" posts that cut off text to force an off-platform click. Posts must provide 100% complete craft value, complete arguments, full comparisons, and full data directly within the Reddit markdown post body.
  5. **Link Placement Protocol**: Do not include raw marketing or vanity links in post bodies on unestablished subreddits. If a user in the comments asks where to read more or asks for a tool, reply in the comment thread with the link.
- **Direct Statement Rule**: Content posted on behalf of WritOn must adhere to the project's non-mannered prose guidelines: clear, literal, craft-focused, and respectful of community norms.
- **Transparency**: Clearly disclose bot or automated status in user profiles or post footers where appropriate.
- **No Vote Manipulation**: Never automate upvoting, downvoting rings, or coordinate artificial cross-account engagements (`POST /api/vote` must only reflect genuine user action).

### 4.3 Official Reddit Appeal Protocol (`reddit.com/appeal`)
If an account or community is flagged by automated spam filters:
- **Strict 250-Character Description Limit**: The Reddit Appeal form description field enforces a **hard maximum limit of 250 characters**. Longer submissions are rejected or truncated by the browser.
- **Appeal Tone & Structure**:
  - Keep tone humble, concise, and professional.
  - State human/indie identity clearly.
  - Acknowledge accidental misunderstanding of outbound link or self-promotion policies.
  - Express commitment to follow all community rules.
- **Standard 238-Character Reinstatement Template**:
  ```text
  Hi Reddit Team. I am the founder of WritOn, an indie writing app. I misunderstood the self-promotion guidelines regarding outbound links in our new community r/writon. It was genuine, not spam. Please review and restore our human account.
  ```
- **Review SLA**: Appeals are routed to human Reddit Trust & Safety personnel and typically take 24–72 hours for determination. Do not submit duplicate appeals while one is pending.

---

## 5. Standard Scopes Matrix

When requesting OAuth tokens for automation, only request the minimum required scopes:

| Scope | Purpose | Typical Automation Use Case |
| :--- | :--- | :--- |
| `identity` | Basic account info (`/api/v1/me`) | Verifying authentication credentials & username |
| `submit` | Post submissions & comments | Publishing daily writing prompts, craft articles, stories |
| `read` | Read posts, comments, and listings | Trend scouting, monitoring mentions, research |
| `history` | Inspect user history | Checking past submissions for idempotency |
| `flair` | Manage & select post flairs | Adding necessary tags to subreddits that enforce flair |
| `mysubreddits` | List joined subreddits | Discovering target writing communities |

---

## 6. Implementation Checklist for WritOn Engine

- [ ] Store Reddit credentials in `.env` (`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USERNAME`, `REDDIT_PASSWORD`, `REDDIT_USER_AGENT`).
- [ ] Ensure `User-Agent` follows `platform:app_id:version (by /u/username)`.
- [ ] Append `raw_json=1` on all API queries.
- [ ] Implement rate-limit tracking via `X-Ratelimit-*` headers.
- [ ] Implement idempotency checks before submission to avoid duplicate posts.
- [ ] Respect subreddit specific flairs and submission rules.
