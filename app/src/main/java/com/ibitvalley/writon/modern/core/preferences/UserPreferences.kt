package com.ibitvalley.writon.modern.core.preferences

import android.content.Context
import android.content.SharedPreferences

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

    /** True if biometric / fingerprint unlock is enabled by user */
    var isBiometricEnabled: Boolean
        get() = sharedPreferences.getBoolean("biometric_enabled", false)
        set(value) = sharedPreferences.edit().putBoolean("biometric_enabled", value).apply()

    /** App language code: "en", "hi", "es", "fr", "bn", "mr", or "system" */
    var appLanguage: String
        get() = sharedPreferences.getString("app_language", "en") ?: "en"
        set(value) = sharedPreferences.edit().putString("app_language", value).apply()

    fun clear() {
        sharedPreferences.edit().clear().apply()
    }
}
