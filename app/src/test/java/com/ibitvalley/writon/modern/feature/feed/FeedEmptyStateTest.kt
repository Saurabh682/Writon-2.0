package com.ibitvalley.writon.modern.feature.feed

import org.junit.Assert.assertEquals
import org.junit.Test

class FeedEmptyStateTest {
    @Test
    fun `detail and editorial cache writes cannot enter the human deck`() {
        fun post(id: String) = com.ibitvalley.writon.modern.core.database.model.PostEntity(
            id = id, authorId = id, authorName = id, authorPenName = id, authorAvatarUrl = null,
            title = id, slug = id, summary = null, content = "", category = "Poetry", coverImage = null,
            readingTimeMin = 1, likesCnt = 0, commentsCnt = 0, bookmarksCnt = 0, createdAt = "")
        val cache = listOf(post("bot"), post("human-a"), post("linked-story"), post("human-b"))
        assertEquals(listOf("human-b", "human-a"),
            sourceFeedPosts(cache, listOf("human-b", "missing", "human-a", "human-b")).map { it.id })
        assertEquals(emptyList<String>(), sourceFeedPosts(cache, emptyList()).map { it.id })
    }
    @Test
    fun `empty feed distinguishes loading failure and genuine empty inventory`() {
        assertEquals(FeedEmptyState.LOADING, feedEmptyState(isRefreshing = true, refreshFailed = false))
        assertEquals(FeedEmptyState.FAILURE, feedEmptyState(isRefreshing = false, refreshFailed = true))
        assertEquals(FeedEmptyState.EMPTY, feedEmptyState(isRefreshing = false, refreshFailed = false))
    }

    @Test
    fun `personalization is limited to the unfiltered home feed`() {
        assertEquals(true, shouldUsePersonalizedHomeFeed(true, "All", ""))
        assertEquals(false, shouldUsePersonalizedHomeFeed(false, "All", ""))
        assertEquals(false, shouldUsePersonalizedHomeFeed(true, "Poetry", ""))
        assertEquals(false, shouldUsePersonalizedHomeFeed(true, "All", "quiet"))
    }
}
