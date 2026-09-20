package com.ibitvalley.writon.modern.core.review

import android.app.Activity
import com.google.android.play.core.review.ReviewInfo
import com.google.android.play.core.review.ReviewManager
import com.google.android.play.core.review.ReviewManagerFactory
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

sealed interface ReviewInfoResult {
    data class Success(val reviewInfo: ReviewInfo) : ReviewInfoResult
    data class Failure(val error: Throwable?) : ReviewInfoResult
}

sealed interface ReviewLaunchResult {
    object Finished : ReviewLaunchResult
    data class Failed(val error: Throwable?) : ReviewLaunchResult
    object ActivityUnavailable : ReviewLaunchResult
}

/**
 * Abstraction around Google Play In-App Review API.
 * Enables deterministic lifecycle isolation, test doubles, and concurrency safety.
 */
interface ReviewGateway {
    suspend fun requestReviewInfo(activity: Activity): ReviewInfoResult
    suspend fun launchReview(activity: Activity, reviewInfo: ReviewInfo): ReviewLaunchResult
}

/**
 * Production gateway interacting with Google Play Core ReviewManager.
 */
class PlayReviewGateway : ReviewGateway {
    override suspend fun requestReviewInfo(activity: Activity): ReviewInfoResult {
        if (activity.isFinishing || activity.isDestroyed) {
            return ReviewInfoResult.Failure(IllegalStateException("Activity destroyed before requestReviewInfo"))
        }
        return suspendCancellableCoroutine { continuation ->
            try {
                val manager: ReviewManager = ReviewManagerFactory.create(activity)
                val flow = manager.requestReviewFlow()
                flow.addOnCompleteListener { task ->
                    if (task.isSuccessful && task.result != null) {
                        continuation.resume(ReviewInfoResult.Success(task.result))
                    } else {
                        continuation.resume(ReviewInfoResult.Failure(task.exception))
                    }
                }
            } catch (e: Exception) {
                continuation.resume(ReviewInfoResult.Failure(e))
            }
        }
    }

    override suspend fun launchReview(activity: Activity, reviewInfo: ReviewInfo): ReviewLaunchResult {
        if (activity.isFinishing || activity.isDestroyed) {
            return ReviewLaunchResult.ActivityUnavailable
        }
        return suspendCancellableCoroutine { continuation ->
            try {
                val manager: ReviewManager = ReviewManagerFactory.create(activity)
                val flow = manager.launchReviewFlow(activity, reviewInfo)
                flow.addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        continuation.resume(ReviewLaunchResult.Finished)
                    } else {
                        continuation.resume(ReviewLaunchResult.Failed(task.exception))
                    }
                }
            } catch (e: Exception) {
                continuation.resume(ReviewLaunchResult.Failed(e))
            }
        }
    }
}
