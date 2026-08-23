package com.ibitvalley.writon.modern.core.notification

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class WritOnFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("WritOnFCM", "New FCM token received: $token")
        // Token can be synced to server during login / network sync
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
