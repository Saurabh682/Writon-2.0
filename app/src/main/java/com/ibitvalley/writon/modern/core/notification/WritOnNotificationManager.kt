package com.ibitvalley.writon.modern.core.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.WritOnModernActivity

object WritOnNotificationManager {

    const val CHANNEL_INTERACTIONS = "writon_interactions_channel"
    const val CHANNEL_EDITORIAL = "writon_editorial_channel"
    const val CHANNEL_UPDATES = "writon_updates_channel"

    private const val BRAND_COLOR = 0xFFE75A2A.toInt()

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val interactionsChannel = NotificationChannel(
                CHANNEL_INTERACTIONS,
                "Interactions & Social",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Applauds, comments, follows, and spark replies from fellow readers"
                enableLights(true)
                enableVibration(true)
                setShowBadge(true)
            }

            val editorialChannel = NotificationChannel(
                CHANNEL_EDITORIAL,
                "Editorial & Daily Reads",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Curated stories, daily editorial recommendations, and highlights"
                enableLights(true)
                setShowBadge(true)
            }

            val updatesChannel = NotificationChannel(
                CHANNEL_UPDATES,
                "Story Updates & Publishing",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Draft sync and publication confirmations"
                setShowBadge(false)
            }

            manager.createNotificationChannels(listOf(interactionsChannel, editorialChannel, updatesChannel))
        }
    }

    fun showInteractionNotification(
        context: Context,
        title: String,
        message: String,
        storyId: String? = null,
        actorName: String? = null,
        kind: String = "interaction",
        notificationId: Int = (System.currentTimeMillis() % 100000).toInt()
    ) {
        val intent = Intent(context, WritOnModernActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (!storyId.isNullOrBlank()) {
                putExtra("storyId", storyId)
                putExtra("targetRoute", "reader/$storyId")
            } else {
                putExtra("targetRoute", "notifications")
            }
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val largeIcon = try {
            BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher)
        } catch (_: Exception) {
            null
        }

        val subtext = when (kind.lowercase()) {
            "applaud" -> "Applaud on your story"
            "comment" -> "New reflection"
            "follow" -> "New follower"
            "spark_reaction" -> "Spark Reaction"
            else -> "WritOn Story"
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_INTERACTIONS)
            .setSmallIcon(R.drawable.ic_stat_writon)
            .setLargeIcon(largeIcon)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(message)
                    .setSummaryText(subtext)
            )
            .setColor(BRAND_COLOR)
            .setColorized(true)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .apply {
                if (!storyId.isNullOrBlank()) {
                    addAction(
                        R.drawable.ic_stat_writon,
                        "Read Story",
                        pendingIntent
                    )
                }
            }
            .build()

        try {
            NotificationManagerCompat.from(context).notify(notificationId, notification)
        } catch (e: SecurityException) {
            // Android 13+ POST_NOTIFICATIONS permission not yet granted
            e.printStackTrace()
        }
    }

    fun showDailyEditorialNotification(
        context: Context,
        storyTitle: String,
        storySummary: String,
        storyId: String,
        authorName: String,
        notificationId: Int = 1001
    ) {
        val intent = Intent(context, WritOnModernActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("storyId", storyId)
            putExtra("targetRoute", "reader/$storyId")
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val largeIcon = try {
            BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher)
        } catch (_: Exception) {
            null
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_EDITORIAL)
            .setSmallIcon(R.drawable.ic_stat_writon)
            .setLargeIcon(largeIcon)
            .setContentTitle("Curated for you • $authorName")
            .setContentText(storyTitle)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .setBigContentTitle(storyTitle)
                    .bigText(storySummary.ifBlank { "A quiet, thoughtful story ready for your morning reading." })
                    .setSummaryText("Daily Editorial Read")
            )
            .setColor(BRAND_COLOR)
            .setColorized(true)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .addAction(R.drawable.ic_stat_writon, "Read Now", pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(notificationId, notification)
        } catch (_: SecurityException) {}
    }

    fun sendTestNotification(context: Context) {
        showInteractionNotification(
            context = context,
            title = "Aarav Mehta applauded your story",
            message = "“The Tactical Synergy of the Decoy Coffee Mug” received 5 new applauds from readers in Philosophy.",
            storyId = "first-try",
            actorName = "Aarav Mehta",
            kind = "applaud",
            notificationId = 777
        )
    }
}
