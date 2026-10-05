package com.ibitvalley.writon.modern.core.preferences

import android.content.Context
import android.content.SharedPreferences
import com.ibitvalley.writon.modern.core.telemetry.GrowthTracker

data class ReaderPreferences(
    val fontSizeSp: Float,
    val lineHeightMultiplier: Float,
    val fontFamily: String
)

internal fun ReaderPreferences.normalized() = ReaderPreferences(
    fontSizeSp = fontSizeSp.coerceIn(16f, 24f),
    lineHeightMultiplier = lineHeightMultiplier.coerceIn(1.3f, 1.9f),
    fontFamily = fontFamily.takeIf { it in setOf("serif", "sans", "mono") } ?: "serif"
)

data class CachedAppVersion(
    val latestVersionCode: Int,
    val minSupportedVersionCode: Int,
    val updateUrl: String,
    val checkedAtMillis: Long
)

data class EngagementPreferences(
    val primaryIntent: String? = null,
    val onboardingVersion: Int = 0,
    val onboardingCompletedAtMillis: Long? = null,
    val preferenceCardState: String = "unseen",
)

internal fun EngagementPreferences.normalized(): EngagementPreferences {
    val validIntent = primaryIntent?.trim()?.lowercase()?.takeIf { it in setOf("read", "write", "both") }
    val validVersion = onboardingVersion.takeIf { it in 0..1_000 } ?: 0
    val validCompletedAt = onboardingCompletedAtMillis?.takeIf { it > 0L }
    val validCardState = preferenceCardState.takeIf { it in setOf("unseen", "dismissed", "completed") } ?: "unseen"
    return EngagementPreferences(validIntent, validVersion, validCompletedAt, validCardState)
}

class UserPreferences(context: Context) {
    fun sourceFeedIds(audience: String): List<String> {
        require(audience in setOf("community", "editorial"))
        return sharedPreferences.getString("source_feed_$audience", "").orEmpty()
            .lineSequence().filter { it.isNotBlank() }.take(200).toList()
    }

    fun saveSourceFeedIds(audience: String, ids: List<String>) {
        require(audience in setOf("community", "editorial"))
        require(ids.all { it.isNotBlank() && it.length <= 128 && !it.contains('\n') && !it.contains('\r') })
        // ponytail: keep 200 source-verified cards offline; Room retains their story bodies.
        sharedPreferences.edit().putString("source_feed_$audience", ids.distinct().take(200).joinToString("\n")).apply()
    }
    private val applicationContext = context.applicationContext
    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences("writon_prefs", Context.MODE_PRIVATE)

    val guestFeedLearning: GuestFeedLearning by lazy { GuestFeedLearning(sharedPreferences) }
    val growthTracker: GrowthTracker by lazy { GrowthTracker(applicationContext, sharedPreferences) }

    internal val growthSharedPreferences: SharedPreferences get() = sharedPreferences

    var isOnboardingComplete: Boolean
        get() = sharedPreferences.getBoolean("onboarding_complete", false)
        set(value) = sharedPreferences.edit().putBoolean("onboarding_complete", value).apply()

    /** True when the reader chose to browse without creating an account. */
    var isVisitorMode: Boolean
        get() = sharedPreferences.getBoolean("visitor_mode", false)
        set(value) = sharedPreferences.edit().putBoolean("visitor_mode", value).apply()

    var lastNotificationPermissionAttemptMillis: Long
        get() = sharedPreferences.getLong("notification_permission_last_attempt", 0L)
        set(value) = sharedPreferences.edit().putLong("notification_permission_last_attempt", value).apply()

    var favouriteCategories: Set<String>
        get() = sharedPreferences.getStringSet("favourite_categories", emptySet()) ?: emptySet()
        set(value) = sharedPreferences.edit().putStringSet("favourite_categories", value).apply()

    /** Stores canonical topic IDs synchronously so selection survives an immediate app close. */
    fun saveFavouriteCategories(topicIds: Set<String>) {
        sharedPreferences.edit()
            .putStringSet("favourite_categories", topicIds.toSortedSet())
            .commit()
    }

    /** Null means no successful fetch yet; an empty list is a valid cached catalog. */
    var cachedInterestCatalog: List<String>?
        get() = sharedPreferences.getString("interest_catalog_v1", null)?.let {
            if (it.isEmpty()) emptyList() else it.split('\n')
        }
        set(value) = sharedPreferences.edit()
            .putString("interest_catalog_v1", value?.joinToString("\n")).apply()

    private fun readingKey(accountId: String?) = "reading_resume_${accountId?.let { "account:$it" } ?: "guest"}"

    fun readingContinuation(accountId: String?): ReadingContinuation? {
        val key = readingKey(accountId)
        val storyId = sharedPreferences.getString("${key}_story", null) ?: return null
        return readingContinuation(storyId, sharedPreferences.getFloat("${key}_progress", 0f))
    }

    fun saveReadingContinuation(accountId: String?, storyId: String, progress: Float) {
        val entry = readingContinuation(storyId, progress)
        if (entry == null) {
            clearReadingContinuation(accountId, storyId)
            return
        }
        val key = readingKey(accountId)
        sharedPreferences.edit().putString("${key}_story", entry.storyId)
            .putFloat("${key}_progress", entry.progress).apply()
    }

    /** A stale reader cannot clear a newer continuation for a different story. */
    fun clearReadingContinuation(accountId: String?, storyId: String) {
        val key = readingKey(accountId)
        if (sharedPreferences.getString("${key}_story", null) != storyId) return
        sharedPreferences.edit().remove("${key}_story").remove("${key}_progress").apply()
    }

    fun interestChoices(accountId: String?): Set<String> = if (accountId == null) {
        favouriteCategories.toSet()
    } else {
        sharedPreferences.getStringSet("interest_choices_$accountId", emptySet())!!.toSet()
    }

    fun hasPendingInterestSync(accountId: String?): Boolean = accountId != null &&
        sharedPreferences.getBoolean("interest_pending_$accountId", false)

    fun saveInterestChoices(accountId: String?, ids: Set<String>, pendingSync: Boolean) {
        if (accountId == null) {
            saveFavouriteCategories(ids)
        } else {
            sharedPreferences.edit()
                .putStringSet("interest_choices_$accountId", ids.toSortedSet())
                .putBoolean("interest_pending_$accountId", pendingSync)
                .commit()
        }
    }

    private fun engagementKey(accountId: String?) =
        "engagement_${accountId?.let { "account:$it" } ?: "guest"}"

    fun engagementPreferences(accountId: String?): EngagementPreferences {
        val key = engagementKey(accountId)
        val completedAt = sharedPreferences.getLong("${key}_completed_at", 0L).takeIf { it > 0L }
        return EngagementPreferences(
            primaryIntent = sharedPreferences.getString("${key}_intent", null),
            onboardingVersion = sharedPreferences.getInt("${key}_version", 0),
            onboardingCompletedAtMillis = completedAt,
            preferenceCardState = sharedPreferences.getString("${key}_card_state", "unseen") ?: "unseen",
        ).normalized()
    }

    /** Saves the complete local snapshot atomically so process death cannot create partial onboarding state. */
    fun hasPendingEngagementSync(accountId: String): Boolean =
        sharedPreferences.getBoolean("${engagementKey(accountId)}_pending", false)

    fun saveEngagementPreferences(
        accountId: String?,
        preferences: EngagementPreferences,
        pendingSync: Boolean = false,
    ): Boolean {
        val key = engagementKey(accountId)
        val value = preferences.normalized()
        val editor = sharedPreferences.edit()
            .putInt("${key}_version", value.onboardingVersion)
            .putString("${key}_card_state", value.preferenceCardState)
            .putBoolean("${key}_pending", accountId != null && pendingSync)
        if (value.primaryIntent == null) editor.remove("${key}_intent") else editor.putString("${key}_intent", value.primaryIntent)
        if (value.onboardingCompletedAtMillis == null) editor.remove("${key}_completed_at")
        else editor.putLong("${key}_completed_at", value.onboardingCompletedAtMillis)
        return editor.commit()
    }

    /** Theme mode: "paper", "sepia", "dark", "system" */
    var themeMode: String
        get() = sharedPreferences.getString("theme_mode", "paper") ?: "paper"
        set(value) = sharedPreferences.edit().putString("theme_mode", value).apply()

    /** Reading body font size in SP (16f - 24f) */
    var readerFontSizeSp: Float
        get() = sharedPreferences.getFloat("reader_font_size_sp", 20f)
        set(value) = sharedPreferences.edit().putFloat("reader_font_size_sp", value).apply()

    /** Reading line height multiplier (1.3f - 1.9f) */
    var readerLineHeightMultiplier: Float
        get() = sharedPreferences.getFloat("reader_line_height_multiplier", 1.6f)
        set(value) = sharedPreferences.edit().putFloat("reader_line_height_multiplier", value).apply()

    /** Reading font family: "serif", "sans", "mono" */
    var readerFontFamily: String
        get() = sharedPreferences.getString("reader_font_family", "serif") ?: "serif"
        set(value) = sharedPreferences.edit().putString("reader_font_family", value).apply()

    /** Reader color theme; "app" follows Appearance until a reader-specific choice is saved. */
    var readerThemeMode: String
        get() {
            val saved = sharedPreferences.getString("reader_theme_mode", null)
            if (sharedPreferences.getBoolean("reader_theme_explicit", false)) return saved ?: "app"
            // Older releases saved "paper" even when only typography changed; only retain
            // unmistakable legacy reader overrides and let the old default inherit Appearance.
            return saved?.takeIf { it == "sepia" || it == "dark" } ?: "app"
        }
        set(value) {
            val mode = value.takeIf { it in setOf("app", "paper", "sepia", "dark") } ?: "app"
            sharedPreferences.edit()
                .putString("reader_theme_mode", mode)
                .putBoolean("reader_theme_explicit", mode != "app")
                .apply()
        }

    val readerPreferences: ReaderPreferences
        get() = ReaderPreferences(
            fontSizeSp = readerFontSizeSp,
            lineHeightMultiplier = readerLineHeightMultiplier,
            fontFamily = readerFontFamily
        )

    /** Saves reader options together and synchronously so a selection survives an immediate close. */
    fun saveReaderPreferences(preferences: ReaderPreferences) {
        val normalized = preferences.normalized()
        sharedPreferences.edit()
            .putFloat("reader_font_size_sp", normalized.fontSizeSp)
            .putFloat("reader_line_height_multiplier", normalized.lineHeightMultiplier)
            .putString("reader_font_family", normalized.fontFamily)
            .commit()
    }

    /** True if biometric / fingerprint unlock is enabled by user */
    var isBiometricEnabled: Boolean
        get() = sharedPreferences.getBoolean("biometric_enabled", false)
        set(value) = sharedPreferences.edit().putBoolean("biometric_enabled", value).apply()

    /** App language code: "en", "hi", "es", "fr", "bn", "mr", or "system" */
    var appLanguage: String
        get() = sharedPreferences.getString("app_language", "en") ?: "en"
        set(value) = sharedPreferences.edit().putString("app_language", value).apply()

    /** Device-local discovery preference for readers who have not signed in. */
    var guestDiscoveryNotificationsEnabled: Boolean
        get() = sharedPreferences.getBoolean("guest_discovery_notifications_enabled", true)
        set(value) = sharedPreferences.edit().putBoolean("guest_discovery_notifications_enabled", value).apply()

    val cachedAppVersion: CachedAppVersion?
        get() {
            val checkedAt = sharedPreferences.getLong("app_version_checked_at", 0L)
            val latest = sharedPreferences.getInt("app_version_latest", 0)
            val minimum = sharedPreferences.getInt("app_version_minimum", 0)
            val updateUrl = sharedPreferences.getString("app_version_url", null)
            return if (checkedAt > 0L && latest > 0 && minimum > 0 && !updateUrl.isNullOrBlank()) {
                CachedAppVersion(latest, minimum, updateUrl, checkedAt)
            } else null
        }

    fun saveAppVersion(version: CachedAppVersion) {
        sharedPreferences.edit()
            .putInt("app_version_latest", version.latestVersionCode)
            .putInt("app_version_minimum", version.minSupportedVersionCode)
            .putString("app_version_url", version.updateUrl)
            .putLong("app_version_checked_at", version.checkedAtMillis)
            .apply()
    }

    fun clear() {
        // Account preference caches must not survive the account/session clear path.
        sharedPreferences.edit().also { editor ->
            sharedPreferences.all.keys.filter {
                it.startsWith("interest_choices_") || it.startsWith("interest_pending_") ||
                    it.startsWith("reading_resume_account:") || it.startsWith("engagement_account:")
            }.forEach(editor::remove)
        }.apply()
        // Account/session data must not erase a reader's device-level typography choices.
        sharedPreferences.edit()
            .remove("onboarding_complete")
            .remove("visitor_mode")
            .remove("favourite_categories")
            .apply()
    }
}
