package com.ibitvalley.writon.modern.core.notification

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GuestNotificationPolicyTest {
    @Test fun onlyPermittedGuestsJoinTheBroadcastAudience() {
        for (signedIn in listOf(false, true)) {
            for (enabled in listOf(false, true)) {
                for (permitted in listOf(false, true)) {
                    val actual = DailyDigestTopicPolicy.shouldSubscribe(signedIn, enabled, permitted)
                    org.junit.Assert.assertEquals(!signedIn && enabled && permitted, actual)
                }
            }
        }
    }

    @Test fun readingPromptRequiresDepthAndForegroundEngagement() {
        assertTrue(qualifiesForReadingNotificationPrompt(0.7f, 30))
        assertFalse(qualifiesForReadingNotificationPrompt(0.7f, 29))
        assertFalse(qualifiesForReadingNotificationPrompt(0.69f, 180))
        assertFalse(qualifiesForReadingNotificationPrompt(Float.NaN, 180))
        assertFalse(qualifiesForReadingNotificationPrompt(Float.POSITIVE_INFINITY, 180))
    }
}
