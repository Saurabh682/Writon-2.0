package com.ibitvalley.writon.modern.core.preferences

import org.junit.Assert.*
import org.junit.Test

class ReadingContinuationTest {
    @Test fun `only unfinished finite positions qualify`() {
        assertEquals(ReadingContinuation("story", 0.4f), readingContinuation("story", 0.4f))
        listOf(0f, -1f, 0.98f, 1f, Float.NaN, Float.POSITIVE_INFINITY).forEach {
            assertNull(readingContinuation("story", it))
        }
        assertNull(readingContinuation("", 0.5f))
    }

    @Test fun `restoration scales to current layout and bounds invalid geometry`() {
        assertEquals(500, continuationScrollOffset(0.5f, 1000))
        assertEquals(1000, continuationScrollOffset(2f, 1000))
        assertEquals(0, continuationScrollOffset(0.5f, Int.MAX_VALUE))
        assertEquals(0, continuationScrollOffset(Float.NaN, 1000))
        assertEquals(0, continuationScrollOffset(0.5f, 0))
    }
}
