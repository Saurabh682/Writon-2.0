package com.ibitvalley.writon.modern.core.notification

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry

class WritOnFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("WritOnFCM", "A refreshed FCM token is ready for durable registration.")
        PushNotificationRegistration.enqueue(applicationContext)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val data = remoteMessage.data
        val notification = remoteMessage.notification

        val title = data["title"]
            ?: notification?.title
            ?: "New interaction on WritOn"

        val body = data["body"]
            ?: notification?.body
            ?: "Someone interacted with your story."

        val storyId = data["storyId"] ?: data["postId"]
        val actorName = data["actorName"] ?: data["authorName"]
        val kind = data["kind"] ?: data["type"] ?: "interaction"
        val targetRoute = data["targetRoute"]

        WritOnTelemetry.pushReceived(applicationContext, kind, !storyId.isNullOrBlank())

        if (kind == "daily_digest") {
            WritOnNotificationManager.showDailyEditorialNotification(
                context = applicationContext,
                storyTitle = data["storyTitle"] ?: title,
                storySummary = data["storySummary"] ?: body,
                storyId = storyId ?: "",
                authorName = data["authorName"] ?: actorName ?: "WritOn",
                notificationId = 2001
            )
        } else {
            WritOnNotificationManager.showInteractionNotification(
                context = applicationContext,
                title = title,
                message = body,
                storyId = storyId,
                kind = kind,
                targetRoute = targetRoute,
                notificationId = notificationTrayId(data["notificationId"], remoteMessage.messageId),
            )
        }
    }
}

internal fun notificationTrayId(
    logicalNotificationId: String?,
    messageId: String?,
    fallback: Long = System.currentTimeMillis(),
): Int = (logicalNotificationId?.takeIf(String::isNotBlank)
    ?: messageId?.takeIf(String::isNotBlank)
    ?: fallback.toString()).hashCode() and Int.MAX_VALUE
