package com.ibitvalley.writon.modern.core.telemetry

import android.app.Activity
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.core.review.PlayReviewGateway
import com.ibitvalley.writon.modern.core.review.ReviewGateway
import com.ibitvalley.writon.modern.core.review.ReviewInfoResult
import com.ibitvalley.writon.modern.core.review.ReviewLaunchResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Value-moment review prompter coordinating Google Play In-App Review requests.
 * Prompts strictly after consuming a pending ReviewOpportunity (ReaderMilestone or ConfirmedPublication)
 * at a stable destination settlement (Home or Library).
 * Enforces session mutex, single prompt per session, and active activity lifecycle checks.
 */
class ReviewPrompter(
    private val gateway: ReviewGateway = PlayReviewGateway()
) {
    private val inFlight = AtomicBoolean(false)
    private val promptedThisSession = AtomicBoolean(false)

    /**
     * Attempts to consume a pending ReviewOpportunity and launch the native review flow.
     * Returns true if a review flow launch was initiated, false otherwise.
     */
    fun tryConsumePendingOpportunity(
        activity: Activity,
        preferences: UserPreferences,
        scope: CoroutineScope = CoroutineScope(Dispatchers.Main)
    ): Boolean {
        if (promptedThisSession.get()) return false
        if (activity.isFinishing || activity.isDestroyed) return false

        val tracker = preferences.growthTracker
        val opportunity = tracker.getPendingOpportunity() ?: return false // No pending value moment!

        if (!inFlight.compareAndSet(false, true)) return false

        val signals = tracker.reviewSignals()
        val decision = ReviewEligibility.evaluateForOpportunity(signals, opportunity)
        if (decision != ReviewDecision.ELIGIBLE) {
            inFlight.set(false)
            WritOnTelemetry.reviewSuppressed(activity.applicationContext, decision.name)
            return false
        }

        val triggerPath = opportunity.valuePath
        val appAgeDays = ((System.currentTimeMillis() - signals.firstOpenAtMillis).coerceAtLeast(0L) / 86_400_000L).toInt()
        WritOnTelemetry.reviewEligible(
            context = activity.applicationContext,
            path = triggerPath,
            appAgeDays = appAgeDays,
            rolloutCohort = signals.rolloutBucket,
            eligibilityVersion = signals.eligibilityVersion
        )

        scope.launch {
            try {
                WritOnTelemetry.reviewInfoRequested(activity.applicationContext, triggerPath)
                val infoResult = gateway.requestReviewInfo(activity)
                when (infoResult) {
                    is ReviewInfoResult.Failure -> {
                        inFlight.set(false)
                        WritOnTelemetry.reviewInfoFailed(
                            activity.applicationContext,
                            infoResult.error?.javaClass?.simpleName ?: "request_failed",
                            triggerPath
                        )
                    }
                    is ReviewInfoResult.Success -> {
                        if (activity.isFinishing || activity.isDestroyed) {
                            inFlight.set(false)
                            return@launch
                        }
                        val consumedOpportunity = tracker.consumePendingOpportunity(opportunity)
                        if (consumedOpportunity != opportunity) {
                            inFlight.set(false)
                            return@launch
                        }
                        // Mark review attempt immediately before valid launch
                        tracker.markReviewRequested()
                        promptedThisSession.set(true)
                        WritOnTelemetry.reviewFlowLaunchStarted(activity.applicationContext, triggerPath)

                        val launchResult = gateway.launchReview(activity, infoResult.reviewInfo)
                        inFlight.set(false)
                        when (launchResult) {
                            is ReviewLaunchResult.Finished -> {
                                WritOnTelemetry.reviewFlowTaskFinished(activity.applicationContext, triggerPath)
                            }
                            is ReviewLaunchResult.Failed -> {
                                WritOnTelemetry.reviewFlowLaunchFailed(
                                    activity.applicationContext,
                                    launchResult.error?.javaClass?.simpleName ?: "launch_failed",
                                    triggerPath
                                )
                            }
                            is ReviewLaunchResult.ActivityUnavailable -> Unit
                        }
                    }
                }
            } catch (e: Exception) {
                inFlight.set(false)
                WritOnTelemetry.reviewInfoFailed(
                    activity.applicationContext,
                    e.javaClass.simpleName,
                    triggerPath
                )
            }
        }
        return true
    }

    companion object {
        val Default: ReviewPrompter by lazy { ReviewPrompter() }
    }
}
