package com.ibitvalley.writon.modern.core.preferences

import android.content.Context
import android.content.SharedPreferences

class UserPreferences(context: Context) {
    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences("writon_prefs", Context.MODE_PRIVATE)

    var isOnboardingComplete: Boolean
        get() = sharedPreferences.getBoolean("onboarding_complete", false)
        set(value) = sharedPreferences.edit().putBoolean("onboarding_complete", value).apply()

    fun clear() {
        sharedPreferences.edit().clear().apply()
    }
}
