package com.ibitvalley.writon.modern.feature.search

import com.ibitvalley.writon.modern.core.database.dao.PostDao
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.PaginationDto
import com.ibitvalley.writon.modern.core.network.model.PostsResponseDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.anyOrNull
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import retrofit2.Response

@OptIn(ExperimentalCoroutinesApi::class)
class SearchViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val api: WritOnApiService = mock()
    private val posts: PostDao = mock()

    @Before fun setup() { Dispatchers.setMain(dispatcher) }
    @After fun teardown() { Dispatchers.resetMain() }

    @Test fun `successful empty search never revives stale cached stories`() = runTest(dispatcher) {
        whenever(searchPosts("removed")).thenReturn(
            Response.success(PostsResponseDto(emptyList(), PaginationDto(1, 20, false)))
        )
        val model = SearchViewModel(api, posts, ioDispatcher = dispatcher)

        model.search("removed")
        advanceUntilIdle()

        assertEquals(SearchResultState.EMPTY, model.resultState)
        assertTrue(model.results.isEmpty())
        verify(posts, never()).getLocalPostsMatching(any())
    }

    @Test fun `failed search uses and labels a cached result`() = runTest(dispatcher) {
        whenever(searchPosts("poetry")).thenThrow(IllegalStateException("offline"))
        whenever(posts.getLocalPostsMatching("poetry")).thenReturn(listOf(localPost()))
        val model = SearchViewModel(api, posts, ioDispatcher = dispatcher)

        model.search("poetry")
        advanceUntilIdle()

        assertEquals(SearchResultState.CACHED, model.resultState)
        assertEquals(listOf("cached-story"), model.results.map { it.id })
    }

    private suspend fun searchPosts(query: String) = api.getPosts(
        category = anyOrNull(),
        tab = anyOrNull(),
        authorId = anyOrNull(),
        authorPenName = anyOrNull(),
        searchQuery = eq(query),
        page = any(),
        limit = any()
    )

    private fun localPost() = PostEntity(
        id = "cached-story",
        authorId = "author",
        authorName = "Writer",
        authorPenName = "writer",
        authorAvatarUrl = null,
        title = "Cached story",
        slug = "cached-story",
        summary = null,
        content = "Text",
        category = "Poetry",
        coverImage = null,
        readingTimeMin = 1,
        likesCnt = 0,
        commentsCnt = 0,
        bookmarksCnt = 0,
        createdAt = "2026-09-07T00:00:00Z"
    )
}
