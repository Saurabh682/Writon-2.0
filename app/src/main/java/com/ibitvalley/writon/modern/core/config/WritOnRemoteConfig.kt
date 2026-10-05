package com.ibitvalley.writon.modern.core.config

import android.content.Context
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import com.google.firebase.remoteconfig.FirebaseRemoteConfigSettings
import com.ibitvalley.writon.BuildConfig
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class RemoteFeatureFlags(
    val updateIndicatorEnabled: Boolean = true,
    val dailyDigestNotificationEnabled: Boolean = true,
    val exploreCuratedBannerEnabled: Boolean = true,
    val exploreTrendingStoriesLimit: Int = 10,
    val existingUserPreferencesCardEnabled: Boolean = false,
    val personalizedHomeFeedEnabled: Boolean = false,
    val isFetchComplete: Boolean = false
)

internal enum class RemoteConfigFetchStatus(val telemetryValue: String) {
    Updated("updated"),
    Cached("cached"),
    Failure("failure")
}

internal fun resolveRemoteConfigFetchStatus(succeeded: Boolean, activated: Boolean): RemoteConfigFetchStatus =
    when {
        !succeeded -> RemoteConfigFetchStatus.Failure
        activated -> RemoteConfigFetchStatus.Updated
        else -> RemoteConfigFetchStatus.Cached
    }

internal fun normalizeExploreTrendingLimit(value: Long): Int = value.coerceIn(1L, 20L).toInt()

internal fun resolveRemoteConfigBoolean(source: Int, value: Boolean, default: Boolean): Boolean =
    if (source == FirebaseRemoteConfig.VALUE_SOURCE_STATIC) default else value

/**
 * Singleton managing Firebase Remote Config for dynamic feature toggles and UI parameters.
 *
 * NOTE: Authority separation contract:
 * - Hard minimum-version blocks and mandatory upgrade gating are strictly managed by /api/v1/app/version.
 * - Remote Config controls non-critical feature rollouts, experimental UI elements, and limits.
 *
 * Caching Policy:
 * - Debug builds: 0 seconds (instant refresh).
 * - Production builds: 3600 seconds (1 hour) to safely remain within Firebase's 100k free tier quota.
 */
object WritOnRemoteConfig {

    private const val TAG = "WritOnRemoteConfig"

    private val remoteConfig: FirebaseRemoteConfig?
        get() = try {
            if (FirebaseApp.getApps(FirebaseApp.getInstance().applicationContext).isNotEmpty()) {
                FirebaseRemoteConfig.getInstance()
            } else null
        } catch (_: Exception) {
            null
        }

    private val _features = MutableStateFlow(RemoteFeatureFlags())
    val features: StateFlow<RemoteFeatureFlags> = _features.asStateFlow()

    fun initialize(context: Context) {
        try {
            val config = remoteConfig ?: return
            val minFetchInterval = if (BuildConfig.DEBUG) 0L else 3600L

            val settings = FirebaseRemoteConfigSettings.Builder()
                .setMinimumFetchIntervalInSeconds(minFetchInterval)
                .build()

            config.setConfigSettingsAsync(settings)
                .continueWithTask { config.setDefaultsAsync(R.xml.remote_config_defaults) }
                .continueWithTask { config.fetchAndActivate() }
                .addOnCompleteListener { task ->
                    val status = resolveRemoteConfigFetchStatus(
                        succeeded = task.isSuccessful,
                        activated = task.isSuccessful && task.result
                    )
                    if (task.isSuccessful) {
                        Log.i(TAG, "Remote Config ready. Status: ${status.telemetryValue}")
                    } else {
                        Log.w(TAG, "Remote Config fetch failed, using in-app defaults: ${task.exception?.message}")
                    }
                    _features.value = readFeatureFlags(config).copy(isFetchComplete = true)
                    WritOnTelemetry.remoteConfigFetched(context, status.telemetryValue)
                }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to initialize Remote Config: ${e.message}")
        }
    }

    val isFeatureUpdateIndicatorEnabled: Boolean
        get() = features.value.updateIndicatorEnabled

    val isDailyDigestNotificationEnabled: Boolean
        get() = features.value.dailyDigestNotificationEnabled

    val isEditorAiAssistEnabled: Boolean
        get() = getBoolean("editor_ai_assist_enabled", true)

    val isExploreCuratedBannerEnabled: Boolean
        get() = features.value.exploreCuratedBannerEnabled

    val exploreTrendingStoriesLimit: Long
        get() = features.value.exploreTrendingStoriesLimit.toLong()

    val isQuoteCardShareEnabled: Boolean
        get() = getBoolean("story_reader_quote_card_share_enabled", true)

    private fun getBoolean(key: String, default: Boolean): Boolean {
        return try {
            val config = remoteConfig ?: return default
            val value = config.getValue(key)
            resolveRemoteConfigBoolean(value.source, value.asBoolean(), default)
        } catch (_: Exception) {
            default
        }
    }

    private fun getLong(key: String, default: Long): Long {
        return try {
            remoteConfig?.getLong(key) ?: default
        } catch (_: Exception) {
            default
        }
    }


    private fun readFeatureFlags(config: FirebaseRemoteConfig): RemoteFeatureFlags = RemoteFeatureFlags(
        updateIndicatorEnabled = config.getBoolean("feature_update_indicator_enabled"),
        dailyDigestNotificationEnabled = config.getBoolean("daily_digest_notification_enabled"),
        exploreCuratedBannerEnabled = config.getBoolean("explore_curated_banner_enabled"),
        exploreTrendingStoriesLimit = normalizeExploreTrendingLimit(
            config.getLong("explore_trending_stories_limit")
        ),
        existingUserPreferencesCardEnabled = config.getBoolean("existing_user_preferences_card_enabled"),
        personalizedHomeFeedEnabled = config.getBoolean("personalized_home_feed_enabled")
    )
}
