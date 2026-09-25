package com.ibitvalley.writon.modern.ui.navigation

import android.content.Intent
import com.ibitvalley.writon.modern.extractNotificationTargetRoute
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class NotificationRouteTest {
    @Test fun `missing route does nothing`() = assertNull(resolveNotificationRoute(null))

    @Test fun `story notification opens its reader`() =
        assertEquals("reader/story-42", resolveNotificationRoute("reader/story-42"))

    @Test fun `app wide notification can open home`() =
        assertEquals("home", resolveNotificationRoute("home"))

    @Test fun `reader routes accept leading slashes and published story paths`() {
        assertEquals("reader/story-42", resolveNotificationRoute("/reader/story-42"))
        assertEquals("reader/story-42", resolveNotificationRoute("stories/story-42"))
        assertEquals("reader/story-42", resolveNotificationRoute("posts/story-42"))
    }

    @Test fun `write action remains a writer destination`() =
        assertEquals("write", resolveNotificationRoute("write"))

    @Test fun `bare uuid targets the reader`() =
        assertEquals(
            "reader/123e4567-e89b-12d3-a456-426614174000",
            resolveNotificationRoute("123e4567-e89b-12d3-a456-426614174000")
        )

    @Test fun `unsafe or malformed route falls back to notifications`() =
        assertEquals("notifications", resolveNotificationRoute("reader/"))

    @Test fun `unknown destination cannot become a reader`() =
        assertEquals("notifications", resolveNotificationRoute("unknown-destination"))

    @Test fun `FCM story survives intent extraction and fresh guest destination selection`() {
        val intent: Intent = mock()
        whenever(intent.getStringExtra("storyId")).thenReturn("story-42")

        val route = resolveNotificationRoute(extractNotificationTargetRoute(intent))

        assertEquals("reader/story-42", route)
        assertEquals(
            "reader/story-42",
            initialNavigationDestination(route, signedIn = false, visitorOnboardingComplete = false),
        )
    }
}
