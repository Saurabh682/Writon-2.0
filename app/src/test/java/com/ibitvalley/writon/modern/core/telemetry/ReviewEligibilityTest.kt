package com.ibitvalley.writon.modern.core.telemetry

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReviewEligibilityTest {
    private val now = 1_800_000_000_000L
    private val hour = 3_600_000L
    private val day = 86_400_000L

    @Test
    fun `reader is eligible after 7 days, 3 qualifying stories, and 180 engaged seconds`() {
        val signals = ReviewSignals(
            firstOpenAtMillis = now - 8 * day,
            qualifyingStoryCount = 3,
            totalEngagedSeconds = 180,
            hasConfirmedPublication = false,
            hasUnresolvedUserFailure = false,
            lastFailureResolvedAtMillis = 0L,
            lastAutomaticReviewAttemptAtMillis = 0L,
            rolloutEnabled = true,
            rolloutBucket = 50,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )

        assertEquals(ReviewDecision.ELIGIBLE, ReviewEligibility.evaluate(signals, now))
        assertTrue(ReviewEligibility.isEligible(signals, now))
    }

    @Test
    fun `writer is eligible after 7 days and first confirmed publication`() {
        val signals = ReviewSignals(
            firstOpenAtMillis = now - 7 * day,
            qualifyingStoryCount = 0,
            totalEngagedSeconds = 0,
            hasConfirmedPublication = true,
            hasUnresolvedUserFailure = false,
            lastFailureResolvedAtMillis = 0L,
            lastAutomaticReviewAttemptAtMillis = 0L,
            rolloutEnabled = true,
            rolloutBucket = 10,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )

        assertEquals(ReviewDecision.ELIGIBLE, ReviewEligibility.evaluate(signals, now))
        assertTrue(ReviewEligibility.isEligible(signals, now))
    }

    @Test
    fun `blocks when install age is less than 7 days`() {
        val signals = ReviewSignals(
            firstOpenAtMillis = now - (6 * day + 23 * hour), // 6 days 23 hours
            qualifyingStoryCount = 5,
            totalEngagedSeconds = 500,
            hasConfirmedPublication = true,
            rolloutEnabled = true,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )

        assertEquals(ReviewDecision.TOO_EARLY_INSTALL_AGE, ReviewEligibility.evaluate(signals, now))
        assertFalse(ReviewEligibility.isEligible(signals, now))
    }

    @Test
    fun `reader with 3 stories but under 180 engaged seconds is blocked`() {
        val signals = ReviewSignals(
            firstOpenAtMillis = now - 10 * day,
            qualifyingStoryCount = 3,
            totalEngagedSeconds = 179,
            hasConfirmedPublication = false,
            rolloutEnabled = true,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )

        assertEquals(ReviewDecision.INSUFFICIENT_READER_EVIDENCE, ReviewEligibility.evaluate(signals, now))
        assertFalse(ReviewEligibility.isEligible(signals, now))
    }

    @Test
    fun `reader with 2 stories but 500 engaged seconds is blocked`() {
        val signals = ReviewSignals(
            firstOpenAtMillis = now - 10 * day,
            qualifyingStoryCount = 2,
            totalEngagedSeconds = 500,
            hasConfirmedPublication = false,
            rolloutEnabled = true,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )

        assertEquals(ReviewDecision.INSUFFICIENT_READER_EVIDENCE, ReviewEligibility.evaluate(signals, now))
        assertFalse(ReviewEligibility.isEligible(signals, now))
    }

    @Test
    fun `unresolved user failure blocks review request immediately`() {
        val signals = ReviewSignals(
            firstOpenAtMillis = now - 14 * day,
            qualifyingStoryCount = 5,
            totalEngagedSeconds = 300,
            hasConfirmedPublication = true,
            hasUnresolvedUserFailure = true,
            rolloutEnabled = true,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )

        assertEquals(ReviewDecision.UNRESOLVED_USER_FAILURE, ReviewEligibility.evaluate(signals, now))
        assertFalse(ReviewEligibility.isEligible(signals, now))
    }

    @Test
    fun `active failure category set blocks review request`() {
        val signals = ReviewSignals(
            firstOpenAtMillis = now - 14 * day,
            qualifyingStoryCount = 5,
            totalEngagedSeconds = 300,
            hasConfirmedPublication = true,
            activeFailures = setOf("publish_failure"),
            rolloutEnabled = true,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )

        assertEquals(ReviewDecision.UNRESOLVED_USER_FAILURE, ReviewEligibility.evaluate(signals, now))
        assertFalse(ReviewEligibility.isEligible(signals, now))
    }

    @Test
    fun `resolved user failure enforces 72 hour quiet period`() {
        val signals71Hours = ReviewSignals(
            firstOpenAtMillis = now - 14 * day,
            qualifyingStoryCount = 5,
            totalEngagedSeconds = 300,
            hasConfirmedPublication = true,
            hasUnresolvedUserFailure = false,
            lastFailureResolvedAtMillis = now - 71 * hour,
            rolloutEnabled = true,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )
        assertEquals(ReviewDecision.FAILURE_QUIET_PERIOD, ReviewEligibility.evaluate(signals71Hours, now))
        assertFalse(ReviewEligibility.isEligible(signals71Hours, now))

        val signals72Hours = signals71Hours.copy(lastFailureResolvedAtMillis = now - 72 * hour)
        assertEquals(ReviewDecision.ELIGIBLE, ReviewEligibility.evaluate(signals72Hours, now))
        assertTrue(ReviewEligibility.isEligible(signals72Hours, now))
    }

    @Test
    fun `enforces 120 day automatic review cooldown`() {
        val signals119Days = ReviewSignals(
            firstOpenAtMillis = now - 200 * day,
            qualifyingStoryCount = 5,
            totalEngagedSeconds = 300,
            lastAutomaticReviewAttemptAtMillis = now - 119 * day,
            rolloutEnabled = true,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )
        assertEquals(ReviewDecision.AUTOMATIC_COOLDOWN_ACTIVE, ReviewEligibility.evaluate(signals119Days, now))
        assertFalse(ReviewEligibility.isEligible(signals119Days, now))

        val signals120Days = signals119Days.copy(lastAutomaticReviewAttemptAtMillis = now - 120 * day)
        assertEquals(ReviewDecision.ELIGIBLE, ReviewEligibility.evaluate(signals120Days, now))
        assertTrue(ReviewEligibility.isEligible(signals120Days, now))
    }

    @Test
    fun `blocks when remote rollout is disabled`() {
        val signals = ReviewSignals(
            firstOpenAtMillis = now - 14 * day,
            qualifyingStoryCount = 5,
            totalEngagedSeconds = 300,
            rolloutEnabled = false,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )

        assertEquals(ReviewDecision.ROLLOUT_DISABLED, ReviewEligibility.evaluate(signals, now))
        assertFalse(ReviewEligibility.isEligible(signals, now))
    }

    @Test
    fun `blocks when rollout bucket is outside cohort percentage`() {
        val signals = ReviewSignals(
            firstOpenAtMillis = now - 14 * day,
            qualifyingStoryCount = 5,
            totalEngagedSeconds = 300,
            rolloutEnabled = true,
            rolloutBucket = 50,
            rolloutPercent = 50, // bucket 50 is outside 0..49
            readerEnabled = true,
            writerEnabled = true
        )

        assertEquals(ReviewDecision.COHORT_EXCLUDED, ReviewEligibility.evaluate(signals, now))
        assertFalse(ReviewEligibility.isEligible(signals, now))
    }

    @Test
    fun `blocks when app version is excluded or below minimum`() {
        val signalsOld = ReviewSignals(
            firstOpenAtMillis = now - 14 * day,
            qualifyingStoryCount = 5,
            totalEngagedSeconds = 300,
            currentVersionCode = 115,
            minimumVersionCode = 120,
            rolloutEnabled = true,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )
        assertEquals(ReviewDecision.VERSION_EXCLUDED, ReviewEligibility.evaluate(signalsOld, now))

        val signalsExcluded = ReviewSignals(
            firstOpenAtMillis = now - 14 * day,
            qualifyingStoryCount = 5,
            totalEngagedSeconds = 300,
            currentVersionCode = 131,
            minimumVersionCode = 120,
            excludedVersionCodes = setOf(131),
            rolloutEnabled = true,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )
        assertEquals(ReviewDecision.VERSION_EXCLUDED, ReviewEligibility.evaluate(signalsExcluded, now))
    }

    @Test
    fun `writer opportunity cannot qualify through reader evidence when writer path is disabled`() {
        val signals = ReviewSignals(
            firstOpenAtMillis = now - 14 * day,
            qualifyingStoryCount = 5,
            totalEngagedSeconds = 500,
            hasConfirmedPublication = true,
            rolloutEnabled = true,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = false
        )

        assertEquals(
            ReviewDecision.INSUFFICIENT_WRITER_EVIDENCE,
            ReviewEligibility.evaluateForOpportunity(
                signals,
                ReviewOpportunity.ConfirmedPublication("post-1"),
                now
            )
        )
    }

    @Test
    fun `reader opportunity cannot qualify through publication when reader path is disabled`() {
        val signals = ReviewSignals(
            firstOpenAtMillis = now - 14 * day,
            qualifyingStoryCount = 5,
            totalEngagedSeconds = 500,
            hasConfirmedPublication = true,
            rolloutEnabled = true,
            rolloutPercent = 100,
            readerEnabled = false,
            writerEnabled = true
        )

        assertEquals(
            ReviewDecision.INSUFFICIENT_READER_EVIDENCE,
            ReviewEligibility.evaluateForOpportunity(
                signals,
                ReviewOpportunity.ReaderMilestone("story-1"),
                now
            )
        )
    }
}
