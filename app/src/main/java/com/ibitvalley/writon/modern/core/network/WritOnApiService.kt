package com.ibitvalley.writon.modern.core.network

import com.ibitvalley.writon.modern.core.network.model.*
import retrofit2.Response
import retrofit2.http.*
import okhttp3.MultipartBody

interface WritOnApiService {

    @GET("api/v1/app/version")
    suspend fun getAppVersion(): Response<AppVersionResponseDto>

    @GET("api/v1/me")
    suspend fun getMyProfile(): Response<MyProfileResponseDto>

    @GET("api/v1/me/milestones")
    suspend fun getMyMilestones(): Response<MilestoneJourneyDto>

    @PUT("api/v1/me")
    suspend fun upsertMyProfile(
        @Body request: UpsertMyProfileRequestDto
    ): Response<MyProfileResponseDto>

    @DELETE("api/v1/me")
    suspend fun deleteMyAccount(): Response<AccountDeletionResponseDto>

    @GET("api/v1/posts")
    suspend fun getPosts(
        @Query("category") category: String? = null,
        @Query("tab") tab: String? = "latest",
        @Query("authorId") authorId: String? = null,
        @Query("authorPenName") authorPenName: String? = null,
        @Query("q") searchQuery: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PostsResponseDto>

    @GET("api/v1/users")
    suspend fun getUsers(
        @Query("q") query: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<UsersResponseDto>

    @GET("api/v1/tags")
    suspend fun getTags(
        @Query("q") query: String? = null
    ): Response<TagsResponseDto>


    @GET("api/v1/posts/{idOrSlug}")
    suspend fun getPostDetail(
        @Path("idOrSlug") idOrSlug: String
    ): Response<PostDetailResponseDto>

    @POST("api/v1/posts")
    suspend fun createPost(
        @Body request: CreatePostRequestDto
    ): Response<PostDetailResponseDto>

    @PUT("api/v1/posts/{id}")
    suspend fun updatePost(
        @Path("id") postId: String,
        @Body request: UpdatePostRequestDto
    ): Response<PostDetailResponseDto>

    @DELETE("api/v1/posts/{id}")
    suspend fun deletePost(@Path("id") postId: String): Response<Unit>

    @POST("api/v1/posts/{id}/publish")
    suspend fun publishDraft(@Path("id") postId: String): Response<PostDetailResponseDto>

    @GET("api/v1/me/drafts")
    suspend fun getMyDrafts(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<DraftsResponseDto>

    @Multipart
    @POST("api/v1/media/upload")
    suspend fun uploadMedia(@Part file: MultipartBody.Part): Response<MediaUploadResponseDto>

    @POST("api/v1/posts/{id}/like")
    suspend fun toggleLike(
        @Path("id") postId: String
    ): Response<LikeResponseDto>

    @PUT("api/v1/posts/{id}/like")
    suspend fun setLike(
        @Path("id") postId: String,
        @Body request: RelationStateRequestDto,
    ): Response<LikeResponseDto>

    @POST("api/v1/posts/{id}/bookmark")
    suspend fun toggleBookmark(
        @Path("id") postId: String
    ): Response<BookmarkResponseDto>

    @PUT("api/v1/posts/{id}/bookmark")
    suspend fun setBookmark(
        @Path("id") postId: String,
        @Body request: RelationStateRequestDto,
    ): Response<BookmarkResponseDto>

    @GET("api/v1/me/bookmarks")
    suspend fun getMyBookmarks(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PostsResponseDto>

    @GET("api/v1/me/applauds")
    suspend fun getMyApplauds(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PostsResponseDto>

    @GET("api/v1/me/stories")
    suspend fun getMyPublishedStories(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PostsResponseDto>

    @GET("api/v1/me/applause-received")
    suspend fun getMyReceivedApplauseStories(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PostsResponseDto>

    @GET("api/v1/me/followers")
    suspend fun getMyFollowers(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<UsersResponseDto>

    @GET("api/v1/me/following")
    suspend fun getMyFollowing(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<UsersResponseDto>

    @GET("api/v1/me/interests")
    suspend fun getMyInterests(): Response<InterestsResponseDto>

    @PUT("api/v1/me/interests")
    suspend fun updateMyInterests(
        @Body request: UpdateInterestsRequestDto
    ): Response<InterestsResponseDto>

    @GET("api/v1/me/reading-history")
    suspend fun getMyReadingHistory(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<ReadingHistoryResponseDto>

    @POST("api/v1/posts/{id}/reading-progress")
    suspend fun recordReadingProgress(
        @Path("id") postId: String,
        @Body request: ReadingProgressRequestDto
    ): Response<ReadingProgressResponseDto>

    @GET("api/v1/me/notifications")
    suspend fun getMyNotifications(
        @Query("kind") kind: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<NotificationsResponseDto>

    @PUT("api/v1/me/devices/push-token")
    suspend fun registerPushToken(
        @Body request: PushTokenRegistrationRequestDto
    ): Response<Map<String, Boolean>>

    @GET("api/v1/me/notification-preferences")
    suspend fun getNotificationPreferences(): Response<NotificationPreferencesDto>

    @PUT("api/v1/me/notification-preferences")
    suspend fun updateNotificationPreferences(
        @Body request: NotificationPreferencesDto
    ): Response<NotificationPreferencesDto>

    @PATCH("api/v1/me/notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") notificationId: String): Response<Map<String, String>>

    @GET("api/v1/comments/{postId}")
    suspend fun getComments(
        @Path("postId") postId: String
    ): Response<CommentsResponseDto>

    @POST("api/v1/comments/{postId}")
    suspend fun addComment(
        @Path("postId") postId: String,
        @Body payload: AddCommentRequestDto
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
