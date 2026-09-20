package com.ibitvalley.writon.modern.feature.onboarding

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class InterestTopicCatalogTest {
    @Test
    fun `fallback matches the current publishable catalog and excludes trending`() {
        val ids = InterestTopicCatalog.fallbackTopics.map(InterestTopicOption::id)

        assertEquals(17, ids.size)
        assertFalse("trending" in ids)
        assertTrue("science_health" in ids)
        assertTrue("business_finance" in ids)
        assertTrue("short_stories" in ids)
    }

    @Test
    fun `server names retain server order and normalize to feed topic ids`() {
        val topics = InterestTopicCatalog.fromServerNames(
            listOf("Science & Health", "Short Stories", "Poetry"),
        )

        assertEquals(
            listOf("science_health", "short_stories", "poetry"),
            topics.map(InterestTopicOption::id),
        )
    }

    @Test
    fun `unknown feed entries and duplicates are ignored`() {
        val topics = InterestTopicCatalog.fromServerNames(
            listOf("Trending", "Poetry", "poetry", "Unknown category"),
        )

        assertEquals(listOf("poetry"), topics.map(InterestTopicOption::id))
    }

    @Test
    fun `saved names slugs and ids normalize consistently`() {
        assertEquals("short_stories", InterestTopicCatalog.normalizeTopicId("Short Stories"))
        assertEquals("short_stories", InterestTopicCatalog.normalizeTopicId("short-stories"))
        assertEquals("short_stories", InterestTopicCatalog.normalizeTopicId("short_stories"))
        assertNull(InterestTopicCatalog.normalizeTopicId("More Topics"))
    }

    @Test
    fun `successful empty or unsupported catalog never resurrects retired categories`() {
        assertEquals(
            emptyList<InterestTopicOption>(),
            InterestTopicCatalog.fromServerNames(emptyList()),
        )
        assertEquals(
            emptyList<InterestTopicOption>(),
            InterestTopicCatalog.fromServerNames(listOf("Trending")),
        )
    }

    @Test
    fun `legacy choices are preserved without invented mappings`() {
        assertEquals(setOf("travel", "Short Essays", "short_stories"),
            InterestTopicCatalog.preserveSavedIds(listOf("travel", "Short Essays", "Short Stories")))
    }

    @Test
    fun `editing only replaces available topics and preserves hidden saved choices`() {
        assertEquals(setOf("travel", "fiction", "essays"), InterestTopicCatalog.mergeSelection(
            setOf("travel", "fiction", "poetry"), setOf("essays"), setOf("poetry", "essays")))
    }
}
