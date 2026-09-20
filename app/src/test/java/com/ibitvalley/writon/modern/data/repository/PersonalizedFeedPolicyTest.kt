package com.ibitvalley.writon.modern.data.repository

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PersonalizedFeedPolicyTest {
    @Test
    fun `first page falls back when personalized inventory is sparse`() {
        assertFalse(isUsablePersonalizedPage(cursor = null, itemCount = 0, limit = 20))
        assertFalse(isUsablePersonalizedPage(cursor = null, itemCount = 4, limit = 20))
        assertTrue(isUsablePersonalizedPage(cursor = null, itemCount = 5, limit = 20))
    }

    @Test
    fun `small requested pages remain usable and later cursors stay in their session`() {
        assertTrue(isUsablePersonalizedPage(cursor = null, itemCount = 3, limit = 3))
        assertTrue(isUsablePersonalizedPage(cursor = "opaque-cursor", itemCount = 0, limit = 20))
    }
}
