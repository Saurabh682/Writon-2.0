package com.ibitvalley.writon.modern.feature.onboarding

import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.*
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.core.preferences.EngagementPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import org.mockito.kotlin.*
import retrofit2.Response

@OptIn(ExperimentalCoroutinesApi::class)
class InterestsViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val api: WritOnApiService = mock()
    private val prefs: UserPreferences = mock()

    @Before fun setup() {
        Dispatchers.setMain(dispatcher)
        whenever(prefs.cachedInterestCatalog).thenReturn(null)
        whenever(prefs.interestChoices(anyOrNull())).thenReturn(emptySet())
        whenever(prefs.engagementPreferences(anyOrNull())).thenReturn(EngagementPreferences())
        whenever(prefs.saveEngagementPreferences(anyOrNull(), any(), any())).thenReturn(true)
    }
    @After fun teardown() { Dispatchers.resetMain() }

    @Test fun `failed fetch retains cached catalog`() = runTest(dispatcher) {
        whenever(prefs.cachedInterestCatalog).thenReturn(listOf("Poetry"))
        whenever(api.getTags()).thenThrow(RuntimeException("offline"))
        val model = InterestsViewModel(api, prefs, null)
        advanceUntilIdle()
        assertEquals(listOf("poetry"), model.uiState.value.availableTopics.map { it.id })
        assertFalse(model.uiState.value.isLoadingTopics)
    }

    @Test fun `successful empty fetch replaces fallback and caches empty`() = runTest(dispatcher) {
        whenever(api.getTags()).thenReturn(Response.success(TagsResponseDto(emptyList())))
        val model = InterestsViewModel(api, prefs, null)
        advanceUntilIdle()
        assertTrue(model.uiState.value.availableTopics.isEmpty())
        verify(prefs).cachedInterestCatalog = emptyList()
    }

    @Test fun `opening screen never rewrites old preferences`() = runTest(dispatcher) {
        whenever(prefs.interestChoices(null)).thenReturn(setOf("travel", "Short Stories"))
        val model = InterestsViewModel(api, prefs, null)
        advanceUntilIdle()
        assertEquals(setOf("travel", "short_stories"), model.uiState.value.selectedTopicIds)
        verify(prefs, never()).saveInterestChoices(anyOrNull(), any(), any())
    }

    @Test fun `late account hydration cannot overwrite an active edit`() = runTest(dispatcher) {
        whenever(api.getMyInterests()).thenReturn(Response.success(InterestsResponseDto(listOf("poetry"))))
        val model = InterestsViewModel(api, prefs, "reader-a")
        model.markEdited()
        advanceUntilIdle()
        assertTrue(model.uiState.value.selectedTopicIds.isEmpty())
        verify(prefs, never()).saveInterestChoices(anyOrNull(), any(), any())
    }

    @Test fun `pending offline choices survive account hydration`() = runTest(dispatcher) {
        whenever(prefs.interestChoices("reader-a")).thenReturn(setOf("essays"))
        whenever(prefs.hasPendingInterestSync("reader-a")).thenReturn(true)
        whenever(api.getMyInterests()).thenReturn(Response.success(InterestsResponseDto(listOf("poetry"))))
        val model = InterestsViewModel(api, prefs, "reader-a")
        advanceUntilIdle()
        assertEquals(setOf("essays"), model.uiState.value.selectedTopicIds)
    }

    @Test fun `skip does not clear preferences or write account endpoint`() = runTest(dispatcher) {
        val model = InterestsViewModel(api, prefs, null)
        var continued = false
        model.continueWithSavedChoices { continued = true }
        advanceUntilIdle()
        assertTrue(continued)
        verify(prefs, never()).saveInterestChoices(anyOrNull(), any(), any())
        verify(api, never()).updateMyInterests(any())
    }

    @Test fun `completing interests records personalized onboarding version two`() = runTest(dispatcher) {
        val savedPreferences = argumentCaptor<EngagementPreferences>()
        val model = InterestsViewModel(api, prefs, null)

        model.continueWithSavedChoices {}

        verify(prefs).saveEngagementPreferences(isNull(), savedPreferences.capture(), eq(false))
        assertEquals(2, savedPreferences.firstValue.onboardingVersion)
        assertEquals("completed", savedPreferences.firstValue.preferenceCardState)
    }

    @Test fun `guest save preserves legacy ids without any account request`() = runTest(dispatcher) {
        whenever(prefs.interestChoices(null)).thenReturn(setOf("travel", "poetry"))
        val model = InterestsViewModel(api, prefs, null)
        model.save(setOf("essays")) {}
        advanceUntilIdle()
        verify(prefs).saveInterestChoices(null, setOf("travel", "essays"), false)
        verify(api, never()).updateMyInterests(any())
    }

    @Test fun `account switch prevents stale save`() = runTest(dispatcher) {
        val model = InterestsViewModel(api, prefs, "reader-a") { false }
        model.save(setOf("poetry")) { fail("Must not navigate for stale account") }
        advanceUntilIdle()
        verify(api, never()).updateMyInterests(any())
        verify(prefs, never()).saveInterestChoices(anyOrNull(), any(), any())
    }

    @Test fun `successful empty account choices are authoritative`() = runTest(dispatcher) {
        whenever(prefs.interestChoices("reader-a")).thenReturn(setOf("poetry"))
        whenever(api.getMyInterests()).thenReturn(Response.success(InterestsResponseDto(emptyList())))
        val model = InterestsViewModel(api, prefs, "reader-a")
        advanceUntilIdle()
        assertTrue(model.uiState.value.selectedTopicIds.isEmpty())
        verify(prefs).saveInterestChoices("reader-a", emptySet(), false)
    }

    @Test fun `all seventeen current categories save locally with pending sync for background owner`() = runTest(dispatcher) {
        val ids = InterestTopicCatalog.fallbackTopics.map { it.id }.toSortedSet()
        val model = InterestsViewModel(api, prefs, "reader-a")
        var continued = false
        model.save(ids) { continued = true }
        advanceUntilIdle()
        assertTrue(continued)
        verify(prefs).saveInterestChoices("reader-a", ids, true)
        verify(api, never()).updateMyInterests(any())
        assertFalse(model.uiState.value.hasSyncError)
        assertEquals(ids, model.uiState.value.selectedTopicIds)
    }

    @Test fun `saving choices locally leaves pending sync and immediately completes without blocking on account sync`() = runTest(dispatcher) {
        val model = InterestsViewModel(api, prefs, "reader-a")
        var continued = false
        model.save(setOf("poetry")) { continued = true }
        assertTrue(continued)
        advanceUntilIdle()
        verify(prefs).saveInterestChoices("reader-a", setOf("poetry"), true)
        verify(api, never()).updateMyInterests(any())
        assertFalse(model.uiState.value.hasSyncError)
        assertEquals(setOf("poetry"), model.uiState.value.selectedTopicIds)
    }

    @Test fun `excess legacy choices save locally with pending sync without truncation or api update`() = runTest(dispatcher) {
        val ids = (1..33).map { "legacy_$it" }.toSet()
        whenever(prefs.interestChoices("reader-a")).thenReturn(ids)
        val model = InterestsViewModel(api, prefs, "reader-a")
        var continued = false
        model.save(emptySet()) { continued = true }
        advanceUntilIdle()
        assertTrue(continued)
        verify(prefs).saveInterestChoices("reader-a", ids, true)
        assertEquals(ids, model.uiState.value.selectedTopicIds)
        verify(api, never()).updateMyInterests(any())
    }
}
