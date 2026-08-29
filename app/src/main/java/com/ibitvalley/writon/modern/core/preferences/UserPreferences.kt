package com.ibitvalley.writon.modern.core.preferences

import android.content.Context
import android.content.SharedPreferences

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

class UserPreferences(context: Context) {
    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences("writon_prefs", Context.MODE_PRIVATE)

    var isOnboardingComplete: Boolean
        get() = sharedPreferences.getBoolean("onboarding_complete", false)
        set(value) = sharedPreferences.edit().putBoolean("onboarding_complete", value).apply()

    /** True when the reader chose to browse without creating an account. */
    var isVisitorMode: Boolean
        get() = sharedPreferences.getBoolean("visitor_mode", false)
        set(value) = sharedPreferences.edit().putBoolean("visitor_mode", value).apply()

    var favouriteCategories: Set<String>
        get() = sharedPreferences.getStringSet("favourite_categories", emptySet()) ?: emptySet()
        set(value) = sharedPreferences.edit().putStringSet("favourite_categories", value).apply()

    /** Stores canonical topic IDs synchronously so selection survives an immediate app close. */
    fun saveFavouriteCategories(topicIds: Set<String>) {
        sharedPreferences.edit()
            .putStringSet("favourite_categories", topicIds.toSortedSet())
            .commit()
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

    /** Reader-only color theme: "paper", "sepia", or "dark". */
    var readerThemeMode: String
        get() = sharedPreferences.getString("reader_theme_mode", "paper") ?: "paper"
        set(value) = sharedPreferences.edit()
            .putString("reader_theme_mode", value.takeIf { it in setOf("paper", "sepia", "dark") } ?: "paper")
            .apply()

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
        // Account/session data must not erase a reader's device-level typography choices.
        sharedPreferences.edit()
            .remove("onboarding_complete")
            .remove("visitor_mode")
            .remove("favourite_categories")
            .apply()
    }
}
