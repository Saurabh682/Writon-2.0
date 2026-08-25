# Changelog & Update History — WritOn 2.0

All notable changes, architectural improvements, UI/UX refinements, security features, and localization additions in the **WritOn-PowerUp** project are documented in this file.

### 📌 Active Repository & Fork Details
- **Primary Fork / Repository**: [`Saurabh682/WritOn-PowerUp`](https://github.com/Saurabh682/WritOn-PowerUp.git)
- **Upstream Repository**: [`Saurabh682/Writon-2.0`](https://github.com/Saurabh682/Writon-2.0.git)
- **Active Working Branch**: `Till_29Aug` *(synchronized with `production` and `main`)*
- **Package Name**: `com.ibitvalley.writon`
- **Current Version**: `2.0.0 (Version Code: 101)`

---


## [2.0.0] - 2026-08-24

### 🌍 Internationalization (i18n) & Multi-Language System
- **Comprehensive String Extraction (225+ semantic keys)**: Extracted all hardcoded UI strings across all screens, headers, dialogs, bottom navigation, and action trays into structured XML resource files.
- **6 Supported Languages Out-of-the-Box**:
  - **English (en)**: Default / Global (`values/strings.xml`)
  - **Hindi (hi / हिन्दी)**: Full native localization (`values-hi/strings.xml`)
  - **Spanish (es / Español)**: España y América Latina (`values-es/strings.xml`)
  - **French (fr / Français)**: France et Francophonie (`values-fr/strings.xml`)
  - **Bengali (bn / বাংলা)**: সাহিত্য ও সংস্কৃতি (`values-bn/strings.xml`)
  - **Marathi (mr / मराठी)**: महाराष्ट्र • कथा आणि साहित्य (`values-mr/strings.xml`)
- **Complete Screen-by-Screen Localization**:
  - `SettingsScreen.kt`: General, Account, Preferences, Security, About, Data Deletion, Language dialog, and App Guide.
  - `AppearanceScreen.kt`: Themes (Paper, Sepia, Dark, System), Line Spacing (Compact, Relaxed, Spacious), Typeface Styles (Serif, Sans, Mono), and sample previews.
  - `NotificationsScreen.kt`: Empty state headers, descriptions, and dynamic theme colors.
  - `InterestsScreen.kt`: Topic selections, Continue, and Skip buttons.
  - `ApplaudsScreen.kt`: Story stats, context menu actions, empty states, and appreciation cards.
  - `ReadingHistoryScreen.kt`: History tabs, empty history states, and reading tip banners.
  - `SearchScreen.kt`: Search empty states, query guidance, and explore topics cards.
  - `ProfileScreen.kt`: Bio editing, Motto/Quote tags, Top Stories, See All, and Edit Profile inputs.
  - `StoryEditorScreen.kt`: Top actions (Save Draft, Publish), story metadata (Title, Summary, Category, Tags, Visibility options).
- **Interactive Language Picker**: Added a dedicated **"Language / भाषा"** setting under *Preferences* in `SettingsScreen.kt` with a live modal selection dialog displaying native language names, subtitles, and selection checkmarks.
- **Dynamic Instant Locale Switching**:
  - Upgraded `WritOnModernActivity` to `AppCompatActivity`.
  - Implemented `attachBaseContext` context-wrapping with `LocaleManager.wrapContext(newBase)`.
  - Bound Jetpack Compose runtime context via `CompositionLocalProvider(LocalConfiguration provides config, LocalContext provides localizedContext)`.
  - Persisted user language preference in DataStore / SharedPreferences (`UserPreferences.appLanguage`).
  - Automated activity recreation on language change for instantaneous UI translation.

---

### 🎨 Design System, Theming & UI/UX
- **Working writing controls**: The editor toolbar now applies bold, italic, underline, bullets, and block quotes to the active selection or line. Reader rendering understands those lightweight marks, while image insertion is visibly disabled until a real media-storage pipeline exists.
- **Distinct interest-topic icons**: Replaced repeated generic category glyphs in onboarding with individual approved icons for philosophy, short stories, journalism, humour, wellness, sci-fi, travel, and career growth.
- **Focused reading-history filters**: Replaced the confusing content-type tabs (All, Stories, Poems, Articles) with just **Read** and **Bookmarked**, matching the actual actions available on the screen.
- **Consistent post covers**: Home now renders each post's stored cover image just like History, Library, Search, and Applauds. The WritOn category artwork is used only when that post has no cover image URL.
- **Settings Navigation Cleanup**: Added a back action to Settings and removed the development-only Test Notification and Copy Push Token controls from the user-facing preferences screen.
- **Cleaner Writing Canvas**: Refined the Compose editor into a calmer, content-first workspace: expanded editorial title space, a dedicated minimal body field with an unobtrusive writing cue, reduced-control top bar, and a flatter compact status/formatting tray. The existing WritOn typeface and approved palette remain unchanged.
- **Paged Home Discovery Feed**: Home now preserves the first server page as the authoritative cache, appends subsequent API pages asynchronously, and prefetches when the reader approaches the end of the story deck. This makes the imported legacy archive reachable instead of stopping after the initial 20 posts.
- **Complete Legacy Category Set**: The shared publish/category list now includes every imported category, including Short Stories, Shayari, Humour, Reviews, Journalism, and Satire.
- **Persistent Reader Choices**: Reader font size, line height, and typeface are now saved atomically and survive immediate app closure and logout. Favourite topics remain personalisation inputs, while Home continues to discover across the full archive rather than treating the first favourite as a permanent filter.
- **Focused Writing Studio**: Rebuilt `StoryEditorScreen` as a distraction-free writing canvas with a compact Back / Save / Publish header, editorial title and body fields, inline draft metadata, and a bottom formatting tray. The primary navigation now stays hidden while writing or publishing. Large editor titles now use the regular WritOn serif weight for a lighter editorial feel.
- **Lighter Home Story Titles**: The Home discovery card keeps its 44sp editorial title scale but now uses the regular WritOn serif weight instead of semibold, matching the intended calm, refined reading hierarchy.
- **Consistent Editorial Display Type**: Standardized the regular WritOn serif treatment across large screen headings, reader story titles, authentication headings, publishing, and onboarding. Display sizes and line heights remain unchanged; only oversized editorial text is lighter, while controls, metadata, and statistics retain their stronger weights for clarity.
- **Dynamic MaterialTheme Color Scheme**: All screens, cards, dialogs, trays, and navigation components dynamically respond to the active theme palette across **Paper (Warm Beige)**, **Sepia**, **Dark Obsidian**, and **System Default**.
- **Dark Mode Icon Contrast & Adaptive Tinting**: Cleaned up hardcoded black/dark tinting on icons across all screens (`ic_bookmark`, `ic_profile`, `ic_search`, `ic_more_vertical`, `ic_back`, `ic_share`, etc.), ensuring full WCAG contrast in dark mode.
- **Rich Illustrated Book Covers**: Replaced empty beige placeholder containers across `ReadingHistoryScreen.kt`, `ApplaudsScreen.kt`, and `SearchScreen.kt` with `PostCoverImage`. Automatically displays high-resolution story cover art when available, and vintage editorial book-jacket artwork with centered BrandRed category typography when absent.
- **Smart Text Wrapping**: Story cover badges and titles automatically wrap gracefully across multiple lines with dynamic height calculation instead of truncating awkwardly.
- **Interactive Onboarding Carousel & Feature Guide**:
  - 4-step onboarding carousel with rich illustrations for first-time app launches.
  - Interactive **"Help & App Guide"** dialog in Settings detailing Curated Feeds, Reader Themes, Offline Writer Studio, and Biometric App Lock.
- **Live Typography & Theme Preview**: Interactive theme selector in `AppearanceScreen.kt` with live sample text and real-time font size adjustments.

---

### 🔒 Security, Authentication & Account Management
- **Legacy Gmail account reclaiming**: A verified Gmail sign-in can now recover a single imported profile whose original email was given a `+legacy-…` suffix during import, but only when the temporary Firebase-ID profile has no stories, interactions, follows, comments, bookmarks, applauds, or reading history. This preserves strict identity proof and avoids overriding an active new account.
- **Supabase Data API Hardening**: Enabled RLS on `reading_history` and both legacy-import metadata tables, then removed `anon` and `authenticated` grants from every public-schema table. The Firebase-authenticated Fastify server remains the sole data access path through its trusted Postgres connection. Also revoked public execution of the `SECURITY DEFINER` RLS event-trigger helper, locked down default table/function privileges, added seven missing foreign-key indexes, and removed a duplicate identity-mapping index.
- **Legacy Account Claiming for Google Sign-In**: Added the RLS-protected `profile_auth_identities` bridge, which maps Firebase UIDs to the existing canonical WritOn profile ID. On the first Google sign-in, the API now links a profile only when Firebase verifies one exact, non-placeholder email match. Historical stories, follows, applause, bookmarks, comments, and reading history keep their original profile references. Display names are never used for identity matching, ambiguous or already-claimed profiles are protected, and brand-new accounts still receive a new profile safely.
- **Reliable Firebase Profile Sync**: Confirmed that Firebase email addresses are stored server-side in `public.profiles.email` from the verified ID token and are returned only by the authenticated `/api/v1/me` contract. Google sign-in now boots through that safe read path rather than overwriting a claimed writer profile with Google's display name, tolerates Render cold starts (30s connect / 45s read), and gives actionable timeout, token, conflict, and service-error messages.
- **Biometric App Lock (Fingerprint & Face ID)**:
  - Added native `BiometricPrompt` security integration via `BiometricAuthManager.kt`.
  - Dedicated toggle switch in `SettingsScreen.kt` (*"Biometric App Lock"*).
  - Modern fullscreen `BiometricLockScreen` shielding stories and personal data when enabled.
- **Google Sign-In**:
  - Removed deprecated Apple login options.
  - Wired native Google Sign-In on both `LoginScreen.kt` and `SignupScreen.kt` using Firebase Google Auth Credentials.
  - Replaced duplicated hard-coded Web client IDs with Firebase's generated `default_web_client_id` resource.
  - Added actionable Play services error handling for cancelled sign-in, no-network states, concurrent attempts, and OAuth `DEVELOPER_ERROR` configuration failures.
  - Added `docs/GOOGLE_SIGN_IN_SETUP.md`, documenting the required Android OAuth SHA-1 registration and refreshed `google-services.json` workflow.
  - Fixed the runtime crash on the login screen by preserving the Android activity-result registry through the localized Compose root; Google Sign-In can now create its activity-result launcher safely.
  - Enabled Android's predictive-back callback in the application manifest, removing the related Android 13+ runtime warning.
- **Password Recovery & Reset**:
  - Interactive password reset modal dialog on Login screen.
  - In-app password reset link trigger in `SettingsScreen.kt` sent directly to the authenticated user's email.
- **In-App Account & Data Deletion**:
  - Added *"Delete Account & Data"* with confirmation modal in `SettingsScreen.kt`.
  - Android now calls the authenticated Fastify `DELETE /api/v1/me` endpoint before clearing local Room data and signing out. This keeps Postgres profile, stories, likes, bookmarks, comments, and Firebase Auth deletion aligned with the user-facing promise.
  - Added a backend contract test proving deletion is authenticated and scoped to the current user.

---

### 🛡️ Google Play Compliance & Store Readiness
- **Child Safety Standards & CSAE Prevention**:
  - Created `CHILD_SAFETY_STANDARDS.md` and public `child-safety.html` outlining Zero Tolerance CSAM/CSAE enforcement, automated content filtering, and reporting mechanisms.
- **Data Safety & Web Deletion Portal**:
  - Created `ACCOUNT_DELETION.md` and public `delete-account.html` for Google Play Data Safety compliance.
- **Play Store Build Artifacts**:
  - Production App Bundle: `release/WritOn-v2.0.0-production.aab` *(Version 101, 2.0.0)*
  - Fresh Installable APK: `release/WritOn-v2.0.0-fresh-installable.apk`

---

### ⚙️ Architecture, Database & Sync Engine
- **Offline-First Room Database**:
  - Room DAOs (`PostDao`, `UserDao`, `CommentDao`, `OutboxDao`) for uninterrupted offline reading and drafting.
  - Background outbox sync via `WorkManager` (`OutboxSyncScheduler.kt`, `OutboxSyncWorker.kt`).
- **Synchronized Comments & Applauds**:
  - Comment count and applaud metrics synchronize dynamically between Fastify REST API, Room SQLite DB, and reader action trays.
- **Push Notifications & FCM**:
  - Custom notification channels (`WritOnNotificationManager.kt`) and Firebase Cloud Messaging token export row in Settings.

---

### ✅ Verification — 2026-08-24
- Built `:app:assembleDebug` successfully; the resulting APK reports package `com.ibitvalley.writon`, version `2.0.0` / code `101`.
- Refreshed `app/google-services.json` with the matching Android OAuth client and rebuilt the signed installable release APK: `release/WritOn-v2.0.0-google-signin.apk`.
- Added and passed `GoogleSignInErrorMapperTest` (3 Android unit tests).
- Verified on the Android emulator: Login opens without the prior `No ActivityResultRegistryOwner` crash and the Google sign-in activity launches successfully.
- Built and signature-verified the installable crash-fix APK: `release/WritOn-v2.0.0-login-crashfix.apk`.
- Passed all server tests (`16` Vitest tests), including the account-deletion authorization contract.
- Updated the Graphify code graph after the authentication and deletion changes.

---

## 📁 Key File Index

| File | Purpose |
|:---|:---|
| `app/src/main/res/values/strings.xml` | Master English string catalog (155+ keys) |
| `app/src/main/res/values-{hi,es,fr,bn,mr}/` | Localized string packs for Hindi, Spanish, French, Bengali, Marathi |
| `app/src/main/java/com/ibitvalley/writon/modern/core/locale/LocaleManager.kt` | Core runtime i18n & locale synchronization manager |
| `app/src/main/java/com/ibitvalley/writon/modern/WritOnModernActivity.kt` | Single-activity host with biometric guard & locale composition provider |
| `app/src/main/java/com/ibitvalley/writon/modern/feature/settings/SettingsScreen.kt` | Full-featured settings with language picker, biometric toggle & tutorials |
| `app/src/main/java/com/ibitvalley/writon/modern/core/auth/BiometricAuthManager.kt` | Native Android BiometricPrompt security wrapper |
| `app/src/main/java/com/ibitvalley/writon/modern/core/auth/GoogleSignInErrorMapper.kt` | Actionable Google Play services sign-in error mapping |
| `docs/GOOGLE_SIGN_IN_SETUP.md` | Firebase Android OAuth certificate and configuration guide |
| `CHILD_SAFETY_STANDARDS.md` | Google Play CSAE compliance documentation |
| `ACCOUNT_DELETION.md` | Google Play Data Safety account deletion policy |
