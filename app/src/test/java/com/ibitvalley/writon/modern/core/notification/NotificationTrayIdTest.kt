package com.ibitvalley.writon.modern.core.notification

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class NotificationTrayIdTest {
    @Test
    fun `logical notification id stays stable across FCM retries`() {
        val first = notificationTrayId("notification-123", "fcm-attempt-1")
        val retry = notificationTrayId("notification-123", "fcm-attempt-2")

        assertEquals(first, retry)
    }

    @Test
    fun `different logical notifications receive different tray ids`() {
        assertNotEquals(
            notificationTrayId("notification-123", null),
            notificationTrayId("notification-456", null),
        )
    }

    @Test
    fun `FCM message id and deterministic fallback cover legacy payloads`() {
        assertEquals(
            notificationTrayId(null, "fcm-123", fallback = 1L),
            notificationTrayId(null, "fcm-123", fallback = 2L),
        )
        assertEquals(
            notificationTrayId(null, null, fallback = 42L),
            notificationTrayId(null, null, fallback = 42L),
        )
    }

    @Test
    fun `FCM route aliases retain their linked story in foreground messages`() {
        assertEquals(
            "reader/story-42",
            notificationTargetRoute(mapOf("target_route" to "/reader/story-42")),
        )
        assertEquals(
            "story-42",
            notificationStoryId(mapOf("url" to "https://writon.cc/stories/story-42")),
        )
        assertEquals("story-42", notificationStoryId(mapOf("post_id" to "story-42")))
    }
}
