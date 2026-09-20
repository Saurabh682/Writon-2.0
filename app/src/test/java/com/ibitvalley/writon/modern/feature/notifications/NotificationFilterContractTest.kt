package com.ibitvalley.writon.modern.feature.notifications

import org.junit.Assert.assertNull
import org.junit.Test

class NotificationFilterContractTest {
    @Test
    fun `every inbox filter loads the complete canonical and legacy activity stream`() {
        // Production defect caught: querying one legacy kind hides canonical aliases such as
        // first_applause, reply, new_follower, and followed_writer_published.
        NotificationFilter.entries.forEach { filter ->
            assertNull(notificationApiKind(filter))
        }
    }
}
