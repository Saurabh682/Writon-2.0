package com.ibitvalley.writon.modern.core.telemetry

import kotlinx.coroutines.CancellationException
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NonFatalReportingTest {
    @Test
    fun `normal coroutine cancellation is not reported`() {
        assertFalse(shouldReportNonFatal(CancellationException("Job was cancelled")))
    }

    @Test
    fun `real failures remain reportable`() {
        assertTrue(shouldReportNonFatal(IllegalStateException("Network request failed")))
    }
}
