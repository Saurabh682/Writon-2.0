package com.ibitvalley.writon.modern.core.notification

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PushNotificationRegistrationTest {
    @Test
    fun `missing auth token is deferred without a non fatal report`() {
        assertFalse(shouldReportPushRegistrationFailure(PushRegistrationDeferredException()))
    }

    @Test
    fun `unexpected failure while still signed in remains observable`() {
        assertTrue(shouldReportPushRegistrationFailure(IllegalStateException("unexpected")))
    }
}
