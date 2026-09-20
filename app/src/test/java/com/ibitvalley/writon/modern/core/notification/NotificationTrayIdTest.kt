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
}
