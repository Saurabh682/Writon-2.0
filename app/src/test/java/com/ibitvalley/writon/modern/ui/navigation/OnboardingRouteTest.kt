package com.ibitvalley.writon.modern.ui.navigation

import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.InterestsResponseDto
import com.ibitvalley.writon.modern.core.preferences.EngagementPreferences
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import retrofit2.Response

class OnboardingRouteTest {
    @Test fun `incoming story is the first destination for a fresh guest`() {
        assertEquals(
            WritOnRoute.Reader.createRoute("shared-story"),
            initialNavigationDestination(
                incomingRoute = WritOnRoute.Reader.createRoute("shared-story"),
                signedIn = false,
                visitorOnboardingComplete = false,
            ),
        )
    }

    @Test fun `ordinary fresh launch still opens the welcome screen`() {
        assertEquals(
            WritOnRoute.Welcome.route,
            initialNavigationDestination(null, signedIn = false, visitorOnboardingComplete = false),
        )
        assertEquals(
            WritOnRoute.Home.route,
            initialNavigationDestination(null, signedIn = false, visitorOnboardingComplete = true),
        )
    }

    @Test fun `settings preference route edits intent before interests`() {
        assertEquals("onboarding-intent?fromSettings=true", WritOnRoute.IntentOnboarding.createRoute(true))
        assertEquals("interests?fromSettings=true", WritOnRoute.Interests.createRoute(true))
    }

    @Test fun `home preference card returns home after interests`() {
        assertEquals("interests?fromSettings=false", WritOnRoute.Interests.createRoute())
        assertEquals(WritOnRoute.Home.route, onboardingCompletionDestination(fromSettings = false))
    }

    @Test fun `new account always enters personalized onboarding`() {
        assertTrue(shouldOpenPersonalizedOnboarding(true, true, 2))
    }

    @Test fun `returning account with server completion goes home after reinstall`() {
        assertFalse(shouldOpenPersonalizedOnboarding(false, false, 2))
    }

    @Test fun `returning account with legacy completed onboarding is not forced through v2`() {
        assertFalse(shouldOpenPersonalizedOnboarding(false, false, 1))
    }

    @Test fun `account without any completion enters personalized onboarding`() {
        assertTrue(shouldOpenPersonalizedOnboarding(false, false, 0))
    }

    @Test fun `preference card only appears once for readers with insufficient interests`() {
        val unseen = EngagementPreferences(onboardingVersion = 1, preferenceCardState = "unseen")
        assertTrue(shouldShowExistingUserPreferencesCard(true, 2, unseen))
        assertFalse(shouldShowExistingUserPreferencesCard(false, 2, unseen))
        assertFalse(shouldShowExistingUserPreferencesCard(true, 3, unseen))
        assertFalse(shouldShowExistingUserPreferencesCard(true, 2, unseen.copy(preferenceCardState = "dismissed")))
        assertFalse(shouldShowExistingUserPreferencesCard(true, 2, unseen.copy(onboardingVersion = 2)))
    }

    @Test fun `authentication returns to the protected destination when one is pending`() {
        assertEquals(WritOnRoute.Reader.createRoute("story-1"), postAuthenticationDestination("reader/story-1"))
        assertEquals(WritOnRoute.Write.route, postAuthenticationDestination(WritOnRoute.Write.route))
        assertEquals(WritOnRoute.Home.route, postAuthenticationDestination(null))
    }

    @Test fun `writer destination follows the latest explicit onboarding choice`() {
        assertEquals(WritOnRoute.Write.route, destinationAfterIntentChoice(WritOnRoute.Write.route, "write"))
        assertEquals(WritOnRoute.Write.route, destinationAfterIntentChoice(WritOnRoute.Write.route, "both"))
        assertEquals(WritOnRoute.Home.route, destinationAfterIntentChoice(WritOnRoute.Write.route, "read"))
    }

    @Test fun `onboarding completion from settings targets settings directly`() {
        assertEquals(WritOnRoute.Settings.route, onboardingCompletionDestination(fromSettings = true))
        assertEquals(WritOnRoute.Settings.route, onboardingCompletionDestination(fromSettings = true, pendingRoute = WritOnRoute.Write.route))
    }

    @Test fun `ordinary onboarding completion targets pending destination or home`() {
        assertEquals(WritOnRoute.Write.route, onboardingCompletionDestination(fromSettings = false, pendingRoute = WritOnRoute.Write.route))
        assertEquals(WritOnRoute.Home.route, onboardingCompletionDestination(fromSettings = false, pendingRoute = null))
    }

    @Test fun `pending interests retry without discarding preserved legacy choices`() = runTest {
        val api: WritOnApiService = mock()
        val preferences: UserPreferences = mock()
        whenever(preferences.hasPendingInterestSync("account-a")).thenReturn(true)
        whenever(preferences.interestChoices("account-a")).thenReturn(setOf("poetry", "legacy-topic"))
        whenever(api.updateMyInterests(org.mockito.kotlin.any()))
            .thenReturn(Response.success(InterestsResponseDto(listOf("poetry"))))
        whenever(preferences.hasPendingEngagementSync("account-a")).thenReturn(false)

        val result = retryPendingAccountPreferences(api, preferences, "account-a")

        assertTrue(result.isSuccess)
        verify(preferences).saveInterestChoices(
            "account-a",
            setOf("poetry", "legacy-topic"),
            pendingSync = false,
        )
    }
}
