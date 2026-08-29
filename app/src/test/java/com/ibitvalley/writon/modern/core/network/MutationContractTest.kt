package com.ibitvalley.writon.modern.core.network

import com.google.gson.JsonParser
import com.ibitvalley.writon.modern.core.network.model.AddCommentRequestDto
import com.ibitvalley.writon.modern.core.network.model.CreatePostRequestDto
import com.ibitvalley.writon.modern.core.network.model.RelationStateRequestDto
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class MutationContractTest {
    private lateinit var server: MockWebServer
    private lateinit var api: WritOnApiService

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(WritOnApiService::class.java)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `like writes desired state with PUT so retry cannot invert it`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("{\"liked\":true,\"likesCount\":4}"))

        api.setLike("post-1", RelationStateRequestDto(enabled = true))

        val request = server.takeRequest()
        assertEquals("PUT", request.method)
        assertEquals("/api/v1/posts/post-1/like", request.path)
        assertTrue(JsonParser.parseString(request.body.readUtf8()).asJsonObject["enabled"].asBoolean)
    }

    @Test
    fun `comment carries a stable client mutation id`() = runTest {
        server.enqueue(MockResponse().setResponseCode(201).setBody("{}"))

        api.addComment(
            "post-1",
            AddCommentRequestDto(
                content = "Thoughtful reply",
                parentId = "comment-1",
                clientMutationId = "550e8400-e29b-41d4-a716-446655440000",
            ),
        )

        val body = JsonParser.parseString(server.takeRequest().body.readUtf8()).asJsonObject
        assertEquals("550e8400-e29b-41d4-a716-446655440000", body["clientMutationId"].asString)
        assertEquals("comment-1", body["parentId"].asString)
    }

    @Test
    fun `published story carries a stable client draft id`() = runTest {
        server.enqueue(MockResponse().setResponseCode(201).setBody("{}"))

        api.createPost(
            CreatePostRequestDto(
                title = "Title",
                content = "Content",
                summary = null,
                category = "Essays",
                coverImage = null,
                clientDraftId = "550e8400-e29b-41d4-a716-446655440001",
            ),
        )

        val body = JsonParser.parseString(server.takeRequest().body.readUtf8()).asJsonObject
        assertEquals("550e8400-e29b-41d4-a716-446655440001", body["clientDraftId"].asString)
    }
}
