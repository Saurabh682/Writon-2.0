package com.ibitvalley.writon.modern.data.repository

import com.google.gson.Gson
import com.ibitvalley.writon.modern.core.database.dao.CommentDao
import com.ibitvalley.writon.modern.core.database.dao.OutboxDao
import com.ibitvalley.writon.modern.core.database.dao.PostDao
import com.ibitvalley.writon.modern.core.database.model.OutboxMutationEntity
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.AddCommentRequestDto
import com.ibitvalley.writon.modern.core.network.model.BookmarkResponseDto
import com.ibitvalley.writon.modern.core.network.model.CreatePostRequestDto
import com.ibitvalley.writon.modern.core.network.model.PaginationDto
import com.ibitvalley.writon.modern.core.network.model.PostsResponseDto
import com.ibitvalley.writon.modern.core.network.model.RelationStateRequestDto
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import retrofit2.Response

class PostRepositoryMutationTest {
    private val api: WritOnApiService = mock()
    private val posts: PostDao = mock()
    private val comments: CommentDao = mock()
    private val outbox: OutboxDao = mock()
    private val gson = Gson()
    private lateinit var repository: PostRepository

    @Before
    fun setUp() {
        repository = PostRepository(api, posts, comments, outbox, gson)
    }

    @Test
    fun `failed like keeps the desired enabled state in one latest mutation`() = runTest {
        whenever(api.setLike("post-1", RelationStateRequestDto(true)))
            .thenReturn(Response.error(503, "offline".toResponseBody()))

        repository.toggleLike("post-1", currentLiked = false, currentCount = 7)

        verify(posts).updateLikeStatus("post-1", true, 8)
        val mutation = argumentCaptor<OutboxMutationEntity>()
        verify(outbox).enqueueLatestMutation(mutation.capture())
        assertEquals("LIKE", mutation.firstValue.mutationType)
        assertTrue(gson.fromJson(mutation.firstValue.payloadJson, RelationStateRequestDto::class.java).enabled)
    }

    @Test
    fun `confirmed bookmark reports saved value moment`() = runTest {
        whenever(api.setBookmark("post-1", RelationStateRequestDto(true)))
            .thenReturn(Response.success(BookmarkResponseDto(bookmarked = true, bookmarksCount = 3)))

        val result = repository.toggleBookmark("post-1", currentBookmarked = false, currentCount = 2)

        assertTrue(result.isSuccess)
        assertTrue(result.getOrThrow())
        verify(posts).updateBookmarkStatus("post-1", true, 3)
        verify(outbox, never()).enqueueLatestMutation(any())
    }

    @Test
    fun `queued bookmark is not a confirmed value moment`() = runTest {
        whenever(api.setBookmark("post-1", RelationStateRequestDto(true)))
            .thenReturn(Response.error(503, "offline".toResponseBody()))

        val result = repository.toggleBookmark("post-1", currentBookmarked = false, currentCount = 2)

        assertTrue(result.isFailure)
        verify(outbox).enqueueLatestMutation(any())
    }

    @Test
    fun `failed comment queues the same mutation id used by the first attempt`() = runTest {
        whenever(api.addComment(eq("post-1"), any())).thenThrow(IllegalStateException("offline"))

        repository.addComment("post-1", "A reply", "Writer", parentId = "root-1")

        val request = argumentCaptor<AddCommentRequestDto>()
        verify(api).addComment(eq("post-1"), request.capture())
        val mutation = argumentCaptor<OutboxMutationEntity>()
        verify(outbox).enqueueMutation(mutation.capture())
        val queued = gson.fromJson(mutation.firstValue.payloadJson, AddCommentRequestDto::class.java)
        assertNotNull(request.firstValue.clientMutationId)
        assertEquals(request.firstValue.clientMutationId, queued.clientMutationId)
        assertEquals("root-1", queued.parentId)
    }

    @Test
    fun `failed publish queues a non-null client draft id`() = runTest {
        whenever(api.createPost(any())).thenThrow(IllegalStateException("offline"))

        repository.publishStory("Title", "Body", null, "Essays")

        val mutation = argumentCaptor<OutboxMutationEntity>()
        verify(outbox).enqueueMutation(mutation.capture())
        val queued = gson.fromJson(mutation.firstValue.payloadJson, CreatePostRequestDto::class.java)
        assertFalse(queued.clientDraftId.isNullOrBlank())
    }

    @Test
    fun `missing server story evicts its cached body and comments`() = runTest {
        whenever(api.getPostDetail("removed-story"))
            .thenReturn(Response.error(404, "not found".toResponseBody()))

        val outcome = repository.refreshPostDetail("removed-story")

        assertEquals(PostDetailRefreshOutcome.NOT_FOUND, outcome)
        verify(posts).deletePostById("removed-story")
        verify(comments).deleteCommentsByPostId("removed-story")
    }

    @Test
    fun `network failure retains downloaded story for offline reading`() = runTest {
        whenever(api.getPostDetail("offline-story"))
            .thenThrow(IllegalStateException("offline"))
        whenever(posts.getPostSnapshot("offline-story")).thenReturn(mock())

        val outcome = repository.refreshPostDetail("offline-story")

        assertEquals(PostDetailRefreshOutcome.RETAINED_OFFLINE, outcome)
        verify(posts, never()).deletePostById("offline-story")
        verify(comments, never()).deleteCommentsByPostId("offline-story")
    }

    @Test
    fun `network failure without cached story reports recoverable failure`() = runTest {
        whenever(api.getPostDetail("uncached-story"))
            .thenThrow(IllegalStateException("offline"))
        whenever(posts.getPostSnapshot("uncached-story")).thenReturn(null)

        val outcome = repository.refreshPostDetail("uncached-story")

        assertEquals(PostDetailRefreshOutcome.FAILED_NO_CACHE, outcome)
        verify(posts, never()).deletePostById("uncached-story")
    }

    @Test
    fun `successful first page reconciles stale cached stories`() = runTest {
        whenever(
            api.getPosts(
                category = null,
                tab = "latest",
                authorId = null,
                authorPenName = null,
                searchQuery = null,
                page = 1,
                limit = 20
            )
        ).thenReturn(
            Response.success(
                PostsResponseDto(
                    posts = emptyList(),
                    pagination = PaginationDto(page = 1, limit = 20, hasMore = false)
                )
            )
        )

        val result = repository.refreshPosts()

        assertTrue(result.wasFetched)
        verify(posts).replaceMatchingPosts(category = null, query = "", posts = emptyList())
    }

    @Test
    fun `startup removes bundled placeholder stories`() = runTest {
        repository.removeLegacySeedStories()

        verify(posts).deletePostsByIds(
            listOf(
                "seed-1", "seed-2", "seed-3",
                "4c1fb2fa-f99b-4694-8f4f-8ca5f0eb3516",
                "72286de1-1635-4c15-8fd9-7d9459f1f52c",
                "02bbba36-e86b-438c-bc7d-bfc59d4b46f1",
                "e6936253-58f3-411f-ad64-cfb9e0c7ed02",
                "57b8d913-dfad-41a7-bef6-0478e6845368",
                "c1a59aa5-54de-4be1-8d34-f83879ca67b1",
                "9187aa00-3e89-41c9-b66a-8f651410f780",
                "f36c1e96-4c50-49c1-80ef-11261eeef719"
            )
        )
        verify(posts).purgeDisallowedStories()
    }

    @Test
    fun `confirmed published story deletion evicts its local body and comments`() = runTest {
        whenever(api.deletePost("owned-story")).thenReturn(Response.success(Unit))

        val result = repository.deletePublishedStory("owned-story")

        assertTrue(result.isSuccess)
        verify(posts).deletePostById("owned-story")
        verify(comments).deleteCommentsByPostId("owned-story")
    }

    @Test
    fun `already missing published story is treated as deleted locally`() = runTest {
        whenever(api.deletePost("already-removed"))
            .thenReturn(Response.error(404, "not found".toResponseBody()))

        val result = repository.deletePublishedStory("already-removed")

        assertTrue(result.isSuccess)
        verify(posts).deletePostById("already-removed")
        verify(comments).deleteCommentsByPostId("already-removed")
    }

    @Test
    fun `failed published story deletion keeps the local story for explicit retry`() = runTest {
        whenever(api.deletePost("retry-story"))
            .thenReturn(Response.error(503, "unavailable".toResponseBody()))

        val result = repository.deletePublishedStory("retry-story")

        assertTrue(result.isFailure)
        verify(posts, never()).deletePostById("retry-story")
        verify(comments, never()).deleteCommentsByPostId("retry-story")
    }
}

private fun String.toResponseBody() = toResponseBody("text/plain".toMediaType())
