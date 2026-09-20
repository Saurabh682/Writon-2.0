package com.ibitvalley.writon.modern.core.notification

import androidx.core.app.NotificationCompat
import com.ibitvalley.writon.R
import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationPresentationTest {
    @Test
    fun `social events use specific WritOn subtext and the social category`() {
        assertEquals(
            NotificationPresentation(R.string.notification_subtext_applause, NotificationCompat.CATEGORY_SOCIAL),
            notificationPresentation("applaud")
        )
        assertEquals(
            NotificationPresentation(R.string.notification_subtext_comment, NotificationCompat.CATEGORY_SOCIAL),
            notificationPresentation("comment")
        )
        assertEquals(
            NotificationPresentation(R.string.notification_subtext_new_reader, NotificationCompat.CATEGORY_SOCIAL),
            notificationPresentation("follow")
        )
        assertEquals(notificationPresentation("applaud"), notificationPresentation("first_applause"))
        assertEquals(notificationPresentation("comment"), notificationPresentation("reply"))
        assertEquals(notificationPresentation("follow"), notificationPresentation("new_follower"))
    }

    @Test
    fun `test and unknown events retain a calm branded fallback`() {
        assertEquals(
            NotificationPresentation(R.string.notification_subtext_connected, NotificationCompat.CATEGORY_STATUS),
            notificationPresentation("system_test")
        )
        assertEquals(
            NotificationPresentation(R.string.notification_subtext_story_activity, NotificationCompat.CATEGORY_SOCIAL),
            notificationPresentation("unexpected")
        )
    }
}
