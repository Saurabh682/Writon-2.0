package com.ibitvalley.writon.modern.core.preferences

import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.EngagementPreferencesDto
import com.ibitvalley.writon.modern.core.network.model.UpdateEngagementPreferencesRequestDto
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import retrofit2.Response

class EngagementPreferencesSyncTest {
    private val api: WritOnApiService = mock()
    private val preferences: UserPreferences = mock()
    private val sync = EngagementPreferencesSync(api, preferences)

    @Test fun `guest save remains local and never calls account API`() = runTest {
        whenever(preferences.saveEngagementPreferences(null, EngagementPreferences("read", 2), false)).thenReturn(true)

        val result = sync.save(null, EngagementPreferences("read", 2))

        assertTrue(result.isSuccess)
        verify(api, never()).updateMyEngagementPreferences(any())
    }

    @Test fun `pending account snapshot wins over remote hydration and is pushed`() = runTest {
        val local = EngagementPreferences("write", 2, 1_788_609_600_000L, "completed")
        val remote = EngagementPreferencesDto("write", 2, "2026-09-05T12:00:00.000Z", "completed")
        whenever(preferences.hasPendingEngagementSync("account-a")).thenReturn(true)
        whenever(preferences.engagementPreferences("account-a")).thenReturn(local)
        whenever(api.updateMyEngagementPreferences(any())).thenReturn(Response.success(remote))
        whenever(preferences.saveEngagementPreferences("account-a", local, false)).thenReturn(true)

        val result = sync.hydrate("account-a")

        assertTrue(result.isSuccess)
        verify(api, never()).getMyEngagementPreferences()
        verify(api).updateMyEngagementPreferences(
            UpdateEngagementPreferencesRequestDto("write", 2, "2026-09-05T12:00:00.000Z", "completed")
        )
    }

    @Test fun `remote account snapshot is cached when no local write is pending`() = runTest {
        val remote = EngagementPreferencesDto("both", 3, null, "dismissed")
        whenever(preferences.hasPendingEngagementSync("account-a")).thenReturn(false)
        whenever(api.getMyEngagementPreferences()).thenReturn(Response.success(remote))
        whenever(preferences.saveEngagementPreferences(any(), any(), any())).thenReturn(true)

        val result = sync.hydrate("account-a")

        assertEquals(EngagementPreferences("both", 3, null, "dismissed"), result.getOrThrow())
        verify(preferences).saveEngagementPreferences("account-a", EngagementPreferences("both", 3, null, "dismissed"), false)
    }

    @Test fun `failed account save remains marked pending for a later retry`() = runTest {
        val local = EngagementPreferences("read", 2, null, "completed")
        whenever(preferences.saveEngagementPreferences("account-a", local, true)).thenReturn(true)
        whenever(api.updateMyEngagementPreferences(any())).thenThrow(IllegalStateException("offline"))

        val result = sync.save("account-a", local)

        assertTrue(result.isFailure)
        verify(preferences).saveEngagementPreferences("account-a", local, true)
        verify(preferences, never()).saveEngagementPreferences("account-a", local, false)
    }
}
