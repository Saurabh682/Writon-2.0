package com.ibitvalley.writon.modern.core.telemetry

import android.content.Context
import android.os.Bundle
import com.google.firebase.FirebaseApp
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.google.firebase.perf.FirebasePerformance
import kotlinx.coroutines.CancellationException

internal fun shouldReportNonFatal(throwable: Throwable): Boolean =
    throwable !is CancellationException

internal interface PerformanceTraceHandle {
    fun start()
    fun stop()
}

internal fun <T> runWithPerformanceTrace(
    traceFactory: () -> PerformanceTraceHandle,
    block: () -> T
): T {
    val trace = try {
        traceFactory()
    } catch (_: Exception) {
        null
    }
    val started = if (trace != null) {
        try {
            trace.start()
            true
        } catch (_: Exception) {
            false
        }
    } else {
        false
    }

    return try {
        block()
    } finally {
        if (started) runCatching { trace?.stop() }
    }
}

internal suspend fun <T> runWithPerformanceTraceSuspending(
    traceFactory: () -> PerformanceTraceHandle,
    block: suspend () -> T
): T {
    val trace = try {
        traceFactory()
    } catch (_: Exception) {
        null
    }
    val started = if (trace != null) {
        try {
            trace.start()
            true
        } catch (_: Exception) {
            false
        }
    } else {
        false
    }

    return try {
        block()
    } finally {
        if (started) runCatching { trace?.stop() }
    }
}

/**
 * Privacy-safe boundary for WritOn's no-cost Firebase observability tools.
 *
 * Never pass email addresses, display names, story text, Firebase ID tokens, or push tokens
 * into this object. Events are limited to feature outcomes and app health.
 */
object WritOnTelemetry {

    fun appLaunched(context: Context) {
        log(context, "writon_launch")
    }

    fun authOutcome(provider: String, succeeded: Boolean) {
        logFromFirebase("auth_outcome") {
            putString("provider", provider)
            putString("result", if (succeeded) "success" else "failure")
        }
    }

    fun logSignUp(method: String) {
        logFromFirebase(FirebaseAnalytics.Event.SIGN_UP) {
            putString(FirebaseAnalytics.Param.METHOD, method)
        }
    }

    fun logLogin(method: String) {
        logFromFirebase(FirebaseAnalytics.Event.LOGIN) {
            putString(FirebaseAnalytics.Param.METHOD, method)
        }
    }

    fun logShare(contentType: String, contentId: String, context: Context? = null) {
        log(context ?: FirebaseApp.getInstance().applicationContext, FirebaseAnalytics.Event.SHARE) {
            putString(FirebaseAnalytics.Param.CONTENT_TYPE, contentType)
            putString(FirebaseAnalytics.Param.ITEM_ID, contentId)
        }
    }

    fun logCardGenerated(
        storyId: String,
        excerptLength: Int,
        sizeRatio: String,
        theme: String,
        context: Context? = null
    ) {
        log(context ?: FirebaseApp.getInstance().applicationContext, "card_generated") {
            putString(FirebaseAnalytics.Param.ITEM_ID, storyId.take(100))
            putLong("excerpt_length", excerptLength.toLong())
            putString("size_ratio", sizeRatio)
            putString("card_theme", theme)
            putString("platform", "android")
        }
    }

    fun logCardShareInitiated(
        storyId: String,
        sizeRatio: String,
        targetPackage: String? = null,
        context: Context? = null
    ) {
        log(context ?: FirebaseApp.getInstance().applicationContext, "card_share_initiated") {
            putString(FirebaseAnalytics.Param.ITEM_ID, storyId.take(100))
            putString("size_ratio", sizeRatio)
            targetPackage?.let { putString("target_package", it) }
            putString("platform", "android")
        }
    }

    fun versionCheck(context: Context, source: String, updateRequired: Boolean) {
        log(context, "version_check") {
            putString("source", source)
            putString("update", if (updateRequired) "required" else "none")
        }
    }

    fun pushRegistration(context: Context, succeeded: Boolean) {
        log(context, "push_registration") {
            putString("result", if (succeeded) "success" else "failure")
        }
    }

    fun pushTopicSubscription(context: Context, subscribed: Boolean, succeeded: Boolean) {
        log(context, "push_topic_subscription") {
            putString("action", if (subscribed) "subscribe" else "unsubscribe")
            putString("result", if (succeeded) "success" else "failure")
        }
    }

    fun pushPermission(context: Context, granted: Boolean) {
        log(context, "push_permission") {
            putString("result", if (granted) "granted" else "denied")
        }
    }

    fun pushReceived(context: Context, kind: String, hasStoryTarget: Boolean) {
        log(context, "push_received") {
            putString("kind", kind.take(36))
            putString("target", if (hasStoryTarget) "story" else "notifications")
        }
    }

    fun pushDisplayed(context: Context, kind: String) {
        log(context, "push_displayed") {
            putString("kind", kind.take(36))
        }
    }

    fun pushDisplaySuppressed(context: Context, reason: String) {
        log(context, "push_display_suppressed") {
            putString("reason", reason.take(36))
        }
    }

    fun pushOpened(context: Context, targetRoute: String) {
        log(context, "push_opened") {
            putString("target", if (targetRoute.startsWith("reader/")) "story" else "notifications")
        }
    }

    fun activation(context: Context, path: String, daysSinceFirstOpen: Int, campaignAttributed: Boolean) {
        log(context, "writon_activation") {
            putString("path", path.takeIf { it == "reader" || it == "writer" } ?: "reader")
            putInt("days_since_first_open", daysSinceFirstOpen.coerceAtLeast(0))
            putString("campaign_attributed", campaignAttributed.toString())
        }
    }

    fun campaignReferrerValidated(context: Context, matchedCampaign: Boolean) {
        log(context, "campaign_referrer_validated") {
            putString("result", if (matchedCampaign) "matched" else "not_matched")
        }
    }

    // --- Compose Screen Analytics ---

    fun screenView(context: Context?, screenName: String, screenClass: String = "ComposeDestination") {
        log(context, FirebaseAnalytics.Event.SCREEN_VIEW) {
            putString(FirebaseAnalytics.Param.SCREEN_NAME, screenName.take(100))
            putString(FirebaseAnalytics.Param.SCREEN_CLASS, screenClass.take(100))
        }
    }

    fun onboardingEntrySelected(context: Context?, choice: String) {
        log(context, "onboarding_entry_selected") {
            putString("choice", choice.takeIf { it in setOf("read", "write", "sign_in") } ?: "unknown")
        }
    }

    fun storyFinderOpened(context: Context?, candidateCount: Int) {
        log(context, "story_finder_opened") {
            putInt("candidate_count", candidateCount.coerceAtLeast(0))
        }
    }

    fun storyFinderFilterChanged(
        context: Context?,
        dimension: String,
        isSet: Boolean,
        resultCount: Int
    ) {
        log(context, "story_finder_filter") {
            putString("dimension", dimension.takeIf { it in setOf("language", "category", "time") } ?: "unknown")
            putString("selection", if (isSet) "set" else "any")
            putInt("result_count", resultCount.coerceAtLeast(0))
        }
    }

    fun storyFinderStoryOpened(
        context: Context?,
        storyId: String,
        resultPosition: Int,
        constraintCount: Int
    ) {
        log(context, "story_finder_story_opened") {
            putString(FirebaseAnalytics.Param.ITEM_ID, storyId.take(100))
            putInt("result_position", resultPosition.coerceAtLeast(1))
            putInt("constraint_count", constraintCount.coerceIn(0, 3))
        }
    }

    // --- In-App Update Telemetry ---

    fun inAppUpdateAvailable(context: Context?, availableVersionCode: Int) {
        log(context, "in_app_update_available") {
            putInt("available_version", availableVersionCode)
        }
    }

    fun inAppUpdateStarted(context: Context?) {
        log(context, "in_app_update_started")
    }

    fun inAppUpdateDownloaded(context: Context?) {
        log(context, "in_app_update_downloaded")
    }

    fun inAppUpdateInstalled(context: Context?) {
        log(context, "in_app_update_installed")
    }

    fun inAppUpdateCompletionRequested(context: Context?) {
        log(context, "in_app_update_completion_requested")
    }

    fun inAppUpdateDismissed(context: Context?) {
        log(context, "in_app_update_dismissed")
    }

    fun remoteConfigFetched(context: Context?, status: String) {
        log(context, "remote_config_fetched") {
            putString("status", status.takeIf { it in setOf("updated", "cached", "failure") } ?: "failure")
        }
    }

    // --- In-App Review Privacy-Safe Telemetry (Phase 9) ---

    fun reviewEligible(
        context: Context,
        path: String,
        appAgeDays: Int,
        rolloutCohort: Int,
        eligibilityVersion: String = ReviewEligibility.ELIGIBILITY_VERSION
    ) {
        log(context, "review_eligible") {
            putString("eligibility_version", eligibilityVersion)
            putString("value_path", path.take(20))
            putInt("app_age_days", appAgeDays.coerceIn(0, 3650))
            putInt("rollout_cohort", rolloutCohort.coerceIn(0, 99))
        }
    }

    fun reviewSuppressed(
        context: Context,
        reason: String,
        eligibilityVersion: String = ReviewEligibility.ELIGIBILITY_VERSION
    ) {
        log(context, "review_suppressed") {
            putString("reason", reason.take(32))
            putString("eligibility_version", eligibilityVersion)
        }
    }

    fun reviewInfoRequested(context: Context, triggerPath: String = "unknown") {
        log(context, "review_info_requested") {
            putString("trigger_path", triggerPath.take(20))
            putString("eligibility_version", ReviewEligibility.ELIGIBILITY_VERSION)
        }
    }

    fun reviewInfoFailed(context: Context, errorClass: String, triggerPath: String = "unknown") {
        log(context, "review_info_failed") {
            putString("error_class", errorClass.take(40))
            putString("trigger_path", triggerPath.take(20))
            putString("eligibility_version", ReviewEligibility.ELIGIBILITY_VERSION)
        }
    }

    fun reviewFlowLaunchStarted(context: Context, triggerPath: String = "unknown") {
        log(context, "review_flow_launch_started") {
            putString("trigger_path", triggerPath.take(20))
            putString("eligibility_version", ReviewEligibility.ELIGIBILITY_VERSION)
        }
    }

    fun reviewFlowTaskFinished(context: Context, triggerPath: String = "unknown") {
        log(context, "review_flow_task_finished") {
            putString("trigger_path", triggerPath.take(20))
            putString("eligibility_version", ReviewEligibility.ELIGIBILITY_VERSION)
        }
    }

    fun reviewFlowLaunchFailed(context: Context, errorReason: String, triggerPath: String = "unknown") {
        log(context, "review_flow_launch_failed") {
            putString("error_reason", errorReason.take(40))
            putString("trigger_path", triggerPath.take(20))
            putString("eligibility_version", ReviewEligibility.ELIGIBILITY_VERSION)
        }
    }

    // --- Diagnostic & Crashlytics ---

    /**
     * Records diagnostic non-fatal exceptions to Crashlytics.
     * Note: Background non-fatal exceptions do NOT automatically block user review eligibility.
     */
    fun recordNonFatal(operation: String, throwable: Throwable) {
        if (!shouldReportNonFatal(throwable)) return
        FirebaseCrashlytics.getInstance().apply {
            setCustomKey("operation", operation.take(64))
            recordException(throwable)
        }
    }

    suspend fun <T> trace(traceName: String, block: suspend () -> T): T {
        return runWithPerformanceTraceSuspending(
            traceFactory = {
                val firebaseTrace = FirebasePerformance.getInstance().newTrace(traceName)
                object : PerformanceTraceHandle {
                    override fun start() = firebaseTrace.start()
                    override fun stop() = firebaseTrace.stop()
                }
            },
            block = block
        )
    }

    fun beginTrace(traceName: String): AutoCloseable {
        val handle = try {
            val firebaseTrace = FirebasePerformance.getInstance().newTrace(traceName)
            object : PerformanceTraceHandle {
                override fun start() = firebaseTrace.start()
                override fun stop() = firebaseTrace.stop()
            }
        } catch (_: Exception) {
            null
        }
        val started = if (handle != null) runCatching { handle.start() }.isSuccess else false
        var closed = false
        return AutoCloseable {
            if (!closed) {
                closed = true
                if (started) runCatching { handle?.stop() }
            }
        }
    }

    fun <T> traceSync(traceName: String, block: () -> T): T {
        return runWithPerformanceTrace(
            traceFactory = {
                val firebaseTrace = FirebasePerformance.getInstance().newTrace(traceName)
                object : PerformanceTraceHandle {
                    override fun start() = firebaseTrace.start()
                    override fun stop() = firebaseTrace.stop()
                }
            },
            block = block
        )
    }

    // --- Scorecard Funnel Telemetry (Week 1 Baseline) ---

    fun storyOpened(
        context: Context?,
        storyId: String,
        title: String? = null,
        authorId: String? = null,
        readingTimeMin: Int? = null
    ) {
        log(context, "story_opened") {
            putString(FirebaseAnalytics.Param.ITEM_ID, storyId.take(100))
            if (title != null) putString(FirebaseAnalytics.Param.ITEM_NAME, title.take(100))
            if (authorId != null) putString("author_id", authorId.take(100))
            if (readingTimeMin != null) putInt("reading_time_min", readingTimeMin.coerceAtLeast(0))
            putString("platform", "android")
        }
    }

    fun storyCompleted(
        context: Context?,
        storyId: String,
        authorId: String? = null,
        readingTimeMin: Int = 0,
        readSeconds: Int = 0,
        isFirstStory: Boolean = false
    ) {
        log(context, "story_completed") {
            putString(FirebaseAnalytics.Param.ITEM_ID, storyId.take(100))
            if (authorId != null) putString("author_id", authorId.take(100))
            putInt("reading_time_min", readingTimeMin.coerceAtLeast(0))
            putInt("dwell_seconds", readSeconds.coerceAtLeast(0))
            putString("is_first_story", isFirstStory.toString())
            putString("platform", "android")
        }
    }

    fun firstStoryCompleted(context: Context?, storyId: String) {
        log(context, "reader_first_story_completed") {
            putString(FirebaseAnalytics.Param.ITEM_ID, storyId.take(100))
            putString("milestone", "activation")
            putString("platform", "android")
        }
    }

    fun secondStoryCompleted(context: Context?, storyId: String) {
        log(context, "reader_second_story_completed") {
            putString(FirebaseAnalytics.Param.ITEM_ID, storyId.take(100))
            putString("milestone", "engagement")
            putString("platform", "android")
        }
    }

    fun nextStoryTapped(context: Context?, fromStoryId: String, toStoryId: String) {
        log(context, "next_story_tapped") {
            putString("from_story_id", fromStoryId.take(100))
            putString("to_story_id", toStoryId.take(100))
            putString("platform", "android")
        }
    }

    fun authorFollowed(context: Context?, authorId: String, source: String = "reader_continuation") {
        log(context, "author_followed") {
            putString("author_id", authorId.take(100))
            putString("source", source.take(40))
            putString("platform", "android")
        }
    }

    fun storyBookmarked(context: Context?, storyId: String, isGuest: Boolean) {
        log(context, "story_bookmarked") {
            putString(FirebaseAnalytics.Param.ITEM_ID, storyId.take(100))
            putString("is_guest", isGuest.toString())
            putString("platform", "android")
        }
    }

    /**
     * Set of user IDs to permanently exclude from Google Analytics / Firebase Telemetry.
     * Devices signed in with these IDs will have analytics collection disabled and marked internal.
     */
    private val EXCLUDED_USER_IDS: Set<String> = setOf(
        "FMpu4Aqe25R07h8Mz0TrHzRliVp1",
        "2da1tH0nPIhYmsSXuKtwdSONj542"
    )

    @Volatile
    private var isTelemetryExcluded: Boolean = com.ibitvalley.writon.BuildConfig.DEBUG

    fun isExcludedUser(userId: String?): Boolean =
        userId != null && userId in EXCLUDED_USER_IDS

    fun setTelemetryExcluded(excluded: Boolean) {
        isTelemetryExcluded = excluded
    }

    fun isTelemetryDisabled(): Boolean = isTelemetryExcluded

    /**
     * Sets or clears the GA4 User-ID and Crashlytics User-ID.
     * Always pass the pseudonymous Firebase UID, never PII (email/phone).
     */
    fun setUserId(context: Context?, userId: String?) {
        try {
            val ctx = context?.applicationContext ?: context ?: return
            val cleanId = userId?.takeIf { it.isNotBlank() }
            val shouldExclude = com.ibitvalley.writon.BuildConfig.DEBUG || (cleanId != null && cleanId in EXCLUDED_USER_IDS)
            isTelemetryExcluded = shouldExclude

            val analytics = FirebaseAnalytics.getInstance(ctx)
            if (shouldExclude) {
                // Shut off analytics collection on internal/debug test devices
                analytics.setAnalyticsCollectionEnabled(false)
                analytics.setUserProperty("traffic_type", "internal")
                analytics.setUserProperty("is_internal_tester", "true")
            } else {
                analytics.setAnalyticsCollectionEnabled(true)
                analytics.setUserProperty("traffic_type", null)
                analytics.setUserProperty("is_internal_tester", null)
            }

            analytics.setUserId(cleanId)
            FirebaseCrashlytics.getInstance().setUserId(cleanId ?: "")
        } catch (_: Exception) {
            // Gracefully ignore during unit tests or uninitialized Firebase
        }
    }

    private fun logFromFirebase(event: String, parameters: Bundle.() -> Unit) {
        if (isTelemetryExcluded) return
        log(FirebaseApp.getInstance().applicationContext, event, parameters)
    }

    private fun log(context: Context?, event: String, parameters: Bundle.() -> Unit = {}) {
        if (isTelemetryExcluded) return
        try {
            val ctx = context?.applicationContext ?: context ?: return
            FirebaseAnalytics.getInstance(ctx).logEvent(event, Bundle().apply(parameters))
        } catch (_: Exception) {
            // Gracefully ignore during unit tests or uninitialized Firebase
        }
    }
}
