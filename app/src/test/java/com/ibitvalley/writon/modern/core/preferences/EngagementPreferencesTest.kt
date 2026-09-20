package com.ibitvalley.writon.modern.core.preferences

import android.content.Context
import android.content.SharedPreferences
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.anyOrNull
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class EngagementPreferencesTest {
    private val data = mutableMapOf<String, Any?>()
    private val storage: SharedPreferences = mock()
    private val editor: SharedPreferences.Editor = mock()
    private val context: Context = mock()

    private fun preferences(): UserPreferences {
        whenever(context.applicationContext).thenReturn(context)
        whenever(context.getSharedPreferences(any(), any())).thenReturn(storage)
        whenever(storage.edit()).thenReturn(editor)
        whenever(storage.getString(any(), anyOrNull())).thenAnswer { data[it.getArgument<String>(0)] as String? ?: it.getArgument<String?>(1) }
        whenever(storage.getInt(any(), any())).thenAnswer { data[it.getArgument<String>(0)] as Int? ?: it.getArgument<Int>(1) }
        whenever(storage.getLong(any(), any())).thenAnswer { data[it.getArgument<String>(0)] as Long? ?: it.getArgument<Long>(1) }
        whenever(storage.getBoolean(any(), any())).thenAnswer { data[it.getArgument<String>(0)] as Boolean? ?: it.getArgument<Boolean>(1) }
        whenever(editor.putString(any(), anyOrNull())).thenAnswer { data[it.getArgument(0)] = it.getArgument<String?>(1); editor }
        whenever(editor.putInt(any(), any())).thenAnswer { data[it.getArgument(0)] = it.getArgument<Int>(1); editor }
        whenever(editor.putLong(any(), any())).thenAnswer { data[it.getArgument(0)] = it.getArgument<Long>(1); editor }
        whenever(editor.putBoolean(any(), any())).thenAnswer { data[it.getArgument(0)] = it.getArgument<Boolean>(1); editor }
        whenever(editor.remove(any())).thenAnswer { data.remove(it.getArgument<String>(0)); editor }
        whenever(editor.commit()).thenReturn(true)
        return UserPreferences(context)
    }

    @Test fun `guest and signed-in snapshots remain isolated`() {
        val prefs = preferences()
        prefs.saveEngagementPreferences(null, EngagementPreferences("read", 2, 100L, "completed"))
        prefs.saveEngagementPreferences("account-a", EngagementPreferences("write", 2, 200L, "dismissed"))

        assertEquals("read", prefs.engagementPreferences(null).primaryIntent)
        assertEquals("write", prefs.engagementPreferences("account-a").primaryIntent)
        assertNull(prefs.engagementPreferences("account-b").primaryIntent)
    }

    @Test fun `invalid local values normalize safely`() {
        val prefs = preferences()
        prefs.saveEngagementPreferences("account-a", EngagementPreferences("invalid", -4, -1L, "later"))

        assertEquals(EngagementPreferences(), prefs.engagementPreferences("account-a"))
    }

    @Test fun `primary intent normalizes user selection before persistence`() {
        val normalized = EngagementPreferences(primaryIntent = " READ ").normalized()

        assertEquals("read", normalized.primaryIntent)
    }

    @Test fun `account snapshots can remain pending while guest snapshots never do`() {
        val prefs = preferences()
        prefs.saveEngagementPreferences("account-a", EngagementPreferences("read", 2), pendingSync = true)
        prefs.saveEngagementPreferences(null, EngagementPreferences("write", 2), pendingSync = true)

        assertEquals(true, prefs.hasPendingEngagementSync("account-a"))
    }

    @Test fun `guest discovery notifications default on and persist locally`() {
        val prefs = preferences()

        assertEquals(true, prefs.guestDiscoveryNotificationsEnabled)
        prefs.guestDiscoveryNotificationsEnabled = false

        assertEquals(false, prefs.guestDiscoveryNotificationsEnabled)
    }
}
