package com.ibitvalley.writon.modern.feature.notifications

import com.ibitvalley.writon.R
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationActionResourceTest {
    @Test fun `canonical activity kinds use app-localized actions`() {
        assertEquals(R.string.notifications_action_commented, notificationActionResource("comment", "server English"))
        assertEquals(R.string.notifications_action_replied, notificationActionResource("reply", "server English"))
        assertEquals(R.string.notifications_action_followed, notificationActionResource("new_follower", "server English"))
        assertEquals(R.string.notifications_action_published, notificationActionResource("followed_writer_published", "published a new story"))
        assertEquals(R.string.notifications_action_published_multiple, notificationActionResource("followed_writer_published", "published new stories"))
    }

    @Test fun `unknown legacy activity retains its server message`() {
        assertNull(notificationActionResource("legacy_custom", "legacy message"))
    }
}
