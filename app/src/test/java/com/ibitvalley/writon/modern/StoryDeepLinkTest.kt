package com.ibitvalley.writon.modern

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class StoryDeepLinkTest {
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
    }

    @Test
    fun `keeps legacy WritOn post links working`() {
        assertEquals(
            "reader/monsoon-letters",
            resolveStoryDeepLink("https://writon.co/posts/monsoon-letters")
        )
        assertEquals(
            "reader/monsoon-letters",
            resolveStoryDeepLink("https://writon.cc/posts/monsoon-letters")
        )
    }

    @Test
    fun `rejects foreign hosts and malformed story paths`() {
        assertNull(resolveStoryDeepLink("https://example.com/stories/monsoon-letters"))
        assertNull(resolveStoryDeepLink("https://writon-powerup.onrender.com/stories/../../admin"))
        assertNull(resolveStoryDeepLink("javascript:alert(1)"))
    }
}
