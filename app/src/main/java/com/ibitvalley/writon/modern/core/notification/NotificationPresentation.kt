package com.ibitvalley.writon.modern.core.notification

import androidx.annotation.StringRes
import androidx.core.app.NotificationCompat
import com.ibitvalley.writon.R

internal data class NotificationPresentation(
    @StringRes val subtextRes: Int,
    val category: String
)

internal fun notificationPresentation(kind: String): NotificationPresentation =
    when (kind.lowercase()) {
        "applaud", "first_applause" -> NotificationPresentation(
            R.string.notification_subtext_applause,
            NotificationCompat.CATEGORY_SOCIAL
        )
        "bookmark" -> NotificationPresentation(
            R.string.notification_subtext_bookmark,
            NotificationCompat.CATEGORY_SOCIAL
        )
        "comment", "reply", "spark_reaction" -> NotificationPresentation(
            R.string.notification_subtext_comment,
            NotificationCompat.CATEGORY_SOCIAL
        )
        "follow", "new_follower" -> NotificationPresentation(
            R.string.notification_subtext_new_reader,
            NotificationCompat.CATEGORY_SOCIAL
        )
        "system_test" -> NotificationPresentation(
            R.string.notification_subtext_connected,
            NotificationCompat.CATEGORY_STATUS
        )
        "reading_nudge", "draft_nudge", "daily_digest", "editorial" -> NotificationPresentation(
            R.string.notification_subtext_daily_read,
            NotificationCompat.CATEGORY_RECOMMENDATION
        )
        "app_update", "update" -> NotificationPresentation(
            R.string.notification_subtext_update,
            NotificationCompat.CATEGORY_STATUS
        )
        else -> NotificationPresentation(
            R.string.notification_subtext_story_activity,
            NotificationCompat.CATEGORY_SOCIAL
        )
    }
