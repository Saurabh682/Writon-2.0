package com.ibitvalley.writon.modern

import android.content.Intent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class StoryDeepLinkTest {
    @Test
    fun `shares the canonical public story link`() {
        assertEquals(
            "https://writon.cc/stories/story-1010-1010",
            canonicalStoryShareUrl("story-1010-1010")
        )
    }

    @Test
    fun `maps writon cc and render story links to the matching reader`() {
        assertEquals(
            "reader/the-extraordinary-protocol",
            resolveStoryDeepLink("https://writon.cc/stories/the-extraordinary-protocol")
        )
        assertEquals(
            "reader/the-extraordinary-protocol",
            resolveStoryDeepLink("https://www.writon.cc/stories/the-extraordinary-protocol")
        )
        assertEquals(
            "reader/story-1010-1010",
            resolveStoryDeepLink("https://writon-powerup.onrender.com/stories/story-1010-1010")
        )
        assertEquals(
            "reader/story-1010-1010",
            resolveStoryDeepLink("https://api.writon.cc/stories/story-1010-1010")
        )
    }

    @Test
    fun `accepts owned post links and rejects retired legacy domains`() {
        assertEquals(
            "reader/monsoon-letters",
            resolveStoryDeepLink("https://writon.cc/posts/monsoon-letters")
        )
        assertNull(resolveStoryDeepLink("https://writon.co/posts/monsoon-letters"))
        assertNull(resolveStoryDeepLink("https://www.writon.co/posts/monsoon-letters"))
    }

    @Test
    fun `rejects foreign hosts and malformed story paths`() {
        assertNull(resolveStoryDeepLink("https://example.com/stories/monsoon-letters"))
        assertNull(resolveStoryDeepLink("https://writon-powerup.onrender.com/stories/../../admin"))
        assertNull(resolveStoryDeepLink("javascript:alert(1)"))
    }

    @Test
    fun `extracts legacy and current notification route keys`() {
        for (key in listOf("targetRoute", "target_route", "route")) {
            val intent: Intent = mock()
            whenever(intent.getStringExtra(key)).thenReturn("/reader/story-42")
            assertEquals("reader/story-42", extractNotificationTargetRoute(intent))
        }
    }

    @Test
    fun `extracts notification story id keys even with generic destination`() {
        for (key in listOf("storyId", "story_id", "postId", "post_id")) {
            val intent: Intent = mock()
            whenever(intent.getStringExtra("targetRoute")).thenReturn("notifications")
            whenever(intent.getStringExtra(key)).thenReturn("story-42")
            assertEquals("reader/story-42", extractNotificationTargetRoute(intent))
        }
    }

    @Test
    fun `extracts owned links and internal reader links`() {
        val publicLink: Intent = mock()
        whenever(publicLink.getStringExtra("url")).thenReturn("https://writon.cc/stories/a-good-read")
        assertEquals("reader/a-good-read", extractNotificationTargetRoute(publicLink))

        val internalLink: Intent = mock()
        whenever(internalLink.dataString).thenReturn("writon://reader/abc-123?notificationId=42")
        assertEquals("reader/abc-123", extractNotificationTargetRoute(internalLink))

        val linkExtra: Intent = mock()
        whenever(linkExtra.getStringExtra("link")).thenReturn("https://writon.cc/posts/another-read")
        assertEquals("reader/another-read", extractNotificationTargetRoute(linkExtra))
    }

    @Test
    fun `rejects unsafe identifiers and foreign story links`() {
        val unsafeId: Intent = mock()
        whenever(unsafeId.getStringExtra("storyId")).thenReturn("../../settings")
        assertNull(extractNotificationTargetRoute(unsafeId))

        val foreignLink: Intent = mock()
        whenever(foreignLink.getStringExtra("link")).thenReturn("https://example.com/stories/abc")
        assertNull(extractNotificationTargetRoute(foreignLink))
    }
}
