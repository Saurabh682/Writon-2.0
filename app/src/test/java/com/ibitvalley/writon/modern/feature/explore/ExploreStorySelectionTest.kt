package com.ibitvalley.writon.modern.feature.explore

import com.ibitvalley.writon.modern.core.network.model.AuthorDto
import com.ibitvalley.writon.modern.core.network.model.PostDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ExploreStorySelectionTest {
    @Test
    fun `start here prioritizes app language and varied writers`() {
        val posts = listOf(
            post("en-a", "en", "author-a", "Essays", 2),
            post("hi-a", "hi", "author-b", "Poetry", 3),
            post("hi-b", "hi", "author-c", "Culture", 4),
            post("en-b", "en", "author-d", "Journal", 2),
            post("hi-c", "hi", "author-e", "Reviews", 5)
        )

        val selected = selectStartHere(posts, preferredLanguage = "hi-IN")

        assertEquals(3, selected.size)
        assertEquals(2, selected.count { it.languageCode == "hi" })
        assertEquals(3, selected.map { it.author.id }.distinct().size)
    }

    @Test
    fun `quick reads exclude featured and longer stories`() {
        val posts = listOf(
            post("featured", "en", "author-a", "Essays", 2),
            post("quick", "en", "author-b", "Poetry", 5),
            post("long", "en", "author-c", "Culture", 6)
        )

        val selected = selectQuickReads(posts, "en", excludedIds = setOf("featured"))

        assertEquals(listOf("quick"), selected.map { it.id })
        assertTrue(selected.all { it.readingTimeMin in 1..5 })
    }

    @Test
    fun `find a read enforces explicit language category and time filters`() {
        val posts = listOf(
            post("match", "hi", "author-a", "Poetry", 4),
            post("wrong-language", "en", "author-b", "Poetry", 4),
            post("wrong-category", "hi", "author-c", "Essays", 4),
            post("too-long", "hi", "author-d", "Poetry", 8)
        )

        val selected = selectFindARead(
            posts = posts,
            preferredLanguage = "en-IN",
            selectedLanguage = "hi-IN",
            selectedCategory = "poetry",
            maxReadingTimeMin = 5
        )

        assertEquals(listOf("match"), selected.map { it.id })
    }

    @Test
    fun `find a read does not silently relax constraints with no match`() {
        val posts = listOf(post("english", "en", "author-a", "Essays", 3))

        val selected = selectFindARead(
            posts = posts,
            preferredLanguage = "en",
            selectedLanguage = "mr",
            selectedCategory = "Poetry",
            maxReadingTimeMin = 5
        )

        assertTrue(selected.isEmpty())
    }

    private fun post(id: String, language: String, author: String, category: String, minutes: Int) = PostDto(
        id = id,
        title = "Story $id",
        languageCode = language,
        category = category,
        readingTimeMin = minutes,
        author = AuthorDto(id = author, fullName = author)
    )
}
