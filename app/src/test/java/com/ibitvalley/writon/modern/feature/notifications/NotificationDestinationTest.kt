package com.ibitvalley.writon.modern.feature.notifications

import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationDestinationTest {
    @Test fun `story activity opens its story`() {
        val opened = mutableListOf<String>()
        openNotificationDestination(activity(kind = NotificationKind.COMMENT, postId = "story-1"),
            onStoryClick = { opened += "story:$it" }, onAuthorClick = { opened += "author:$it" })
        assertEquals(listOf("story:story-1"), opened)
    }

    @Test fun `new follower activity opens the follower profile`() {
        val opened = mutableListOf<String>()
        openNotificationDestination(activity(kind = NotificationKind.FOLLOW, actorId = "reader-1"),
            onStoryClick = { opened += "story:$it" }, onAuthorClick = { opened += "author:$it" })
        assertEquals(listOf("author:reader-1"), opened)
    }

    private fun activity(kind: NotificationKind, postId: String? = null, actorId: String? = null) =
        ActivityNotification("n1", "Reader", "acted", "comment", "detail", "today", kind, true, postId != null, postId, actorId)
}
