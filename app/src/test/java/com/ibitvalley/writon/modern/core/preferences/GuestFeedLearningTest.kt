package com.ibitvalley.writon.modern.core.preferences

import org.junit.Assert.assertEquals
import org.junit.Test

class GuestFeedLearningTest {
    @Test fun `saved interests are included in guest ranking topics`() {
        assertEquals(
            mapOf("short_stories" to 8f, "poetry" to 8f),
            preferredTopicScores(setOf("Short Stories", "Poetry")),
        )
    }
}
