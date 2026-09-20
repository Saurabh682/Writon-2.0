package com.ibitvalley.writon.modern.core.notification

import org.junit.Assert.*
import org.junit.Test

class NotificationPermissionPolicyTest {
    @Test fun `first contextual request is allowed`() {
        assertTrue(canRequestNotificationPermission(1000L, 0L))
    }
    @Test fun `repeat requests wait fourteen days and reject clock rollback`() {
        val last = 1000L
        val interval = 14L * 24 * 60 * 60 * 1000
        assertFalse(canRequestNotificationPermission(last + interval - 1, last))
        assertTrue(canRequestNotificationPermission(last + interval, last))
        assertFalse(canRequestNotificationPermission(last - 1, last))
    }
}
