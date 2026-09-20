package com.ibitvalley.writon.modern.feature.reader

import com.ibitvalley.writon.modern.core.database.model.PostEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ReaderNextStoryTest {
    @Test
    fun `prefers another author in the same language and category`() {
        val current = story("current", "author-a", "Poetry", "hi")
        val candidates = listOf(
            current,
            story("same-author", "author-a", "Poetry", "hi"),
            story("other-language", "author-b", "Poetry", "en"),
            story("best", "author-b", "Poetry", "hi")
        )

        assertEquals("best", selectNextStory(current, candidates)?.id)
        assertNull(selectNextStory(current, listOf(current)))
    }

    @Test fun `explains why the next story was selected`() {
        val current = story("current", "author-a", "Poetry", "hi")

        assertEquals(
            NextStoryReason.SAME_CATEGORY,
            nextStoryReason(current, story("category", "author-b", "Poetry", "en")),
        )
        assertEquals(
            NextStoryReason.SAME_LANGUAGE,
            nextStoryReason(current, story("language", "author-b", "Essays", "hi")),
        )
        assertEquals(
            NextStoryReason.SAME_WRITER,
            nextStoryReason(current, story("writer", "author-a", "Essays", "en")),
        )
    }

    private fun story(id: String, authorId: String, category: String, language: String) = PostEntity(
        id = id,
        authorId = authorId,
        authorName = authorId,
        authorPenName = authorId,
        authorAvatarUrl = null,
        title = id,
        slug = id,
        summary = null,
        content = "",
        category = category,
        coverImage = null,
        readingTimeMin = 2,
        likesCnt = 0,
        commentsCnt = 0,
        bookmarksCnt = 0,
        createdAt = "2026-09-10T00:00:00Z",
        languageCode = language
    )
}
