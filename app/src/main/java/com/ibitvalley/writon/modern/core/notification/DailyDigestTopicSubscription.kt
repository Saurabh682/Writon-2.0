package com.ibitvalley.writon.modern.core.notification

import android.content.Context
import com.google.firebase.messaging.FirebaseMessaging
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry

internal object DailyDigestTopicPolicy {
    fun shouldSubscribe(isSignedIn: Boolean, digestEnabled: Boolean = true, permissionGranted: Boolean = true): Boolean =
        digestEnabled && permissionGranted && !isSignedIn
}

/**
 * Keeps the broadcast topic guest-only. Signed-in readers receive direct notifications whose
 * delivery is governed by their server-side notification preferences.
 */
object DailyDigestTopicSubscription {
    private const val TOPIC = "daily_digest"

    fun sync(
        context: Context,
        isSignedIn: Boolean,
        digestEnabled: Boolean = true,
        onComplete: (Boolean) -> Unit = {}
    ) {
        val shouldSubscribe = DailyDigestTopicPolicy.shouldSubscribe(
            isSignedIn, digestEnabled,
            androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()
        )
        val messaging = FirebaseMessaging.getInstance()
        val task = if (shouldSubscribe) {
            messaging.subscribeToTopic(TOPIC)
        } else {
            messaging.unsubscribeFromTopic(TOPIC)
        }
        task.addOnCompleteListener { outcome ->
            WritOnTelemetry.pushTopicSubscription(
                context.applicationContext,
                subscribed = shouldSubscribe,
                succeeded = outcome.isSuccessful
            )
            onComplete(outcome.isSuccessful)
        }
    }
}
