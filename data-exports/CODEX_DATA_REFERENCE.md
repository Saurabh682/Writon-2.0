# WritOn Data Tables Reference for Codex

This document describes all data tables, schemas, relations, and sample data for the **WritOn 2.0** application database.

- **Export Timestamp**: `2026-08-21T03:29:37.205Z`
- **Total Tables**: `6`
- **Formats Available**:
  - `json/<tableName>.json` - Raw data in JSON array
  - `csv/<tableName>.csv` - Comma-separated values
  - `schema.sql` - DDL statements for all tables
  - `dump.sql` - Complete SQLite dump with schema + all insert statements
  - `tables_summary.json` - Machine-readable metadata schema

---

## 1. Table Summary

| Table | Columns | Row Count | Description |
| :--- | :--- | :--- | :--- |
| `bookmarks` | 4 | 440 | Core bookmarks data entity |
| `comments` | 6 | 804 | Core comments data entity |
| `follows` | 4 | 550 | Core follows data entity |
| `likes` | 4 | 6 | Core likes data entity |
| `posts` | 16 | 630 | Core posts data entity |
| `users` | 12 | 3946 | Core users data entity |

---

## 2. Table Specifications

### `bookmarks`

**Row Count**: 440

#### Columns

| Column | Type | Nullable | Primary Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | YES | YES | `null` |
| `user_id` | `TEXT` | NO | NO | `null` |
| `post_id` | `TEXT` | NO | NO | `null` |
| `created_at` | `TEXT` | NO | NO | `CURRENT_TIMESTAMP` |

#### DDL Schema
```sql
CREATE TABLE bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
  );
```

#### Sample Row(s)
```json
[
  {
    "id": "bm_001",
    "user_id": "usr_elena_vance",
    "post_id": "post_001",
    "created_at": "2026-08-14 20:59:43"
  },
  {
    "id": "bm_jjWZDPf5wIa4",
    "user_id": "usr_maya_lin",
    "post_id": "post_UG0XBzSaLed0",
    "created_at": "2026-08-14 20:59:59"
  }
]
```

### `comments`

**Row Count**: 804

#### Columns

| Column | Type | Nullable | Primary Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | YES | YES | `null` |
| `post_id` | `TEXT` | NO | NO | `null` |
| `author_id` | `TEXT` | NO | NO | `null` |
| `parent_id` | `TEXT` | YES | NO | `null` |
| `content` | `TEXT` | NO | NO | `null` |
| `created_at` | `TEXT` | NO | NO | `CURRENT_TIMESTAMP` |

#### DDL Schema
```sql
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id TEXT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
```

#### Sample Row(s)
```json
[
  {
    "id": "cmt_001",
    "post_id": "post_001",
    "author_id": "usr_elena_vance",
    "parent_id": null,
    "content": "The point about acoustic damping and cognitive bandwidth resonates deeply with our lab’s neurological findings on cortisol levels in open-plan architecture.",
    "created_at": "2026-08-14 20:59:43"
  },
  {
    "id": "cmt_002",
    "post_id": "post_001",
    "author_id": "usr_maya_lin",
    "parent_id": "cmt_001",
    "content": "Thank you Elena! I would love to read more about your lab measurements on natural timber environments.",
    "created_at": "2026-08-14 20:59:43"
  }
]
```

### `follows`

**Row Count**: 550

#### Columns

| Column | Type | Nullable | Primary Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | YES | YES | `null` |
| `follower_id` | `TEXT` | NO | NO | `null` |
| `following_id` | `TEXT` | NO | NO | `null` |
| `created_at` | `TEXT` | NO | NO | `CURRENT_TIMESTAMP` |

#### DDL Schema
```sql
CREATE TABLE follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
  );
```

#### Sample Row(s)
```json
[
  {
    "id": "flw_001",
    "follower_id": "usr_maya_lin",
    "following_id": "usr_elena_vance",
    "created_at": "2026-08-14 20:59:43"
  },
  {
    "id": "flw_002",
    "follower_id": "usr_julian_ross",
    "following_id": "usr_maya_lin",
    "created_at": "2026-08-14 20:59:43"
  }
]
```

### `likes`

**Row Count**: 6

#### Columns

| Column | Type | Nullable | Primary Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | YES | YES | `null` |
| `user_id` | `TEXT` | NO | NO | `null` |
| `post_id` | `TEXT` | NO | NO | `null` |
| `created_at` | `TEXT` | NO | NO | `CURRENT_TIMESTAMP` |

#### DDL Schema
```sql
CREATE TABLE likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
  );
```

#### Sample Row(s)
```json
[
  {
    "id": "lk_001",
    "user_id": "usr_elena_vance",
    "post_id": "post_001",
    "created_at": "2026-08-14 20:59:43"
  },
  {
    "id": "like_PiGr7kpKiquH",
    "user_id": "usr_maya_lin",
    "post_id": "post_UG0XBzSaLed0",
    "created_at": "2026-08-14 20:59:59"
  }
]
```

### `posts`

**Row Count**: 630

#### Columns

| Column | Type | Nullable | Primary Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | YES | YES | `null` |
| `author_id` | `TEXT` | NO | NO | `null` |
| `title` | `TEXT` | NO | NO | `null` |
| `slug` | `TEXT` | NO | NO | `null` |
| `summary` | `TEXT` | YES | NO | `null` |
| `content` | `TEXT` | NO | NO | `null` |
| `category` | `TEXT` | NO | NO | `'Essays'` |
| `cover_image` | `TEXT` | YES | NO | `null` |
| `reading_time_min` | `INTEGER` | NO | NO | `3` |
| `likes_cnt` | `INTEGER` | NO | NO | `0` |
| `comments_cnt` | `INTEGER` | NO | NO | `0` |
| `bookmarks_cnt` | `INTEGER` | NO | NO | `0` |
| `is_published` | `INTEGER` | NO | NO | `1` |
| `published_at` | `TEXT` | YES | NO | `CURRENT_TIMESTAMP` |
| `created_at` | `TEXT` | NO | NO | `CURRENT_TIMESTAMP` |
| `updated_at` | `TEXT` | NO | NO | `CURRENT_TIMESTAMP` |

#### DDL Schema
```sql
CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Essays',
    cover_image TEXT,
    reading_time_min INTEGER NOT NULL DEFAULT 3,
    likes_cnt INTEGER NOT NULL DEFAULT 0,
    comments_cnt INTEGER NOT NULL DEFAULT 0,
    bookmarks_cnt INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    published_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
```

#### Sample Row(s)
```json
[
  {
    "id": "post_001",
    "author_id": "usr_maya_lin",
    "title": "The Architecture of Solitude: Designing Spaces for Thought in a Hyper-Connected World",
    "slug": "the-architecture-of-solitude-designing-spaces-for-thought",
    "summary": "Why modern architectural density fails the human psyche, and how intentional spatial acoustics can restore deep contemplative focus.",
    "content": "## The Disappearance of Quietude\n\nWe live in an era characterized not merely by technological saturation, but by an acoustic and visual claustrophobia. The modern cityscape, engineered for commerce and throughput, leaves little room for the sacred pause. \n\nWhen we examine the monasteries of 12th-century Europe or the traditional *machiya* courtyards of Kyoto, we observe a shared architectural intuition: **space must breathe so the mind may listen.**\n\n### Spatial Echoes and Cognitive Bandwidth\n\nCognitive load theory reveals that visual clutter generates ambient micro-decisions. Every open door, flashing billboard, and glass partition invites subconscious appraisal. \n\n> \"We shape our buildings; thereafter, our buildings shape us.\" — Winston Churchill\n\nTo reclaim deep creative focus, we must design environments with deliberate acoustic buffers and tactile materials:\n\n1. **Mass Timber & Raw Clay**: Natural damping coefficients that absorb harsh high-frequency noise.\n2. **Threshold Sequences**: Transition zones (*genkan*) between chaotic public spaces and sanctuary chambers.\n3. **Indirect Natural Illumination**: Diffused skylights that mark the passage of the sun without glare.\n\nWhen our surroundings honor silence, our internal narrative finally discovers its true register.",
    "category": "Essays",
    "cover_image": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
    "reading_time_min": 5,
    "likes_cnt": 1,
    "comments_cnt": 2,
    "bookmarks_cnt": 1,
    "is_published": 1,
    "published_at": "2026-08-14 20:59:43",
    "created_at": "2026-08-14 20:59:43",
    "updated_at": "2026-08-14 20:59:43"
  },
  {
    "id": "post_002",
    "author_id": "usr_elena_vance",
    "title": "Beyond the Token Window: What Small Local Models Teach Us About Human Memory",
    "slug": "beyond-the-token-window-small-local-models-human-memory",
    "summary": "How running 2B parameter neural networks on edge devices reveals surprising parallels to human cognitive heuristics and biological memory compression.",
    "content": "## The Myth of Infinite Context\n\nThe machine learning industry has spent years chasing ever-expanding context windows — 128k, 1M, 10M tokens. Yet the human working memory operates under fierce physical constraints: Miller’s magical number seven (plus or minus two).\n\nWhen we deploy quantized **Gemma-2B** or **SmolLM** on modern consumer chips, we witness a fascinating phenomenon: aggressive quantization forces structural distillation.\n\n### On-Device Inference as a Philosophical Constraint\n\nRunning local inference is not just an engineering optimization to avoid cloud API billing; it is a profound paradigm shift:\n\n```typescript\n// Zero cloud footprint on-device token pipeline\nconst engine = await CreateMLCEngine(\"gemma-2b-it-q4f16_1\");\nconst summary = await engine.chat.completions.create({\n  messages: [{ role: \"user\", content: \"Distill the core premise in 3 bullets.\" }]\n});\n```\n\n### Key Takeaways for Builders\n\n- **Zero-Latency Privacy**: Your words never leave your local RAM.\n- **Graceful Heuristics**: Compact models generalize patterns rather than brute-forcing encyclopedic recall.\n- **Energy Alignment**: Processing 40 tokens per second on 5 watts reflects the energy budget of biological brains.",
    "category": "Tech",
    "cover_image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
    "reading_time_min": 6,
    "likes_cnt": 0,
    "comments_cnt": 1,
    "bookmarks_cnt": 0,
    "is_published": 1,
    "published_at": "2026-08-14 20:59:43",
    "created_at": "2026-08-14 20:59:43",
    "updated_at": "2026-08-14 20:59:43"
  }
]
```

### `users`

**Row Count**: 3946

#### Columns

| Column | Type | Nullable | Primary Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | YES | YES | `null` |
| `pen_name` | `TEXT` | NO | NO | `null` |
| `full_name` | `TEXT` | NO | NO | `null` |
| `email` | `TEXT` | NO | NO | `null` |
| `password_hash` | `TEXT` | YES | NO | `null` |
| `avatar_url` | `TEXT` | YES | NO | `null` |
| `bio` | `TEXT` | YES | NO | `null` |
| `quote_of_day` | `TEXT` | YES | NO | `null` |
| `followers_cnt` | `INTEGER` | NO | NO | `0` |
| `following_cnt` | `INTEGER` | NO | NO | `0` |
| `created_at` | `TEXT` | NO | NO | `CURRENT_TIMESTAMP` |
| `updated_at` | `TEXT` | NO | NO | `CURRENT_TIMESTAMP` |

#### DDL Schema
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    pen_name TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    avatar_url TEXT,
    bio TEXT,
    quote_of_day TEXT,
    followers_cnt INTEGER NOT NULL DEFAULT 0,
    following_cnt INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
```

#### Sample Row(s)
```json
[
  {
    "id": "usr_maya_lin",
    "pen_name": "mayalin",
    "full_name": "Maya Lin",
    "email": "maya.lin@writon.dev",
    "password_hash": "$2b$10$SDur0ctISVAp2QrlaHym8eQQQDBuxZbRzoTUWSIHHnfYHt0UgqSpS",
    "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    "bio": "Essayist, architectural critic, and student of quiet spaces. Writing about design systems, stillness, and human craft.",
    "quote_of_day": "Architecture is frozen music, but prose is flowing architecture.",
    "followers_cnt": 1,
    "following_cnt": 1,
    "created_at": "2026-08-14 20:59:43",
    "updated_at": "2026-08-14 20:59:43"
  },
  {
    "id": "usr_elena_vance",
    "pen_name": "elenavance",
    "full_name": "Dr. Elena Vance",
    "email": "elena.vance@writon.dev",
    "password_hash": "$2b$10$SDur0ctISVAp2QrlaHym8eQQQDBuxZbRzoTUWSIHHnfYHt0UgqSpS",
    "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
    "bio": "Cognitive scientist and AI researcher. Exploring the boundaries between human intuition and machine inference.",
    "quote_of_day": "The mind is not a vessel to be filled, but a fire to be kindled.",
    "followers_cnt": 1,
    "following_cnt": 0,
    "created_at": "2026-08-14 20:59:43",
    "updated_at": "2026-08-14 20:59:43"
  }
]
```

