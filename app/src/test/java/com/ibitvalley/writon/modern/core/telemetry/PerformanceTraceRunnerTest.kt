package com.ibitvalley.writon.modern.core.telemetry

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.fail
import org.junit.Test

class PerformanceTraceRunnerTest {

    private class RecordingTrace(
        private val failOnStart: Boolean = false,
        private val failOnStop: Boolean = false
    ) : PerformanceTraceHandle {
        var starts = 0
        var stops = 0

        override fun start() {
            starts++
            if (failOnStart) error("performance unavailable")
        }

        override fun stop() {
            stops++
            if (failOnStop) error("performance unavailable")
        }
    }

    // Regression: an exception from real app work was mistaken for telemetry failure and reran it.
    @Test
    fun `sync business failure propagates without rerunning the block`() {
        val trace = RecordingTrace()
        val businessFailure = IllegalStateException("publish failed")
        var executions = 0

        try {
            runWithPerformanceTrace(traceFactory = { trace }) {
                executions++
                throw businessFailure
            }
            fail("Expected the original business exception")
        } catch (actual: IllegalStateException) {
            assertSame(businessFailure, actual)
        }

        assertEquals(1, executions)
        assertEquals(1, trace.starts)
        assertEquals(1, trace.stops)
    }

    // Regression: Firebase Performance startup failure prevented the real operation from running.
    @Test
    fun `telemetry startup failure still runs sync work exactly once`() {
        val trace = RecordingTrace(failOnStart = true)
        var executions = 0

        val result = runWithPerformanceTrace(traceFactory = { trace }) {
            executions++
            "saved"
        }

        assertEquals("saved", result)
        assertEquals(1, executions)
        assertEquals(1, trace.starts)
        assertEquals(0, trace.stops)
    }

    // Regression: suspend operations were also retried after their own exception.
    @Test
    fun `suspend business failure propagates without rerunning the block`() = runTest {
        val trace = RecordingTrace()
        val businessFailure = IllegalArgumentException("sync failed")
        var executions = 0

        try {
            runWithPerformanceTraceSuspending(traceFactory = { trace }) {
                executions++
                throw businessFailure
            }
            fail("Expected the original business exception")
        } catch (actual: IllegalArgumentException) {
            assertSame(businessFailure, actual)
        }

        assertEquals(1, executions)
        assertEquals(1, trace.starts)
        assertEquals(1, trace.stops)
    }
}
