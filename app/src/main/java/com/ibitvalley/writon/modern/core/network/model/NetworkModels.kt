package com.ibitvalley.writon.modern.core.network.model

import com.google.gson.annotations.SerializedName

data class AuthorDto(
    @SerializedName("id") val id: String,
    @SerializedName("penName") val penName: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("bio") val bio: String?,
    @SerializedName("quoteOfDay") val quoteOfDay: String?,
    @SerializedName("followersCnt") val followersCnt: Int?,
    @SerializedName("followingCnt") val followingCnt: Int?
)

data class PostDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("slug") val slug: String,
    @SerializedName("summary") val summary: String?,
    @SerializedName("content") val content: String,
    @SerializedName("category") val category: String,
    @SerializedName("coverImage") val coverImage: String?,
    @SerializedName("readingTimeMin") val readingTimeMin: Int,
    @SerializedName("likesCnt") val likesCnt: Int,
    @SerializedName("commentsCnt") val commentsCnt: Int,
    @SerializedName("bookmarksCnt") val bookmarksCnt: Int,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("author") val author: AuthorDto,
    @SerializedName("isLiked") val isLiked: Boolean = false,
    @SerializedName("isBookmarked") val isBookmarked: Boolean = false,
    @SerializedName("isFollowingAuthor") val isFollowingAuthor: Boolean = false
)

data class PostsResponseDto(
    @SerializedName("posts") val posts: List<PostDto>,
    @SerializedName("pagination") val pagination: PaginationDto
)

data class PaginationDto(
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int,
    @SerializedName("hasMore") val hasMore: Boolean
)

data class PostDetailResponseDto(
    @SerializedName("post") val post: PostDto
)

data class CommentDto(
    @SerializedName("id") val id: String,
    @SerializedName("postId") val postId: String,
    @SerializedName("authorId") val authorId: String,
    @SerializedName("parentId") val parentId: String?,
    @SerializedName("content") val content: String,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("author") val author: AuthorDto,
    @SerializedName("replies") val replies: List<CommentDto>? = emptyList()
)

data class CommentsResponseDto(
    @SerializedName("comments") val comments: List<CommentDto>,
    @SerializedName("total") val total: Int
)

data class LikeResponseDto(
    @SerializedName("liked") val liked: Boolean,
    @SerializedName("likesCount") val likesCount: Int
)

data class BookmarkResponseDto(
    @SerializedName("bookmarked") val bookmarked: Boolean,
    @SerializedName("bookmarksCount") val bookmarksCount: Int
)

data class FollowResponseDto(
    @SerializedName("following") val following: Boolean,
    @SerializedName("followersCount") val followersCount: Int
)

data class CreatePostRequestDto(
    @SerializedName("title") val title: String,
    @SerializedName("content") val content: String,
    @SerializedName("summary") val summary: String?,
    @SerializedName("category") val category: String,
    @SerializedName("coverImage") val coverImage: String?,
    @SerializedName("isPublished") val isPublished: Boolean = true,
    @SerializedName("clientDraftId") val clientDraftId: String? = null
)

data class RelationStateRequestDto(
    @SerializedName("enabled") val enabled: Boolean,
)

data class AddCommentRequestDto(
    @SerializedName("content") val content: String,
    @SerializedName("parentId") val parentId: String? = null,
    @SerializedName("clientMutationId") val clientMutationId: String? = null,
)

data class InterestsResponseDto(
    @SerializedName("topicIds") val topicIds: List<String>,
)

data class UpdateInterestsRequestDto(
    @SerializedName("topicIds") val topicIds: List<String>,
)

data class UpdatePostRequestDto(
    @SerializedName("title") val title: String,
    @SerializedName("content") val content: String,
    @SerializedName("summary") val summary: String? = null,
    @SerializedName("category") val category: String,
    @SerializedName("coverImage") val coverImage: String? = null,
    @SerializedName("isPublished") val isPublished: Boolean = false,
    @SerializedName("clientDraftId") val clientDraftId: String? = null
)

data class DraftsResponseDto(
    @SerializedName("posts") val posts: List<PostDto>,
    @SerializedName("pagination") val pagination: PaginationDto
)

data class MediaUploadResponseDto(
    @SerializedName("url") val url: String,
    @SerializedName("key") val key: String
)

data class UserProfileResponseDto(
    @SerializedName("user") val user: AuthorDto
)

data class ReadingHistoryItemDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("slug") val slug: String,
    @SerializedName("summary") val summary: String?,
    @SerializedName("content") val content: String,
    @SerializedName("category") val category: String,
    @SerializedName("coverImage") val coverImage: String?,
    @SerializedName("readingTimeMin") val readingTimeMin: Int,
    @SerializedName("likesCnt") val likesCnt: Int,
    @SerializedName("commentsCnt") val commentsCnt: Int,
    @SerializedName("bookmarksCnt") val bookmarksCnt: Int,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("author") val author: AuthorDto,
    @SerializedName("isLiked") val isLiked: Boolean = false,
    @SerializedName("isBookmarked") val isBookmarked: Boolean = false,
    @SerializedName("progress") val progress: Float,
    @SerializedName("readSeconds") val readSeconds: Int,
    @SerializedName("firstReadAt") val firstReadAt: String,
    @SerializedName("lastReadAt") val lastReadAt: String
) {
    fun asPost() = PostDto(
        id = id,
        title = title,
        slug = slug,
        summary = summary,
        content = content,
        category = category,
        coverImage = coverImage,
        readingTimeMin = readingTimeMin,
        likesCnt = likesCnt,
        commentsCnt = commentsCnt,
        bookmarksCnt = bookmarksCnt,
        createdAt = createdAt,
        author = author,
        isLiked = isLiked,
        isBookmarked = isBookmarked
    )
}

data class ReadingHistorySummaryDto(
    @SerializedName("storiesRead") val storiesRead: Int,
    @SerializedName("hoursRead") val hoursRead: Float
)

data class ReadingHistoryResponseDto(
    @SerializedName("items") val items: List<ReadingHistoryItemDto>,
    @SerializedName("summary") val summary: ReadingHistorySummaryDto,
    @SerializedName("pagination") val pagination: PaginationDto
)

data class ReadingProgressRequestDto(
    @SerializedName("progress") val progress: Float,
    @SerializedName("readSeconds") val readSeconds: Int = 0
)

data class ReadingProgressResponseDto(
    @SerializedName("progress") val progress: Float,
    @SerializedName("readSeconds") val readSeconds: Int,
    @SerializedName("lastReadAt") val lastReadAt: String
)

data class NotificationActorDto(
    @SerializedName("id") val id: String?,
    @SerializedName("penName") val penName: String?,
    @SerializedName("fullName") val fullName: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?
)

data class NotificationDto(
    @SerializedName("id") val id: String,
    @SerializedName("kind") val kind: String,
    @SerializedName("message") val message: String,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("readAt") val readAt: String?,
    @SerializedName("postId") val postId: String?,
    @SerializedName("postTitle") val postTitle: String?,
    @SerializedName("actor") val actor: NotificationActorDto?
)

data class NotificationsResponseDto(
    @SerializedName("notifications") val notifications: List<NotificationDto>,
    @SerializedName("pagination") val pagination: PaginationDto
)

data class MyProfileDto(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String?,
    @SerializedName("penName") val penName: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("bio") val bio: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("location") val location: String?,
    @SerializedName("joinedAt") val joinedAt: String,
    @SerializedName("followersCount") val followersCount: Int,
    @SerializedName("followingCount") val followingCount: Int,
    @SerializedName("storiesCount") val storiesCount: Int = 0,
    @SerializedName("applaudsReceived") val applaudsReceived: Int = 0,
    @SerializedName("quoteOfDay") val quoteOfDay: String? = null
)


data class MyProfileResponseDto(
    @SerializedName("profile") val profile: MyProfileDto
)

data class AppVersionResponseDto(
    @SerializedName("latestVersionCode") val latestVersionCode: Int,
    @SerializedName("minSupportedVersionCode") val minSupportedVersionCode: Int,
    @SerializedName("updateUrl") val updateUrl: String
)

data class PushTokenRegistrationRequestDto(
    @SerializedName("token") val token: String,
    @SerializedName("platform") val platform: String = "android",
    @SerializedName("appVersionCode") val appVersionCode: Int,
    @SerializedName("notificationPermission") val notificationPermission: String
)

data class NotificationPreferencesDto(
    @SerializedName("interactionsEnabled") val interactionsEnabled: Boolean = true,
    @SerializedName("followsEnabled") val followsEnabled: Boolean = true,
    @SerializedName("editorialEnabled") val editorialEnabled: Boolean = true,
    @SerializedName("publishingEnabled") val publishingEnabled: Boolean = true
)

data class AccountDeletionResponseDto(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String
)

data class UpsertMyProfileRequestDto(
    @SerializedName("penName") val penName: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("bio") val bio: String? = null,
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
    @SerializedName("location") val location: String? = null
)

data class UsersResponseDto(
    @SerializedName("users") val users: List<AuthorDto>,
    @SerializedName("pagination") val pagination: PaginationDto
)

data class TagDto(
    @SerializedName("name") val name: String,
    @SerializedName("count") val count: Int
)

data class TagsResponseDto(
    @SerializedName("tags") val tags: List<TagDto>
)

