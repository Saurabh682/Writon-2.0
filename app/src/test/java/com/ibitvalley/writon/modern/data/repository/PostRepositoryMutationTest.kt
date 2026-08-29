package com.ibitvalley.writon.modern.data.repository

import com.google.gson.Gson
import com.ibitvalley.writon.modern.core.database.dao.CommentDao
import com.ibitvalley.writon.modern.core.database.dao.OutboxDao
import com.ibitvalley.writon.modern.core.database.dao.PostDao
import com.ibitvalley.writon.modern.core.database.model.OutboxMutationEntity
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.AddCommentRequestDto
import com.ibitvalley.writon.modern.core.network.model.CreatePostRequestDto
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
}

private fun String.toResponseBody() = toResponseBody("text/plain".toMediaType())
