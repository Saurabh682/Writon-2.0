package com.ibitvalley.writon.modern.feature.comments

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CommentsTimestampTest {
    @Test
    fun parsesUtcAndOffsetTimestampsConsistently() {
        val utc = parseIsoTimestampMillis("2026-08-27T12:30:45Z")
        assertEquals(utc, parseIsoTimestampMillis("2026-08-27T18:00:45+05:30"))
        assertEquals(utc, parseIsoTimestampMillis("2026-08-27T12:30:45.000Z"))
    }

    @Test
    fun rejectsInvalidTimestamp() {
        assertNull(parseIsoTimestampMillis("not-a-timestamp"))
    }
}
