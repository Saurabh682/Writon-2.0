package com.ibitvalley.writon.modern.core.telemetry

import android.app.Activity
import android.content.Context
import com.google.android.play.core.review.ReviewInfo
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.core.review.ReviewGateway
import com.ibitvalley.writon.modern.core.review.ReviewInfoResult
import com.ibitvalley.writon.modern.core.review.ReviewLaunchResult
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`

class FakeReviewGateway(
    var shouldFailInfo: Boolean = false,
    var shouldFailLaunch: Boolean = false
) : ReviewGateway {
    var requestInfoCalledCount = 0
    var launchReviewCalledCount = 0

    override suspend fun requestReviewInfo(activity: Activity): ReviewInfoResult {
        requestInfoCalledCount++
        if (shouldFailInfo) {
            return ReviewInfoResult.Failure(RuntimeException("Play Store unavailable"))
        }
        val mockInfo = mock(ReviewInfo::class.java)
        return ReviewInfoResult.Success(mockInfo)
    }

    override suspend fun launchReview(activity: Activity, reviewInfo: ReviewInfo): ReviewLaunchResult {
        launchReviewCalledCount++
        if (shouldFailLaunch) {
            return ReviewLaunchResult.Failed(RuntimeException("Launch failed"))
        }
        return ReviewLaunchResult.Finished
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class ReviewPrompterTest {

    private val now = 1_800_000_000_000L
    private val day = 86_400_000L

    private lateinit var mockActivity: Activity
    private lateinit var mockPreferences: UserPreferences
    private lateinit var mockTracker: GrowthTracker
    private lateinit var mockContext: Context

    private fun createEligibleSignals(): ReviewSignals {
        val currentTime = System.currentTimeMillis()
        return ReviewSignals(
            firstOpenAtMillis = currentTime - 10 * day,
            qualifyingStoryCount = 3,
            totalEngagedSeconds = 200,
            hasConfirmedPublication = false,
            hasUnresolvedUserFailure = false,
            lastFailureResolvedAtMillis = 0L,
            lastAutomaticReviewAttemptAtMillis = 0L,
            rolloutEnabled = true,
            rolloutBucket = 10,
            rolloutPercent = 100,
            readerEnabled = true,
            writerEnabled = true
        )
    }

    @Before
    fun setUp() {
        mockActivity = mock(Activity::class.java)
        mockPreferences = mock(UserPreferences::class.java)
        mockTracker = mock(GrowthTracker::class.java)
        mockContext = mock(Context::class.java)

        `when`(mockActivity.isFinishing).thenReturn(false)
        `when`(mockActivity.isDestroyed).thenReturn(false)
        `when`(mockActivity.applicationContext).thenReturn(mockContext)
        `when`(mockPreferences.growthTracker).thenReturn(mockTracker)
    }

    @Test
    fun `prompter does nothing when there is no pending opportunity`() = runTest {
        val fakeGateway = FakeReviewGateway()
        val prompter = ReviewPrompter(gateway = fakeGateway)

        `when`(mockTracker.getPendingOpportunity()).thenReturn(null)

        val result = prompter.tryConsumePendingOpportunity(
            activity = mockActivity,
            preferences = mockPreferences,
            scope = this
        )

        assertFalse(result)
        assertEquals(0, fakeGateway.requestInfoCalledCount)
        assertEquals(0, fakeGateway.launchReviewCalledCount)
    }

    @Test
    fun `prompter preserves opportunity and does not call gateway when user is temporarily ineligible`() = runTest {
        val fakeGateway = FakeReviewGateway()
        val prompter = ReviewPrompter(gateway = fakeGateway)
        val opportunity = ReviewOpportunity.ReaderMilestone("story-1")

        `when`(mockTracker.getPendingOpportunity()).thenReturn(opportunity)
        `when`(mockTracker.reviewSignals()).thenReturn(
            createEligibleSignals().copy(rolloutEnabled = false) // Remote rollout disabled!
        )

        val result = prompter.tryConsumePendingOpportunity(
            activity = mockActivity,
            preferences = mockPreferences,
            scope = this
        )

        assertFalse(result)
        verify(mockTracker, never()).consumePendingOpportunity(org.mockito.kotlin.any())
        assertEquals(0, fakeGateway.requestInfoCalledCount)
        assertEquals(0, fakeGateway.launchReviewCalledCount)
    }

    @Test
    fun `prompter consumes opportunity and launches review flow when user is eligible`() = runTest {
        val fakeGateway = FakeReviewGateway()
        val prompter = ReviewPrompter(gateway = fakeGateway)
        val opportunity = ReviewOpportunity.ReaderMilestone("story-1")

        `when`(mockTracker.getPendingOpportunity()).thenReturn(opportunity)
        `when`(mockTracker.consumePendingOpportunity(opportunity)).thenReturn(opportunity)
        `when`(mockTracker.reviewSignals()).thenReturn(createEligibleSignals())

        val result = prompter.tryConsumePendingOpportunity(
            activity = mockActivity,
            preferences = mockPreferences,
            scope = this
        )

        assertTrue(result)
        testScheduler.advanceUntilIdle()

        assertEquals(1, fakeGateway.requestInfoCalledCount)
        verify(mockTracker).markReviewRequested()
        assertEquals(1, fakeGateway.launchReviewCalledCount)
    }

    @Test
    fun `prompter handles info failure gracefully and does not record review attempt`() = runTest {
        val fakeGateway = FakeReviewGateway(shouldFailInfo = true)
        val prompter = ReviewPrompter(gateway = fakeGateway)
        val opportunity = ReviewOpportunity.ConfirmedPublication("post-1")

        `when`(mockTracker.getPendingOpportunity()).thenReturn(opportunity)
        `when`(mockTracker.reviewSignals()).thenReturn(
            createEligibleSignals().copy(hasConfirmedPublication = true)
        )

        val result = prompter.tryConsumePendingOpportunity(
            activity = mockActivity,
            preferences = mockPreferences,
            scope = this
        )

        assertTrue(result)
        testScheduler.advanceUntilIdle()

        assertEquals(1, fakeGateway.requestInfoCalledCount)
        verify(mockTracker, never()).consumePendingOpportunity(org.mockito.kotlin.any())
        verify(mockTracker, never()).markReviewRequested() // Never marks cooldown on failure!
        assertEquals(0, fakeGateway.launchReviewCalledCount)
    }

    @Test
    fun `prompter strictly limits prompt to once per session`() = runTest {
        val fakeGateway = FakeReviewGateway()
        val prompter = ReviewPrompter(gateway = fakeGateway)
        val opportunity1 = ReviewOpportunity.ReaderMilestone("story-1")
        val opportunity2 = ReviewOpportunity.ReaderMilestone("story-2")

        `when`(mockTracker.getPendingOpportunity()).thenReturn(opportunity1)
        `when`(mockTracker.consumePendingOpportunity(opportunity1)).thenReturn(opportunity1)
        `when`(mockTracker.reviewSignals()).thenReturn(createEligibleSignals())

        // First prompt succeeds
        val result1 = prompter.tryConsumePendingOpportunity(
            activity = mockActivity,
            preferences = mockPreferences,
            scope = this
        )
        assertTrue(result1)
        testScheduler.advanceUntilIdle()

        // Second prompt in the same session is rejected
        `when`(mockTracker.getPendingOpportunity()).thenReturn(opportunity2)
        val result2 = prompter.tryConsumePendingOpportunity(
            activity = mockActivity,
            preferences = mockPreferences,
            scope = this
        )
        assertFalse(result2)
        assertEquals(1, fakeGateway.requestInfoCalledCount)
        assertEquals(1, fakeGateway.launchReviewCalledCount)
    }

    @Test
    fun `prompter aborts safely when activity is finishing or destroyed`() = runTest {
        val fakeGateway = FakeReviewGateway()
        val prompter = ReviewPrompter(gateway = fakeGateway)
        val opportunity = ReviewOpportunity.ReaderMilestone("story-1")

        `when`(mockTracker.getPendingOpportunity()).thenReturn(opportunity)
        `when`(mockActivity.isFinishing).thenReturn(true)

        val result = prompter.tryConsumePendingOpportunity(
            activity = mockActivity,
            preferences = mockPreferences,
            scope = this
        )

        assertFalse(result)
        assertEquals(0, fakeGateway.requestInfoCalledCount)
    }
}
