package com.ibitvalley.writon.modern.core.notification

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class WritOnFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("WritOnFCM", "New FCM token received: $token")
        CoroutineScope(Dispatchers.IO).launch {
            PushNotificationRegistration.syncCurrentDevice(applicationContext, token)
                .onFailure { Log.w("WritOnFCM", "Could not register refreshed FCM token", it) }
        }
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

        WritOnTelemetry.pushReceived(applicationContext, kind, !storyId.isNullOrBlank())

        WritOnNotificationManager.showInteractionNotification(
            context = applicationContext,
            title = title,
            message = body,
            storyId = storyId,
            actorName = actorName,
            kind = kind
        )
    }
}
