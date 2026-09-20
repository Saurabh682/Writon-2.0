package com.ibitvalley.writon.modern.core.telemetry

import android.content.Context
import android.content.SharedPreferences
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import com.google.firebase.auth.FirebaseAuth
import com.ibitvalley.writon.BuildConfig
import java.net.URLDecoder
import java.nio.charset.StandardCharsets

/**
 * Outcome decisions for Google Play In-App Review eligibility.
 * Evaluated deterministically as a pure function.
 */
enum class ReviewDecision {
    ELIGIBLE,
    TOO_EARLY_INSTALL_AGE,
    INSUFFICIENT_READER_EVIDENCE,
    INSUFFICIENT_WRITER_EVIDENCE,
    UNRESOLVED_USER_FAILURE,
    FAILURE_QUIET_PERIOD,
    AUTOMATIC_COOLDOWN_ACTIVE,
    SESSION_ALREADY_ATTEMPTED,
    ROLLOUT_DISABLED,
    COHORT_EXCLUDED,
    VERSION_EXCLUDED
}

/**
 * Pending value moment opportunity required before any review evaluation can proceed.
 * Eliminates cold startup prompts and generic navigation triggers.
 */
sealed interface ReviewOpportunity {
    val valuePath: String
    val identifier: String
    val timestamp: Long

    data class ReaderMilestone(
        val storyId: String,
        override val timestamp: Long = System.currentTimeMillis()
    ) : ReviewOpportunity {
        override val valuePath: String get() = "reader"
        override val identifier: String get() = storyId
    }

    data class ConfirmedPublication(
        val postId: String,
        override val timestamp: Long = System.currentTimeMillis()
    ) : ReviewOpportunity {
        override val valuePath: String get() = "writer"
        override val identifier: String get() = postId
    }
}

/**
 * Data snapshot of local reader/writer engagement and product health signals.
 */
data class ReviewSignals(
    val firstOpenAtMillis: Long = 0L,
    val qualifyingStoryCount: Int = 0,               // Profile-scoped stories with progress >= 70%
    val totalEngagedSeconds: Int = 0,                // Profile-scoped bounded foreground reading seconds
    val hasConfirmedPublication: Boolean = false,    // Profile-scoped authoritative server-confirmed publication
    val hasUnresolvedUserFailure: Boolean = false,   // Active user-visible blocker
    val activeFailures: Set<String> = emptySet(),    // Set of active unrecovered failure types
    val lastFailureResolvedAtMillis: Long = 0L,      // Timestamp when all user failures were resolved
    val lastAutomaticReviewAttemptAtMillis: Long = 0L,// Timestamp of last native review prompt launch
    val rolloutEnabled: Boolean = false,             // Fail-closed remote gate
    val rolloutBucket: Int = 0,                      // Stable install bucket (0..99)
    val rolloutPercent: Int = 0,                     // Fail-closed remote gate
    val readerEnabled: Boolean = false,              // Fail-closed remote gate
    val writerEnabled: Boolean = false,              // Fail-closed remote gate
    val currentVersionCode: Int = BuildConfig.VERSION_CODE,
    val minimumVersionCode: Int = 120,
    val excludedVersionCodes: Set<Int> = emptySet(),
    val eligibilityVersion: String = ReviewEligibility.ELIGIBILITY_VERSION
)

/**
 * Pure deterministic review eligibility engine implementing `review_eligibility_v1`.
 */
object ReviewEligibility {
    const val ELIGIBILITY_VERSION = "review_eligibility_v1"
    const val MIN_INSTALL_AGE_DAYS = 7L
    const val MIN_QUALIFYING_STORIES = 3
    const val MIN_ENGAGED_SECONDS = 180
    const val FAILURE_QUIET_PERIOD_HOURS = 72L
    const val AUTOMATIC_COOLDOWN_DAYS = 120L

    private const val DAY_MILLIS = 86_400_000L
    private const val HOUR_MILLIS = 3_600_000L

    fun evaluate(signals: ReviewSignals, nowMillis: Long = System.currentTimeMillis()): ReviewDecision {
        evaluateGuards(signals, nowMillis)?.let { return it }

        // Value path qualification:
        val isEligibleReader = signals.readerEnabled &&
                signals.qualifyingStoryCount >= MIN_QUALIFYING_STORIES &&
                signals.totalEngagedSeconds >= MIN_ENGAGED_SECONDS
        val isEligibleWriter = signals.writerEnabled && signals.hasConfirmedPublication

        if (!isEligibleReader && !isEligibleWriter) {
            return if (!signals.hasConfirmedPublication) {
                ReviewDecision.INSUFFICIENT_READER_EVIDENCE
            } else {
                ReviewDecision.INSUFFICIENT_WRITER_EVIDENCE
            }
        }

        return ReviewDecision.ELIGIBLE
    }

    fun evaluateForOpportunity(
        signals: ReviewSignals,
        opportunity: ReviewOpportunity,
        nowMillis: Long = System.currentTimeMillis()
    ): ReviewDecision {
        evaluateGuards(signals, nowMillis)?.let { return it }
        return when (opportunity) {
            is ReviewOpportunity.ReaderMilestone -> {
                if (signals.readerEnabled &&
                    signals.qualifyingStoryCount >= MIN_QUALIFYING_STORIES &&
                    signals.totalEngagedSeconds >= MIN_ENGAGED_SECONDS
                ) ReviewDecision.ELIGIBLE else ReviewDecision.INSUFFICIENT_READER_EVIDENCE
            }
            is ReviewOpportunity.ConfirmedPublication -> {
                if (signals.writerEnabled && signals.hasConfirmedPublication) {
                    ReviewDecision.ELIGIBLE
                } else {
                    ReviewDecision.INSUFFICIENT_WRITER_EVIDENCE
                }
            }
        }
    }

    private fun evaluateGuards(signals: ReviewSignals, nowMillis: Long): ReviewDecision? {
        if (!signals.rolloutEnabled) return ReviewDecision.ROLLOUT_DISABLED
        if (signals.rolloutBucket >= signals.rolloutPercent) return ReviewDecision.COHORT_EXCLUDED
        if (signals.currentVersionCode < signals.minimumVersionCode || signals.excludedVersionCodes.contains(signals.currentVersionCode)) {
            return ReviewDecision.VERSION_EXCLUDED
        }
        if (signals.eligibilityVersion != ELIGIBILITY_VERSION) return ReviewDecision.ROLLOUT_DISABLED

        val firstOpen = signals.firstOpenAtMillis
        if (firstOpen <= 0L || (nowMillis - firstOpen) < (MIN_INSTALL_AGE_DAYS * DAY_MILLIS)) {
            return ReviewDecision.TOO_EARLY_INSTALL_AGE
        }
        if (signals.hasUnresolvedUserFailure || signals.activeFailures.isNotEmpty()) {
            return ReviewDecision.UNRESOLVED_USER_FAILURE
        }
        if (signals.lastFailureResolvedAtMillis > 0L &&
            nowMillis - signals.lastFailureResolvedAtMillis < FAILURE_QUIET_PERIOD_HOURS * HOUR_MILLIS
        ) return ReviewDecision.FAILURE_QUIET_PERIOD
        if (signals.lastAutomaticReviewAttemptAtMillis > 0L &&
            nowMillis - signals.lastAutomaticReviewAttemptAtMillis < AUTOMATIC_COOLDOWN_DAYS * DAY_MILLIS
        ) return ReviewDecision.AUTOMATIC_COOLDOWN_ACTIVE
        return null
    }

    fun isEligible(signals: ReviewSignals, nowMillis: Long = System.currentTimeMillis()): Boolean {
        return evaluate(signals, nowMillis) == ReviewDecision.ELIGIBLE
    }
}

/**
 * Local growth & engagement telemetry tracker.
 * Hardened for profile-scoped evidence, category-safe failure tracking, and pending opportunity life-cycle.
 */
class GrowthTracker(
    private val context: Context,
    private val preferences: SharedPreferences,
    private val activationReporter: (Context, String, Int, Boolean) -> Unit = WritOnTelemetry::activation,
    private val profileIdProvider: () -> String = {
        FirebaseAuth.getInstance().currentUser?.uid?.takeIf { it.isNotBlank() } ?: "guest"
    }
) {
    private fun getProfileId(): String = profileIdProvider().takeIf { it.isNotBlank() } ?: "guest"

    fun recordFirstOpen() {
        if (!preferences.contains(KEY_FIRST_OPEN_AT)) {
            preferences.edit().putLong(KEY_FIRST_OPEN_AT, System.currentTimeMillis()).apply()
        }
        if (!preferences.contains(KEY_ROLLOUT_BUCKET)) {
            val bucket = (Math.random() * 100).toInt().coerceIn(0, 99)
            preferences.edit().putInt(KEY_ROLLOUT_BUCKET, bucket).apply()
        }
    }

    fun updateRemoteConfig(
        enabled: Boolean,
        rolloutPercent: Int,
        minimumVersionCode: Int,
        excludedVersionCodes: List<Int>,
        eligibilityVersion: String,
        readerEnabled: Boolean,
        writerEnabled: Boolean
    ) {
        val compatible = eligibilityVersion == ReviewEligibility.ELIGIBILITY_VERSION
        preferences.edit()
            .putBoolean(KEY_REMOTE_ENABLED, compatible && enabled)
            .putInt(KEY_REMOTE_ROLLOUT_PERCENT, if (compatible) rolloutPercent.coerceIn(0, 100) else 0)
            .putInt(KEY_REMOTE_MIN_VERSION_CODE, minimumVersionCode)
            .putString(KEY_REMOTE_EXCLUDED_VERSIONS, excludedVersionCodes.joinToString(","))
            .putBoolean(KEY_REMOTE_READER_ENABLED, compatible && readerEnabled)
            .putBoolean(KEY_REMOTE_WRITER_ENABLED, compatible && writerEnabled)
            .putBoolean(KEY_REMOTE_CONFIG_FETCHED, true)
            .apply()
    }

    fun disableRemoteReviewConfig() {
        preferences.edit()
            .putBoolean(KEY_REMOTE_CONFIG_FETCHED, false)
            .putBoolean(KEY_REMOTE_ENABLED, false)
            .putInt(KEY_REMOTE_ROLLOUT_PERCENT, 0)
            .putBoolean(KEY_REMOTE_READER_ENABLED, false)
            .putBoolean(KEY_REMOTE_WRITER_ENABLED, false)
            .apply()
    }

    fun recordReaderProgress(storyId: String, progress: Float, additionalSeconds: Int) {
        recordFirstOpen()
        val profileId = getProfileId()
        val keyStories = "${KEY_QUALIFYING_STORIES}_$profileId"
        val keySeconds = "${KEY_ENGAGED_SECONDS}_$profileId"

        val qualifyingStories = preferences.getStringSet(keyStories, emptySet()).orEmpty().toMutableSet()
        if (progress >= 0.70f) {
            qualifyingStories.add(storyId)
        }
        val boundedSeconds = additionalSeconds.coerceIn(0, 60)
        val totalSeconds = preferences.getInt(keySeconds, 0) + boundedSeconds

        preferences.edit()
            .putStringSet(keyStories, qualifyingStories)
            .putInt(keySeconds, totalSeconds)
            .apply()

        // Milestone 1 (Activation): First story completed
        val keyFirstStory = "${KEY_FIRST_STORY_EMITTED}_$profileId"
        if (qualifyingStories.size >= 1 && !preferences.getBoolean(keyFirstStory, false)) {
            preferences.edit().putBoolean(keyFirstStory, true).apply()
            WritOnTelemetry.firstStoryCompleted(context, storyId)
        }

        // Milestone 2 (Engagement): Second story completed
        val keySecondStory = "${KEY_SECOND_STORY_EMITTED}_$profileId"
        if (qualifyingStories.size >= 2 && !preferences.getBoolean(keySecondStory, false)) {
            preferences.edit().putBoolean(keySecondStory, true).apply()
            WritOnTelemetry.secondStoryCompleted(context, storyId)
        }

        // Check if user crossed the 3-story & 180s Reader milestone
        val keyMilestoneEmitted = "${KEY_READER_MILESTONE_EMITTED}_$profileId"
        if (qualifyingStories.size >= ReviewEligibility.MIN_QUALIFYING_STORIES &&
            totalSeconds >= ReviewEligibility.MIN_ENGAGED_SECONDS &&
            !preferences.getBoolean(keyMilestoneEmitted, false)
        ) {
            preferences.edit().putBoolean(keyMilestoneEmitted, true).apply()
            savePendingOpportunity(profileId, ReviewOpportunity.ReaderMilestone(storyId))
        }

        if (qualifyingStories.size >= 2 && totalSeconds >= 180) {
            activate("reader")
        }
    }

    fun recordStrongReaderAction() {
        recordFirstOpen()
        activate("reader")
    }

    fun recordDraftLength(characterCount: Int) {
        recordFirstOpen()
        if (characterCount >= 100) activate("writer")
    }

    fun recordPublishedStory(postId: String = "unknown") {
        recordFirstOpen()
        val profileId = getProfileId()
        val keyPublished = "${KEY_HAS_PUBLISHED}_$profileId"
        preferences.edit().putBoolean(keyPublished, true).apply()

        val keyMilestoneEmitted = "${KEY_WRITER_MILESTONE_EMITTED}_$profileId"
        if (!preferences.getBoolean(keyMilestoneEmitted, false)) {
            preferences.edit().putBoolean(keyMilestoneEmitted, true).apply()
            savePendingOpportunity(profileId, ReviewOpportunity.ConfirmedPublication(postId))
        }

        activate("writer")
    }

    /**
     * Category-safe failure recording.
     * Preserves active failures per type (auth_failure, publish_failure, draft_loss, sync_conflict, feed_load_error).
     */
    fun recordUserVisibleFailure(failureType: String = "general") {
        val activeFailures = preferences.getStringSet(KEY_ACTIVE_FAILURES, emptySet()).orEmpty().toMutableSet()
        activeFailures.add(failureType)
        preferences.edit()
            .putStringSet(KEY_ACTIVE_FAILURES, activeFailures)
            .putBoolean(KEY_HAS_UNRESOLVED_FAILURE, true)
            .putString(KEY_LAST_FAILURE_TYPE, failureType)
            .putLong(KEY_LAST_FAILURE_AT, System.currentTimeMillis())
            .apply()
    }

    /**
     * Category-safe failure resolution.
     * Clears only the resolved failure type; sets quiet period timestamp once all active failures resolve.
     */
    fun recordFailureResolved(failureType: String = "general") {
        val activeFailures = preferences.getStringSet(KEY_ACTIVE_FAILURES, emptySet()).orEmpty().toMutableSet()
        if (!activeFailures.remove(failureType)) return
        val hasRemaining = activeFailures.isNotEmpty()
        val editor = preferences.edit()
            .putStringSet(KEY_ACTIVE_FAILURES, activeFailures)
            .putBoolean(KEY_HAS_UNRESOLVED_FAILURE, hasRemaining)
        if (!hasRemaining) {
            editor.putLong(KEY_LAST_FAILURE_RESOLVED_AT, System.currentTimeMillis())
        }
        editor.apply()
    }

    @Synchronized
    fun hasPendingOpportunity(): Boolean = readPendingOpportunity(getProfileId()) != null

    @Synchronized
    fun getPendingOpportunity(): ReviewOpportunity? = readPendingOpportunity(getProfileId())

    @Synchronized
    fun consumePendingOpportunity(expected: ReviewOpportunity? = null): ReviewOpportunity? {
        val profileId = getProfileId()
        val current = readPendingOpportunity(profileId) ?: return null
        if (expected != null && current != expected) return null
        preferences.edit()
            .remove(profileKey(KEY_PENDING_OPPORTUNITY_TYPE, profileId))
            .remove(profileKey(KEY_PENDING_OPPORTUNITY_ID, profileId))
            .remove(profileKey(KEY_PENDING_OPPORTUNITY_AT, profileId))
            .commit()
        return current
    }

    @Synchronized
    private fun savePendingOpportunity(profileId: String, opportunity: ReviewOpportunity) {
        val type = when (opportunity) {
            is ReviewOpportunity.ReaderMilestone -> PENDING_TYPE_READER
            is ReviewOpportunity.ConfirmedPublication -> PENDING_TYPE_WRITER
        }
        preferences.edit()
            .putString(profileKey(KEY_PENDING_OPPORTUNITY_TYPE, profileId), type)
            .putString(profileKey(KEY_PENDING_OPPORTUNITY_ID, profileId), opportunity.identifier)
            .putLong(profileKey(KEY_PENDING_OPPORTUNITY_AT, profileId), opportunity.timestamp)
            .commit()
    }

    private fun readPendingOpportunity(profileId: String): ReviewOpportunity? {
        val type = preferences.getString(profileKey(KEY_PENDING_OPPORTUNITY_TYPE, profileId), null) ?: return null
        val identifier = preferences.getString(profileKey(KEY_PENDING_OPPORTUNITY_ID, profileId), null)
            ?.takeIf { it.isNotBlank() } ?: return null
        val timestamp = preferences.getLong(profileKey(KEY_PENDING_OPPORTUNITY_AT, profileId), 0L)
        return when (type) {
            PENDING_TYPE_READER -> ReviewOpportunity.ReaderMilestone(identifier, timestamp)
            PENDING_TYPE_WRITER -> ReviewOpportunity.ConfirmedPublication(identifier, timestamp)
            else -> null
        }
    }

    private fun profileKey(base: String, profileId: String): String = "${base}_$profileId"

    fun reviewSignals(currentVersionCode: Int = BuildConfig.VERSION_CODE): ReviewSignals {
        val profileId = getProfileId()
        val keyStories = "${KEY_QUALIFYING_STORIES}_$profileId"
        val keySeconds = "${KEY_ENGAGED_SECONDS}_$profileId"
        val keyPublished = "${KEY_HAS_PUBLISHED}_$profileId"

        val activeFailures = preferences.getStringSet(KEY_ACTIVE_FAILURES, emptySet()).orEmpty()
        val configFetched = preferences.getBoolean(KEY_REMOTE_CONFIG_FETCHED, false)

        val excluded = preferences.getString(KEY_REMOTE_EXCLUDED_VERSIONS, "")
            ?.split(",")
            ?.mapNotNull { it.trim().toIntOrNull() }
            ?.toSet() ?: emptySet()

        return ReviewSignals(
            firstOpenAtMillis = preferences.getLong(KEY_FIRST_OPEN_AT, 0L),
            qualifyingStoryCount = preferences.getStringSet(keyStories, emptySet()).orEmpty().size,
            totalEngagedSeconds = preferences.getInt(keySeconds, 0),
            hasConfirmedPublication = preferences.getBoolean(keyPublished, false),
            hasUnresolvedUserFailure = preferences.getBoolean(KEY_HAS_UNRESOLVED_FAILURE, false) || activeFailures.isNotEmpty(),
            activeFailures = activeFailures,
            lastFailureResolvedAtMillis = preferences.getLong(KEY_LAST_FAILURE_RESOLVED_AT, 0L),
            lastAutomaticReviewAttemptAtMillis = preferences.getLong(KEY_LAST_REVIEW_REQUEST_AT, 0L),
            rolloutEnabled = if (configFetched) preferences.getBoolean(KEY_REMOTE_ENABLED, false) else false, // Fail-closed
            rolloutBucket = preferences.getInt(KEY_ROLLOUT_BUCKET, 0),
            rolloutPercent = if (configFetched) preferences.getInt(KEY_REMOTE_ROLLOUT_PERCENT, 0) else 0,   // Fail-closed
            readerEnabled = if (configFetched) preferences.getBoolean(KEY_REMOTE_READER_ENABLED, false) else false,
            writerEnabled = if (configFetched) preferences.getBoolean(KEY_REMOTE_WRITER_ENABLED, false) else false,
            currentVersionCode = currentVersionCode,
            minimumVersionCode = preferences.getInt(KEY_REMOTE_MIN_VERSION_CODE, 120),
            excludedVersionCodes = excluded
        )
    }

    fun markReviewRequested() {
        preferences.edit().putLong(KEY_LAST_REVIEW_REQUEST_AT, System.currentTimeMillis()).apply()
    }

    fun saveCampaignAttribution(deliveryId: String, language: String?) {
        preferences.edit()
            .putBoolean(KEY_CAMPAIGN_ATTRIBUTED, true)
            .putString(KEY_CAMPAIGN_DELIVERY, deliveryId)
            .putString(KEY_CAMPAIGN_LANGUAGE, language)
            .apply()
    }

    fun completeCampaignAttributionCheck() {
        if (preferences.getBoolean(KEY_REFERRER_CHECK_COMPLETE, false)) return
        val pendingPath = preferences.getString(KEY_PENDING_ACTIVATION_PATH, null)
        preferences.edit()
            .putBoolean(KEY_REFERRER_CHECK_COMPLETE, true)
            .remove(KEY_PENDING_ACTIVATION_PATH)
            .apply()
        pendingPath?.let(::activate)
    }

    fun needsCampaignAttributionCheck(): Boolean =
        !preferences.getBoolean(KEY_REFERRER_CHECK_COMPLETE, false)

    private fun activate(path: String) {
        if (preferences.getBoolean(KEY_ACTIVATION_EMITTED, false)) return
        if (!preferences.getBoolean(KEY_REFERRER_CHECK_COMPLETE, false)) {
            preferences.edit().putString(KEY_PENDING_ACTIVATION_PATH, path).apply()
            return
        }
        val firstOpen = preferences.getLong(KEY_FIRST_OPEN_AT, System.currentTimeMillis())
        val daysSinceFirstOpen = ((System.currentTimeMillis() - firstOpen).coerceAtLeast(0L) / 86_400_000L).toInt()
        val campaignAttributed = preferences.getBoolean(KEY_CAMPAIGN_ATTRIBUTED, false)
        preferences.edit().putBoolean(KEY_ACTIVATION_EMITTED, true).apply()
        activationReporter(context, path, daysSinceFirstOpen, campaignAttributed)
    }

    companion object {
        internal const val KEY_FIRST_OPEN_AT = "growth_first_open_at"
        internal const val KEY_ROLLOUT_BUCKET = "growth_rollout_bucket"
        internal const val KEY_QUALIFYING_STORIES = "growth_qualifying_stories"
        internal const val KEY_ENGAGED_SECONDS = "growth_engaged_seconds"
        internal const val KEY_HAS_PUBLISHED = "growth_has_published"
        internal const val KEY_FIRST_STORY_EMITTED = "growth_first_story_emitted"
        internal const val KEY_SECOND_STORY_EMITTED = "growth_second_story_emitted"
        internal const val KEY_READER_MILESTONE_EMITTED = "growth_reader_milestone_emitted"
        internal const val KEY_WRITER_MILESTONE_EMITTED = "growth_writer_milestone_emitted"
        internal const val KEY_ACTIVATION_EMITTED = "growth_activation_emitted"
        internal const val KEY_ACTIVE_FAILURES = "growth_active_failures"
        internal const val KEY_HAS_UNRESOLVED_FAILURE = "growth_has_unresolved_failure"
        internal const val KEY_LAST_FAILURE_TYPE = "growth_last_failure_type"
        internal const val KEY_LAST_FAILURE_AT = "growth_last_failure_at"
        internal const val KEY_LAST_FAILURE_RESOLVED_AT = "growth_last_failure_resolved_at"
        internal const val KEY_LAST_REVIEW_REQUEST_AT = "growth_last_review_request_at"
        internal const val KEY_PENDING_OPPORTUNITY_TYPE = "growth_pending_review_type"
        internal const val KEY_PENDING_OPPORTUNITY_ID = "growth_pending_review_id"
        internal const val KEY_PENDING_OPPORTUNITY_AT = "growth_pending_review_at"
        internal const val KEY_CAMPAIGN_ATTRIBUTED = "growth_campaign_attributed"
        internal const val KEY_CAMPAIGN_DELIVERY = "growth_campaign_delivery"
        internal const val KEY_CAMPAIGN_LANGUAGE = "growth_campaign_language"
        internal const val KEY_REFERRER_CHECK_COMPLETE = "growth_referrer_check_complete"
        internal const val KEY_PENDING_ACTIVATION_PATH = "growth_pending_activation_path"

        // Remote review configuration keys
        internal const val KEY_REMOTE_CONFIG_FETCHED = "growth_remote_config_fetched"
        internal const val KEY_REMOTE_ENABLED = "growth_remote_review_enabled"
        internal const val KEY_REMOTE_ROLLOUT_PERCENT = "growth_remote_rollout_percent"
        internal const val KEY_REMOTE_MIN_VERSION_CODE = "growth_remote_min_version_code"
        internal const val KEY_REMOTE_EXCLUDED_VERSIONS = "growth_remote_excluded_versions"
        internal const val KEY_REMOTE_READER_ENABLED = "growth_remote_reader_enabled"
        internal const val KEY_REMOTE_WRITER_ENABLED = "growth_remote_writer_enabled"

        private const val PENDING_TYPE_READER = "reader"
        private const val PENDING_TYPE_WRITER = "writer"
    }
}

/**
 * Validates campaign delivery strings and extracts target languages for attribution.
 */
object CampaignAttribution {
    private val VALID_PLATFORMS = setOf("ig", "ig_story", "threads", "x", "pin", "fb", "founder")
    private val VALID_LANGUAGES = setOf("en", "hi", "bn", "mr")

    fun validatedDeliveryLanguage(deliveryId: String): String? {
        val parts = deliveryId.split("_")
        if (parts.size < 5) return null
        if (!parts[0].matches(Regex("^\\d{4}$"))) return null
        if (!parts[1].matches(Regex("^d\\d{2}$"))) return null

        val platform = if (parts.size >= 6 && parts[2] == "ig" && parts[3] == "story") "ig_story" else parts[2]
        if (!VALID_PLATFORMS.contains(platform)) return null

        val lang = parts.find { it in VALID_LANGUAGES } ?: return null
        return lang
    }
}

/**
 * Handles Play Install Referrer parsing and attribution tracking.
 */
object InstallReferrerTracker {
    fun start(context: Context, tracker: GrowthTracker) {
        if (!tracker.needsCampaignAttributionCheck()) return
        val referrerClient = InstallReferrerClient.newBuilder(context.applicationContext).build()
        try {
            referrerClient.startConnection(object : InstallReferrerStateListener {
            override fun onInstallReferrerSetupFinished(responseCode: Int) {
                try {
                    if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                        val response = referrerClient.installReferrer
                        val matched = parseAndSave(response.installReferrer, tracker)
                        WritOnTelemetry.campaignReferrerValidated(context.applicationContext, matched)
                    }
                } catch (_: Exception) {
                    WritOnTelemetry.campaignReferrerValidated(context.applicationContext, false)
                } finally {
                    tracker.completeCampaignAttributionCheck()
                    referrerClient.endConnection()
                }
            }

            override fun onInstallReferrerServiceDisconnected() {
                tracker.completeCampaignAttributionCheck()
            }
            })
        } catch (_: Exception) {
            WritOnTelemetry.campaignReferrerValidated(context.applicationContext, false)
            tracker.completeCampaignAttributionCheck()
            runCatching { referrerClient.endConnection() }
        }
    }

    internal fun parseAndSave(rawReferrer: String?, tracker: GrowthTracker): Boolean {
        if (rawReferrer.isNullOrBlank()) return false
        val parameters = rawReferrer.split('&').mapNotNull { pair ->
            val separator = pair.indexOf('=')
            if (separator <= 0) return@mapNotNull null
            val key = URLDecoder.decode(pair.substring(0, separator), StandardCharsets.UTF_8.name())
            val value = URLDecoder.decode(pair.substring(separator + 1), StandardCharsets.UTF_8.name())
            key to value
        }.toMap()
        if (parameters["utm_campaign"] != "writon_growth_2026_09") return false
        val deliveryId = parameters["utm_content"] ?: return false
        val language = CampaignAttribution.validatedDeliveryLanguage(deliveryId)
        if (language != null) {
            tracker.saveCampaignAttribution(deliveryId, language)
            return true
        }
        val medium = parameters["utm_medium"]
        if (medium == "story_reader" || medium == "next_story" || parameters["utm_source"] == "web_reader") {
            tracker.saveCampaignAttribution("story_reader_${deliveryId.take(40)}", "en")
            return true
        }
        return false
    }
}
