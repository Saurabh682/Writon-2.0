package com.ibitvalley.writon.modern.core.notification

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DailyDigestTopicSubscriptionTest {

    @Test
    fun `guests subscribe to daily digest topic`() {
        assertTrue(DailyDigestTopicPolicy.shouldSubscribe(isSignedIn = false))
    }

    @Test
    fun `signed in readers rely on direct preferences and leave guest topic`() {
        assertFalse(DailyDigestTopicPolicy.shouldSubscribe(isSignedIn = true))
    }

    // Regression: a remotely disabled digest still subscribed every guest device.
    @Test
    fun `disabled digest unsubscribes guests as well as signed in readers`() {
        assertFalse(DailyDigestTopicPolicy.shouldSubscribe(isSignedIn = false, digestEnabled = false))
        assertFalse(DailyDigestTopicPolicy.shouldSubscribe(isSignedIn = true, digestEnabled = false))
    }

    @Test
    fun `notification permission denial never leaves a guest topic subscription`() {
        assertFalse(
            DailyDigestTopicPolicy.shouldSubscribe(
                isSignedIn = false,
                digestEnabled = true,
                permissionGranted = false,
            ),
        )
    }

    @Test
    fun `every signed in state unsubscribes regardless of guest settings or permission`() {
        for (digestEnabled in listOf(false, true)) {
            for (permissionGranted in listOf(false, true)) {
                assertFalse(
                    DailyDigestTopicPolicy.shouldSubscribe(
                        isSignedIn = true,
                        digestEnabled = digestEnabled,
                        permissionGranted = permissionGranted,
                    ),
                )
            }
        }
    }
}
