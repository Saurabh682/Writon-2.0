# 🖋️ WritOn 2.0 — Android Native (Jetpack Compose) Master AI Specification

> **Comprehensive Blueprint for Android Studio AI / Gemini in Android Studio**
> This file contains the complete, minute-by-minute architectural specifications, data schemas, visual tokens, API contracts, local AI algorithms, and screen-by-screen UX logic required to build and match the Android Compose application with the React 19 Web client.

---

## 📑 Table of Contents
1. [System Architecture & Roles](#1-system-architecture--roles)
2. [Design System & Visual Tokens (Obsidian Editorial)](#2-design-system--visual-tokens-obsidian-editorial)
3. [Data Models, Room Entities & DTOs](#3-data-models-room-entities--dtos)
4. [REST API Contracts & Endpoints](#4-rest-api-contracts--endpoints)
5. [Screen-by-Screen Minute Specifications](#5-screen-by-screen-minute-specifications)
   - [5.1 Feed & Discovery Screen](#51-feed--discovery-screen)
   - [5.2 Story Reader Screen (with AI & TTS)](#52-story-reader-screen-with-ai--tts)
   - [5.3 Story Editor Screen (with AI Copilot)](#53-story-editor-screen-with-ai-copilot)
   - [5.4 Author Profile Screen](#54-author-profile-screen)
   - [5.5 Authentication & Session Management](#55-authentication--session-management)
6. [Zero-Cost Local AI & Audio Narration Engine](#6-zero-cost-local-ai--audio-narration-engine)
7. [Offline-First Outbox Synchronization](#7-offline-first-outbox-synchronization)
8. [Master Android Studio AI Prompt Template](#8-master-android-studio-ai-prompt-template)

---

## 1. System Architecture & Roles

```text
WritOn-PowerUp/
├── server/                         # High-Performance Node.js Hono REST API (Port 3001)
├── web/                            # React 19 + Vite + Tailwind CSS Web Client
└── app/                            # Android Kotlin + Jetpack Compose Native App
    └── src/main/java/com/ibitvalley/writon/modern/
        ├── WritOnModernActivity.kt # Root Navigation & Compose Activity
        ├── core/
        │   ├── designsystem/theme/ # Colors, Typography, Shapes
        │   ├── network/            # Retrofit 2 + OkHttp + AuthInterceptor
        │   ├── database/           # Room Database, DAOs, Entities
        │   └── ai/                 # On-device AI Summarizer & TextToSpeech
        ├── data/
        │   ├── repository/         # PostRepository (Flow & Offline-first)
        │   └── sync/               # WorkManager OutboxSyncWorker
        └── feature/
            ├── feed/               # FeedScreen, StoryCard, CategoryChips, FeedViewModel
            ├── reader/             # ReaderScreen, AISummaryCard, AudioBar, CommentTree, ReaderViewModel
            ├── editor/             # StoryEditorScreen, AICopilotBar, MarkdownInput, EditorViewModel
            └── profile/            # ProfileScreen, AuthorStats, StoryTabs, ProfileViewModel
```

---

## 2. Design System & Visual Tokens (Obsidian Editorial)

### A. Color Palette
```kotlin
// Dark Palette (Obsidian Theme)
val DarkBackground = Color(0xFF0C0E14)      // Deep obsidian dark canvas
val DarkSurfaceCard = Color(0xFF161922)     // Story card surface
val DarkSurfaceElevated = Color(0xFF1E2230) // Toolbars and modal sheets
val DarkBorderStroke = Color(0xFF262B3B)    // Subtle card and divider borders
val DarkTextPrimary = Color(0xFFF3F4F6)     // High-contrast primary reading text
val DarkTextSecondary = Color(0xFF9CA3AF)   // Muted subtitles, dates, reading times

// Brand Accent & Actions
val AccentPrimary = Color(0xFF6366F1)       // Indigo 500
val AccentHover = Color(0xFF4F46E5)         // Indigo 600
val AccentClap = Color(0xFFEF4444)          // Rose 500 for likes / applause
val AccentBookmark = Color(0xFFF59E0B)      // Amber 500 for bookmarks
val AccentAIGlow = Color(0xFF8B5CF6)        // Purple 500 for AI insights

// Light Palette (Warm Editorial Paper)
val LightBackground = Color(0xFFFBFBF9)     // Warm editorial paper
val LightSurfaceCard = Color(0xFFFFFFFF)
val LightBorderStroke = Color(0xFFE5E7EB)
val LightTextPrimary = Color(0xFF111827)
val LightTextSecondary = Color(0xFF6B7280)
```

### B. Typography Hierarchy
```kotlin
val EditorialTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 34.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 28.sp
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Medium,
        fontSize = 18.sp,
        lineHeight = 24.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default, // Clean Sans-Serif
        fontWeight = FontWeight.Normal,
        fontSize = 17.sp,
        lineHeight = 27.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 22.sp
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        letterSpacing = 0.5.sp
    )
)
```

---

## 3. Data Models, Room Entities & DTOs

### A. Story Model (`Story` / `PostEntity`)
```kotlin
data class Story(
    val id: String,                         // UUID
    val title: String,
    val slug: String,
    val summary: String?,
    val content: String,                    // Markdown formatted body
    val category: String,                   // 'All' | 'Short Stories' | 'Poetry' | 'Shayari' | 'Essays' | 'Reviews' | 'Journalism' | 'Humour' | 'Philosophy' | 'Tech' | 'Culture'
    val coverImage: String?,                // URL or null
    val readingTimeMin: Int,                // Formula: ceil(wordCount / 200)
    val likesCnt: Int,
    val commentsCnt: Int,
    val bookmarksCnt: Int,
    val isLiked: Boolean = false,           // Current authenticated user reaction
    val isBookmarked: Boolean = false,      // Current authenticated user bookmark
    val isFollowingAuthor: Boolean = false,
    val publishedAt: String?,
    val createdAt: String,
    val author: Author
)
```

### B. Author Model (`Author` / `UserEntity`)
```kotlin
data class Author(
    val id: String,
    val penName: String,
    val fullName: String,
    val email: String? = null,
    val avatarUrl: String? = null,
    val bio: String? = null,
    val quoteOfDay: String? = null,
    val followersCnt: Int = 0,
    val followingCnt: Int = 0,
    val totalStories: Int = 0,
    val isFollowing: Boolean = false
)
```

### C. Comment Tree Model (`Comment` / `CommentEntity`)
```kotlin
data class Comment(
    val id: String,
    val postId: String,
    val authorId: String,
    val parentId: String? = null,           // null for top-level, UUID for nested reply
    val content: String,
    val createdAt: String,
    val author: AuthorBasic,
    val replies: List<Comment> = emptyList()
)

data class AuthorBasic(
    val id: String,
    val penName: String,
    val fullName: String,
    val avatarUrl: String? = null
)
```

### D. AI Analysis Model (`AIAnalysis`)
```kotlin
data class AIAnalysis(
    val tldr: String,
    val keyInsights: List<String>,          // Exactly 3 distilled takeaway bullets
    val tone: String,                       // e.g. "Philosophical & Contemplative", "Technical & Deep-Tech"
    val targetAudience: String = "Curious thinkers, builders, and essayists"
)
```

---

## 4. REST API Contracts & Endpoints

Base URL:
- **Android Emulator**: `http://10.0.2.2:3001/api/v1/`
- **Physical Device**: `http://<YOUR_LAN_IP>:3001/api/v1/`

| HTTP Method | Endpoint | Query / Body Params | Response DTO | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/posts` | `?category=...&tab=latest\|trending\|following&q=...&page=1&limit=20` | `{ posts: List<Story>, pagination: Pagination }` | Optional |
| `GET` | `/posts/{id_or_slug}` | None | `{ post: Story }` | Optional |
| `POST` | `/posts` | `{ title, content, summary, category, coverImage }` | `{ post: Story }` | Required |
| `PUT` | `/posts/{id}` | `{ title, content, summary, category, coverImage }` | `{ post: Story }` | Required |
| `DELETE` | `/posts/{id}` | None | `{ success: true }` | Required |
| `POST` | `/posts/{id}/like` | None | `{ liked: Boolean, likesCount: Int }` | Required |
| `POST` | `/posts/{id}/bookmark`| None | `{ bookmarked: Boolean, bookmarksCount: Int }` | Required |
| `GET` | `/comments/{postId}` | None | `{ comments: List<Comment> }` | Optional |
| `POST` | `/comments/{postId}` | `{ content: String, parentId?: String }` | `{ comment: Comment }` | Required |
| `GET` | `/users/{id_or_penName}` | None | `{ user: Author, posts: List<Story> }` | Optional |
| `POST` | `/users/{id}/follow` | None | `{ following: Boolean, followersCount: Int }` | Required |
| `POST` | `/auth/login` | `{ email, password }` | `{ token: String, user: Author }` | No |
| `POST` | `/auth/register` | `{ penName, fullName, email, password }` | `{ token: String, user: Author }` | No |

---

## 5. Screen-by-Screen Minute Specifications

### 5.1 Feed & Discovery Screen (`FeedScreen.kt`)
1. **Top Editorial Bar**:
   - Title: "WritOn" in Serif font with a purple accent dot (`#8B5CF6`).
   - Debounced Search Bar (300ms delay) searching across title, excerpt, and author.
   - "Write" Action Button navigating to `Screen.Editor`.
2. **Category Horizontal Filter**:
   - Scrollable chips row: `['All', 'Short Stories', 'Poetry', 'Shayari', 'Essays', 'Reviews', 'Journalism', 'Humour', 'Philosophy', 'Tech', 'Culture']`.
   - Selected chip: Background `#6366F1`, text `#FFFFFF`.
3. **Feed Tabs (`TabRow`)**:
   - 3 tabs: `Latest`, `Trending`, `Following`.
4. **Story Card (`StoryCard.kt`)**:
   - Card surface with `12.dp` rounded corners and `1.dp` border (`#262B3B`).
   - 16:9 Cover Image with category pill overlay on top-left.
   - Title in Serif 18sp Bold (`headlineSmall`).
   - Excerpt limited to 2 lines max with ellipsis.
   - Metadata Footer:
     - Author Avatar (32.dp circle) + `penName`.
     - `•` separator + `readingTimeMin` min read.
     - Interactive Claps Button with `likesCnt` (optimistic UI update).
     - Interactive Bookmark Button (optimistic UI update).
5. **State Handling**:
   - Shimmer skeleton loaders while fetching.
   - Pull-to-Refresh support.
   - Empty state illustration when no stories match search/category.

---

### 5.2 Story Reader Screen (with AI & TTS) (`ReaderScreen.kt`)
1. **Reading Progress Bar**:
   - Top-pinned linear progress bar (`2.dp` height) reflecting 0% to 100% reading scroll position.
2. **Navigation & Control Bar**:
   - Back button (`ArrowBack`).
   - Font Size Switcher: Cycle between Small (`15sp`), Medium (`18sp`), Large (`21sp`).
   - "✨ AI Insights" action button toggling the on-device AI Summary Modal/Drawer.
   - Audio Narration Play/Pause button with playback speed toggle (`1.0x`, `1.25x`, `1.5x`).
3. **AI Insights Card (`AISummaryCard.kt`)**:
   - Gradient border box (`#6366F1` to `#8B5CF6`).
   - **TL;DR**: Concisely generated 1-2 sentence overview.
   - **Key Takeaways**: 3 numbered bullet points.
   - **Tone Tag**: Detected literary tone badge (e.g. "Philosophical & Contemplative").
4. **Hero Header**:
   - Full-width cover image (if present).
   - Category badge & published date formatted as `MMM dd, yyyy`.
   - Headline in Serif 28sp Bold (`headlineLarge`).
   - Author Info Row: Avatar, Pen name (clickable to Profile), Estimated read time.
5. **Body Content**:
   - Rendered rich Markdown with proper paragraph spacing (`16.dp`) and line-height `1.7x`.
6. **Author Signature Card**:
   - Large avatar, bio, follower count, and "Follow / Following" interactive button.
7. **Threaded Comments Section**:
   - Total comment count header.
   - Recursive comment tree: replies indented with a left border line.
   - Fixed Bottom Input Bar: TextField, Send button, and active reply indicator banner (`Replying to @penName [Cancel]`).

---

### 5.3 Story Editor Screen (with AI Copilot) (`StoryEditorScreen.kt`)
1. **Top Bar**:
   - Back button, Draft status text ("Draft saved locally"), and "Publish" gradient button.
2. **Input Fields**:
   - Cover Image URL input with instant preview thumbnail.
   - Category Selector Dropdown (Essays, Poetry, Tech, Philosophy, Fiction, Culture).
   - Title Input (Large Serif bold, placeholder: "Title of your story...").
   - Markdown Body Input (Multiline, expandable).
3. **Live Metrics Footer**:
   - Live word count.
   - Calculated reading time: `Math.ceil(words / 200.0)`.
4. **AI Writing Copilot Toolbar (`AICopilotBar.kt`)**:
   - Docked floating bottom toolbar:
     - `✨ Improve Tone`: Replaces weak phrases and refines sentence cadence.
     - `💡 Catchy Title`: Suggests 3 high-engagement headlines.
     - `✂️ Tighten`: Eliminates filler words (`in order to` → `to`, `due to the fact that` → `because`).

---

### 5.4 Author Profile Screen (`ProfileScreen.kt`)
1. **Profile Banner & Info**:
   - Large avatar (80.dp), full name, `@penName`.
   - Bio text & Quote of the Day banner.
   - Metrics Row: `Stories Count`, `Followers Count`, `Following Count`.
   - Interactive Follow / Following button.
2. **Tabbed Content**:
   - Tab 1: `Stories` (LazyColumn of published posts by this author).
   - Tab 2: `Bookmarks` (List of bookmarked stories).
   - Tab 3: `About` (Extended author bio and writer credentials).

---

### 5.5 Authentication & Session Management
- **Auth Interceptor**: Automatically attaches `Authorization: Bearer <JWT_TOKEN>` from `EncryptedSharedPreferences` on all authenticated calls.
- **Auto-Login / Session Refresh**: Calls `GET /auth/me` on application boot to restore user state.

---

## 6. Zero-Cost Local AI & Audio Narration Engine

### A. Kotlin On-Device Story Analyzer
```kotlin
package com.ibitvalley.writon.modern.core.ai

object ClientAIEngine {
    fun analyzeStory(title: String, content: String): AIAnalysis {
        val clean = content.replace(Regex("[#*_`~>\\-]"), " ").trim()
        val sentences = clean.split(Regex("[.!?]+"))
            .map { it.trim() }
            .filter { it.length > 20 }

        val toneKeywords = mapOf(
            "Philosophical & Contemplative" to listOf("truth", "exist", "reason", "meaning", "nature", "human", "sacred", "consciousness"),
            "Technical & Deep-Tech" to listOf("system", "model", "parameter", "algorithm", "inference", "latency", "code", "memory"),
            "Lyrical & Introspective" to listOf("bloom", "whisper", "dusk", "shadow", "pulse", "echo", "night", "rhythm"),
            "Structured & Analytical" to listOf("theory", "evidence", "reveal", "observe", "compare", "metric", "framework", "data")
        )

        val cleanLower = clean.lowercase()
        var detectedTone = "Reflective & Analytical"
        var maxToneMatches = 0

        for ((tone, keywords) in toneKeywords) {
            val count = keywords.count { cleanLower.contains(it) }
            if (count > maxToneMatches) {
                maxToneMatches = count
                detectedTone = tone
            }
        }

        val scoredSentences = sentences.map { s ->
            var score = s.length
            if (s.contains("must") || s.contains("because") || s.contains("reveals") || s.contains("means")) {
                score += 50
            }
            Pair(s, score)
        }.sortedByDescending { it.second }

        val keyInsights = if (scoredSentences.isNotEmpty()) {
            scoredSentences.take(3).map { it.first }
        } else {
            listOf(
                "Explores the intersection of intention and craft.",
                "Challenges standard linear thinking in modern workflows.",
                "Recommends deliberate spatial and cognitive stillness."
            )
        }

        val tldr = if (sentences.isNotEmpty()) {
            "This piece explores \"$title\", examining how ${sentences[0].lowercase()}"
        } else {
            "An in-depth editorial exploring modern themes in $title."
        }

        return AIAnalysis(
            tldr = tldr,
            keyInsights = keyInsights,
            tone = detectedTone
        )
    }

    fun assistWriting(action: String, text: String, title: String = ""): String {
        return when (action) {
            "polish" -> text
                .replace(Regex("(?i)\\bvery\\s+"), "")
                .replace(Regex("(?i)\\breally\\s+"), "")
                .replace(Regex("(?i)\\bin order to\\b"), "to")
                .replace(Regex("(?i)\\bdue to the fact that\\b"), "because")
                .trim()
            "enrich" -> text
                .replace(Regex("(?i)\\bgood\\b"), "exemplary")
                .replace(Regex("(?i)\\bimportant\\b"), "paramount")
                .replace(Regex("(?i)\\bshow\\b"), "illuminate")
                .replace(Regex("(?i)\\bthink\\b"), "contemplate")
            "headlines" -> "1. ${title.ifEmpty { "The Craft" }}: A New Paradigm\n2. Why ${title.ifEmpty { "Modern Writing" }} Demands Stillness\n3. The Hidden Architecture of ${title.ifEmpty { "Ideas" }}"
            else -> text
        }
    }
}
```

### B. Android Text-to-Speech Narration Manager
```kotlin
package com.ibitvalley.writon.modern.core.ai

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale

class AudioNarrator(context: Context) : TextToSpeech.OnInitListener {
    private var tts: TextToSpeech? = TextToSpeech(context, this)
    private var isInitialized = false

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.US
            isInitialized = true
        }
    }

    fun speak(text: String, speed: Float = 1.0f) {
        if (!isInitialized) return
        tts?.setSpeechRate(speed)
        val cleanText = text.replace(Regex("[#*_`~>\\-]"), " ")
        tts?.speak(cleanText, TextToSpeech.QUEUE_FLUSH, null, "WritOnSpeech")
    }

    fun stop() {
        tts?.stop()
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
    }
}
```

---

## 7. Offline-First Outbox Synchronization

### Flow:
1. When user taps **Clap**, **Bookmark**, **Comment**, or **Publish**:
   - Room database updates locally and immediately reflects in the UI (0ms latency).
   - An `OutboxMutationEntity` record is inserted with `status = "PENDING"`.
2. `OutboxSyncWorker` is enqueued via `WorkManager` with a `NetworkType.CONNECTED` constraint:
   - Reads pending mutations in chronological order (`createdAt ASC`).
   - Executes corresponding Retrofit API calls (`toggleLike`, `toggleBookmark`, `addComment`, `createPost`).
   - Deletes successfully synced mutations or marks them for exponential backoff retry.

---

## 8. Master Android Studio AI Prompt Template

When interacting with **Gemini in Android Studio**, copy and paste this command:

```text
@WritOnModernActivity.kt @WritOnApiService.kt @ANDROID_STUDIO_AI_SPEC.md

Please implement/update the screen according to the minute specifications defined in ANDROID_STUDIO_AI_SPEC.md. Ensure:
1. Exact visual tokens (Obsidian dark #0C0E14, Card #161922, Border #262B3B, Accent #6366F1).
2. Exact typography (Serif headlines, Sans-serif body).
3. 100% parity with the web client (Category filters, Audio TTS, On-Device AI Summarizer, Claps/Bookmarks, Nested comments, and Offline-first Room outbox sync).
```
