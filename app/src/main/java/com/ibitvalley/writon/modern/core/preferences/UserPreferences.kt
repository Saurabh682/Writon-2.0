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

    fun clear() {
        sharedPreferences.edit().clear().apply()
    }
}
