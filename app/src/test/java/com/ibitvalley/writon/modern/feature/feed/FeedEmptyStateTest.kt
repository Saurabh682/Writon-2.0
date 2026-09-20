package com.ibitvalley.writon.modern.feature.feed

import org.junit.Assert.assertEquals
import org.junit.Test

class FeedEmptyStateTest {
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
