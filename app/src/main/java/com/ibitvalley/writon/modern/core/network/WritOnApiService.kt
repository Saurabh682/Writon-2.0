package com.ibitvalley.writon.modern.core.network

import com.ibitvalley.writon.modern.core.network.model.*
import retrofit2.Response
import retrofit2.http.*

interface WritOnApiService {

    @GET("api/v1/me")
    suspend fun getMyProfile(): Response<MyProfileResponseDto>

    @PUT("api/v1/me")
    suspend fun upsertMyProfile(
        @Body request: UpsertMyProfileRequestDto
    ): Response<MyProfileResponseDto>

    @GET("api/v1/posts")
    suspend fun getPosts(
        @Query("category") category: String? = null,
        @Query("tab") tab: String? = "latest",
        @Query("q") searchQuery: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PostsResponseDto>

    @GET("api/v1/posts/{idOrSlug}")
    suspend fun getPostDetail(
        @Path("idOrSlug") idOrSlug: String
    ): Response<PostDetailResponseDto>

    @POST("api/v1/posts")
    suspend fun createPost(
        @Body request: CreatePostRequestDto
    ): Response<PostDetailResponseDto>

    @POST("api/v1/posts/{id}/like")
    suspend fun toggleLike(
        @Path("id") postId: String
    ): Response<LikeResponseDto>

    @POST("api/v1/posts/{id}/bookmark")
    suspend fun toggleBookmark(
        @Path("id") postId: String
    ): Response<BookmarkResponseDto>

    @GET("api/v1/comments/{postId}")
    suspend fun getComments(
        @Path("postId") postId: String
    ): Response<CommentsResponseDto>

    @POST("api/v1/comments/{postId}")
    suspend fun addComment(
        @Path("postId") postId: String,
        @Body payload: Map<String, String>
    ): Response<Map<String, Any>>

    @GET("api/v1/users/{idOrPenName}")
    suspend fun getUserProfile(
        @Path("idOrPenName") idOrPenName: String
    ): Response<UserProfileResponseDto>

    @POST("api/v1/users/{id}/follow")
    suspend fun toggleFollow(
        @Path("id") authorId: String
    ): Response<FollowResponseDto>
}
