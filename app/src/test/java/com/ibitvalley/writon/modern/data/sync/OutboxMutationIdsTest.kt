package com.ibitvalley.writon.modern.data.sync

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class OutboxMutationIdsTest {
    @Test
    fun `fallback id is stable for every retry of one mutation`() {
        assertEquals(stableOutboxUuid("comment", 42), stableOutboxUuid("comment", 42))
    }

    @Test
    fun `fallback ids do not collide across mutation kinds or rows`() {
        assertNotEquals(stableOutboxUuid("comment", 42), stableOutboxUuid("post", 42))
        assertNotEquals(stableOutboxUuid("comment", 42), stableOutboxUuid("comment", 43))
    }
}
