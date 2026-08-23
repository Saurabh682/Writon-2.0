package com.ibitvalley.writon.modern.core.locale

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import java.util.Locale

data class AppLanguage(
    val code: String,
    val name: String,
    val nativeName: String,
    val subtitle: String
)

object LocaleManager {

    val SupportedLanguages = listOf(
        AppLanguage(
            code = "en",
            name = "English",
            nativeName = "English",
            subtitle = "Default • Global"
        ),
        AppLanguage(
            code = "hi",
            name = "Hindi",
            nativeName = "हिन्दी",
            subtitle = "भारत • कहानियाँ और कविताएँ"
        ),
        AppLanguage(
            code = "es",
            name = "Spanish",
            nativeName = "Español",
            subtitle = "España y América Latina"
        ),
        AppLanguage(
            code = "fr",
            name = "French",
            nativeName = "Français",
            subtitle = "France et Francophonie"
        ),
        AppLanguage(
            code = "bn",
            name = "Bengali",
            nativeName = "বাংলা",
            subtitle = "সাহিত্য ও সংস্কৃতি"
        ),
        AppLanguage(
            code = "mr",
            name = "Marathi",
            nativeName = "मराठी",
            subtitle = "महाराष्ट्र • कथा आणि साहित्य"
        )
    )

    fun applyLanguage(context: Context, languageCode: String, recreateActivity: Boolean = true) {
        val prefs = UserPreferences(context)
        prefs.appLanguage = languageCode

        val locale = if (languageCode == "system" || languageCode.isBlank()) {
            Locale.getDefault()
        } else {
            Locale(languageCode)
        }
        Locale.setDefault(locale)

        val appLocale = if (languageCode == "system" || languageCode.isBlank()) {
            LocaleListCompat.getEmptyLocaleList()
        } else {
            LocaleListCompat.forLanguageTags(languageCode)
        }
        AppCompatDelegate.setApplicationLocales(appLocale)

        if (recreateActivity) {
            findActivity(context)?.recreate()
        }
    }

    fun getCurrentLanguage(context: Context): AppLanguage {
        val prefs = UserPreferences(context)
        val savedCode = prefs.appLanguage
        return SupportedLanguages.find { it.code.equals(savedCode, ignoreCase = true) }
            ?: SupportedLanguages.first()
    }

    fun wrapContext(context: Context): Context {
        val prefs = UserPreferences(context)
        val savedCode = prefs.appLanguage
        if (savedCode.isBlank() || savedCode == "system" || savedCode == "en") {
            return context
        }
        val locale = Locale(savedCode)
        Locale.setDefault(locale)
        val config = Configuration(context.resources.configuration)
        config.setLocale(locale)
        config.setLayoutDirection(locale)
        return context.createConfigurationContext(config)
    }

    private fun findActivity(context: Context): Activity? {
        var ctx = context
        while (ctx is ContextWrapper) {
            if (ctx is Activity) return ctx
            ctx = ctx.baseContext
        }
        return null
    }
}
