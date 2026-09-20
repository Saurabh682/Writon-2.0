package com.ibitvalley.writon.modern.core.telemetry

import android.content.Context
import android.content.SharedPreferences
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito.mock

class GrowthTrackerOpportunityTest {

    @Test
    fun `activation waits for referrer check and reports attributed campaign`() {
        val preferences = InMemorySharedPreferences()
        val activations = mutableListOf<Boolean>()
        val tracker = GrowthTracker(
            context = mock(Context::class.java),
            preferences = preferences,
            profileIdProvider = { "reader-a" },
            activationReporter = { _, _, _, campaignAttributed ->
                activations += campaignAttributed
            }
        )

        tracker.recordStrongReaderAction()
        assertTrue(activations.isEmpty())

        assertTrue(
            InstallReferrerTracker.parseAndSave(
                "utm_source=instagram&utm_medium=organic_social" +
                    "&utm_campaign=writon_growth_2026_09" +
                    "&utm_content=2609_d03_ig_post_hi_verified_poem_quote",
                tracker
            )
        )
        tracker.completeCampaignAttributionCheck()

        assertEquals(listOf(true), activations)
        assertEquals("hi", preferences.getString(GrowthTracker.KEY_CAMPAIGN_LANGUAGE, null))
    }

    @Test
    fun `unmatched campaign completes pending activation without attribution`() {
        val preferences = InMemorySharedPreferences()
        val activations = mutableListOf<Boolean>()
        val tracker = GrowthTracker(
            context = mock(Context::class.java),
            preferences = preferences,
            activationReporter = { _, _, _, campaignAttributed ->
                activations += campaignAttributed
            }
        )

        tracker.recordStrongReaderAction()
        assertFalse(
            InstallReferrerTracker.parseAndSave(
                "utm_campaign=someone_else&utm_content=2609_d03_ig_post_hi_verified_poem_quote",
                tracker
            )
        )
        tracker.completeCampaignAttributionCheck()

        assertEquals(listOf(false), activations)
    }

    @Test
    fun `publication opportunity survives tracker recreation and remains profile scoped`() {
        val preferences = InMemorySharedPreferences()
        var profileId = "writer-a"
        val firstTracker = GrowthTracker(mock(Context::class.java), preferences) { profileId }

        firstTracker.recordPublishedStory("post-42")

        val recreatedTracker = GrowthTracker(mock(Context::class.java), preferences) { profileId }
        val restored = recreatedTracker.getPendingOpportunity()
        assertTrue(restored is ReviewOpportunity.ConfirmedPublication)
        assertEquals("post-42", restored?.identifier)

        profileId = "writer-b"
        assertNull(recreatedTracker.getPendingOpportunity())
        profileId = "writer-a"
        assertEquals("post-42", recreatedTracker.getPendingOpportunity()?.identifier)
    }

    @Test
    fun `compare and consume does not remove a different pending opportunity`() {
        val preferences = InMemorySharedPreferences()
        val tracker = GrowthTracker(mock(Context::class.java), preferences) { "writer-a" }
        tracker.recordPublishedStory("post-42")

        assertNull(
            tracker.consumePendingOpportunity(
                ReviewOpportunity.ConfirmedPublication("different-post", timestamp = 1L)
            )
        )
        assertEquals("post-42", tracker.getPendingOpportunity()?.identifier)
    }
}

private class InMemorySharedPreferences : SharedPreferences {
    private val values = linkedMapOf<String, Any?>()

    override fun getAll(): Map<String, *> = values.toMap()
    override fun getString(key: String?, defValue: String?): String? = values[key] as? String ?: defValue
    @Suppress("UNCHECKED_CAST")
    override fun getStringSet(key: String?, defValues: MutableSet<String>?): MutableSet<String>? =
        ((values[key] as? Set<String>) ?: defValues)?.toMutableSet()
    override fun getInt(key: String?, defValue: Int): Int = values[key] as? Int ?: defValue
    override fun getLong(key: String?, defValue: Long): Long = values[key] as? Long ?: defValue
    override fun getFloat(key: String?, defValue: Float): Float = values[key] as? Float ?: defValue
    override fun getBoolean(key: String?, defValue: Boolean): Boolean = values[key] as? Boolean ?: defValue
    override fun contains(key: String?): Boolean = values.containsKey(key)
    override fun edit(): SharedPreferences.Editor = Editor()
    override fun registerOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) = Unit
    override fun unregisterOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) = Unit

    private inner class Editor : SharedPreferences.Editor {
        private val updates = linkedMapOf<String, Any?>()
        private val removals = linkedSetOf<String>()
        private var clearRequested = false

        override fun putString(key: String?, value: String?): SharedPreferences.Editor = stage(key, value)
        override fun putStringSet(key: String?, values: MutableSet<String>?): SharedPreferences.Editor = stage(key, values?.toSet())
        override fun putInt(key: String?, value: Int): SharedPreferences.Editor = stage(key, value)
        override fun putLong(key: String?, value: Long): SharedPreferences.Editor = stage(key, value)
        override fun putFloat(key: String?, value: Float): SharedPreferences.Editor = stage(key, value)
        override fun putBoolean(key: String?, value: Boolean): SharedPreferences.Editor = stage(key, value)
        override fun remove(key: String?): SharedPreferences.Editor = apply {
            if (key != null) removals += key
        }
        override fun clear(): SharedPreferences.Editor = apply { clearRequested = true }
        override fun commit(): Boolean {
            if (clearRequested) values.clear()
            removals.forEach(values::remove)
            updates.forEach { (key, value) ->
                if (value == null) values.remove(key) else values[key] = value
            }
            return true
        }
        override fun apply() { commit() }

        private fun stage(key: String?, value: Any?): SharedPreferences.Editor = apply {
            if (key != null) updates[key] = value
        }
    }
}
