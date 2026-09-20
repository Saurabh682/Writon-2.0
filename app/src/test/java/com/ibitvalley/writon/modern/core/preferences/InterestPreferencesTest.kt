package com.ibitvalley.writon.modern.core.preferences

import android.content.Context
import android.content.SharedPreferences
import org.junit.Assert.*
import org.junit.Test
import org.mockito.kotlin.*

class InterestPreferencesTest {
    private val data = mutableMapOf<String, Any?>()
    private val storage: SharedPreferences = mock()
    private val editor: SharedPreferences.Editor = mock()
    private val context: Context = mock()

    private fun preferences(): UserPreferences {
        whenever(context.applicationContext).thenReturn(context)
        whenever(context.getSharedPreferences(any(), any())).thenReturn(storage)
        whenever(storage.edit()).thenReturn(editor)
        whenever(storage.getStringSet(any(), anyOrNull())).thenAnswer { invocation ->
            @Suppress("UNCHECKED_CAST")
            (data[invocation.getArgument<String>(0)] as Set<String>?) ?: invocation.getArgument<Set<String>?>(1)
        }
        whenever(storage.getString(any(), anyOrNull())).thenAnswer { data[it.getArgument<String>(0)] as String? ?: it.getArgument<String?>(1) }
        whenever(storage.getBoolean(any(), any())).thenAnswer { data[it.getArgument<String>(0)] as Boolean? ?: it.getArgument<Boolean>(1) }
        whenever(storage.all).thenAnswer { data.toMap() }
        whenever(editor.putStringSet(any(), anyOrNull())).thenAnswer { data[it.getArgument(0)] = it.getArgument<Set<String>?>(1)?.toSet(); editor }
        whenever(editor.putString(any(), anyOrNull())).thenAnswer { data[it.getArgument(0)] = it.getArgument<String?>(1); editor }
        whenever(editor.putBoolean(any(), any())).thenAnswer { data[it.getArgument(0)] = it.getArgument<Boolean>(1); editor }
        whenever(editor.remove(any())).thenAnswer { data.remove(it.getArgument<String>(0)); editor }
        whenever(editor.commit()).thenReturn(true)
        return UserPreferences(context)
    }

    @Test fun `guest and two account choices never share a cache`() {
        val prefs = preferences()
        prefs.saveInterestChoices(null, setOf("poetry"), false)
        prefs.saveInterestChoices("a", setOf("tech"), true)
        prefs.saveInterestChoices("b", setOf("essays"), false)
        assertEquals(setOf("poetry"), prefs.interestChoices(null))
        assertEquals(setOf("tech"), prefs.interestChoices("a"))
        assertEquals(setOf("essays"), prefs.interestChoices("b"))
        assertTrue(prefs.hasPendingInterestSync("a"))
        assertFalse(prefs.hasPendingInterestSync("b"))
    }

    @Test fun `cache distinguishes never fetched from successful empty`() {
        val prefs = preferences()
        assertNull(prefs.cachedInterestCatalog)
        prefs.cachedInterestCatalog = emptyList()
        assertEquals(emptyList<String>(), prefs.cachedInterestCatalog)
        prefs.cachedInterestCatalog = listOf("Science & Health", "Poetry")
        assertEquals(listOf("Science & Health", "Poetry"), prefs.cachedInterestCatalog)
    }

    @Test fun `account clear removes scoped preferences and pending flags`() {
        val prefs = preferences()
        prefs.saveInterestChoices("a", setOf("tech"), true)
        prefs.saveInterestChoices("b", setOf("essays"), false)
        prefs.cachedInterestCatalog = listOf("Poetry")
        prefs.clear()
        assertTrue(prefs.interestChoices("a").isEmpty())
        assertTrue(prefs.interestChoices("b").isEmpty())
        assertFalse(prefs.hasPendingInterestSync("a"))
        assertEquals(listOf("Poetry"), prefs.cachedInterestCatalog)
    }
}
