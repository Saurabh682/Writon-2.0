package com.ibitvalley.writon.modern.core.notification

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.ibitvalley.writon.modern.normalizeNotificationRoute
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

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

        val storyId = notificationStoryId(data)
        val actorName = data["actorName"] ?: data["authorName"]
        val kind = data["kind"] ?: data["type"] ?: "interaction"
        val targetRoute = notificationTargetRoute(data)

        if (!storyId.isNullOrBlank()) {
            try {
                // Persist before returning from the FCM callback; a detached coroutine can be killed.
                runBlocking(Dispatchers.IO) {
                    val owner = FirebaseAuth.getInstance().currentUser?.uid ?: "device"
                    WritOnDatabase.getDatabase(applicationContext).incomingStoryDao()
                        .capture(owner, storyId, "push", data["storyTitle"])
                }
            } catch (error: Exception) {
                Log.w("WritOnInbox", "Could not retain received story link", error)
            }
        }

        WritOnTelemetry.pushReceived(applicationContext, kind, !storyId.isNullOrBlank())

        if (kind == "daily_digest") {
            WritOnNotificationManager.showDailyEditorialNotification(
                context = applicationContext,
                storyTitle = data["storyTitle"] ?: title,
                storySummary = data["storySummary"] ?: body,
                storyId = storyId ?: "",
                authorName = data["authorName"] ?: actorName ?: "WritOn",
                targetRoute = targetRoute,
                notificationId = notificationTrayId(data["notificationId"], remoteMessage.messageId)
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

internal fun notificationTargetRoute(data: Map<String, String>): String? =
    listOf("targetRoute", "target_route", "route", "url", "link")
        .firstNotNullOfOrNull(data::get)
        ?.let { normalizeNotificationRoute(it) ?: it }

internal fun notificationStoryId(data: Map<String, String>): String? =
    listOf("storyId", "story_id", "postId", "post_id")
        .firstNotNullOfOrNull(data::get)
        ?: normalizeNotificationRoute(notificationTargetRoute(data))
            ?.takeIf { it.startsWith("reader/") }
            ?.removePrefix("reader/")

internal fun notificationTrayId(
    logicalNotificationId: String?,
    messageId: String?,
    fallback: Long = System.currentTimeMillis(),
): Int = (logicalNotificationId?.takeIf(String::isNotBlank)
    ?: messageId?.takeIf(String::isNotBlank)
    ?: fallback.toString()).hashCode() and Int.MAX_VALUE
