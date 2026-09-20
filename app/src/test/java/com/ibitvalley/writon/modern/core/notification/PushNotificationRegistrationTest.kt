package com.ibitvalley.writon.modern.core.notification

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.concurrent.TimeUnit

class PushNotificationRegistrationTest {
    @Test
    fun `missing auth token is deferred without a non fatal report`() {
        assertFalse(shouldReportPushRegistrationFailure(PushRegistrationDeferredException()))
    }

    @Test
    fun `unexpected failure while still signed in remains observable`() {
        assertTrue(shouldReportPushRegistrationFailure(IllegalStateException("unexpected")))
    }

    @Test
    fun `unchanged registration is skipped within one day`() {
        assertFalse(shouldRefreshPushRegistration("same", 1_000L, "same", 2_000L))
    }

    @Test
    fun `registration refreshes when device state changes`() {
        assertTrue(shouldRefreshPushRegistration("old", 1_000L, "new", 2_000L))
    }

    @Test
    fun `unchanged registration refreshes after one day`() {
        val oneDay = TimeUnit.DAYS.toMillis(1)
        assertTrue(shouldRefreshPushRegistration("same", 1_000L, "same", 1_000L + oneDay))
    }

    @Test
    fun `registration refreshes when stored clock is ahead`() {
        assertTrue(shouldRefreshPushRegistration("same", 2_000L, "same", 1_000L))
    }
}
