package com.ibitvalley.writon.modern.core.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.WritOnModernActivity
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry

object WritOnNotificationManager {

    const val CHANNEL_INTERACTIONS = "writon_interactions_channel"
    const val CHANNEL_EDITORIAL = "writon_editorial_channel"
    const val CHANNEL_UPDATES = "writon_updates_channel"

    private const val BRAND_COLOR = 0xFFE75A2A.toInt()
    private const val GROUP_INTERACTIONS = "writon_interactions"
    private const val GROUP_EDITORIAL = "writon_editorial"

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val interactionsChannel = NotificationChannel(
                CHANNEL_INTERACTIONS,
                context.getString(R.string.notification_channel_interactions_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = context.getString(R.string.notification_channel_interactions_description)
                enableLights(true)
                enableVibration(true)
                setShowBadge(true)
            }

            val editorialChannel = NotificationChannel(
                CHANNEL_EDITORIAL,
                context.getString(R.string.notification_channel_editorial_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = context.getString(R.string.notification_channel_editorial_description)
                enableLights(true)
                setShowBadge(true)
            }

            val updatesChannel = NotificationChannel(
                CHANNEL_UPDATES,
                context.getString(R.string.notification_channel_updates_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = context.getString(R.string.notification_channel_updates_description)
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
        kind: String = "interaction",
        targetRoute: String? = null,
        notificationId: Int = (System.currentTimeMillis() % 100000).toInt()
    ) {
        val intent = Intent(context, WritOnModernActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (!targetRoute.isNullOrBlank()) {
                putExtra("targetRoute", targetRoute)
                if (!storyId.isNullOrBlank()) putExtra("storyId", storyId)
            } else if (!storyId.isNullOrBlank()) {
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
            BitmapFactory.decodeResource(context.resources, R.drawable.appcon)
        } catch (_: Exception) {
            null
        }

        val presentation = notificationPresentation(kind)
        val actionLabel = if (kind.lowercase() in setOf("app_update", "update") ||
            targetRoute == "play_store" ||
            targetRoute?.contains("play.google.com") == true
        ) {
            context.getString(R.string.notification_action_update)
        } else if (targetRoute == "write") {
            context.getString(R.string.continue_writing_untitled)
        } else if (storyId.isNullOrBlank()) {
            context.getString(R.string.notification_action_view_activity)
        } else {
            context.getString(R.string.notification_action_read_story)
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_INTERACTIONS)
            .setSmallIcon(R.drawable.ic_stat_writon)
            .setLargeIcon(largeIcon)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(message)
                    .setSummaryText(context.getString(presentation.subtextRes))
            )
            .setColor(BRAND_COLOR)
            .setSubText(context.getString(presentation.subtextRes))
            .setCategory(presentation.category)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setGroup(GROUP_INTERACTIONS)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .addAction(R.drawable.ic_stat_writon, actionLabel, pendingIntent)
            .build()

        postNotification(context, notificationId, notification, kind)
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
            BitmapFactory.decodeResource(context.resources, R.drawable.appcon)
        } catch (_: Exception) {
            null
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_EDITORIAL)
            .setSmallIcon(R.drawable.ic_stat_writon)
            .setLargeIcon(largeIcon)
            .setContentTitle(context.getString(R.string.notification_daily_title))
            .setContentText(context.getString(R.string.notification_story_by_author, storyTitle, authorName))
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .setBigContentTitle(storyTitle)
                    .bigText(storySummary.ifBlank { context.getString(R.string.notification_daily_fallback) })
                    .setSummaryText(context.getString(R.string.notification_subtext_daily_read))
            )
            .setColor(BRAND_COLOR)
            .setSubText(context.getString(R.string.notification_subtext_daily_read))
            .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setGroup(GROUP_EDITORIAL)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .addAction(
                R.drawable.ic_stat_writon,
                context.getString(R.string.notification_action_read_story),
                pendingIntent
            )
            .build()

        postNotification(context, notificationId, notification, "daily_digest")
    }

    fun sendTestNotification(context: Context) {
        showInteractionNotification(
            context = context,
            title = context.getString(R.string.notification_test_title),
            message = context.getString(R.string.notification_test_body),
            kind = "system_test",
            notificationId = 777
        )
    }

    private fun postNotification(
        context: Context,
        notificationId: Int,
        notification: android.app.Notification,
        kind: String
    ) {
        val runtimePermissionGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        val manager = NotificationManagerCompat.from(context)
        if (!runtimePermissionGranted || !manager.areNotificationsEnabled()) {
            WritOnTelemetry.pushDisplaySuppressed(context, "permission_or_settings")
            return
        }
        try {
            manager.notify(notificationId, notification)
            WritOnTelemetry.pushDisplayed(context, kind)
        } catch (error: SecurityException) {
            WritOnTelemetry.pushDisplaySuppressed(context, "security_exception")
            WritOnTelemetry.recordNonFatal("push_display_permission", error)
        }
    }
}
