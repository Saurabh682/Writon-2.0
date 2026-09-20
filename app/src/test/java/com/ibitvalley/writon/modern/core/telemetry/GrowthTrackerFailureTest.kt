package com.ibitvalley.writon.modern.core.telemetry

import android.content.Context
import android.content.SharedPreferences
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`

class GrowthTrackerFailureTest {

    @Test
    fun `resolving a failure that was never active does not start quiet period`() {
        val context = mock(Context::class.java)
        val preferences = mock(SharedPreferences::class.java)
        val editor = mock(SharedPreferences.Editor::class.java)
        `when`(preferences.getStringSet(GrowthTracker.KEY_ACTIVE_FAILURES, emptySet())).thenReturn(emptySet())
        `when`(preferences.edit()).thenReturn(editor)
        `when`(editor.putStringSet(org.mockito.kotlin.any(), org.mockito.kotlin.any())).thenReturn(editor)
        `when`(editor.putBoolean(org.mockito.kotlin.any(), org.mockito.kotlin.any())).thenReturn(editor)
        `when`(editor.putLong(org.mockito.kotlin.any(), org.mockito.kotlin.any())).thenReturn(editor)

        GrowthTracker(context, preferences).recordFailureResolved("publish_failure")

        verify(editor, never()).putLong(
            org.mockito.kotlin.eq(GrowthTracker.KEY_LAST_FAILURE_RESOLVED_AT),
            org.mockito.kotlin.any()
        )
    }

    @Test
    fun `resolving one of several failures keeps quiet period unchanged`() {
        val context = mock(Context::class.java)
        val preferences = mock(SharedPreferences::class.java)
        val editor = mock(SharedPreferences.Editor::class.java)
        `when`(
            preferences.getStringSet(GrowthTracker.KEY_ACTIVE_FAILURES, emptySet())
        ).thenReturn(setOf("auth_failure", "publish_failure"))
        `when`(preferences.edit()).thenReturn(editor)
        `when`(editor.putStringSet(org.mockito.kotlin.any(), org.mockito.kotlin.any())).thenReturn(editor)
        `when`(editor.putBoolean(org.mockito.kotlin.any(), org.mockito.kotlin.any())).thenReturn(editor)
        `when`(editor.putLong(org.mockito.kotlin.any(), org.mockito.kotlin.any())).thenReturn(editor)

        GrowthTracker(context, preferences).recordFailureResolved("publish_failure")

        verify(editor).putStringSet(GrowthTracker.KEY_ACTIVE_FAILURES, setOf("auth_failure"))
        verify(editor).putBoolean(GrowthTracker.KEY_HAS_UNRESOLVED_FAILURE, true)
        verify(editor, never()).putLong(
            org.mockito.kotlin.eq(GrowthTracker.KEY_LAST_FAILURE_RESOLVED_AT),
            org.mockito.kotlin.any()
        )
    }

    @Test
    fun `incompatible remote eligibility contract remains fail closed`() {
        val context = mock(Context::class.java)
        val preferences = mock(SharedPreferences::class.java)
        val editor = mock(SharedPreferences.Editor::class.java)
        `when`(preferences.edit()).thenReturn(editor)
        `when`(editor.putBoolean(org.mockito.kotlin.any(), org.mockito.kotlin.any())).thenReturn(editor)
        `when`(editor.putInt(org.mockito.kotlin.any(), org.mockito.kotlin.any())).thenReturn(editor)
        `when`(editor.putString(org.mockito.kotlin.any(), org.mockito.kotlin.anyOrNull())).thenReturn(editor)

        GrowthTracker(context, preferences).updateRemoteConfig(
            enabled = true,
            rolloutPercent = 100,
            minimumVersionCode = 120,
            excludedVersionCodes = emptyList(),
            eligibilityVersion = "review_eligibility_v2",
            readerEnabled = true,
            writerEnabled = true
        )

        verify(editor).putBoolean(GrowthTracker.KEY_REMOTE_ENABLED, false)
        verify(editor).putInt(GrowthTracker.KEY_REMOTE_ROLLOUT_PERCENT, 0)
        verify(editor).putBoolean(GrowthTracker.KEY_REMOTE_READER_ENABLED, false)
        verify(editor).putBoolean(GrowthTracker.KEY_REMOTE_WRITER_ENABLED, false)
    }
}
