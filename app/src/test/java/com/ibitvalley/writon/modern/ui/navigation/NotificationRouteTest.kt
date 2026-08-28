package com.ibitvalley.writon.modern.ui.navigation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationRouteTest {
    @Test fun `missing route does nothing`() = assertNull(resolveNotificationRoute(null))

    @Test fun `story notification opens its reader`() =
        assertEquals("reader/story-42", resolveNotificationRoute("reader/story-42"))

    @Test fun `unsafe or malformed route falls back to notifications`() =
        assertEquals("notifications", resolveNotificationRoute("reader/"))
}
